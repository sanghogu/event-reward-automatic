import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import {ServiceRegistryService} from "../service-registry/service-registry.service";
import {Role} from "../common/enums/role.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
      private readonly serviceRegistryService: ServiceRegistryService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()

    this.logger.log(`RolesGuard hit: METHOD: ${request.method}, URL: ${request.originalUrl}`);

    const { permission } = this.serviceRegistryService.findServiceAndPermissionForRequest(request);

    if (permission === undefined) {
      throw new NotFoundException(`서비스 찾지못했습니다. role guard: ${request.method} ${request.originalUrl}.`);
    }

    if (permission.roles.includes(Role.PUBLIC)) {
      return true;
    }

    //public 외는 퍼블릭 아니므로 user 필수임
    const { user } = request; // JwtAuthGuard에 의해 설정된 user 객체
    if (!user) {
      throw new ForbiddenException('유저 정보 확인 실패');
    }

    const hasRequiredRole = permission.roles.some((role) => user.roles.includes(role));

    if (!hasRequiredRole) {
      throw new ForbiddenException(`접근 권한이 없습니다. 필요 권한: ${permission.roles.join(', ')}}`);
    }
    return true;
  }
}
