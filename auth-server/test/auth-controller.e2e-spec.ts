import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { disconnect, Model } from 'mongoose';
import { User, UserDocument } from '../src/schema/user.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Role } from '../src/common/enums/role.enum';
import { hashPassword } from '../src/common/utils/bcrypt.utils';

describe('AuthController(e2e)', () => {
  let app: INestApplication;
  let userModel: Model<UserDocument>;

  const adminUsernameForTest = 'e2e_admin_auth_ctrl';
  const testUsernameForTest = 'e2e_testuser_auth_ctrl';

  //시작전 이전 DB 유저 초기화 및 기본 유저 생성
  // 혹시모르니 기본 계쩡 있는지 유효성검사
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
    await userModel.deleteMany({username: {$in: [adminUsernameForTest, testUsernameForTest]}});

    // 테스트용 관리자 계정 확인 또는 생성
    let admin = await userModel.findOne({ username: adminUsernameForTest }).exec();
    if (!admin) {
      const pwd = 'adminpass';
      const pwdHash = await hashPassword(pwd);
      admin = await userModel.create({
        username: adminUsernameForTest,
        passwordHash: pwdHash,
        roles: [Role.ADMIN],
      });
      console.log(`E2E Auth Test: Created admin user ${admin.username}`);
    }

    let user = await userModel.findOne({ username: testUsernameForTest }).exec();
    if (!user) {
      const pwd = 'testpass';
      const pwdHash = await hashPassword(pwd);
      user = await userModel.create({
        username: testUsernameForTest,
        passwordHash: pwdHash,
        roles: [Role.USER],
      });
      console.log(`E2E Auth Test: Created test user ${user.username}`);
    }
  });

  //테스트 후 데이터 정리 로직 제거 및 ㅋ앱클로즈
  afterAll(async () => {
    await userModel.deleteMany({username: {$in: [adminUsernameForTest, testUsernameForTest]}});
    await disconnect();
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('JWT 발급 성공', async () => {
      const loginDto = { username: testUsernameForTest, password: 'testpass' };
      return request(app.getHttpServer())
          .post('/auth/login')
          .send(loginDto)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('access_token');
            expect(res.body.user.username).toEqual(loginDto.username);
          });
    });

    it('JWT 인증정보 누락 401', () => {
      const loginDto = { username: testUsernameForTest, password: 'wrongpassword' };
      return request(app.getHttpServer())
          .post('/auth/login')
          .send(loginDto)
          .expect(401);
    });
  });
});
