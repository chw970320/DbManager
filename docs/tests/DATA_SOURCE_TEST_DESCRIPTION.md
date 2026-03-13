# 데이터 소스(Data Source) 주제영역 테스트 설명

이 문서는 데이터 소스 연결 관리 기능에 대한 테스트 케이스를 정리합니다.

## 테스트 현황 요약

| 테스트 파일                        | 테스트 수 | 상태 |
| ---------------------------------- | --------- | ---- |
| `data-source-registry.test.ts`     | 3개       | 완료 |
| `data-sources/server.test.ts`      | 7개       | 완료 |
| `data-sources/test/server.test.ts` | 5개       | 완료 |
| `data-source/browse/page.test.ts`  | 4개       | 완료 |
| **합계**                           | **19개**  |      |

---

## 1. data-source-registry.test.ts (3개)

**파일 경로**: `src/lib/registry/data-source-registry.test.ts`

데이터 소스 설정 저장소의 기본 생성, 요약 응답 비밀번호 마스킹, 수정 시 비밀번호 유지 동작을 검증합니다.

| 테스트명                                                                  | 설명                  | 검증 내용                                                   |
| ------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------- |
| should create the default empty registry when the file does not exist     | 기본 설정 파일 생성   | 빈 데이터 초기화, `settings/data-sources.json` 생성         |
| should create a PostgreSQL data source and hide the password in summaries | 저장/조회 보안 처리   | 저장본에는 password 유지, GET 요약에는 `hasPassword`만 노출 |
| should preserve the stored password when update payload leaves it blank   | 수정 시 비밀번호 유지 | 편집 시 비밀번호 공란이면 기존 비밀번호 유지                |

---

## 2. data-sources/server.test.ts (7개)

**파일 경로**: `src/routes/api/data-sources/server.test.ts`

데이터 소스 CRUD API를 테스트합니다.

| 테스트명                                           | 설명             | 검증 내용                                   |
| -------------------------------------------------- | ---------------- | ------------------------------------------- |
| GET should return sanitized data source summaries  | 목록 조회 성공   | 200 응답, password 없는 요약 목록 반환      |
| POST should create a PostgreSQL data source        | 데이터 소스 생성 | 201 응답, registry create 호출              |
| POST should reject missing required fields         | 필수 필드 검증   | host/database/username/password 누락 시 400 |
| POST should return 409 when the name is duplicated | 중복 이름 방지   | 동일 이름 저장 시 409 반환                  |
| PUT should update a data source                    | 데이터 소스 수정 | 200 응답, registry update 호출              |
| PUT should return 404 when data source is missing  | 없는 항목 수정   | 대상 없음 에러 시 404                       |
| DELETE should remove a data source                 | 데이터 소스 삭제 | 200 응답, registry delete 호출              |

---

## 3. data-sources/test/server.test.ts (5개)

**파일 경로**: `src/routes/api/data-sources/test/server.test.ts`

연결 테스트 API를 테스트합니다.

| 테스트명                                                                               | 설명                     | 검증 내용                                   |
| -------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------- |
| should test a stored data source by id                                                 | 저장된 연결 테스트       | id로 registry 조회 후 연결 테스트 실행      |
| should test a direct PostgreSQL payload without saving it                              | 저장 전 직접 연결 테스트 | 임시 payload로 연결 테스트 실행             |
| should reuse the stored password when testing an edited connection with blank password | 편집 중 비밀번호 유지    | 저장된 비밀번호를 이어받아 직접 테스트 실행 |
| should return 404 when the stored data source does not exist                           | 없는 저장 연결 테스트    | id 조회 실패 시 404                         |
| should return 400 when the payload is incomplete                                       | 입력값 검증              | host 등 필수 config 누락 시 400             |

---

## 4. data-source/browse/page.test.ts (4개)

**파일 경로**: `src/routes/data-source/browse/page.test.ts`

데이터 소스 관리 화면의 기본 흐름을 테스트합니다.

| 테스트명                                                                              | 설명                             | 검증 내용                                                                                    |
| ------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| should load the saved data sources and run a connection test from the list            | 목록 조회 및 행 테스트           | GET 목록 로드, 저장된 연결 테스트 성공 메시지 표시                                           |
| should allow direct connection test and creation from the editor modal                | 모달 기반 테스트/생성            | 직접 연결 테스트 실행 후 POST 저장 및 목록 반영                                              |
| should render breadcrumb navigation and expose peer lv1 and lv2 menus from each crumb | breadcrumb 레벨별 메뉴 이동 노출 | `lv1` crumb에서 `표준 용어/DB 설계`, `lv2` crumb에서 `품질 규칙/프로파일링/스냅샷` 링크 확인 |
| should place the summary in the left sidebar and omit the mobile sidebar toggle       | 요약 sidebar 고정                | 좌측 요약 region 렌더링, `hidden lg:block`, 모바일 sidebar 열기 버튼 미노출                  |

---

## 실행 명령어

```bash
pnpm vitest run src/lib/registry/data-source-registry.test.ts
pnpm vitest run src/routes/api/data-sources/server.test.ts
pnpm vitest run src/routes/api/data-sources/test/server.test.ts
pnpm vitest run src/routes/data-source/browse/page.test.ts
```
