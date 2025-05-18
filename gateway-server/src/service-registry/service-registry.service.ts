import {Injectable, InternalServerErrorException, Logger, OnModuleInit} from '@nestjs/common';
import {
    RegisteredServiceConfig,
    RoutePermission,
    staticServiceRegistry
} from "./service-registry.config";
import {Request} from "express";

@Injectable()
export class ServiceRegistryService implements OnModuleInit {
    private readonly logger = new Logger(ServiceRegistryService.name);
    private activeServices: RegisteredServiceConfig[] = [];

    onModuleInit() {
        this.loadDefaultServices();
        this.logger.log('ServiceRegistryService initialized.');
    }

    //신뢰성 100%인것만 기본 라우팅 구성
    private loadDefaultServices() {
        const defaultServices = staticServiceRegistry().map((serviceConfig, index) => ({
            ...serviceConfig,
            id: `default-${serviceConfig.name}-${index}-${serviceConfig.url.replace(/[^a-zA-Z0-9]/g, '')}`,
            registeredAt: new Date(),
        }));
        this.activeServices.push(...defaultServices);
        this.logger.log(`${defaultServices.length} 기본 라우팅 경로 딩 완료`);
    }

    public findServiceAndPermissionForRequest(
        req: Request,
    ): { service?: RegisteredServiceConfig; permission?: RoutePermission; servicePath?: string } {
        const originalUrl = req.originalUrl;
        const method = req.method.toUpperCase();
        let requestPath = originalUrl;

        //앞에 / 슬래시 있는거로 통합
        if (!requestPath.startsWith('/')) {
            requestPath = '/' + requestPath;
        }

        const healthyServices = this.activeServices;
        if (healthyServices.length === 0 && this.activeServices.length > 0) {
            this.logger.warn("가용 서비스가 없습니다.");
        }


        for (const service of healthyServices) {
            if (requestPath.startsWith(service.prefix)) {
                const servicePath = requestPath.substring(service.prefix.length);

                //1. 특정 경로 권한 확인 없다면 기본 권한으로 넘어감
                if (service.permissions) {
                    for (const perm of service.permissions) {

                        const normUrl = servicePath.split("?")[0];

                        if (perm.path === normUrl && (perm.method === 'ALL' || perm.method === method)) {
                            this.logger.debug(
                                `Matched specific permission for ${method} ${originalUrl} -> ${service.name}${servicePath}: roles ${perm.roles.join(',')}`,
                            );
                            return { service, permission: perm, servicePath };
                        }
                    }
                }

                // 2. 기본 서비스 권한 확인
                if (service.defaultRoles) {
                    this.logger.debug(
                        `Service Registry 라우팅 경로 찾음 ${originalUrl} -> ${service.name}${servicePath}: 서비스 역할 ${service.defaultRoles.join(',')}`,
                    );
                    return { service, permission: { path: '*', method: 'ALL', roles: service.defaultRoles }, servicePath };
                }

            }
        }

        this.logger.warn(`적절한 서비스 찾지못함. URL: ${originalUrl}`);
        return { service: undefined, permission: undefined, servicePath: undefined };
    }


}
