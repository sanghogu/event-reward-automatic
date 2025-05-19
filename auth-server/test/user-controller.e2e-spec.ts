// auth-server/test/users.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import  { disconnect, Model, Types } from 'mongoose';
import { User, UserDocument } from '../src/schema/user.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Role } from '../src/common/enums/role.enum';
import { CreateUserDto } from '../src/auth/dto/create-user.dto';
import { hashPassword } from '../src/common/utils/bcrypt.utils';

describe('UsersController (e2e)', () => {
    let app: INestApplication;
    let userModel: Model<UserDocument>;

    let adminUserId: string;
    const adminUserRoles = "ADMIN"

    let testUserId: string;
    const testUserRoles = "USER";

    const adminUsernameForTest = 'e2e_admin_for_users_ctrl';
    const testUsernameForTest = 'e2e_user_for_users_ctrl';

    const createUsernameForTest = "newe2euser_ctrl_unique";


    //시작전 이전 DB 유저 초기화 및 기본 유저 생성
    // 혹시모르니 기본 계쩡 있는지 유효성검사
    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();

        userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
        await userModel.deleteMany({username: {$in: [adminUsernameForTest, testUsernameForTest, createUsernameForTest]}});

        let admin = await userModel.findOne({ username: adminUsernameForTest }).exec();
        if (!admin) {
            const pass = 'admin123';
            const passHash = await hashPassword(pass);
            admin = await userModel.create({ username: adminUsernameForTest, passwordHash: passHash, roles: [Role.ADMIN] });
            console.log(`E2E Test: Created admin user ${admin.username}`);
        }
        adminUserId = admin._id.toString();
        let user = await userModel.findOne({ username: testUsernameForTest }).exec();
        if (!user) {
            const pass = 'user123';
            const passHash = await hashPassword(pass);
            user = await userModel.create({ username: testUsernameForTest, passwordHash: passHash, roles: [Role.USER] });
            console.log(`E2E Test: Created test user ${user.username}`);
        }
        testUserId = user._id.toString();
    });

    //테스트 후 데이터 정리 로직 제거 및 ㅋ앱클로즈
    afterAll(async () => {
        await userModel.deleteMany({username: {$in: [adminUsernameForTest, testUsernameForTest, createUsernameForTest]}});
        await disconnect();
        await app.close();
    });

    describe('/users/register (POST)', () => {
        const newUserDto: CreateUserDto = { username: createUsernameForTest, password: 'password123', roles: [Role.USER] }; // username을 고유하게 변경

        it('회원 가입 success', () => {
            return request(app.getHttpServer())
                .post('/users/register')
                .set('x-user-id', adminUserId)
                .set('x-user-roles', adminUserRoles)
                .send(newUserDto)
                .expect(HttpStatus.CREATED)
                .then((res) => {
                    expect(res.body.username).toEqual(newUserDto.username);
                    expect(res.body).not.toHaveProperty('passwordHash');
                });
        });

        it('회원가입 권한 없을때', () => {
            const userAttemptDto: CreateUserDto = { username: 'user_attempt_register', password: 'password123', roles: [Role.USER] };
            return request(app.getHttpServer())
                .post('/users/register')
                .set('x-user-id', testUserId)
                .set('x-user-roles', testUserRoles)
                .send(userAttemptDto)
                .expect(HttpStatus.FORBIDDEN);
        });

        it('중복된 username 가입신청 (beforeAll에서 생성된 사용자)', async () => {
            const existingUserDto: CreateUserDto = { username: testUsernameForTest, password: 'newpassword', roles: [Role.USER] };

            return request(app.getHttpServer())
                .post('/users/register')
                .set('x-user-id', adminUserId)
                .set('x-user-roles', adminUserRoles)
                .send(existingUserDto)
                .expect(HttpStatus.CONFLICT);
        });
    });

    describe('/users/me (GET)', () => {
        it('로그인한 유저 정보 조회', () => {
            return request(app.getHttpServer())
                .get('/users/me')
                .set('x-user-id', testUserId)
                .set('x-user-roles', testUserRoles)
                .expect(HttpStatus.OK)
                .then((res) => {
                    expect(res.body._id).toEqual(testUserId);
                    expect(res.body.username).toEqual(testUsernameForTest);
                });
        });

        it('토큰없는 인증 계정 조회', () => {
            return request(app.getHttpServer())
                .get('/users/me')
                .set('x-user-roles', testUserRoles)
                .expect(HttpStatus.UNAUTHORIZED);
        });
    });

    describe('/users/:username (GET)', () => {
        it('특정 유저 조회 성공', () => {
            return request(app.getHttpServer())
                .get(`/users/${testUsernameForTest}`)
                .set('x-user-id', adminUserId)
                .set('x-user-roles', adminUserRoles)
                .expect(HttpStatus.OK)
                .then((res) => {
                    expect(res.body.username).toEqual(testUsernameForTest);
                });
        });

        it('특정 유저조회 권한 없을경ㅇ', () => {
            return request(app.getHttpServer())
                .get(`/users/${adminUsernameForTest}`)
                .set('x-user-id', testUserId)
                .set('x-user-roles', testUserRoles)
                .expect(HttpStatus.FORBIDDEN);
        });

        it('존재하지않는 유저 조회', () => {
            return request(app.getHttpServer())
                .get(`/users/nonexistinguser12345`)
                .set('x-user-id', adminUserId)
                .set('x-user-roles', adminUserRoles)
                .expect(HttpStatus.NOT_FOUND);
        });
    });

    describe('/users/:username/roles (PUT)', () => {
        it('유저 권한 수정 성공', async () => {

            const newRoles = { roles: [Role.ADMIN, Role.OPERATOR] };
            // 테스트 실행 시마다 다른 사용자를 대상으로 하거나, 역할을 원래대로 돌려놓는 로직이 필요할 수 있음
            // 여기서는 testUsernameForTest 사용자의 역할을 변경
            await request(app.getHttpServer())
                .put(`/users/${testUsernameForTest}/roles`)
                .set('x-user-id', adminUserId)
                .set('x-user-roles', adminUserRoles)
                .send(newRoles)
                .expect(HttpStatus.OK);
            const updatedUser = await userModel.findOne({ username: testUsernameForTest }).exec();

            expect(updatedUser?.roles).toEqual(expect.arrayContaining(newRoles.roles));
        });

        it('유저 권한 수정 요청 권한 부족 실패', async () => {

            await userModel.updateOne({_id: testUserId}, {$set: {roles: [Role.USER]}}).exec();

            const newRoles = { roles: [Role.ADMIN] };
            return request(app.getHttpServer())
                .put(`/users/${testUsernameForTest}/roles`)
                .set('x-user-id', testUserId)
                .set('x-user-roles', testUserRoles)
                .send(newRoles)
                .expect(HttpStatus.FORBIDDEN);
        });
    });
});
