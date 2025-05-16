import { Strategy } from 'passport-local';
import {AuthService} from "./auth.service";
import {PassportStrategy} from "@nestjs/passport";
import {UserDocument} from "../schema/user.schema";
import {Injectable, UnauthorizedException} from "@nestjs/common";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {

    constructor(private readonly authService: AuthService) {
        super({ usernameField: 'username', passwordField: 'password' });
    }

    async validate(username: string, password: string): Promise<UserDocument> { // UserDocument 반환 명시
        const user = await this.authService.validateUserCredentials(username, password);
        if (!user) {
            throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
        }
        return user;
    }
}