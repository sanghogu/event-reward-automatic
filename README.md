
## 이벤트 보상 시스템 (NestJS MSA)

## 시스템 아키텍처

3개의 서비스로 구성했습니다.
1.  **Gateway Server**:
    * 모든 API 요청의 진입점
    * 요청을 적절한 백엔드 서비스로 라우팅.
2.  **Auth Server**:
    * 사용자 정보 관리 (가입, 로그인, 정보 확인).
    * 역할(Role) 기반 접근 제어를 위한 사용자 역할 관리.
    * 로그인 성공 시 JWT 발급
    * Refresh 로직은 배제, Refresh 은 클라이언트 책임이 늘어나는데 Client 미존재함.
    * 역할 (4개):
        * `USER`: 보상 요청 가능. 자신의 요청 내역 조회.
        * `OPERATOR`: 이벤트 및 보상 등록/수정/조회. 전체 유저 요청 기록 조회 및 처리.
            * (쓰기 권한에는 읽기 권한 기본 포함 가정)
        * `AUDITOR`: 지급 내역(보상 요청 기록) 조회만 가능.
        * `ADMIN`: 모든 기능 접근 가능. 사용자 역할 관리, 서비스 등록 관리.
3.  **Event Server**:
    * 이벤트 생성, 조건 정의, 기간 설정, 상태 관리.
    * 이벤트에 따른 보상(포인트, 아이템, 쿠폰 등) 정의 및 수량 관리.
    * 사용자의 보상 요청 처리 (조건 검증, 중복 방지).
    * 보상 지급 요청 상태 저장 및 이력 관리.
    * (선택 사항) 필터 기능 통해 이벤트별, 상태별 등 사용자 진행 상황 추적.


모든 요청은 `service-registry` 모듈에 사전 구조된 형태로 `/auth-service...`, `event-service...` 형태로 Gateway를 통해 각 선별된 서비스로 전달됩니다.
Gateway는 인증된 사용자의 ID (`X-User-Id`)와 쉼표로 구분된 역할 (`X-User-Roles`)을 헤더에 담아 내부 서비스로 전달합니다.

---

## 구현 중 겪은 고민 및 설계 결정 사항

* **인증 및 인가 전략**:
    * **Gateway에서의 중앙 처리**: Gateway에서 모든 요청에 대해 JWT 유효성을 검증하고, 토큰에 담긴 사용자 역할을 기반으로 각 엔드포인트 접근 권한을 확인합니다.
    * **각각의 서비스로 사용자 정보 전달**: Gateway는 인증된 사용자의 ID와 역할을 커스텀 헤더(`X-User-Id`, `X-User-Roles`)에 담아 백엔드 서비스로 전달합니다. 백엔드 서비스는 이 헤더 정보를 신뢰하고 로직을 수행합니다.
* **서비스 디스커버리 및 라우팅 설정**:
    * **정적 설정 기반의 동적 확장 구조**: 서비스 디스커버리 도구(Eureka 등)를 사용할 수 없는 환경을 가정하여, Gateway Server의 `src/config/service-registry.config.ts` 파일에 서비스 정보를 정적으로 정의했습니다.
    * **확장성 고려**: 하지만 단순히 하드코딩하는 대신, `ServiceRegistryService` 클래스와 설정 파일(`service-registry.config.ts`) 구조를 통해 서비스 정보를 관리하도록 설계했습니다. 이렇게 설계한 이유는 향후 각 백엔드 서비스가 시작 시 Gateway의 특정 API 엔드포인트로 자신의 정보(URL, 권한 규칙 등)를 동적으로 등록하고, Gateway가 이 정보를 기반으로 라우팅 테이블을 관리하며 주기적인 Health Check를 수행하는 방식으로 쉽게 확장할 수 있도록 하기 위함입니다. 즉, 현재는 정적 데이터를 사용하지만,
      동적 서비스 등록 및 관리를 위한 기반 구조를 염두하여 설계했습니다.
