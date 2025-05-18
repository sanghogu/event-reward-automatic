import { Module } from '@nestjs/common';
import { RewardClaimController } from './reward-claim.controller';
import { RewardClaimService } from './reward-claim.service';

@Module({
  imports: [],
  controllers: [RewardClaimController],
  providers: [RewardClaimService]
})
export class RewardClaimModule {}
