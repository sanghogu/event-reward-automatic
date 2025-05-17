import {PassportStrategy} from "@nestjs/passport";
import {BadRequestException, Injectable, Logger, UnauthorizedException} from "@nestjs/common";
import { Strategy } from 'passport-custom';
import {ConfigService} from "@nestjs/config";
import {UserService} from "../user/user.service";

@Injectable()
export class GatewayStrategy extends PassportStrategy(Strategy, 'gateway') {

    private readonly logger = new Logger(GatewayStrategy.name);

    constructor(
        private readonly config: ConfigService,
        private readonly userService: UserService,
    ) {
        super();
    }

    async validate(req: Request) {

        this.logger.log("GatewayStrategy validate called.")

        const headers = req.headers;

        if(headers['x-user-id']) {
            const user = await this.userService.findById(headers['x-user-id'] as string);
            if(!user) {
                throw new UnauthorizedException("유저 정보 없음")
            }
            return user;
        } else {
            throw new BadRequestException('Invalid user id');
        }

    }

}