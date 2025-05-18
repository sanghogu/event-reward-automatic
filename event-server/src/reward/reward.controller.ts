import {Body, Controller, Get, Param, Post, Put, Query, UseGuards} from '@nestjs/common';
import {AuthGuard} from "@nestjs/passport";
import {RolesGuard} from "../common/guards/roles.guard";
import {Roles} from "../common/decorators/roles.decorator";
import {Role} from "../common/enums/role.enum";
import {CreateRewardDto} from "./dto/create-reward.dto";
import {RewardService} from "./reward.service";
import {UpdateRewardDto} from "./dto/update-reward.dto";
import {GatewayGuard} from "../gateway/gateway.guard";

@Controller('rewards')
@UseGuards(GatewayGuard, RolesGuard)
export class RewardController {

    constructor(private readonly rewardService: RewardService) {
    }

    // Gateway에서 OPERATOR, ADMIN 역할에 대해 접근 허용
    @Post()
    @Roles(Role.ADMIN, Role.OPERATOR)
    create(@Body() createRewardDto: CreateRewardDto) {
        return this.rewardService.create(createRewardDto);
    }


    @Get()
    @Roles(Role.ADMIN, Role.OPERATOR)
    findAll(@Query('eventId') eventId?: string) {
        return this.rewardService.findAll(eventId);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.OPERATOR)
    findOne(@Param('id') id: string) {
        return this.rewardService.findOne(id);
    }

    @Put(':id')
    @Roles(Role.ADMIN, Role.OPERATOR)
    update(@Param('id') id: string, @Body() updateRewardDto: UpdateRewardDto) {
        return this.rewardService.update(id, updateRewardDto);
    }

}
