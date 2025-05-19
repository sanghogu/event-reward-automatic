import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { disconnect, Model, Types } from 'mongoose';
import { Event, EventDocument } from '../src/schema/event.schema';
import { getModelToken } from '@nestjs/mongoose';
import { EventStatus } from '../src/common/enums/event-status.enum';

describe('EventController (e2e)', () => {
    let app: INestApplication;
    let eventModel: Model<EventDocument>;

    const operatorUserId = new Types.ObjectId().toString();
    const operatorUserRoles = "OPERATOR";
    const adminUserId = new Types.ObjectId().toString();
    const adminUserRoles = "ADMIN";
    const normalUserId = new Types.ObjectId().toString();
    const normalUserRoles = "USER";

    let createdEventId: string;

    const createEventName = "e2e test event";
    const updateEventName = "e2e test event update";

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        eventModel = moduleFixture.get<Model<EventDocument>>(getModelToken(Event.name));

        await eventModel.deleteMany({name: {$in: [updateEventName, createEventName]}});
    });

    afterAll(async () => {
        await eventModel.deleteMany({name: {$in: [updateEventName, createEventName]}});
        await disconnect();
        await app.close();
    });

    describe('/events (POST)', () => {
        const createEventDto = {
            name: createEventName,
            description: 'Event for e2e desc',
            condition: { type: 'testCondition', value: 1 },
            startDate: '2025-01-01',
            endDate: '2026-01-31',
            status: EventStatus.ACTIVE,
            isActive: true,
        };

        it('이벤트 생성 성공', () => {
            return request(app.getHttpServer())
                .post('/events') // Event Server 내부 경로 사용
                .set('x-user-id', operatorUserId)
                .set('x-user-roles', operatorUserRoles)
                .send(createEventDto)
                .expect(HttpStatus.CREATED)
                .then((res) => {
                    expect(res.body.name).toEqual(createEventDto.name);
                    createdEventId = res.body._id;
                });
        });

        it('이벤트 생성 실패 유저권한', () => {
            return request(app.getHttpServer())
                .post('/events')
                .set('x-user-id', normalUserId)
                .set('x-user-roles', normalUserRoles)
                .send(createEventDto)
                .expect(HttpStatus.FORBIDDEN);
        });
    });

    describe('/events (GET)', () => {
        it('전체 이벤트 조회', async () => {
            //만약 이전 케이스에서 이벤트 생성 안됐어도 테스트 영향없게
            if (!createdEventId) {
                const event = await eventModel.create({
                    name: createEventName,
                    condition: { type: 'get_all_e2e' },
                    startDate: new Date('2025-02-01'),
                    endDate: new Date('2026-02-28'),
                    status: EventStatus.ACTIVE,
                    isActive: true,
                });
                createdEventId = String(event._id);
            }

            return request(app.getHttpServer())
                .get('/events')
                .set('x-user-id', operatorUserId)
                .set('x-user-roles', operatorUserRoles)
                .expect(HttpStatus.OK)
                .then((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThanOrEqual(1);
                });
        });
    });

    describe('/events/:id (GET)', () => {
        it('특정 이벤트 조회 성공', () => {
            expect(createdEventId).toBeDefined();
            return request(app.getHttpServer())
                .get(`/events/${createdEventId}`)
                .set('x-user-id', operatorUserId)
                .set('x-user-roles', operatorUserRoles)
                .expect(HttpStatus.OK)
                .then((res) => {
                    expect(res.body._id).toEqual(createdEventId);
                });
        });

        it('특정 이벤트 404', () => {
            const notfoundId = new Types.ObjectId().toString();
            return request(app.getHttpServer())
                .get(`/events/${notfoundId}`)
                .set('x-user-id', operatorUserId)
                .set('x-user-roles', operatorUserRoles)
                .expect(HttpStatus.NOT_FOUND);
        });
    });

    describe('/events/:id (PUT)', () => {
        const updateEventDto = {
            name: updateEventName,
            status: EventStatus.INACTIVE,
        };

        it('업데이트 성공', () => {
            expect(createdEventId).toBeDefined();
            return request(app.getHttpServer())
                .put(`/events/${createdEventId}`)
                .set('x-user-id', adminUserId)
                .set('x-user-roles', adminUserRoles)
                .send(updateEventDto)
                .expect(HttpStatus.OK)
                .then((res) => {
                    expect(res.body.name).toEqual(updateEventDto.name);
                    expect(res.body.status).toEqual(EventStatus.INACTIVE);
                });
        });

        it('업데이트 실패 권한 부족', () => {
            expect(createdEventId).toBeDefined();
            return request(app.getHttpServer())
                .put(`/events/${createdEventId}`)
                .set('x-user-id', normalUserId)
                .set('x-user-roles', normalUserRoles)
                .send(updateEventDto)
                .expect(HttpStatus.FORBIDDEN);
        });
    });
});
