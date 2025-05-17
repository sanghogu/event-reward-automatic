import { PartialType } from '@nestjs/mapped-types';
import { CreateEventDto } from './create-event.dto';
import {EventCondition} from "../interface/event-condition";
import {EventStatus} from "../../common/enums/event-status.enum";

export class UpdateEventDto extends PartialType(CreateEventDto) {}