* **에러 핸들링**: DTO를 통한 요청 유효성 검사를 수행하도록 했습니다. 각 서비스 및 Gateway에서 발생하는 예외에 대해 적절한 HTTP 응답코드와 적절한오류 메시지를 반환하도록 노력했습니다.
* **헬스체크**: 유동적이지 않은 서비스 구조로 HealthCheck 를 제외했지만 원래는 Gateway Server가 주기적으로 등록된 백엔드 서비스의 상태를 확인하여, `UNHEALTHY`로 판단된 서비스로는 요청을 라우팅하지 않도록 하는 기능을 포함하고자 했습니다. 각 백엔드 서비스는 간단한 `/health` 엔드포인트를 제공하여 자신의 상태를 알립니다.
* **단일 보상 요청 방식 채택 이유**:
    * 개발 중 이벤트에 연결된 모든 보상을 한 번의 요청으로 지급하는 방안도 고려했는데, 최종적으로는 사용자가 `eventId`와 함께 연결된 특정 `rewardId`를 명시하여 개별 보상을 요청하는 방식을 채택했습니다.
    * 메이플스토리에서 사용자가 여러 보상 항목 중 특정 항목을 선택하거나, 순차적으로 개별 보상을 수령하는 방식이 일반적이라는 점과 추후 일괄 처리 로직으로도 유연하게 대처될거같아 개별 보상으로 결정햇습니다.
    * 만약 일괄지급 기능이 필요하다면, 현재의 단일 보상 요청 API를 여러 번 호출하거나, 별도의 일괄 지급 API 엔드포인트를 추가로 구성하는 방식으로 확장할 수 있습니다.

---

## 보상 지급 로직 상세 설명

1.  **요청 접수 및 유효성 검사**: 사용자가 `/event-service/reward-claims`로 특정 이벤트(`eventId`)와 보상(`rewardId`)에 대해 요청합니다. Gateway는 인증된 `userId`를 Event Server로 전달합니다.
2.  **이벤트 및 보상 유효성 확인**: 요청된 이벤트가 `ACTIVE` 상태이고 기간이 유효한지, 요청된 `rewardId`의 보상이 해당 `eventId`에 연결된 것이 맞는지 확인합니다.
3.  **중복 요청 방지**: 동일 사용자가 동일 이벤트의 동일한 보상(`rewardId`)에 대해 이미 완료된(특정 상태 제외) 요청이 있는지 확인합니다.
4.  **이벤트 조건 달성 여부 검증**: `EventService.checkEventCondition`을 호출하여 사용자 조건 충족 여부를 검증합니다. 현재는 타입만 일치한다면 모두 허용 시키고있습니다. 실제 해당 로직의 완성은 각각의 퀘스트를 관장하는 서비스 모듈에서 진행해야합니다.
5.  **보상 요청 기록 생성 및 상태 처리**: 조건 충족 시, 신규 `RewardClaim` 을 몽고에 넣어주고 `claimedRewardDetails`에 보상 정보를 스냅샷으로 저장합니다. 현재는 자동 승인 및 지급으로 가정하여 상태를 `APPROVED` 후 즉시 `PAID`로 변경하고 `processedAt`을 기록합니다.
6.  **실제 보상 지급 연동**: `PAID` 상태가 되면 실제 별도의 보상 지급 시스템(포인트, 아이템 등)과의 연동이 필요합니다. 현재 프로젝트에서는 EventCondition 검사와 마찬가지로 지급으로 가정하고 넘어갑니다.
7.  **완성**: 처리된 `RewardClaim` 객체를 반환하고 끝납니다.

---

## 테스트 전략

