import {Injectable, Logger, NotFoundException} from '@nestjs/common';
import {InjectModel} from "@nestjs/mongoose";
import {Reward, RewardDocument} from "../schema/reward.schema";
import {Model, Types} from "mongoose";
import {EventService} from "../event/event.service";
import {CreateRewardDto} from "./dto/create-reward.dto";
import {UpdateRewardDto} from "./dto/update-reward.dto";

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

    async findAll(eventId?: string): Promise<RewardDocument[]> {
        const query: any = {};
        if (eventId) {
            if (!Types.ObjectId.isValid(eventId)) {
                throw new NotFoundException(`invalid event id: ${eventId}`);
            }
            query.eventId = new Types.ObjectId(eventId);
        }
        return this.rewardModel.find(query).exec();
    }

    async findOne(id: string): Promise<RewardDocument> {
        if (!Types.ObjectId.isValid(id)) {
            throw new NotFoundException(`Invalid reward ID: ${id}`);
        }
        const reward = await this.rewardModel.findById(id).exec();
        if (!reward) {
            throw new NotFoundException(`Reward id: ${id} not found`);
        }
        return reward;
    }

    async update(id: string, updateRewardDto: UpdateRewardDto): Promise<RewardDocument> {
        if (updateRewardDto.eventId) {
            //eventId 변경 할때 새로운 event id 있는지 검사함
            await this.eventService.findOne(updateRewardDto.eventId.toString());
        }
        const updatedReward = await this.rewardModel
            .findByIdAndUpdate(id, updateRewardDto, { new: true })
            .exec();
        if (!updatedReward) {
            throw new NotFoundException(`reeward ID: ${id} not found`);
        }
        return updatedReward;
    }

}
