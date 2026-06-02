# DbManager 남은 작업 체크리스트

Last updated: 2026-06-02

이 문서는 최근 백엔드 유지보수/테스트 보강 이후 남은 작업을 추적하는 체크리스트입니다. 작업 실행 전에는 항상 루트 `AGENTS.md`를 우선 기준으로 삼고, 각 항목은 별도 계획/검증/커밋 단위로 진행합니다.

## 공통 진행 원칙

- [ ] 작업 전 `AGENTS.md`를 읽고 현재 작업에 필요한 최소 문서/소스만 로드한다.
- [ ] UI 대개편과 충돌하는 변경은 별도 승인 없이 진행하지 않는다.
- [ ] 현재 동작을 계약으로 보고, 상태 코드/응답 필드/캐시 무효화/저장 경로를 임의로 정규화하지 않는다.
- [ ] 리팩터링 전 관련 route/helper 테스트를 먼저 잠근다.
- [ ] 코드 변경 시 targeted tests → `pnpm run format:check` → `pnpm check` → `pnpm run lint` → 필요 시 `pnpm vitest run` 순서로 검증한다.
- [ ] 작업 단위가 완료되면 AGENTS.md 커밋 규칙에 맞춰 별도 커밋한다.
- [ ] 원격 push는 사용자가 명시적으로 요청할 때만 수행한다.

## 권장 우선순위

1. [ ] Cascade wrapper extraction 계획/구현
2. [ ] Upload route wrapper cleanup 계획/구현
3. [ ] File/mapping orchestration cleanup 계획/구현
4. [ ] Sync/cache asymmetry 의사결정 정리
5. [ ] Release/push handoff 정리

## P0 — 다음에 바로 계획 가능한 작업

### Cascade wrapper extraction

상태: 준비됨. 단, 별도 계획 필요.

근거:

- `vocabulary/domain/term` cascade blocked `409` + `data.preview` route 계약이 테스트로 잠김.
- 최근 커밋: `9069795 test: 캐스케이드 차단 응답 회귀 보강`

체크리스트:

- [ ] 별도 계획에서 추출 범위를 “응답 생성/값 조립” 수준으로 제한한다.
- [ ] `vocabulary`의 cascade opt-in과 `domain/term`의 default-on cascade 차이를 보존한다.
- [ ] `success:false`, `message`, conflict reason 기반 `error`, `data.preview` shape를 변경하지 않는다.
- [ ] `applyCascadePlan` 호출 여부와 direct save/cache 경로를 변경하지 않는다.
- [ ] runtime response normalization이 필요해 보이면 즉시 중단하고 별도 behavior-change 계획을 만든다.
- [ ] targeted tests:
  - [ ] `pnpm vitest run src/routes/api/vocabulary/server.test.ts src/routes/api/domain/server.test.ts src/routes/api/term/server.test.ts`
- [ ] full gate:
  - [ ] `pnpm run format:check`
  - [ ] `pnpm check`
  - [ ] `pnpm run lint`
  - [ ] `pnpm vitest run`

### Upload route wrapper cleanup

상태: 계획 가능. 단, route-specific behavior 보존이 핵심.

근거:

- upload `data.postProcess` payload shape와 download cache-header behavior가 테스트로 잠김.
- 최근 관련 커밋: `308a871 test: 업로드 다운로드 경계 회귀 보강`, `3a18a8d refactor: 다운로드 응답 헬퍼 분리`

체크리스트:

- [ ] upload route별 validation, history capture, merge, postprocess payload를 먼저 표로 재확인한다.
- [ ] 공통화는 request parsing, response value assembly 같은 value-only helper로 제한한다.
- [ ] `domain`/`term` upload의 고유 validation을 공통 wrapper 안으로 숨기지 않는다.
- [ ] `postProcess` 응답 shape를 변경하지 않는다.
- [ ] 실패 응답의 status/body shape를 변경하지 않는다.
- [ ] targeted tests:
  - [ ] `pnpm vitest run src/routes/api/upload/server.test.ts src/routes/api/database/upload/server.test.ts src/routes/api/attribute/upload/server.test.ts src/routes/api/entity/upload/server.test.ts src/routes/api/table/upload/server.test.ts src/routes/api/column/upload/server.test.ts src/routes/api/domain/upload/server.test.ts src/routes/api/term/upload/server.test.ts`
