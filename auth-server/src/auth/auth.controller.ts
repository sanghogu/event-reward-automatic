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
import {UserService} from "../user/user.service";
import {CreateUserDto} from "./dto/create-user.dto";

import {UserDocument} from "../schema/user.schema";
import {Roles} from "../common/decorators/roles.decorator";
import {Role} from "../common/enums/role.enum";
import {RolesGuard} from "./roles.guard";
import {JwtGuard} from "./jwt.guard";
import {LocalGuard} from "./local.guard";
import {Response} from "express";

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
