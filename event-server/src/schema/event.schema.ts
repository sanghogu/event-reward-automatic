import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {EventStatus} from "../common/enums/event-status.enum";
import {EventCondition} from "../event/interface/event-condition";

export type EventDocument = Event & Document;

@Schema({ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class Event {
    @Prop({ required: true })
    name: string;

    @Prop()
    description?: string;

    @Prop({ type: Object, required: true }) //조건 로직 저장 (예: { type: 'loginStreak', days: 7 })
    condition: EventCondition; //실제 조건 검증 로직은 각 서비스에서 처리

    @Prop({ required: true })
    startDate: Date;

    @Prop({ required: true })
    endDate: Date;

    @Prop({ type: String, enum: EventStatus, default: EventStatus.ACTIVE })
    status: EventStatus;

    @Prop({ default: true })
    isActive: boolean; //이벤트 활성 비활성
}

export const EventSchema = SchemaFactory.createForClass(Event);

//rewards 필드를 Reward 모델과 연결하기 위한 가상 populate 설정
EventSchema.virtual('eventRewards', {
    ref: 'Reward', // 참조할 모델 이름
    localField: '_id',
    foreignField: 'eventId',
});
