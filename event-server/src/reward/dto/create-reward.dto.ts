import { IsString, IsNotEmpty, IsEnum, IsObject, IsNumber, Min, IsMongoId, IsOptional } from 'class-validator';
import {RewardType} from "../../common/enums/reward-type.enum";

export class CreateRewardDto {
    @IsMongoId()
    @IsNotEmpty()
    eventId: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(RewardType)
    @IsNotEmpty()
    type: RewardType;

    @IsObject()
    @IsNotEmpty()
    details: Record<string, any>; //{val: 100 } | { id: 'item123' } 등등

    @IsNumber()
    @Min(1)
    quantity: number;
}