import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalGuard extends AuthGuard('local') { // 'local'은 LocalStrategy에 명시된 이름
    constructor() {
        super();
    }

    //stretegy 리턴값 err or user
    handleRequest(err, user, info, context: ExecutionContext) {
        if (err || !user) {
            throw err || new UnauthorizedException(info?.message || '아이디 또는 비밀번호가 일치하지 않습니다.');
        }
        return user; // 인증 성공 시 user 그대로 반환해서 req.user 세팅함
    }
}