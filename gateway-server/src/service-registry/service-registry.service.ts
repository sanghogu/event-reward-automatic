import {Injectable, InternalServerErrorException, Logger, OnModuleInit} from '@nestjs/common';
import {
    RegisteredServiceConfig,
    RoutePermission,
    ServiceHealthStatus,
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
            healthStatus: { // 기본적으로 UNKNOWN 또는 HEALTHY로 시작할 수 있음
                status: 'HEALTHY', // 초기에는 HEALTHY로 가정, health check 로직이 업데이트
                lastSeen: new Date(),
                consecutiveFailures: 0,
            } as ServiceHealthStatus,
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

        const healthyServices = this.activeServices.filter(s => s.healthStatus?.status === 'HEALTHY');
        if (healthyServices.length === 0 && this.activeServices.length > 0) {
            this.logger.warn("가용 서비스가 없습니다.");
        }


        for (const service of healthyServices) {
            if (requestPath.startsWith(service.prefix)) {
                const servicePath = requestPath.substring(service.prefix.length);

                //1. 특정 경로 권한 확인 없다면 기본 권한으로 넘어감
                if (service.permissions) {
                    for (const perm of service.permissions) {

                        this.logger.log(`ㅇㅇㅇㅇㅇㅇㅇ ${perm.path}, ${perm.method}, currentMethod: ${method}`)

                        if (perm.path === servicePath && (perm.method === 'ALL' || perm.method === method)) {
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


    //라우팅 해제할때
    public unregisterService(serviceId: string): boolean {
        const initialLength = this.activeServices.length;
        this.activeServices = this.activeServices.filter(s => s.id !== serviceId);
        const success = this.activeServices.length < initialLength;
        if (success) {
            this.logger.log(`Service with ID [${serviceId}] unregistered.`);
        } else {
            this.logger.warn(`Service with ID [${serviceId}] not found for unregistration.`);
        }
        return success;
    }

    //서비스 상태 업뎃
    public updateHealthStatus(serviceId: string, status: 'HEALTHY' | 'UNHEALTHY') {
        const service = this.activeServices.find(s => s.id === serviceId);
        if (service && service.healthStatus) {
            service.healthStatus.status = status;
            service.healthStatus.lastSeen = new Date();
            if (status === 'HEALTHY') {
                service.healthStatus.consecutiveFailures = 0;
            } else {
                service.healthStatus.consecutiveFailures = (service.healthStatus.consecutiveFailures || 0) + 1;
            }
            this.logger.log(`Health status for service ID [${serviceId}] updated to ${status}. Failures: ${service.healthStatus.consecutiveFailures}`);
        }
    }

    public getServiceById(serviceId: string): RegisteredServiceConfig | undefined {
        return this.activeServices.find(s => s.id === serviceId);
    }

    public getAllServices(): RegisteredServiceConfig[] {
        return [...this.activeServices];
    }
}