- [ ] full gate:
  - [ ] `pnpm run format:check`
  - [ ] `pnpm check`
  - [ ] `pnpm run lint`
  - [ ] `pnpm vitest run`

### File/mapping orchestration cleanup

상태: 계획 가능. 단, runtime behavior 변경은 별도 승인 필요.

근거:

- file/mapping descriptor cleanup 완료.
- data-registry public `renameFile` / `deleteFile` shared-bundle sync integration coverage 잠김.
- 최근 관련 커밋: `7abe5f4 refactor: 파일 매핑 정본화`, `929ac83 test: 데이터 레지스트리 매핑 동기화 보강`

체크리스트:

- [ ] `data-registry`, `shared-file-mapping-registry`, `db-design-file-mapping`, `mapping-registry`의 책임 경계를 다시 표로 확인한다.
- [ ] route code가 registry sync/cleanup을 중복 수행하지 않게 유지한다.
- [ ] shared mapping bundle 저장/resolve 계약을 변경하지 않는다.
- [ ] rename/delete default fallback behavior를 변경하지 않는다.
- [ ] runtime behavior를 바꾸는 정리 필요성이 발견되면 별도 behavior-change 계획을 만든다.
- [ ] targeted tests:
  - [ ] `pnpm vitest run src/lib/registry/data-registry.file-mapping.test.ts src/lib/registry/shared-file-mapping-registry.test.ts src/lib/registry/db-design-file-mapping.test.ts`
- [ ] full gate:
  - [ ] `pnpm run format:check`
  - [ ] `pnpm check`
  - [ ] `pnpm run lint`
  - [ ] `pnpm vitest run`

## P1 — 결정/지도화가 먼저 필요한 작업

### Sync/cache asymmetry audit

상태: 분석/결정 필요.

체크리스트:

- [ ] `term sync apply`와 `column sync-term apply`의 cache invalidation 부재가 의도된 현재 계약인지 재확인한다.
- [ ] “고쳐야 할 버그”인지 “보존해야 할 비대칭”인지 별도 decision record를 만든다.
- [ ] 변경이 필요하면 behavior-change 계획으로 분리한다.
- [ ] 변경 전 preview/apply route tests를 강화한다.

### Generic validation service 검토

상태: 보류 권장.

체크리스트:

- [ ] vocabulary/domain/term validation endpoint의 status/body shape를 먼저 재점검한다.
- [ ] route별 고유 validation rule이 공통 service 뒤로 숨지 않는지 확인한다.
- [ ] 공통화는 value helper 수준으로 제한 가능한지 검토한다.
- [ ] route response normalization이 필요하면 별도 승인 후 진행한다.

### Release / push handoff

상태: 사용자 승인 필요.

체크리스트:

- [ ] `main`이 `origin/main`보다 앞선 커밋 수를 확인한다.
- [ ] push 전 전체 검증 최신 evidence를 다시 확보한다.
- [ ] push가 필요하면 사용자에게 명시 승인받는다.
- [ ] release note가 필요하면 `docs/CHANGELOG.md` 갱신 여부를 별도 판단한다.

## P2 — UI 대개편과 조율해야 하는 작업

### UI overhaul coordination

상태: 별도 세션과 충돌 방지 필요.

체크리스트:

- [ ] UI 컴포넌트/라우트 시각 구조 변경은 대개편 세션과 충돌 여부를 먼저 확인한다.
- [ ] 백엔드 테스트/route contract 작업은 UI 변경 없이 진행한다.
- [ ] UI 변경이 필요하면 `DESIGN.md`를 먼저 로드한다.
- [ ] UI 대개편 범위로 넘길 항목은 별도 plan으로 분리한다.

## 완료된 최근 안전망

- [x] Standardization CRUD value/helper boundary 축소
- [x] File/mapping descriptor cleanup
- [x] Upload/download boundary test hardening
- [x] Download response helper cleanup
- [x] Data-registry rename/delete integration tests
- [x] Cascade blocked preview route tests

## 보류/금지 조건

- [ ] runtime route/source behavior 변경은 별도 승인 전 금지
- [ ] cascade/upload/download response shape normalization은 별도 승인 전 금지
- [ ] UI 대개편과 충돌하는 변경은 별도 승인 전 금지
- [ ] 새 runtime dependency 추가는 별도 승인 전 금지
- [ ] 원격 push는 별도 승인 전 금지
