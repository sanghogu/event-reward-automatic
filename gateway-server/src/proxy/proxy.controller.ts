import { Controller, All, Req, Res, Logger, UseGuards, UnauthorizedException, ForbiddenException, NotFoundException, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { ServiceRegistryService } from '../service-registry/service-registry.service';
import {RolesGuard} from "../role-auth/role-auth.guard";
import {JwtAuthGuard} from "../jwt-auth/jwt-auth.guard";

@Controller() // all 기본 경로 잡기 위해 컨트롤러 레벨에 path를 지정하지 않음
@UseGuards(JwtAuthGuard, RolesGuard) //모든 요청에 대해 가드 적용!
export class ProxyController {
    private readonly logger = new Logger(ProxyController.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly serviceRegistry: ServiceRegistryService
    ) {

    }


    @All('*') // 모든 HTTP 메소드와 모든 경로(*)를 처리
    async proxyRequest(@Req() req: Request & {user:any}, @Res() res: Response) {
        const { originalUrl, method, body, headers, user } = req; // user는 JwtAuthGuard에 의해 추가됨

        this.logger.log(`Proxy Guard pass hit! METHOD: ${method}, URL: ${originalUrl}`);

        //가드가 이미 신뢰하는것만 패스했으니, 여기서는 서비스 라우팅만함
        const { service, servicePath } = this.serviceRegistry.findServiceAndPermissionForRequest(req);

        if (service === undefined) {
            //Guard 레벨에서 전부 처리했으니 undefined 일 경우는 없지만 그래도 크로스체크
            return res.status(404).json({ message: 'service 404' });
        }

        const targetUrl = `${service.url}${servicePath}`;
        this.logger.log(`Proxying ${method} ${originalUrl} to ${targetUrl}`);

        const downstreamHeaders: Record<string, any> = { ...headers };
        delete downstreamHeaders.host;
        delete downstreamHeaders['content-length'];

        /**
         * 서비스 모듈에서 jwt 말고 유저 시퀀스 값을 받는다면 적용
        delete downstreamHeaders.authorization; // 기존 Authorization 헤더는 제거
        if (user && user.userId) {
            downstreamHeaders['x-user-id'] = user.userId;
            if (user.roles) {
                downstreamHeaders['x-user-roles'] = user.roles.join(',');
            }
            this.logger.debug(`Forwarding with headers: X-User-Id=${user.userId}, X-User-Roles=${user.roles?.join(',')}`);
        } else {
            this.logger.debug('Forwarding request (likely public) without X-User-* headers from JWT.');
        }
         **/
        this.logger.debug(`Forwarding with headers: ${JSON.stringify(downstreamHeaders)}`);


        const axiosConfig: AxiosRequestConfig = {
            method: method as any,
            url: targetUrl,
            data: body,
            headers: downstreamHeaders,
            timeout: this.configService.get<number>('PROXY_HTTP_TIMEOUT_MS', 10000), // 타임아웃 증가 고려
            validateStatus: function (status) {
                return status >= 200 && status < 500;
            },
        };

        try {
            const serviceResponse = await firstValueFrom(
                this.httpService.request(axiosConfig).pipe(
                    catchError((error: AxiosError) => {
                        this.logger.error(`프록시 요청 에러 ${service.name} (${targetUrl}): ${error.message}`, error.response?.status);
                        if (error.response) {
                            this.logger.error(`에러 응답: ${JSON.stringify(error.response.data)}`);
                            res.status(error.response.status || 500).json(error.response.data);
                        } else if (error.request) {
                            res.status(503).json({ message: 'timed out.', service: service.name, details: error.message });
                        } else {
                            res.status(500).json({ message: '서비스 서버 에러', details: error.message });
                        }
                        throw error; //체인 중단
                    }),
                ),
            );

            if (serviceResponse && !res.headersSent) {
                res.status(serviceResponse.status).set(serviceResponse.headers).json(serviceResponse.data);
            } else if (!res.headersSent) {
                this.logger.error("중복 응답");
            }
        } catch (error) {
            if (!res.headersSent) {
                this.logger.error(`런타임 에러 ${targetUrl}: ${error.message}`, error.stack);
                res.status(500).json({message: `Internal Server Error By proxy.`});
            }
        }
    }
}