1. **통합 테스트**:
    * 각 서비스(`auth-server`, `event-server`)는 자체적으로 E2E 테스트 갖고있습니다..
    * 이 테스트는 실제 데이터베이스 연결을 사용하며, HTTP 요청을통해 컨트롤러부터 서비스, 데이터베이스까지의 전체 흐름을 검증합니다.
    * Gateway에서 주입하는 `x-user-id`, `x-user-roles` 헤더를 가상으로 설정하여 서비스 간 인증/인가 흐름을 테스트합니다.
    * 각 테스트 실행 전(`beforeAll`)과 후(`afterAll`)에 테스트 데이터를 생성하고 정리합니다.
    * 본 테스트는 .env.test 프로파일로 실행되며 실행 시에는 root 폴더의 docker-compose.development.yml 을 up 시켜주세요.
    ```bash
        docker compose -f .\docker-compose.development.yml up -d
    ```
2. **수동 API 테스트 (API 클라이언트 사용)**:
    * 애플리케이션을 도커로 실행시켜줍니다. (하단 애플리케이션 실행 참고)
    * Postman과 같은 API 클라이언트를 사용하여 Gateway (`http://localhost:3000`)를 통해 API를 직접 호출하여 테스트합니다.
    * "기본 사용자 계정" (`admin/admin`, `test/test`)을 사용하여 로그인 후 JWT 토큰을 발급받고, 이 토큰을 `Authorization: Bearer <JWT_TOKEN>` 헤더에 포함하여 인증이 필요한 API들을 테스트합니다.
    * 다양한 시나리오를 수동으로 검증하는 데 유용합니다.

---

### 기본 사용자 계정 (Auth Server 시작 시 자동 생성)

`auth-server`가 처음 시작될 때 (해당 사용자가 DB에 존재하지 않을 경우) 다음과 같은 기본 계정들이 자동으로 생성됩니다.

API 테스트 및 시스템에 사용할 수 있습니다.

* **관리자 (Admin) 계정**:
    * Username: `admin`
    * Password: `admin`
    * Role: `ADMIN`
* **테스트 사용자 (Test User) 계정**:
    * Username: `test`
    * Password: `test`
    * Role: `USER`

---

### 애플리케이션 실행

* **명령어 실행 위치**: 프로젝트 루트 디렉토리 (`docker-compose.yml` 파일이 있는 위치)
* **명령어 1 (이미지 빌드 - 필요한 경우)**:
  ```bash
  docker-compose build --no-cache
  ```
    * `--no-cache` 옵션은 캐시를 사용하지 않고 이미지를 새로 빌드합니다.


* **명령어 2-1 (프로덕션 애플리케이션 시작)**:
  ```bash
  docker-compose up -d
  ```
    * 프로덕션 전체 환경실행 3000번 (gateway) 포트만 외부와 바인딩됩니다.


* **명령어 2-2 (개발용 의존성 시작)**:
  ```bash
    docker compose -f .\docker-compose.development.yml up -d
  ```
    * 개발용 서버 실행하는데 필요한 DB만 실행됩니다.
    * 해당 명령어 실행 후 각 서비스 루트에서 ```npm run start:dev``` 실행하면 직접 소스 변경하며 테스트 가능


### 애플리케이션 중지

* **명령어 실행 위치**: 프로젝트 루트 디렉토리 (`docker-compose.yml` 파일이 있는 위치)
* **명령어**:
  ```bash
  docker-compose down
  ```
    * 데이터 볼륨까지 함께 삭제하려면 `-v` 옵션을 추가해주세요.

## API 요청 방법

모든 API 요청은 Gateway (`http://localhost:3000`)를 통해 각 서비스로 전달됩니다.
* **Auth Service** 관련 API는 `/auth-service` 접두사를 가집니다. (예: `http://localhost:3000/auth-service/...`)
* **Event Service** 관련 API는 `/event-service` 접두사를 가집니다. (예: `http://localhost:3000/event-service/...`)

위 접두사는 gateway-server service-registry.config.ts 에 정적으로 선언돼있습니다.

인증이 필요한 API는 `Authorization: Bearer <JWT_TOKEN>` 헤더를 포함해야 합니다.

