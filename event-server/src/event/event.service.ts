import {Injectable, Logger, NotFoundException} from '@nestjs/common';
import {InjectModel} from "@nestjs/mongoose";
import {Model, Types} from "mongoose";
import {Event, EventDocument} from "../schema/event.schema";
import {CreateEventDto} from "./dto/create-event.dto";
import {EventStatus} from "../common/enums/event-status.enum";

@Injectable()
export class EventService {

    private logger = new Logger(EventService.name)

    constructor(
        @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    ) {}

    async create(createEventDto: CreateEventDto): Promise<EventDocument> {
        const createdEvent = new this.eventModel({
            ...createEventDto,
            startDate: new Date(createEventDto.startDate),
            endDate: new Date(createEventDto.endDate),
        });
        return createdEvent.save();
    }

    async findAll(status?: EventStatus, isActive?: boolean): Promise<EventDocument[]> {
        const query: any = {};
        if (status) query.status = status;
        if (isActive !== undefined) query.isActive = isActive;
        return this.eventModel.find(query).populate('eventRewards').exec(); // eventRewards로 populate
    }

    async findOne(id: string): Promise<EventDocument> {
        if (!Types.ObjectId.isValid(id)) {
            throw new NotFoundException(`${id}`);
        }
        const event = await this.eventModel.findById(id).populate('eventRewards').exec();
        if (!event) {
            throw new NotFoundException(`ID ${id} not found`);
        }
        return event;
    }

}
