import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Logger,
    Param,
    Post,
    Put,
    Request,
    Res,
    UseGuards
} from '@nestjs/common';
import {AuthService} from "./auth.service";

import {UserDocument} from "../schema/user.schema";
import {LocalGuard} from "./local.guard";

@Controller('auth')
export class AuthController {

    private readonly logger = new Logger(AuthController.name);

    constructor(private authService: AuthService) {}

    @UseGuards(LocalGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Request() req: { user: UserDocument}) {
        return this.authService.createJwt(req.user);
    }

}
