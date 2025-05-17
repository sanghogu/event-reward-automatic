import {Body, Controller, Post, UseGuards} from '@nestjs/common';
import {AuthGuard} from "@nestjs/passport";
import {RolesGuard} from "../common/guards/roles.guard";
import {Roles} from "../common/decorators/roles.decorator";
import {Role} from "../common/enums/role.enum";
import {CreateRewardDto} from "./dto/create-reward.dto";
import {RewardService} from "./reward.service";

@Controller('rewards')
export class RewardController {

    constructor(private readonly rewardService: RewardService) {
    }

    // Gateway에서 OPERATOR, ADMIN 역할에 대해 접근 허용
    @Post()
    @UseGuards(AuthGuard('gateway'), RolesGuard)
    @Roles(Role.ADMIN, Role.OPERATOR)
    create(@Body() createRewardDto: CreateRewardDto) {
        return this.rewardService.create(createRewardDto);
    }

}
