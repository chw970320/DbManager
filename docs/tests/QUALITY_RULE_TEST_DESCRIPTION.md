# 품질 규칙(Quality Rule) 주제영역 테스트 설명

이 문서는 PostgreSQL 프로파일링 결과에 적용되는 품질 규칙 관리 기능의 테스트 케이스를 정리합니다.

## 테스트 현황 요약

| 테스트 파일                               | 테스트 수 | 상태 |
| ----------------------------------------- | --------- | ---- |
| `data-quality-rule-evaluator.test.ts`     | 3개       | 완료 |
| `quality-rules/server.test.ts`            | 6개       | 완료 |
| `quality-rule/browse/page.test.ts`        | 3개       | 완료 |
| `data-sources/profile/run/server.test.ts` | 4개       | 완료 |
| `profiling/browse/page.test.ts`           | 3개       | 완료 |
| **합계**                                  | **19개**  |      |

---

## 1. data-quality-rule-evaluator.test.ts (3개)

**파일 경로**: `src/lib/utils/data-quality-rule-evaluator.test.ts`

프로파일링 결과와 저장된 품질 규칙을 비교하는 핵심 평가 로직을 테스트합니다.

| 테스트명                                                                    | 설명                | 검증 내용                                                 |
| --------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------- |
| should create a violation when a matched column rule fails                  | 컬럼 규칙 위반 검출 | 패턴 매칭, 실패 규칙 집계, 위반 타깃 컬럼명 반환          |
| should count a matched table rule as passed when the threshold is satisfied | 테이블 규칙 통과    | `rowCount` 기준 통과, passedRules 증가, 위반 없음         |
| should ignore unmatched or disabled rules in matched counts                 | 비매칭/비활성 제외  | totalRules/ matchedRules 계산에서 비매칭 또는 비활성 제외 |

---

## 2. quality-rules/server.test.ts (6개)

**파일 경로**: `src/routes/api/quality-rules/server.test.ts`

품질 규칙 목록 조회와 CRUD API를 테스트합니다.

| 테스트명                                               | 설명           | 검증 내용                                      |
| ------------------------------------------------------ | -------------- | ---------------------------------------------- |
| GET should return quality rule data                    | 목록 조회 성공 | 200 응답, 규칙 목록/메타데이터 반환            |
| POST should create a quality rule                      | 규칙 등록 성공 | 201 응답, 저장소 생성 함수 호출                |
| POST should reject missing required fields             | 필수 입력 검증 | 이름, 범위, 메트릭, 연산자, 기준값 누락 시 400 |
| PUT should update a quality rule                       | 규칙 수정 성공 | 200 응답, 저장소 수정 함수 호출                |
| PUT should return 404 when the quality rule is missing | 수정 대상 없음 | 존재하지 않는 ID 수정 시 404                   |
| DELETE should remove a quality rule                    | 규칙 삭제 성공 | 200 응답, 저장소 삭제 함수 호출                |

---

## 3. quality-rule/browse/page.test.ts (3개)

**파일 경로**: `src/routes/quality-rule/browse/page.test.ts`

품질 규칙 관리 화면에서 목록 조회와 등록/수정 흐름을 테스트합니다.

| 테스트명                                                                           | 설명              | 검증 내용                                                                   |
| ---------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| should load quality rules and render summary cards                                 | 화면 기본 조회    | 규칙 목록, 활성 규칙 수, 범위/심각도 요약 표시                              |
| should allow creating a rule from the editor modal                                 | 등록 흐름 성공    | 모달 입력, POST 호출, 목록 갱신                                             |
| should render the summary in the left sidebar and keep the mobile sidebar disabled | 요약 sidebar 고정 | 좌측 요약 region 렌더링, `hidden lg:block`, 모바일 sidebar 열기 버튼 미노출 |

---

## 4. data-sources/profile/run/server.test.ts (4개)

**파일 경로**: `src/routes/api/data-sources/profile/run/server.test.ts`

테이블 프로파일링 실행 시 활성 품질 규칙을 함께 평가하는 API를 테스트합니다.

| 테스트명                                                       | 설명                 | 검증 내용                                           |
| -------------------------------------------------------------- | -------------------- | --------------------------------------------------- |
| should run table profiling for a saved PostgreSQL source       | 프로파일링 실행 성공 | 200 응답, 프로파일링 유틸 호출, 평가 결과 포함      |
| should include evaluated quality rule results when rules exist | 규칙 평가 통합       | 활성 규칙 로드, 평가 유틸 호출, 응답에 summary 포함 |
| should return 400 when required profiling fields are missing   | 필수 입력 검증       | `dataSourceId`, `schema`, `table` 누락 시 400       |
| should return 404 when the data source does not exist          | 저장 연결 없음 처리  | 존재하지 않는 ID 조회 시 404                        |

---

## 5. profiling/browse/page.test.ts (3개)

**파일 경로**: `src/routes/profiling/browse/page.test.ts`

프로파일링 결과 화면에 품질 규칙 평가 요약과 위반 목록이 함께 표시되는지 테스트합니다.

| 테스트명                                                                           | 설명                | 검증 내용                                                                   |
| ---------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------- |
| should load profile targets for the selected data source and render the result     | 화면 기본 성공 흐름 | 대상 조회, 프로파일링 실행, 컬럼 결과 및 규칙 평가 요약 표시                |
| should show an empty state when there are no saved data sources                    | 빈 상태 처리        | 데이터 소스가 없을 때 안내 문구와 이동 CTA 표시                             |
| should render the desktop-only summary in the left sidebar without a mobile toggle | 요약 sidebar 고정   | 좌측 요약 region 렌더링, `hidden lg:block`, 모바일 sidebar 열기 버튼 미노출 |

---

## 실행 명령어

```bash
pnpm vitest run src/routes/api/quality-rules/server.test.ts
pnpm vitest run src/lib/utils/data-quality-rule-evaluator.test.ts
pnpm vitest run src/routes/quality-rule/browse/page.test.ts
pnpm vitest run src/routes/api/data-sources/profile/run/server.test.ts
pnpm vitest run src/routes/profiling/browse/page.test.ts
```
