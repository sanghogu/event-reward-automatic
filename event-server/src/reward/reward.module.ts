import { Module } from '@nestjs/common';
import { RewardController } from './reward.controller';
import { RewardService } from './reward.service';
import {MongooseModule} from "@nestjs/mongoose";
import {Reward, RewardSchema} from "../schema/reward.schema";
import {EventModule} from "../event/event.module";

@Module({
    imports: [
      MongooseModule.forFeature([
        {name: Reward.name, schema: RewardSchema}
      ]),
      EventModule
    ],
    controllers: [RewardController],
    providers: [RewardService],
    exports: [RewardService]
})
export class RewardModule {}
