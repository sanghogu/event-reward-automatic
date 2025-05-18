// src/events/dto/create-event.dto.ts
import {
    IsString,
    IsNotEmpty,
    IsDateString,
    IsEnum,
    IsObject,
    IsOptional,
    IsBoolean,
    ValidateNested
} from 'class-validator';
import {EventCondition} from "../interface/event-condition";
import {EventStatus} from "../../common/enums/event-status.enum";
import {Type} from "class-transformer";

class EventConditionDto implements EventCondition {
    @IsString()
    @IsNotEmpty()
    type: string;
}

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsObject() // 기본적으로 객체인지 확인
    @ValidateNested() // 중첩된 객체의 유효성 검사 (EventConditionDto 사용 시)
    @Type(() => EventConditionDto) // 타입 변환 (plainToClass)
    @IsNotEmpty()
    condition: EventCondition; //// 예: { type: 'loginStreak', days: 7 }

    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @IsDateString()
    @IsNotEmpty()
    endDate: string;

    @IsEnum(EventStatus)
    @IsOptional()
    status?: EventStatus;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}