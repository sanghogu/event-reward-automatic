import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import {ConfigModule, ConfigService} from "@nestjs/config";
import * as Joi from 'joi';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`],
      validationSchema: Joi.object({
        JWT_SECRET: Joi.string().required(),
        DB_URI: Joi.string().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
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
    UserModule,
    AuthModule,
    GatewayModule
  ],
  providers: [],
  controllers: [HealthController],
})
export class AppModule {}
