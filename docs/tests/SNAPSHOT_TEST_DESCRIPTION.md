# 스냅샷(Snapshot) 주제영역 테스트 설명

이 문서는 8종 설계 번들 스냅샷 저장/복원 기능의 테스트 케이스를 정리합니다.

## 테스트 현황 요약

| 테스트 파일                              | 테스트 수 | 상태 |
| ---------------------------------------- | --------- | ---- |
| `design-snapshot-registry.test.ts`        | 3개       | 완료 |
| `design-snapshots/server.test.ts`         | 4개       | 완료 |
| `design-snapshots/restore/server.test.ts` | 2개       | 완료 |
| `snapshot/browse/page.test.ts`            | 2개       | 완료 |
| **합계**                                  | **11개**  |      |

---

## 1. design-snapshot-registry.test.ts (3개)

**파일 경로**: `src/lib/registry/design-snapshot-registry.test.ts`

스냅샷 저장소의 생성, 복원, 삭제 핵심 로직을 테스트합니다.

| 테스트명                                         | 설명              | 검증 내용                                                     |
| ------------------------------------------------ | ----------------- | ------------------------------------------------------------- |
| 스냅샷을 생성하고 요약 목록을 반환한다           | 스냅샷 생성 성공  | 8종 번들 payload 저장, 요약 counts 계산, description 유지     |
| 스냅샷 복원 시 변경된 번들 데이터를 되돌린다     | 복원 동작 검증    | 저장 후 변경된 컬럼 데이터가 원래 값으로 복원                 |
| 스냅샷 삭제 시 목록에서 제거된다                 | 삭제 동작 검증    | 삭제 후 요약 목록에서 대상 스냅샷이 사라짐                    |

---

## 2. design-snapshots/server.test.ts (4개)

**파일 경로**: `src/routes/api/design-snapshots/server.test.ts`

스냅샷 목록 조회/생성/삭제 API를 테스트합니다.

| 테스트명                                        | 설명              | 검증 내용                                      |
| ----------------------------------------------- | ----------------- | ---------------------------------------------- |
| GET should return snapshots and available bundles | 목록 조회 성공  | 스냅샷 목록과 저장 가능한 공통 번들 동시 반환  |
| POST should create a snapshot                   | 스냅샷 생성 성공  | 201 응답, 레지스트리 create 호출               |
| DELETE should remove a snapshot                 | 스냅샷 삭제 성공  | 200 응답, 레지스트리 delete 호출               |
| DELETE should reject a missing id               | 필수 입력 검증    | `id` 누락 시 400 반환                          |

---

## 3. design-snapshots/restore/server.test.ts (2개)

**파일 경로**: `src/routes/api/design-snapshots/restore/server.test.ts`

스냅샷 복원 API를 테스트합니다.

| 테스트명                          | 설명            | 검증 내용                              |
| --------------------------------- | --------------- | -------------------------------------- |
| POST should restore a snapshot    | 복원 API 성공   | 200 응답, `restoredAt` 포함 결과 반환 |
| POST should reject a missing id   | 필수 입력 검증  | `id` 누락 시 400 반환                  |

---

## 4. snapshot/browse/page.test.ts (2개)

**파일 경로**: `src/routes/snapshot/browse/page.test.ts`

스냅샷 관리 화면의 기본 흐름을 테스트합니다.

| 테스트명                                               | 설명                 | 검증 내용                                        |
| ------------------------------------------------------ | -------------------- | ------------------------------------------------ |
| should load the saved snapshots and restore one from the list | 목록 조회 및 복원 | GET 목록 로드, 복원 confirm, restore API 호출    |
| should create a snapshot for the selected bundle       | 생성 흐름 성공       | 폼 입력, POST 호출, 새 스냅샷 행 렌더링          |

---

## 실행 명령어

```bash
pnpm vitest run src/lib/registry/design-snapshot-registry.test.ts
pnpm vitest run src/routes/api/design-snapshots/server.test.ts
pnpm vitest run src/routes/api/design-snapshots/restore/server.test.ts
pnpm vitest run src/routes/snapshot/browse/page.test.ts
```
