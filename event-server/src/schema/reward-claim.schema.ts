import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {Document, HydratedDocument, Types} from 'mongoose';
import {ClaimStatus} from "../common/enums/claim-status.enum"; // Types 임포트

export type RewardClaimDocument = HydratedDocument<RewardClaim>

@Schema({ timestamps: true })
export class RewardClaim {
    @Prop({ type: Types.ObjectId, required: true, index: true })
    userId: Types.ObjectId; //Gateway에서 전달받는 사용자 아디

    @Prop({ type: Types.ObjectId, ref: 'Event', required: true, index: true })
    eventId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Reward', required: true, index: true })
    rewardId: Types.ObjectId;

    @Prop({ type: String, enum: ClaimStatus, default: ClaimStatus.PENDING })
    status: ClaimStatus;

    @Prop()
    notes?: string;

    @Prop()
    processedAt?: Date;

    @Prop({ type: Object })
    claimedRewardDetails?: Record<string, any>;
}

export const RewardClaimSchema = SchemaFactory.createForClass(RewardClaim);

// 복합 인덱스: 사용자가 동일 이벤트+보상에 대해 중복 요청하는 것을 방지
// userId 타입이 ObjectId로 변경되었으므로 인덱스 정의는 그대로 유효
RewardClaimSchema.index({ userId: 1, eventId: 1, rewardId: 1 }, { unique: true, partialFilterExpression: { status: { $ne: ClaimStatus.REJECTED } } });