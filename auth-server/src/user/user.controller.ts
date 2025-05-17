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
import {CreateUserDto} from "../auth/dto/create-user.dto";
import {UserService} from "./user.service";
import {RolesGuard} from "../common/guards/roles.guard";
import {Roles} from "../common/decorators/roles.decorator";
import {Role} from "../common/enums/role.enum";
import {Response} from "express";
import {GatewayGuard} from "../gateway/gateway.guard";

@Controller('users')
export class UserController {

    private readonly logger = new Logger(UserController.name);

    constructor(private readonly userService: UserService) {
    }

    @Post("register")
    @HttpCode(201)
    async register(@Body() createUserDto: CreateUserDto) {

        this.logger.log("register: ", createUserDto)

        return this.userService.create(createUserDto);
    }

    @UseGuards(GatewayGuard)
    @Get('me')
    getProfile(@Request() req) {
        const { passwordHash, __v, ...userProfile } = req.user.toObject(); // req.user가 UserDocument 인스턴스라고 가정
        return userProfile;
    }

    // ADMIN만 사용자명으로 조회 가능
    @UseGuards(GatewayGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Get(':username')
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
    @UseGuards(GatewayGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Put(':username/roles')
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
