import { Module } from '@nestjs/common';
import {PassportModule} from "@nestjs/passport";
import {JwtModule} from "@nestjs/jwt";
import {ConfigService} from "@nestjs/config";
import {JwtAuthStrategy} from "./jwt-auth.strategy";

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                // Gateway는 토큰 검증만 하므로 signOptions는 필수는 아님
            }),
        }),
    ],
    providers: [JwtAuthStrategy],
    exports: [PassportModule, JwtModule]
})
export class JwtAuthModule {}
