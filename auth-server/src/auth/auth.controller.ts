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

    constructor(private authService: AuthService,
                private userService: UserService) {
    }


    @Post("register")
    @HttpCode(201)
    async register(@Body() createUserDto: CreateUserDto) {

        this.logger.log("register: ", createUserDto)

        return this.userService.create(createUserDto);
    }

    @UseGuards(LocalGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Request() req: { user: UserDocument}) {
        return this.authService.createJwt(req.user);
    }

    @UseGuards(JwtGuard) // Auth 서버가 직접 토큰 검증 시
    @Get('profile')
    getProfile(@Request() req) { // req.user는 Auth 서버의 JwtStrategy에 의해 채워짐
        const { passwordHash, __v, ...userProfile } = req.user.toObject(); // req.user가 UserDocument 인스턴스라고 가정
        return userProfile;
    }

    // ADMIN만 사용자명으로 조회 가능
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Get('users/:username/profile')
    async getProfileByUsername(
        @Param('username') usernameWithFind: string,
        @Res() res: Response
    ) {

        this.logger.log(`getProfileByUsername: ${usernameWithFind}`)

        const result = await this.userService.findOneByUsername(usernameWithFind)
        this.logger.log(`getProfileByUsername result: ${result}`)
        if(!result) {
            res.status(404);
            res.send("사용자를 찾을수 없습니다.")
        } else {
            const userObject = result.toObject();

            const { passwordHash, __v, ...userProfile } = userObject

            res.status(200).send(userProfile);
        }
    }
    // ADMIN만 사용자 역할 변경 가능
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Put('users/:username/roles')
    @HttpCode(HttpStatus.OK)
    async updateUserRoles(
        @Param('username') usernameToUpdate: string,
        @Body('roles') newRoles: Role[],
        @Request() req, // req.user는 현재 요청을 보낸 ADMIN 사용자
    ) {

        this.logger.log("updateUserRoles: ", usernameToUpdate, newRoles)

        return this.userService.assignRoles(usernameToUpdate, newRoles);
    }

}
