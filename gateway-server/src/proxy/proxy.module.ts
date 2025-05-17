import { Module } from '@nestjs/common';
import {ProxyController} from "./proxy.controller";
import {HttpModule} from "@nestjs/axios";
import {ConfigService} from "@nestjs/config";

@Module({
    imports: [
        HttpModule.registerAsync({
            useFactory: async (configService: ConfigService) => ({
                timeout: configService.get<number>('PROXY_HTTP_TIMEOUT_MS'),
                maxRedirects: 3,
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [ProxyController]
})
export class ProxyModule {}
