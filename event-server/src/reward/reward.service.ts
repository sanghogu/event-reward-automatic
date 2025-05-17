import {Injectable, Logger} from '@nestjs/common';
import {InjectModel} from "@nestjs/mongoose";
import {Reward, RewardDocument} from "../schema/reward.schema";
import {Model, Types} from "mongoose";
import {EventService} from "../event/event.service";
import {CreateRewardDto} from "./dto/create-reward.dto";

@Injectable()
export class RewardService {

    private readonly logger = new Logger(RewardService.name);

    constructor(
        @InjectModel(Reward.name) private rewardModel: Model<RewardDocument>,
        private readonly eventService: EventService,
    ) {}

    async create(createRewardDto: CreateRewardDto): Promise<RewardDocument> {
        await this.eventService.findOne(createRewardDto.eventId.toString());
        const rewardToCreate = new this.rewardModel({
            ...createRewardDto,
            eventId: new Types.ObjectId(createRewardDto.eventId)
        });
        return rewardToCreate.save();
    }

}
