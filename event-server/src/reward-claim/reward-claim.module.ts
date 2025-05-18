import { Module } from '@nestjs/common';
import { RewardClaimController } from './reward-claim.controller';
import { RewardClaimService } from './reward-claim.service';
import {MongooseModule} from "@nestjs/mongoose";
import {RewardClaim, RewardClaimSchema} from "../schema/reward-claim.schema";

@Module({
  imports: [
      MongooseModule.forFeature([
        {name: RewardClaim.name, schema: RewardClaimSchema}
      ])
  ],
  controllers: [RewardClaimController],
  providers: [RewardClaimService]
})
export class RewardClaimModule {}
