// src/events/dto/create-event.dto.ts
import { IsString, IsNotEmpty, IsDateString, IsEnum, IsObject, IsOptional, IsBoolean } from 'class-validator';
import {EventCondition} from "../interface/event-condition";
import {EventStatus} from "../../common/enums/event-status.enum";

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsObject()
    @IsNotEmpty()
    condition: EventCondition; // 예: { type: 'loginStreak', days: 7 }

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