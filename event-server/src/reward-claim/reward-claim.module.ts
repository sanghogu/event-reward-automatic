import { Module } from '@nestjs/common';
import { RewardClaimController } from './reward-claim.controller';
import { RewardClaimService } from './reward-claim.service';
import {MongooseModule} from "@nestjs/mongoose";
import {RewardClaim, RewardClaimSchema} from "../schema/reward-claim.schema";
import {EventModule} from "../event/event.module";
import {RewardModule} from "../reward/reward.module";

@Module({
  imports: [
      MongooseModule.forFeature([
        {name: RewardClaim.name, schema: RewardClaimSchema}
      ]),
      EventModule,
      RewardModule
  ],
  controllers: [RewardClaimController],
  providers: [RewardClaimService]
})
export class RewardClaimModule {}
