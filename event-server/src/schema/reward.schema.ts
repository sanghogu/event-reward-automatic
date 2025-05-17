import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Number } from 'mongoose';
import {RewardType} from "../common/enums/reward-type.enum";

export type RewardDocument = Reward & Document;

@Schema({ timestamps: true })
export class Reward {
    @Prop({ type: Types.ObjectId, ref: 'Event', required: true, index: true })
    eventId: Types.ObjectId; //어떤 이벤트에 속했는지 ref

    @Prop({ required: true })
    name: string; //100억메소, 일비

    @Prop({ type: String, enum: RewardType, required: true })
    type: RewardType;

    @Prop({ type: Object, required: true }) // 보상 내용 (타입에 따라 구조가 다를 수 있음)
    details: Record<string, any>; // 예: { value: 1000 } for POINT, { itemId: 'glove', grade: 'epic' } for ITEM

    @Prop({ required: true, min: 0 })
    quantity: number; // 지급 수량(포인트 1000점, 아이템 1개)
}

export const RewardSchema = SchemaFactory.createForClass(Reward);