내부 서비스 E2E 테스트 시에는 Gateway가 주입하는 `x-user-id` (MongoDB 사용자 ObjectId 문자열) 및 `x-user-roles` (쉼표로 구분된 역할, 예: "ADMIN,USER") 헤더를 사용합니다.

### Auth Service API (`/auth-service`)

1.  **`POST /auth/login`**
    * **설명**: 사용자 로그인 및 JWT 발급
    * **필요 권한**: `PUBLIC`
    * **요청 본문 (Request Body)**:
        * `username` (string, 필수)
        * `password` (string, 필수 - 클라이언트에서 전송하는 평문 비밀번호)
    * **성공 응답 (`200 OK`)**:
        * `access_token` (string): JWT
        * `user` (object): 사용자 정보 (id, username, roles)
    * **실패 응답**:
        * `401 Unauthorized`: 자격 증명 실패

2.  **`POST /users/register`**
    * **설명**: 신규 사용자 회원 가입
    * **필요 권한**: `ADMIN`
    * **요청 본문 (Request Body)**:
        * `username` (string, 필수, 3~30자)
        * `password_hash` (string, 필수, 6~100자 - 클라이언트에서 전송하는 평문 비밀번호)
        * `roles` (array of strings, 기본값: `[USER]`)
    * **성공 응답 (`201 Created`)**:
        * 생성된 사용자 정보 (비밀번호 제외)
    * **실패 응답**:
        * `400 Bad Request`: 유효성 검사 실패
        * `409 Conflict`: 사용자 이름 중복

3.  **`GET /users/me`**
    * **설명**: 현재 로그인된 사용자 정보 조회
    * **필요 권한**: `USER`, `OPERATOR`, `AUDITOR`, `ADMIN`
    * **요청 파라미터**: 없음 (Gateway가 `Authorization` 헤더의 JWT를 검증하고 `X-User-Id` 헤더를 Auth Server로 전달)
    * **성공 응답 (`200 OK`)**:
        * 현재 로그인된 사용자 정보 (비밀번호 제외)
    * **실패 응답**:
        * `401 Unauthorized`: 유효하지 않은 토큰 또는 Gateway에서 사용자 ID 미전달

4.  **`GET /users/:username`**
    * **설명**: 특정 사용자 정보 조회
    * **필요 권한**: `ADMIN`
    * **경로 파라미터 (Path Parameters)**:
        * `:username` (string, 필수): 조회할 사용자의 이름
    * **성공 응답 (`200 OK`)**:
        * 해당 사용자의 정보 (비밀번호 제외)
    * **실패 응답**:
        * `404 Not Found`: 해당 사용자가 존재하지 않음

5.  **`PUT /users/:username/roles`**
    * **설명**: 특정 사용자의 역할(권한) 업데이트
    * **필요 권한**: `ADMIN`
    * **경로 파라미터 (Path Parameters)**:
        * `:username` (string, 필수): 역할을 업데이트할 사용자의 이름
    * **요청 본문 (Request Body)**:
        * `roles` (array of strings, 필수, Role Enum 값들)
    * **성공 응답 (`200 OK`)**:
        * 업데이트된 사용자 정보 (비밀번호 제외)
    * **실패 응답**:
        * `400 Bad Request`: 유효성 검사 실패 (잘못된 역할 등)
        * `404 Not Found`: 해당 사용자가 존재하지 않음

### Event Service API (`/event-service`)

#### Events (`/events`)

