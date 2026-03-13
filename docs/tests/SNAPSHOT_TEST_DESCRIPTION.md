# 스냅샷(Snapshot) 주제영역 테스트 설명

이 문서는 8종 설계 번들 스냅샷 저장/복원 기능의 테스트 케이스를 정리합니다.

## 테스트 현황 요약

| 테스트 파일                               | 테스트 수 | 상태 |
| ----------------------------------------- | --------- | ---- |
| `DesignSnapshotEditor.test.ts`            | 3개       | 완료 |
| `design-snapshot-registry.test.ts`        | 3개       | 완료 |
| `design-snapshots/server.test.ts`         | 4개       | 완료 |
| `design-snapshots/restore/server.test.ts` | 2개       | 완료 |
| `snapshot/browse/page.test.ts`            | 3개       | 완료 |
| **합계**                                  | **15개**  |      |

---

## 1. DesignSnapshotEditor.test.ts (3개)

**파일 경로**: `src/lib/components/DesignSnapshotEditor.test.ts`

스냅샷 추가 모달의 기본 렌더링과 입력/요약 동작을 테스트합니다.

| 테스트명                                                             | 설명                | 검증 내용                                                           |
| -------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| should render an empty state when no bundles are available           | 번들 없음 안내      | 모달 안 empty state 렌더링, 저장 버튼 비활성화                     |
| should dispatch a save callback with trimmed values for the chosen bundle | 저장 콜백 전달 | 초기 번들 선택, 입력 trim, save 콜백 payload 전달                 |
| should update the included file summary when the bundle changes      | 번들 변경 요약 반영 | select 변경 후 포함 파일 칩이 새 번들 파일명으로 즉시 갱신         |

---

## 2. design-snapshot-registry.test.ts (3개)

**파일 경로**: `src/lib/registry/design-snapshot-registry.test.ts`

스냅샷 저장소의 생성, 복원, 삭제 핵심 로직을 테스트합니다.

| 테스트명                                     | 설명             | 검증 내용                                                 |
| -------------------------------------------- | ---------------- | --------------------------------------------------------- |
| 스냅샷을 생성하고 요약 목록을 반환한다       | 스냅샷 생성 성공 | 8종 번들 payload 저장, 요약 counts 계산, description 유지 |
| 스냅샷 복원 시 변경된 번들 데이터를 되돌린다 | 복원 동작 검증   | 저장 후 변경된 컬럼 데이터가 원래 값으로 복원             |
| 스냅샷 삭제 시 목록에서 제거된다             | 삭제 동작 검증   | 삭제 후 요약 목록에서 대상 스냅샷이 사라짐                |

---

## 3. design-snapshots/server.test.ts (4개)

**파일 경로**: `src/routes/api/design-snapshots/server.test.ts`

스냅샷 목록 조회/생성/삭제 API를 테스트합니다.

| 테스트명                                          | 설명             | 검증 내용                                     |
| ------------------------------------------------- | ---------------- | --------------------------------------------- |
| GET should return snapshots and available bundles | 목록 조회 성공   | 스냅샷 목록과 저장 가능한 공통 번들 동시 반환 |
| POST should create a snapshot                     | 스냅샷 생성 성공 | 201 응답, 레지스트리 create 호출              |
| DELETE should remove a snapshot                   | 스냅샷 삭제 성공 | 200 응답, 레지스트리 delete 호출              |
| DELETE should reject a missing id                 | 필수 입력 검증   | `id` 누락 시 400 반환                         |

---

## 4. design-snapshots/restore/server.test.ts (2개)

**파일 경로**: `src/routes/api/design-snapshots/restore/server.test.ts`

스냅샷 복원 API를 테스트합니다.

| 테스트명                        | 설명           | 검증 내용                             |
| ------------------------------- | -------------- | ------------------------------------- |
| POST should restore a snapshot  | 복원 API 성공  | 200 응답, `restoredAt` 포함 결과 반환 |
| POST should reject a missing id | 필수 입력 검증 | `id` 누락 시 400 반환                 |

---

## 5. snapshot/browse/page.test.ts (3개)

**파일 경로**: `src/routes/snapshot/browse/page.test.ts`

스냅샷 관리 화면의 기본 흐름을 테스트합니다.

| 테스트명                                                                             | 설명              | 검증 내용                                                                   |
| ------------------------------------------------------------------------------------ | ----------------- | --------------------------------------------------------------------------- |
| should load the saved snapshots and restore one from the list                        | 목록 조회 및 복원 | GET 목록 로드, 복원 confirm, restore API 호출                               |
| should create a snapshot for the selected bundle                                     | 생성 흐름 성공    | `스냅샷 추가` 모달 오픈, 폼 입력, POST 호출, 새 스냅샷 행 렌더링            |
| should render the summary in the left sidebar and not expose a mobile sidebar toggle | 요약 sidebar 고정 | 좌측 요약 region 렌더링, `hidden lg:block`, 모바일 sidebar 열기 버튼 미노출 |

---

## 실행 명령어

```bash
pnpm vitest run src/lib/components/DesignSnapshotEditor.test.ts
pnpm vitest run src/lib/registry/design-snapshot-registry.test.ts
pnpm vitest run src/routes/api/design-snapshots/server.test.ts
pnpm vitest run src/routes/api/design-snapshots/restore/server.test.ts
pnpm vitest run src/routes/snapshot/browse/page.test.ts
```
