import {Injectable, Logger} from '@nestjs/common';
import {UserService} from "../user/user.service";
import {JwtService} from "@nestjs/jwt";
import {UserDocument} from "../schema/user.schema";
import {comparePassword} from "../common/utils/bcrypt.utils";

@Injectable()
export class AuthService {

    private readonly logger = new Logger(AuthService.name);

    constructor(
        private userService: UserService,
        private jwtService: JwtService
    ) {
    }

    async validateUserCredentials(username: string, pass: string): Promise<UserDocument | null> {
        const user = await this.userService.findOneByUsername(username);
        if (user && (await comparePassword(pass, user.passwordHash))) {
            return user;
        }
        return null;
    }

    async createJwt(userDoc: UserDocument) { // validateUserCredentials에서 반환된 UserDocument 사용
        const payload = {
            username: userDoc.username,
            sub: userDoc._id.toString(), // userId
            roles: userDoc.roles,
        };
        this.logger.log(`User ${userDoc.username} logged in. Roles: ${userDoc.roles}`);
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: userDoc._id.toString(),
                username: userDoc.username,
                roles: userDoc.roles,
            },
        };
    }

}
