import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import {ConfigModule, ConfigService} from "@nestjs/config";
import * as Joi from 'joi';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';

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
    UserModule,
    AuthModule
  ],
  providers: [],
})
export class AppModule {}
