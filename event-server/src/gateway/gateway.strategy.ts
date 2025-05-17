import {PassportStrategy} from "@nestjs/passport";
import {BadRequestException, Injectable, Logger, UnauthorizedException} from "@nestjs/common";
import { Strategy } from 'passport-custom';
import {ConfigService} from "@nestjs/config";

@Injectable()
export class GatewayStrategy extends PassportStrategy(Strategy, 'gateway') {

    private readonly logger = new Logger(GatewayStrategy.name);

    constructor() {
        super();
    }

    async validate(req: Request) {

        this.logger.log("GatewayStrategy validate called.")

        const headers = req.headers;

        if(headers['x-user-id']) {
            const userId = headers['x-user-id'];
            const roles = (headers['x-user-roles']?.split(',')) ?? [];
            return {userId, roles};
        } else {
            throw new UnauthorizedException('Invalid authorization information');
        }

    }

}