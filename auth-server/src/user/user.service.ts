import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleInit
} from '@nestjs/common';
import {InjectModel} from "@nestjs/mongoose";
import {User, UserDocument} from "../schema/user.schema";
import {Model, Types} from "mongoose";
import {ConfigService} from "@nestjs/config";
import {CreateUserDto} from "../auth/dto/create-user.dto";
import {Role} from "../common/enums/role.enum";
import {hashPassword} from "../common/utils/bcrypt.utils";

@Injectable()
export class UserService implements OnModuleInit {

    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private readonly config: ConfigService,
    ) {
    }

    async onModuleInit() {
        await this.createDefaultAdmin();
        await this.createDefaultUser();
    }

    private async createDefaultAdmin() {
        const adminUsername = 'admin';
        const existingAdmin = await this.userModel.findOne({ username: adminUsername });
        if (!existingAdmin) {
            const adminPassword = 'admin'
            const hashedPassword = await hashPassword(adminPassword);
            const adminUser = new this.userModel({
                username: adminUsername,
                passwordHash: hashedPassword,
                roles: [Role.ADMIN],
            });
            await adminUser.save();
            console.log('Default admin user created.');
        }
    }

    private async createDefaultUser() {
        const username = 'test';
        const existingAdmin = await this.userModel.findOne({ username: username });
        if (!existingAdmin) {
            const password = 'test'
            const hashedPassword = await hashPassword(password);
            const defaultUser = new this.userModel({
                username: username,
                passwordHash: hashedPassword,
                roles: [Role.USER],
            });
            await defaultUser.save();
            console.log('Default user created.');
        }
    }

    async create(createUserDto: CreateUserDto) {
        const { username, password, roles } = createUserDto;
        const existingUser = await this.findOneByUsername(username);
        console.log(existingUser)
        if (existingUser) {
            throw new ConflictException('이미 사용 중인 유저명입니다.');
        }

        const hashedPassword = await hashPassword(password);

        const newUser = new this.userModel({
            username,
            passwordHash: hashedPassword,
            roles: roles && roles.length > 0 ? this.validateRoles(roles) : [Role.USER],
        });

        const savedUser = await newUser.save();

        const { passwordHash, ...result } = savedUser.toObject();
        console.log(result)
        return result as Omit<UserDocument, 'passwordHash'>;
    }

    async findOneByUsername(username: string): Promise<UserDocument | null> {
        this.logger.log(`Finding user by username: ${username}`);
        return this.userModel.findOne({ username: username.toLowerCase() }).exec();
    }

    async findById(id: string): Promise<UserDocument | null> {

        const userIdObj = new Types.ObjectId(id);

        try {
            const result = await this.userModel.findById(new Types.ObjectId(userIdObj)).exec();
            return result;
        } catch (e) {
            return null;
        }
    }

    async assignRoles(username: string, newRoles: Role[]): Promise<boolean> {
        const user = await this.findOneByUsername(username);
        if (!user) {
            throw new NotFoundException('사용자를 찾을 수 없습니다.');
        }
        user.roles = this.validateRoles(newRoles);
        const updatedUser = await user.save();

        const result = updatedUser.toObject();
        return true;
    }

    private validateRoles(roles: string[]): Role[] {
        const validRoles: Role[] = [];
        for (const role of roles) {
            if (Object.values(Role).includes(role as Role)) {
                validRoles.push(role as Role);
            } else {
                throw new BadRequestException(`잘못된 역할이 포함되어 있습니다: ${role}`);
            }
        }
        if (validRoles.length === 0) {
            throw new BadRequestException('하나 이상의 유효한 역할이 필요합니다.');
        }
        return [...new Set(validRoles)]; // 중복 제거
    }
}
