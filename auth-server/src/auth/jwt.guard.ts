import {AuthGuard} from "@nestjs/passport";
import {BadRequestException, ExecutionContext, UnauthorizedException} from "@nestjs/common";
import {Observable} from "rxjs";
import {JsonWebTokenError, TokenExpiredError} from "@nestjs/jwt";


export class JwtGuard extends AuthGuard("access") {

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        return super.canActivate(context);
    }

    handleRequest(err, user, info) {
        if (err || !user) {
            if (err instanceof BadRequestException) {
                throw err;
            }
            if (err instanceof TokenExpiredError) {
                throw new UnauthorizedException('Access Token is expired');
            }
            if (err instanceof JsonWebTokenError) {
                throw new BadRequestException(err.message);
            }
            if (err instanceof SyntaxError) {
                throw new BadRequestException('Invalid JSON object');
            } else {
                throw new UnauthorizedException('Unauthorized');
            }
        }
        return user;
    }
}