import { Role } from '../common/enums/role.enum';

//라우팅 타입
export interface RoutePermission {
    path: string;
    method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'|'ALL';
    roles: Role[];
}

export interface ServiceHealthStatus {
    lastSeen: Date;
    status: 'HEALTHY' | 'UNHEALTHY';
    consecutiveFailures: number; //헬스체크 시도 실패 횟수
}

export interface RegisteredServiceConfig extends ServiceConfig {
    id: string; //서비스 위한 고유 ID 예시:(serviceName-host-port)
    healthStatus?: ServiceHealthStatus; //서비스 상태
    registeredAt: Date;
}

export interface ServiceConfig {
    name: string;
    url: string; // 대상 서비스의 기본 URL
    prefix: string; // 이 prefix로 시작하는 요청을 해당 서비스로 라우팅
    // 각 경로별 세부 권한 설정 (prefix 이후의 경로)
    permissions?: RoutePermission[];
    // 이 서비스의 모든 경로에 적용될 기본 권한 (permissions에 명시되지 않은 경우)
    defaultRoles?: Role[];
    healthCheckPath?: string; // 서비스 건강 체크를 위한 경로 (예: '/health')
}

//초기 정적 서비스 목록
export const staticServiceRegistry = (): ServiceConfig[] => [
    {
        name: 'AuthService',
        url: process.env.DEFAULT_AUTH_SERVICE_URL!,
        prefix: '/auth-service', //auth 로 시작하는 url은 기본적으로 여기로
        healthCheckPath: '/health', // 각 서비스는 이 경로에 대해 200 OK를 반환해야 함
        permissions: [
            { path: '/auth/login', method: 'POST', roles: [Role.PUBLIC] }, // 로그인은 누구나 가능
            { path: '/users/register', method: 'POST', roles: [Role.PUBLIC] }, //사용자 등록은 우선 공개해둠 추후 ADMIN 교체 권고함
            { path: '/users/me', method: 'GET', roles: [Role.USER, Role.OPERATOR, Role.AUDITOR, Role.ADMIN] }, //인증된 모든 사용자
            { path: '/users/:username', method: 'GET', roles: [Role.ADMIN] }, // 또는 본인 확인 로직 추가
            { path: '/users/:username/roles', method: 'PUT', roles: [Role.ADMIN] },
        ],
        defaultRoles: [Role.ADMIN], //기본적으로 ADMIN만 허용 (위 permissions에 없으면)
    },
];