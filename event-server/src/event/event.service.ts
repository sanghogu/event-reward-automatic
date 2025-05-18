import {Injectable, Logger, NotFoundException} from '@nestjs/common';
import {InjectModel} from "@nestjs/mongoose";
import {Model, Types} from "mongoose";
import {Event, EventDocument} from "../schema/event.schema";
import {CreateEventDto} from "./dto/create-event.dto";
import {EventStatus} from "../common/enums/event-status.enum";
import {UpdateEventDto} from "./dto/update-event.dto";

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

    async update(id: string, updateEventDto: UpdateEventDto): Promise<EventDocument> {
        const eventDataToUpdate = { ...updateEventDto };
        let startDate, endDate;
        if (updateEventDto.startDate) {
            startDate = new Date(updateEventDto.startDate);
        }
        if (updateEventDto.endDate) {
            endDate = new Date(updateEventDto.endDate);
        }

        const updatedEvent = await this.eventModel
            .findByIdAndUpdate(id, {
                ...eventDataToUpdate, startDate, endDate
            }, { new: true })
            .exec();
        if (!updatedEvent) {
            throw new NotFoundException(`ID ${id} not found`);
        }
        return updatedEvent;
    }

    //이벤트 조건 검증 로직 이벤트 서비스에 만드는게
    async checkEventCondition(userId: string, event: EventDocument): Promise<boolean> {
        if (!userId) {
            console.warn('event condition UserId not valid');
            return false;
        }

        this.logger.log(`event condition event "${event.name}" (ID: ${event._id}) for user "${userId}"`);
        this.logger.log('Event condition details:', event.condition);

        const { type, ...params } = event.condition;

        this.logger.log(`Event condition type: ${JSON.stringify(params, null, 2)}`);

        //모든 이벤트는 타입만 체크하고 일단 통과 (실제 로직으로 대체 필요함)
        switch (type) {
            case 'loginStreak':
                //const userLoginDays = await this.userActivityService.getLoginStreak(userId);
                //return userLoginDays >= params.days;
                return true;
            case 'inviteFriends':
                return true;
            case 'questClear':
                return true;
            default:
                return false;
        }
    }

    async findActiveEventById(eventId: string): Promise<EventDocument | null> {
        if (!Types.ObjectId.isValid(eventId)) return null;
        const now = new Date();
        return this.eventModel.findOne({
            _id: eventId,
            status: EventStatus.ACTIVE,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
        }).exec();
    }

}
