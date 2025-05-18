import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException
} from '@nestjs/common';
import {Model, Types} from "mongoose";
import {RewardClaim, RewardClaimDocument} from "../schema/reward-claim.schema";
import {ClaimStatus} from "../common/enums/claim-status.enum";
import {UpdateClaimStatusDto} from "./dto/update-reward-claim.dto";
import {EventService} from "../event/event.service";
import {CreateRewardClaimDto} from "./dto/create-reward-claim.dto";
import {EventStatus} from "../common/enums/event-status.enum";
import {RewardService} from "../reward/reward.service";
import {InjectModel} from "@nestjs/mongoose";

@Injectable()
export class RewardClaimService {

    private readonly logger = new Logger(RewardClaimService.name)

    constructor(
        @InjectModel(RewardClaim.name) private rewardClaimModel: Model<RewardClaimDocument>,
    ) {
    }

    async findMyClaimsByUserId(
        userIdString: string,
        eventId?: string,
        status?: ClaimStatus,): Promise<RewardClaimDocument[]> {

        this.logger.log(`findMyClaimsByUserId: userId: ${userIdString}, eventId: ${eventId}, status: ${status}`);

        if (!userIdString || !Types.ObjectId.isValid(userIdString)) {
            throw new BadRequestException('user Id format is invalid.');
        }
        const userIdObj = new Types.ObjectId(userIdString);

        const query: any = { userId: userIdObj }; // 현재 사용자의 ID로 고정

        if (eventId) {
            if (!Types.ObjectId.isValid(eventId)) throw new BadRequestException('Ievent id format is invalid');
            query.eventId = new Types.ObjectId(eventId);
        }
        if (status) {
            query.status = status;
        }

        return this.rewardClaimModel.find(query)
            .populate('eventId', 'name') //이벤트 이름만 가져오기
            .populate('rewardId', 'name type') //보상 이름과 타입만 가져오기
            .sort({ createdAt: -1 })
            .exec();
    }


    async createClaim(userIdString: string, createRewardClaimDto: CreateRewardClaimDto): Promise<RewardClaimDocument> {
        return new Promise(async (resolve, reject) => {});
    }

    async findAllClaimsForAdmin(
        filterByUserIdString?: string,
        eventId?: string,
        status?: ClaimStatus,
    ): Promise<RewardClaimDocument[]> {

        const query: any = {};

        if (filterByUserIdString) {
            if (!Types.ObjectId.isValid(filterByUserIdString)) {
                throw new BadRequestException('Invalid User ID format for filtering.');
            }
            query.userId = new Types.ObjectId(filterByUserIdString);
        }

        if (eventId) {
            if (!Types.ObjectId.isValid(eventId)) throw new BadRequestException('Invalid Event ID format for filtering.');
            query.eventId = new Types.ObjectId(eventId);
        }
        if (status) {
            query.status = status;
        }

        return this.rewardClaimModel.find(query)
            .populate('eventId', 'name')
            .populate('rewardId', 'name type')
            .sort({ createdAt: -1 })
            .exec();
    }

}
