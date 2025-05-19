import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { disconnect, Model, Types } from 'mongoose';
import { Event, EventDocument } from '../src/schema/event.schema';
import { Reward, RewardDocument } from '../src/schema/reward.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Role } from '../src/common/enums/role.enum';
import { RewardType } from '../src/common/enums/reward-type.enum';

describe('RewardsController (e2e)', () => {
    let app: INestApplication;
    let eventModel: Model<EventDocument>;
    let rewardModel: Model<RewardDocument>;

    const operatorUserId = new Types.ObjectId().toString();
    const operatorUserRoles = 'OPERATOR';

    const normalUserId = new Types.ObjectId().toString();
    const normalUserRoles = 'USER';

    let testEventId: string;
    let createdRewardId: string;

    const createEventName= 'Event for reward E2E Test'
    const createRewardName = 'E2E Test Reward - Points';
    const updateRewardName = 'Updated E2E Reward Name';

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        // Event Server의 main.ts에서 setGlobalPrefix를 사용하지 않는다고 가정
        app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
        await app.init();

        eventModel = app.get<Model<EventDocument>>(getModelToken(Event.name));
        rewardModel = app.get<Model<RewardDocument>>(getModelToken(Reward.name));

        await eventModel.deleteMany({name: createEventName});
        await rewardModel.deleteMany({name: {$in: [createRewardName, updateRewardName]}});

        // 테스트용 이벤트 생성
        const event = await eventModel.create({
            name: createEventName,
            condition: { type: 'test_reward_event_condition' },
            startDate: new Date('2025-03-01'),
            endDate: new Date('2025-03-31'),
            status: 'ACTIVE',
            isActive: true,
        });
        testEventId = String(event._id);
    });

    afterAll(async () => {
        await eventModel.deleteMany({name: createEventName});
        await rewardModel.deleteMany({name: {$in: [createRewardName, updateRewardName]}});
        await disconnect();
        await app.close();
    });

    describe('/rewards (POST)', () => {
        const createRewardDto = {
            eventId: '',
            name: createRewardName,
            type: RewardType.POINT,
            details: { value: 100 },
            quantity: 1,
        };
        beforeAll(()=> {
            createRewardDto.eventId = testEventId;
        })

        it('Operator 리워드 생성 성공', () => {
            return request(app.getHttpServer())
                .post('/rewards') // 경로 수정
                .set('x-user-id', operatorUserId)
                .set('x-user-roles', operatorUserRoles)
                .send(createRewardDto)
                .expect(HttpStatus.CREATED)
                .then((res) => {
                    expect(res.body.name).toEqual(createRewardDto.name);
                    expect(res.body.eventId).toEqual(testEventId);
                    createdRewardId = res.body._id;
                });
        });

        it('Admin 리워드 생성 성공', () => {
            return request(app.getHttpServer())
                .post('/rewards') // 경로 수정
                .set('x-user-id', operatorUserId)
                .set('x-user-roles', operatorUserRoles)
                .send(createRewardDto)
                .expect(HttpStatus.CREATED)
                .then((res) => {
                    expect(res.body.name).toEqual(createRewardDto.name);
                    expect(res.body.eventId).toEqual(testEventId);
                    createdRewardId = res.body._id;
                });
        });

        it('User 리워드 생성 실패', () => {
            return request(app.getHttpServer())
                .post('/rewards') // 경로 수정
                .set('x-user-id', normalUserId)
                .set('x-user-roles', normalUserRoles)
                .send(createRewardDto)
                .expect(HttpStatus.FORBIDDEN);
        });
    });

    describe('/rewards (GET)', () => {
        it('Operator 전체 리워드 목록 조회 성공', async () => {
            if (!createdRewardId) {//이전 케이스에서 만약 보상 생성안됐다면 테케 영향없게 다시 생성
                await rewardModel.create({ eventId: testEventId, name: createRewardName, type: RewardType.ITEM, details: {itemId: 'item_e2e_get'}, quantity: 11});
            }
            return request(app.getHttpServer())
                .get('/rewards')
                .query({ eventId: testEventId })
                .set('x-user-id', operatorUserId)
                .set('x-user-roles', operatorUserRoles)
                .expect(HttpStatus.OK)
                .then((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThanOrEqual(1);
                    expect(res.body.every(r => r.eventId === testEventId)).toBe(true);
                });
        });
        it('User 전체 리워드 목록 조회 실패', async () => {
            if (!createdRewardId) {//이전 케이스에서 만약 보상 생성안됐다면 테케 영향없게 다시 생성
                await rewardModel.create({ eventId: testEventId, name: createRewardName, type: RewardType.ITEM, details: {itemId: 'item_e2e_get'}, quantity: 11});
            }
            return request(app.getHttpServer())
                .get('/rewards')
                .set('x-user-id', normalUserId)
                .set('x-user-roles', normalUserId)
                .expect(HttpStatus.FORBIDDEN);
        });
    });

    describe('/rewards/:id (GET)', () => { // 경로에서 /event-service 제거
        it('Operator 특정 리워드 조회 성공', () => {
            expect(createdRewardId).toBeDefined(); // POST 테스트에서 생성된 ID 사용
            return request(app.getHttpServer())
                .get(`/rewards/${createdRewardId}`) // 경로 수정
                .set('x-user-id', operatorUserId)
                .set('x-user-roles', operatorUserRoles)
                .expect(HttpStatus.OK)
                .then((res) => {
                    expect(res.body._id).toEqual(createdRewardId);
                });
        });
        it('User 특정 리워드 조회 실패', () => {
            expect(createdRewardId).toBeDefined(); // POST 테스트에서 생성된 ID 사용
            return request(app.getHttpServer())
                .get(`/rewards/${createdRewardId}`) // 경로 수정
                .set('x-user-id', normalUserId)
                .set('x-user-roles', normalUserRoles)
                .expect(HttpStatus.FORBIDDEN);
        });
    });

    describe('/rewards/:id (PUT)', () => {
        const updateRewardDto = {
            name: updateRewardName,
            details: { value: 250 },
        };
        it('Operator 특정 리워드 업데이트 성공', () => {
            expect(createdRewardId).toBeDefined();
            return request(app.getHttpServer())
                .put(`/rewards/${createdRewardId}`) // 경로 수정
                .set('x-user-id', operatorUserId)
                .set('x-user-roles', operatorUserRoles)
                .send(updateRewardDto)
                .expect(HttpStatus.OK)
                .then((res) => {
                    expect(res.body.name).toEqual(updateRewardDto.name);
                    expect(res.body.details.value).toEqual(250);
                });
        });
        it('User 특정 리워드 업데이트 실패', () => {
            return request(app.getHttpServer())
                .put(`/rewards/${createdRewardId}`) // 경로 수정
                .set('x-user-id', normalUserId)
                .set('x-user-roles', normalUserRoles)
                .send(updateRewardDto)
                .expect(HttpStatus.FORBIDDEN);
        });
    });
});