1.  **`POST /events`**
    * **설명**: 새로운 이벤트 생성
    * **필요 권한**: `ADMIN`, `OPERATOR`
    * **요청 본문 (Request Body)**:
        * `name` (string, 필수)
        * `description` (string, 선택적)
        * `condition` (object, 필수): 이벤트 조건 객체 (예: `{"type": "loginStreak", "days": 7}`)
            * `type` (string, 필수): 조건 유형
            * `[key:string]:any`: 조건 유형에 따른 추가 파라미터
        * `startDate` (string, 필수, 형식: `YYYY-MM-DD`, 예: `2025-05-20`)
        * `endDate` (string, 필수, 형식: `YYYY-MM-DD`, 예: `2025-06-01`)
        * `status` (string, 선택적, Enum: `ACTIVE`, `INACTIVE`, `ENDED`, 기본값: `ACTIVE`)
        * `isActive` (boolean, 선택적, 기본값: `true`)
    * **성공 응답 (`201 Created`)**:
        * 생성된 이벤트 정보

2.  **`GET /events`**
    * **설명**: 전체 이벤트 목록 조회
    * **필요 권한**: `ADMIN`, `OPERATOR`
    * **쿼리 파라미터 (Query Parameters)**:
        * `status` (string, 선택적, Enum: `ACTIVE`, `INACTIVE`, `ENDED`): 이벤트 상태로 필터링
        * `isActive` (boolean, 선택적, 기본값: `true`): 활성 상태로 필터링
    * **성공 응답 (`200 OK`)**:
        * 이벤트 정보 배열 (각 이벤트는 `eventRewards` 필드를 통해 연결된 보상 목록 포함 가능)

3.  **`GET /events/:id`**
    * **설명**: 특정 이벤트 상세 조회
    * **필요 권한**: `ADMIN`, `OPERATOR`
    * **경로 파라미터 (Path Parameters)**:
        * `:id` (string, 필수, MongoDB ObjectId): 조회할 이벤트의 ID
    * **성공 응답 (`200 OK`)**:
        * 해당 이벤트 정보 (`eventRewards` 필드 포함 가능)
    * **실패 응답**:
        * `404 Not Found`: 해당 이벤트가 존재하지 않음

4.  **`PUT /events/:id`**
    * **설명**: 특정 이벤트 정보 업데이트
    * **필요 권한**: `ADMIN`, `OPERATOR`
    * **경로 파라미터 (Path Parameters)**:
        * `:id` (string, 필수, MongoDB ObjectId): 업데이트할 이벤트의 ID
    * **요청 본문 (Request Body)**: `POST /events`와 동일한 필드 (업데이트할 필드만 포함, 날짜 형식 `YYYY-MM-DD`)
    * **성공 응답 (`200 OK`)**:
        * 업데이트된 이벤트 정보
    * **실패 응답**:
        * `404 Not Found`: 해당 이벤트가 존재하지 않음

#### Rewards (`/rewards`)

5.  **`GET /rewards`**
    * **설명**: 전체 보상 목록 조회 (특정 이벤트의 보상만 필터링 가능)
    * **필요 권한**: `ADMIN`, `OPERATOR`
    * **쿼리 파라미터 (Query Parameters)**:
        * `eventId` (string, 선택적, MongoDB ObjectId 로 치환됨): 특정 이벤트 ID로 보상 필터링
    * **성공 응답 (`200 OK`)**:
        * 보상 정보 배열

6.  **`POST /rewards`**
    * **설명**: 새로운 보상 생성 및 이벤트에 연결
    * **필요 권한**: `ADMIN`, `OPERATOR`
    * **요청 본문 (Request Body)**:
        * `eventId` (string, 필수, MongoDB ObjectId): 연결할 이벤트의 ID
        * `name` (string, 필수)
        * `type` (string, 필수, Enum: `POINT`, `ITEM`, `COUPON`, `CURRENCY`)
        * `details` (object, 필수): 보상 상세 (예: `{"value": 100}` 또는 `{"itemId": "item123"}`)
        * `quantity` (number, 필수, 최소값: 1): 지급 수량 혹은 포인트 1000점 등
    * **성공 응답 (`201 Created`)**:
        * 생성된 보상 정보

