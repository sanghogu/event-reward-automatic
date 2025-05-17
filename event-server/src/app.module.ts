import { Module } from '@nestjs/common';
import {ConfigModule, ConfigService} from "@nestjs/config";
import {MongooseModule} from "@nestjs/mongoose";
import { HealthController } from './health/health.controller';
import { EventModule } from './event/event.module';
import * as Joi from "joi";
import {GatewayModule} from "./gateway/gateway.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development'],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validationSchema: Joi.object({
        JWT_SECRET: Joi.string().required(),
        DB_URI: Joi.string().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('DB_URI'),
        auth: {
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
        },
        authSource: 'admin'
      })
    }),
    EventModule,
    GatewayModule,
  ],
  controllers: [HealthController],
  providers: [],
  exports: [EventModule]
})
export class AppModule {}
