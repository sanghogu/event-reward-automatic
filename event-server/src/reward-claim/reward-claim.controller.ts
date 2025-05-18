import {Body, Controller, Get, Logger, Param, Post, Put, Query, Req, UseGuards} from '@nestjs/common';
import {RewardClaimService} from "./reward-claim.service";
import {GatewayGuard} from "../gateway/gateway.guard";
import {RolesGuard} from "../common/guards/roles.guard";
import {Roles} from "../common/decorators/roles.decorator";
import {Role} from "../common/enums/role.enum";
import {CreateRewardClaimDto} from "./dto/create-reward-claim.dto";
import {ClaimStatus} from "../common/enums/claim-status.enum";
import {Request} from "express";
import {UpdateClaimStatusDto} from "./dto/update-reward-claim.dto";

@UseGuards(GatewayGuard, RolesGuard)
@Controller('reward-claims')
export class RewardClaimController {

    private logger = new Logger(RewardClaimController.name);

    constructor(private readonly rewardClaimsService: RewardClaimService) {}

    //Gateway에서 USER 역할에 대해 접근 허용
    @Post()
    @Roles(Role.USER)
    create(
        @Req() req: {user: {userId: string}} & Request,
        @Body() createRewardClaimDto: CreateRewardClaimDto) {
        const {user} = req;

        this.logger.log(`create: ${user.userId}`);

        return this.rewardClaimsService.createClaim(user.userId, createRewardClaimDto);
    }

    @Roles(Role.ADMIN, Role.AUDITOR)
    @Get()
    findAllForAdmins(
        @Query('userId') filterByUserId?: string, // 특정 사용자의 ID로 필터링 (관리자용)
        @Query('eventId') eventId?: string,
        @Query('status') status?: ClaimStatus,
    ) {
        return this.rewardClaimsService.findAllClaimsForAdmin(filterByUserId, eventId, status);
    }

    @Get('me')
    @Roles(Role.USER)
    findMyClaims(
        @Req() req: {userId: string} & Request,
        @Query('eventId') eventId?: string,
        @Query('status') status?: ClaimStatus,
    ) {
        const { userId } = req;
        return this.rewardClaimsService.findMyClaimsByUserId(userId, eventId, status);
    }

}
