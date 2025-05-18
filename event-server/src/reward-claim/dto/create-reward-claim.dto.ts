import {IsMongoId, IsNotEmpty} from "class-validator";

/**
 * 두개 엔티티 모두 서비스에서 ObjectId 로 형변환함
 */
export class CreateRewardClaimDto {


    @IsMongoId()
    @IsNotEmpty()
    eventId: string;

    @IsMongoId()
    @IsNotEmpty()
    rewardId: string;
}