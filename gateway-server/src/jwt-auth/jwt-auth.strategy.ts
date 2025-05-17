
import {BadRequestException, Injectable, Logger, UnauthorizedException} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import * as jwt from 'jsonwebtoken';
import {ConfigService} from "@nestjs/config";
import {JsonWebTokenError, TokenExpiredError} from "@nestjs/jwt";

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy, 'access'){

    private readonly logger = new Logger(JwtAuthStrategy.name);

    constructor(
        private readonly config: ConfigService,
    ) {
        super();
    }


    async validate(req: Request) {

        this.logger.log("JwtAuthStrategy validate called.")

        try {
            const userToken = req.headers['authorization']?.slice(7);

            if (!userToken) {
                throw new BadRequestException('There is no access token in header');
            }

            const secretKey = this.config.get<string>('JWT_SECRET');

            const payload = jwt.verify(userToken, secretKey!);

            const userId = payload['sub'];
            if(typeof userId !== 'string') {
                throw new BadRequestException('Invalid user id');
            }

            return {userId, username: payload['username'], roles: payload['roles'] as string[]};
        } catch (e) {
            console.error(e);
            if (e instanceof BadRequestException) {
                throw e
            }
            if (e instanceof SyntaxError) {
                throw new BadRequestException('Invalid JSON object');
            }
            if (e instanceof TokenExpiredError) {
                throw new UnauthorizedException('Access Token is expired');
            }
            if (e instanceof JsonWebTokenError) {
                throw new BadRequestException(e.message);
            } else {
                throw new UnauthorizedException('Unauthorized for unknown error')
            }
        }
    }
}