7.  **`GET /rewards/:id`**
    * **설명**: 특정 보상 상세 조회
    * **필요 권한**: `ADMIN`, `OPERATOR`
    * **경로 파라미터 (Path Parameters)**:
        * `:id` (string, 필수, MongoDB ObjectId로 치환함): 조회할 보상의 ID
    * **성공 응답 (`200 OK`)**:
        * 해당 보상 정보
    * **실패 응답**:
        * `404 Not Found`: 해당 보상이 존재하지 않음

8.  **`PUT /rewards/:id`**
    * **설명**: 특정 보상 정보 업데이트
    * **필요 권한**: `ADMIN`, `OPERATOR`
    * **경로 파라미터 (Path Parameters)**:
        * `:id` (string, 필수, MongoDB ObjectId 치환함): 업데이트할 보상의 ID
    * **요청 본문 (Request Body)**: `POST /rewards`와 동일한 필드 (업데이트할 필드만 포함)
    * **성공 응답 (`200 OK`)**:
        * 업데이트된 보상 정보
    * **실패 응답**:
        * `404 Not Found`: 해당 보상이 존재하지 않음

#### Reward Claims (`/reward-claims`)

9.  **`GET /reward-claims`**
    * **설명**: 보상 요청 내역 조회 (관리자/감사자용)
    * **필요 권한**: `ADMIN`, `AUDITOR`
    * **쿼리 파라미터 (Query Parameters)**:
        * `userId` (string, 선택적, MongoDB ObjectId 치환됨): 특정 사용자의 요청 내역 필터링
        * `eventId` (string, 선택적, MongoDB ObjectId 치환됨): 특정 이벤트의 요청 내역 필터링
        * `status` (string, 선택적, Enum: `PENDING`, `APPROVED`, `REJECTED`, `PAID`, `FAILED`, `CANCELLED`): 특정 상태의 요청 내역 필터링
    * **성공 응답 (`200 OK`)**:
        * 필터링된 보상 요청 내역 배열
    * **실패 응답**:
        * `400 Bad Request`: `userId` | `eventId` 형식 오류

10. **`POST /reward-claims`**
    * **설명**: 사용자 보상 요청 생성 (특정 이벤트의 특정 보상에 대해)
    * **필요 권한**: `USER`
    * **요청 본문 (Request Body)**:
        * `eventId` (string, 필수, MongoDB ObjectId 내부적으로 치환함)
        * `rewardId` (string, 필수, MongoDB ObjectId 내부적으로 치환함)
    * **성공 응답 (`201 Created`)**:
        * 생성된 보상 요청 내역 정보
    * **실패 응답**:
        * `400 Bad Request`: 조건 미충족, 유효하지 않은 ID 등
        * `404 Not Found`: 이벤트 또는 보상이 존재하지 않음
        * `409 Conflict`: 이미 처리된 요청 (중복 요청)

11. **`GET /reward-claims/me`**
    * **설명**: 현재 로그인한 사용자의 보상 요청 내역 조회
    * **필요 권한**: `USER`
    * **쿼리 파라미터 (Query Parameters)**:
        * `eventId` (string, 선택적, MongoDB ObjectId 내부적으로 치환함): 특정 이벤트로 필터링
        * `status` (string, 선택적, Enum: `PENDING`, `APPROVED`, `REJECTED`, `PAID`, `FAILED`, `CANCELLED`): 특정 상태로 필터링
    * **성공 응답 (`200 OK`)**:
        * 조회된 보상 요청 내역 배열

12. **`GET /reward-claims/:id`**
    * **설명**: 특정 보상 요청 내역 조회
    * **필요 권한**: `ADMIN`, `AUDITOR`
    * **경로 파라미터 (Path Parameters)**:
        * `:id` (string, 필수, MongoDB ObjectId 내부적으로 치환함): 조회할 보상 요청의 ID
    * **성공 응답 (`200 OK`)**:
        * 해당 보상 요청 내역 정보
    * **실패 응답**:
        * `404 Not Found`: 해당 요청 내역이 없거나 접근 권한 없음