# 데이터 프로파일링(Data Profiling) 주제영역 테스트 설명

이 문서는 PostgreSQL 기반 실데이터 프로파일링 기능에 대한 테스트 케이스를 정리합니다.

## 테스트 현황 요약

| 테스트 파일                                   | 테스트 수 | 상태 |
| --------------------------------------------- | --------- | ---- |
| `data-sources/profile/targets/server.test.ts` | 3개       | 완료 |
| `data-sources/profile/run/server.test.ts`     | 3개       | 완료 |
| `profiling/browse/page.test.ts`               | 3개       | 완료 |
| **합계**                                      | **9개**   |      |

---

## 1. data-sources/profile/targets/server.test.ts (3개)

**파일 경로**: `src/routes/api/data-sources/profile/targets/server.test.ts`

저장된 PostgreSQL 데이터 소스 기준으로 조회 가능한 스키마/테이블 목록을 반환하는 API를 테스트합니다.

| 테스트명                                                         | 설명                | 검증 내용                                        |
| ---------------------------------------------------------------- | ------------------- | ------------------------------------------------ |
| should return profile targets for a saved PostgreSQL data source | 대상 조회 성공      | 200 응답, profiler 유틸 호출, 스키마/테이블 반환 |
| should return 400 when dataSourceId is missing                   | 필수 파라미터 검증  | `dataSourceId` 누락 시 400                       |
| should return 404 when the data source does not exist            | 저장 연결 없음 처리 | 존재하지 않는 ID 조회 시 404                     |

---

## 2. data-sources/profile/run/server.test.ts (3개)

**파일 경로**: `src/routes/api/data-sources/profile/run/server.test.ts`

저장된 PostgreSQL 데이터 소스를 이용해 선택한 테이블의 컬럼 프로파일을 계산하는 API를 테스트합니다.

| 테스트명                                                     | 설명                 | 검증 내용                                       |
| ------------------------------------------------------------ | -------------------- | ----------------------------------------------- |
| should run table profiling for a saved PostgreSQL source     | 프로파일링 실행 성공 | 200 응답, schema/table 전달, 컬럼 프로파일 반환 |
| should return 400 when required profiling fields are missing | 필수 입력 검증       | `dataSourceId`, `schema`, `table` 누락 시 400   |
| should return 404 when the data source does not exist        | 저장 연결 없음 처리  | 존재하지 않는 ID 조회 시 404                    |

---

## 3. profiling/browse/page.test.ts (3개)

**파일 경로**: `src/routes/profiling/browse/page.test.ts`

프로파일링 화면에서 데이터 소스 선택, 대상 조회, 실행 결과 확인 흐름을 테스트합니다.

| 테스트명                                                                           | 설명                | 검증 내용                                                                   |
| ---------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------- |
| should load profile targets for the selected data source and render the result     | 화면 기본 성공 흐름 | 목록 조회, 대상 조회, 프로파일링 실행, 결과 테이블 표시                     |
| should show an empty state when there are no saved data sources                    | 빈 상태 처리        | 데이터 소스가 없을 때 안내 문구와 이동 CTA 표시                             |
| should render the desktop-only summary in the left sidebar without a mobile toggle | 요약 sidebar 고정   | 좌측 요약 region 렌더링, `hidden lg:block`, 모바일 sidebar 열기 버튼 미노출 |

---

## 실행 명령어

```bash
pnpm vitest run src/routes/api/data-sources/profile/targets/server.test.ts
pnpm vitest run src/routes/api/data-sources/profile/run/server.test.ts
pnpm vitest run src/routes/profiling/browse/page.test.ts
```
