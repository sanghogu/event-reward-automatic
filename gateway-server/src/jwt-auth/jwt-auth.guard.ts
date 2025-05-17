
import {Injectable, ExecutionContext, UnauthorizedException, Logger, NotFoundException} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {Role} from "../common/enums/role.enum";
import {ServiceRegistryService} from "../service-registry/service-registry.service";

@Injectable()
export class JwtAuthGuard extends AuthGuard('access') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    constructor(
        private readonly serviceRegistryService: ServiceRegistryService,
    ) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {

        const request = context.switchToHttp().getRequest();

        this.logger.log(`JwtAuthGuard hit: METHOD: ${request.method}, URL: ${request.originalUrl}`);
        const { permission } = this.serviceRegistryService.findServiceAndPermissionForRequest(request);

        //서비스가 없다면 404
        if(permission === undefined) {
            throw new NotFoundException(`서비스 찾지못했습니다. jwt guard: ${request.method} ${request.originalUrl}.`);
        }

        //필요권한 퍼블릭이면 패스
        if (permission.roles.includes(Role.PUBLIC)) {
            return true;
        }

        //그외는 검증 이어감
        return super.canActivate(context) as Promise<boolean>;
    }

    handleRequest(err, user, info, context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const { permission } = this.serviceRegistryService.findServiceAndPermissionForRequest(request);

        //퍼블릭은 패스
        if (permission && permission.roles.includes(Role.PUBLIC)) {
            return user;
        }

        // 퍼블릭 아닌곳
        if (err || !user) {
            throw err || new UnauthorizedException(`jwt 토큰 검증실패 요청: ${request.method}, ${request.originalUrl}. message: ${info?.message}`);
        }
        return user;
    }
}
