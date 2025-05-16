import {CanActivate, ExecutionContext, ForbiddenException, Injectable} from "@nestjs/common";
import {Reflector} from "@nestjs/core";
import {ROLES_KEY} from "../common/decorators/roles.decorator";


@Injectable()
export class RolesGuard implements CanActivate {

    constructor(private reflector: Reflector) {
    }

    canActivate(context: ExecutionContext): boolean{
        const requireRoles = this.reflector.getAllAndOverride(ROLES_KEY, [
            context.getHandler(),
            context.getClass()
        ])

        //데코레이터 설정ㅇ안해놧으면 패스
        if(!requireRoles && requireRoles.length === 0) return true;

        const { user } = context.switchToHttp().getRequest();

        if(!user || !user.roles) {
            throw new ForbiddenException("권한 정보가 없습니다..");
        }

        // 사용자가 가진 역할 중 하나라도 필요한 역할에 포함되는지 확인
        const hasRequiredRole = requireRoles.some((role) => user.roles?.includes(role));

        if (!hasRequiredRole) {
            throw new ForbiddenException(`접근 권한이 없습니다. 필요 권한: ${requireRoles.join(', ')}}`);
        }

        return true;
    }
}