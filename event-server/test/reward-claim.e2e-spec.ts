import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { disconnect, Model, Types } from 'mongoose';
import { Event, EventDocument } from '../src/schema/event.schema';
import { Reward, RewardDocument } from '../src/schema/reward.schema';
import { RewardClaim, RewardClaimDocument } from '../src/schema/reward-claim.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Role } from '../src/common/enums/role.enum';
import { RewardType } from '../src/common/enums/reward-type.enum';
import { ClaimStatus } from '../src/common/enums/claim-status.enum';
import { EventService } from '../src/event/event.service';

describe('RewardClaimsController (e2e)', () => {
    let app: INestApplication;
    let eventModel: Model<EventDocument>;
    let rewardModel: Model<RewardDocument>;
    let rewardClaimModel: Model<RewardClaimDocument>;
    let eventService: EventService;

    const normalUserId = new Types.ObjectId().toString();
    const normalUserRoles = 'USER';

    const adminUserId = new Types.ObjectId().toString();
    const adminUserRoles = 'ADMIN';

    const auditorUserId = new Types.ObjectId().toString();
    const auditorUserRoles = 'AUDITOR';


    let testEventIdForAllow: string;
    let testRewardIdForAllow: string;
    let testEventIdForReject: string;
    let testRewardIdForReject: string;
    let createdClaimIdForNormalUser: string;

    const createEventAllow = 'Event for Claims E2E Test';
    const createRewardFowAllow = 'Claim Test E2E Reward';
    const createEventReject = 'Event for Claims E2E Test';
    const createRewardForReject = 'Claim Test E2E Reward';

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
        await app.init();

        eventModel = app.get<Model<EventDocument>>(getModelToken(Event.name));
        rewardModel = app.get<Model<RewardDocument>>(getModelToken(Reward.name));
        rewardClaimModel = app.get<Model<RewardClaimDocument>>(getModelToken(RewardClaim.name));
        eventService = app.get<EventService>(EventService);

        await eventModel.deleteMany({
            name: {$in: [createEventAllow, createEventReject]},
        });
        await rewardModel.deleteMany({
            name: {$in: [createRewardFowAllow, createRewardForReject]},
        });
        await rewardClaimModel.deleteMany({});

        const event = await eventModel.create({
            name: createEventAllow,
            condition: { type: 'claim_test_condition_e2e', allow: true },
            startDate: new Date(),
            endDate: new Date('2029-05-05'),
            status: 'ACTIVE',
            isActive: true,
        });
        testEventIdForAllow = String(event._id);
        const rewardAllow = await rewardModel.create({
            eventId: event._id,
            name: createRewardFowAllow,
            type: RewardType.POINT,
            details: { value: 50 },
            quantity: 1,
        });
        testRewardIdForAllow = String(rewardAllow._id);

        const eventReject = await eventModel.create({
            name: createEventReject,
            condition: { type: 'claim_test_condition_e2e', allow: false },
            startDate: new Date(),
            endDate: new Date('2029-05-05'),
            status: 'ACTIVE',
            isActive: true,
        });
        testEventIdForReject = String(eventReject._id);
        const rewardReject = await rewardModel.create({
            eventId: eventReject._id,
            name: createRewardForReject,
            type: RewardType.POINT,
            details: { value: 50 },
            quantity: 1,
        });
        testRewardIdForReject = String(rewardReject._id);

        jest.spyOn(eventService, 'checkEventCondition').mockImplementation(async (userId, eventDoc) => {
            const condition = eventDoc.condition as any;
            //퀘스트 조건은 condition 의 allow 값따라 허용 비허용 결정
            return condition.type === 'claim_test_condition_e2e' && condition.allow === true;
        });
    });

    afterAll(async () => {
        await eventModel.deleteMany({
            name: {$in: [createEventAllow, createEventReject]},
        });
        await rewardModel.deleteMany({
            name: {$in: [createRewardFowAllow, createRewardForReject]},
        });
        await rewardClaimModel.deleteMany({});
        await disconnect();
        await app.close();
    });

    describe('/reward-claims (POST)', () => {


        it('보상 지급 요청 성공', async () => {

            const createClaimDto = {
                eventId: testEventIdForAllow,
                rewardId: testRewardIdForAllow,
            };

            return request(app.getHttpServer())
                .post('/reward-claims')
                .set('x-user-id', normalUserId)
                .set('x-user-roles', normalUserRoles)
                .send(createClaimDto)
                .expect(HttpStatus.CREATED)
                .then((res) => {
                    expect(res.body.eventId).toEqual(testEventIdForAllow);
                    expect(res.body.rewardId).toEqual(testRewardIdForAllow);
                    expect(res.body.userId).toEqual(normalUserId);
                    expect(res.body.status).toEqual(ClaimStatus.PAID);
                    createdClaimIdForNormalUser = res.body._id; //생성된 클레임 ID 저장
                });
        });
        it('보상 지급 요청 실패 (퀘스트 미충족)', async () => {

            const createClaimDto = {
                eventId: testEventIdForReject,
                rewardId: testRewardIdForReject,
            };

            return request(app.getHttpServer())
                .post('/reward-claims')
                .set('x-user-id', normalUserId)
                .set('x-user-roles', normalUserRoles)
                .send(createClaimDto)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('보상 지급 요청 중복 실패', async () => {

            const createClaimDto = {
                eventId: testEventIdForAllow,
                rewardId: testRewardIdForAllow,
            };

            const claim = rewardClaimModel.find({eventId: new Types.ObjectId(testEventIdForAllow), rewardId: new Types.ObjectId(testRewardIdForAllow), userId: normalUserId});

            //위에서 생성된 클레임 ID를 사용하거나 없다면 여기서 다시 클레임을 생성 복원성
            if(!claim) {
                const firstResponse = await request(app.getHttpServer())
                    .post('/reward-claims')
                    .set('x-user-id', normalUserId)
                    .set('x-user-roles', normalUserRoles)
                    .send(createClaimDto)
                    .expect(HttpStatus.CREATED);
                createdClaimIdForNormalUser = firstResponse.body._id; // ID 저장
            }

            // 동일한 요청 다시 시도
            return request(app.getHttpServer())
                .post('/reward-claims')
                .set('x-user-id', normalUserId)
                .set('x-user-roles', normalUserRoles)
                .send(createClaimDto)
                .expect(HttpStatus.CONFLICT);
        });

        it('Reject건 보상 중복 지급 요청시 409가 아닌 400 실패', async () => {

            const createClaimDto = {
                eventId: testEventIdForReject,
                rewardId: testRewardIdForReject,
            };

            const claim = rewardClaimModel.find({eventId: new Types.ObjectId(testEventIdForReject), rewardId: new Types.ObjectId(testRewardIdForReject), userId: normalUserId});

            if(!claim) {
                const firstResponse = await request(app.getHttpServer())
                    .post('/reward-claims')
                    .set('x-user-id', normalUserId)
                    .set('x-user-roles', normalUserRoles)
                    .send(createClaimDto)
                    .expect(HttpStatus.BAD_REQUEST);
            }

            // 동일한 요청 다시 시도
            return request(app.getHttpServer())
                .post('/reward-claims')
                .set('x-user-id', normalUserId)
                .set('x-user-roles', normalUserRoles)
                .send(createClaimDto)
                .expect(HttpStatus.BAD_REQUEST);
        });
    });

    describe('/reward-claims/me (GET)', () => {
        it('USER 내 클레임 확인 성공', async () => {

            return request(app.getHttpServer())
                .get('/reward-claims/me')
                .set('x-user-id', normalUserId)
                .set('x-user-roles', normalUserRoles)
                .expect(HttpStatus.OK)
                .then((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThan(0);
                });
        });
    });

    describe('/reward-claims (GET)', () => {
        it('어드민 전체 클레임 조회', async () => {

            return request(app.getHttpServer())
                .get('/reward-claims')
                .set('x-user-id', adminUserId)
                .set('x-user-roles', adminUserRoles)
                .expect(HttpStatus.OK)
                .then((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThan(0);
                });
        });

        it('어드민 전체 클레임 조회 (이벤트 필터링)', async () => {

            return request(app.getHttpServer())
                .get('/reward-claims')
                .set('x-user-id', adminUserId)
                .set('x-user-roles', adminUserRoles)
                .query({ eventId: testEventIdForAllow })
                .expect(HttpStatus.OK)
                .then((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    const foundClaim = res.body.find(c => c.eventId._id === testEventIdForAllow);
                    expect(foundClaim).toBeDefined();
                });
        });
    });

    describe('/reward-claims/:id (GET)', () => {
        it('ADMIN 특정 클레임 조회 성공', async () => {
            expect(createdClaimIdForNormalUser).toBeDefined();
            return request(app.getHttpServer())
                .get(`/reward-claims/${createdClaimIdForNormalUser}`)
                .set('x-user-id', adminUserId) // ADMIN으로 요청
                .set('x-user-roles', adminUserRoles)
                .expect(HttpStatus.OK)
                .then((res) => {
                    expect(res.body._id).toEqual(createdClaimIdForNormalUser);
                });
        });

        it('AUDITOR 특정 클레임 조회 성공', async () => {

            return request(app.getHttpServer())
                .get(`/reward-claims/${createdClaimIdForNormalUser}`)
                .set('x-user-id', auditorUserId) // AUDITOR로 요청
                .set('x-user-roles', auditorUserRoles)
                .expect(HttpStatus.OK)
                .then((res) => {
                    expect(res.body._id).toEqual(createdClaimIdForNormalUser);
                });
        });

        it('USER 특정 클레임 조회 실패', async () => {
            expect(createdClaimIdForNormalUser).toBeDefined();

            return request(app.getHttpServer())
                .get(`/reward-claims/${createdClaimIdForNormalUser}`)
                .set('x-user-id', normalUserId) // USER로 요청
                .set('x-user-roles', normalUserRoles)
                .expect(HttpStatus.FORBIDDEN); // Gateway 설정에 따라 ADMIN, AUDITOR만 허용
        });

        it('존재하지않는 클레임 조회 404', () => {
            const nonExistentClaimId = new Types.ObjectId().toString();
            return request(app.getHttpServer())
                .get(`/reward-claims/${nonExistentClaimId}`)
                .set('x-user-id', adminUserId)
                .set('x-user-roles', adminUserRoles)
                .expect(HttpStatus.NOT_FOUND);
        });
    });
});
