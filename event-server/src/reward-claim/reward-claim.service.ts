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
        private eventService: EventService,
        private rewardService: RewardService
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
        if (!userIdString || !Types.ObjectId.isValid(userIdString)) {
            throw new BadRequestException('Valid User ID is required to claim a reward.');
        }
        const userIdObj = new Types.ObjectId(userIdString);

        const eventIdObj = new Types.ObjectId(createRewardClaimDto.eventId);
        const rewardIdObj = new Types.ObjectId(createRewardClaimDto.rewardId);

        const event = await this.eventService.findActiveEventById(createRewardClaimDto.eventId);
        if (!event) {
            throw new NotFoundException(`event ID ${createRewardClaimDto.eventId} not found or not active.`);
        }
        if (event.status !== EventStatus.ACTIVE || !event.isActive) {
            throw new BadRequestException(`Event ID ${event.id} is not currently active.`);
        }

        const reward = await this.rewardService.findOne(createRewardClaimDto.rewardId);
        if (!reward || !reward.eventId.equals(eventIdObj)) {
            throw new NotFoundException(`Reward with ID "${createRewardClaimDto.rewardId}" event id not matched: "${event._id}".`);
        }

        const existingClaim = await this.rewardClaimModel.findOne({
            userId: userIdObj,
            eventId: eventIdObj,
            rewardId: rewardIdObj,
            status: { $nin: [ClaimStatus.REJECTED, ClaimStatus.CANCELLED, ClaimStatus.FAILED] },
        }).exec();

        if (existingClaim) {
            throw new ConflictException(`중복된 클레임이 존재합니다. (Claim ID: ${existingClaim._id}, Status: ${existingClaim.status}).`);
        }

        const conditionMet = await this.eventService.checkEventCondition(userIdString, event);
        if (!conditionMet) {
            const failedClaim = new this.rewardClaimModel({
                userId: userIdObj,
                eventId: eventIdObj,
                rewardId: rewardIdObj,
                status: ClaimStatus.REJECTED,
                notes: '이벤트 유효성 통과 실패 지급 거절',
                claimedRewardDetails: { name: reward.name, type: reward.type, details: reward.details, quantity: reward.quantity },
                processedAt: new Date(),
            });
            await failedClaim.save();
            throw new BadRequestException('이벤트 유효성 통과 실패 지급 거절');
        }

        const newClaim = new this.rewardClaimModel({
            userId: userIdObj,
            eventId: eventIdObj,
            rewardId: rewardIdObj,
            status: ClaimStatus.APPROVED,
            notes: 'Claim approved by system.',
            claimedRewardDetails: { name: reward.name, type: reward.type, details: reward.details, quantity: reward.quantity }
        });
        this.logger.log("Claim APPROVED created success! ! !");

        //승인과 지급 로직은 따로따로 동작함
        try {
            const savedClaim = await newClaim.save();
            savedClaim.status = ClaimStatus.PAID;
            savedClaim.notes = 'Claim approved and reward paid automatically. (System processed)';
            savedClaim.processedAt = new Date();
            return await savedClaim.save();
        } catch (error) {
            if (error.code === 11000) {
                throw new ConflictException('중복 클레임 감지 유효성');
            }
            this.logger.error("Error creating claim:", error);
            throw new InternalServerErrorException('Failed to process reward claim approve -> paid.');
        }
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


    async findClaimById(claimId: string): Promise<RewardClaimDocument> {
        if (!Types.ObjectId.isValid(claimId)) {
            throw new BadRequestException('Invalid Claim ID format');
        }
        const claim = await this.rewardClaimModel.findById(claimId)
            .populate('eventId', 'name startDate endDate')
            .populate('rewardId', 'name type details quantity')
            .exec();

        if (!claim) {
            throw new NotFoundException(`Reward claim id ${claimId} not found.`);
        }

        return claim;
    }

}
