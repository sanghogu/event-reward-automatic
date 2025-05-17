
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import {Role} from "../common/enums/role.enum";
import {ROLES_KEY} from "../common/decorators/roles.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        //@Roles(Role.PUBLIC) 데코레이터가 있는지 확인 있으면 인증패스
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        //public role 은 바로 건너뜀
        if (requiredRoles && requiredRoles.includes(Role.PUBLIC)) {
            return true;
        }

        return super.canActivate(context);
    }

    handleRequest(err, user, info, context: ExecutionContext) {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        //public role 은 바로 건너뜀
        if (requiredRoles && requiredRoles.includes(Role.PUBLIC)) {
            return user || null; // 토큰이 있으면 user 객체, 없으면 null
        }


        if (err || !user) {
            throw err || new UnauthorizedException('User not authenticated or token invalid.');
        }
        return user; // 인증성공시컨트롤러 req.user 에서 참조
    }
}
