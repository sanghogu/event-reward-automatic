import { Module } from '@nestjs/common';
import {AuthService} from "./auth.service";
import {LocalStrategy} from "./local.strategy";
import { AuthController } from './auth.controller';
import {PassportModule} from "@nestjs/passport";
import {UserModule} from "../user/user.module";
import {JwtModule} from "@nestjs/jwt";
import {ConfigService} from "@nestjs/config";

@Module({
    imports: [
        UserModule,
        PassportModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get("JWT_SECRET"),
                signOptions: {
                    expiresIn: "1h"
                }
            })
        })
    ],
    providers: [AuthService, LocalStrategy],
    controllers: [AuthController]
})
export class AuthModule {}
