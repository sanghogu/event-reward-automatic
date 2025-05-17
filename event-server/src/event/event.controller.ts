import {
    Body,
    Controller,
    DefaultValuePipe,
    Get,
    Logger,
    Param,
    ParseBoolPipe,
    Post, Put,
    Query,
    UseGuards
} from '@nestjs/common';
import {GatewayGuard} from "../gateway/gateway.guard";
import {CreateEventDto} from "./dto/create-event.dto";
import {EventService} from "./event.service";
import {RolesGuard} from "../common/guards/roles.guard";
import {Roles} from "../common/decorators/roles.decorator";
import {Role} from "../common/enums/role.enum";
import {EventStatus} from "../common/enums/event-status.enum";
import {UpdateEventDto} from "./dto/update-event.dto";

@Controller('events')
export class EventController {

    private readonly logger = new Logger(EventController.name);

    constructor(private eventsService: EventService) {
    }

    @Post()
    @UseGuards(GatewayGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.OPERATOR)
    create(@Body() createEventDto: CreateEventDto) {
        this.logger.log(`create: ${createEventDto}}`);
        return this.eventsService.create(createEventDto);
    }

    @Get()
    @UseGuards(GatewayGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.OPERATOR)
    findAll(
        @Query('status') status?: EventStatus,
        @Query('isActive', new DefaultValuePipe(true), ParseBoolPipe) isActive?: boolean, // 기본적으로 활성 이벤트만 조회
    ) {
        return this.eventsService.findAll(status, isActive);
    }

    @UseGuards(GatewayGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.OPERATOR)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.eventsService.findOne(id);
    }

    @UseGuards(GatewayGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.OPERATOR)
    @Put(':id')
    update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
        return this.eventsService.update(id, updateEventDto);
    }

}
