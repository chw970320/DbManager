# DbManager 디자인 백로그

Last updated: 2026-06-02

이 문서는 남은 **디자인/UI 작업만** 추적하는 체크리스트입니다. 제품/UI 철학과 원칙의 정본은 루트 [`../DESIGN.md`](../DESIGN.md)이며, 이 문서는 `DESIGN.md`를 대체하지 않습니다.

## 역할과 범위

- 역할: 완료된 UI overhaul 상태, 남은 디자인 감사 항목, Visual QA 게이트, 후속 UI 계획 후보를 추적한다.
- 정본: 디자인 철학/원칙은 [`../DESIGN.md`](../DESIGN.md)를 따른다.
- 실행 기준: 작업 전 루트 [`../AGENTS.md`](../AGENTS.md)를 읽고 검증/커밋 규칙을 따른다.
- 분리 기준: 백엔드 유지보수 항목은 [`MAINTENANCE_CHECKLIST.md`](./MAINTENANCE_CHECKLIST.md)에서 관리한다.

## 완료된 디자인 기반

- [x] 루트 `DESIGN.md` 정본화
- [x] 저장 영향/차단/검토 필요/영향 없음 상태 표시 강화
- [x] 검증 패널의 색상 비의존 상태/심각도 문구 보강
- [x] 표준화 테이블의 로딩/빈 상태/검색 결과/하이라이트 표현 정리
- [x] DB 설계 테이블의 로딩/빈 상태/검색 결과/하이라이트 표현 정리
- [x] `ColumnFilter`의 적용 상태와 접근성 상태 보강
- [x] 공통 `SearchBar`의 검색 landmark, 로딩, 고급 검색 상태 노출
- [x] 프로파일링 browse 컨트롤을 공통 `ActionBar`/`SearchBar` 흐름에 맞춤
- [x] 업로드 이력 복구 패널의 파일명/오류/복원 맥락 표시 보강
- [x] 관계 패널의 severity/source/preview/reason trace cue 보강
- [x] 품질 규칙 browse의 severity/scope/metric/threshold/target trace 표시
- [x] 용어 검증 패널 디버그 출력 제거 및 DOM 이벤트 회귀 보강
- [x] 저장소 전체 `pnpm run format:check` 통과 상태 회복

## P0 — 바로 필요한 디자인 작업

### Visual QA evidence gate

상태: 완료됨. 비파괴적으로 접근 가능한 route screenshot을 수집했고, 후속 fixture blocker 4종도 screenshot evidence로 확인했습니다.

근거:

- Visual QA report: `.omx/plans/design-visual-qa-report-20260602T013737Z.md`
- Screenshot evidence: `.omx/plans/visual-qa-screenshots/`
- Fixture evidence report: `.omx/plans/design-fixture-evidence-20260602T043758Z.md`
- Fixture screenshot evidence: `.omx/plans/design-fixture-screenshots/20260602T043758Z/`
- UI source 변경: 없음

목표:

- 기존 테스트 중심 검증을 보완해 실제 브라우저/스크린샷 또는 명시적 blocker 근거를 남긴다.
- 결함이 발견되면 즉시 수정하지 않고 별도 후속 스펙/계획으로 분리한다.

필수 확인 흐름:

- [x] 저장 영향/파괴적 확인: component-test evidence 확인, live screenshot은 fixture 필요 blocker로 기록
- [x] 검증 패널: route smoke 확인, expanded/error state는 fixture 필요 blocker로 기록
- [x] 표준화 dense table: `/domain/browse` screenshot 수집
- [x] DB 설계 dense table: `/database/browse` screenshot 수집
- [x] bundle/recovery: `/snapshot/browse` screenshot 수집, upload/file-manager mutation state는 fixture blocker로 기록
- [x] relation/sync: `/erd`와 DB relation summary smoke 확인, apply/sync mutation state는 fixture blocker로 기록
- [x] operations/quality: `/profiling/browse`, `/quality-rule/browse` screenshot 수집
- [x] ERD/relation: `/erd` route smoke screenshot 수집

완료 기준:

- [x] `.omx/plans/design-visual-qa-report-*.md`에 flow별 pass/fail/blocked 기록
- [x] 각 flow가 `DESIGN.md` 원칙 또는 open question에 매핑됨
- [x] UI source file 수정 없음
- [x] 발견 결함 없음; fixture가 필요한 screenshot state만 후속 blocker로 분리

Fixture blocker 처리 결과:

- [x] 저장 영향 modal screenshot fixture: `screenshot-pass`
- [x] validation panel expanded/error screenshot fixture: `screenshot-pass`
- [x] upload restore/file-manager mapping screenshot fixture: `screenshot-pass`
- [x] sync preview/apply screenshot fixture: `screenshot-pass`

## P1 — 후속 디자인 계획 후보

### Bundle confidence and recovery cues

상태: Visual QA 이후 계획화.

- [ ] 파일 관리 모달에서 현재 번들/파일 식별이 충분히 드러나는지 확인
- [ ] 파일 관리 모달 heading이 dialog accessible name으로 연결되는지 확인
- [ ] 업로드/복원/스냅샷 흐름에서 영향 파일 집합과 복구 경로가 명확한지 확인
- [ ] reset-backed upload history fixture 도입 여부 결정
- [ ] 공통 매핑 번들 identity를 숨기지 않음
- [ ] API/storage shape 변경 없이 기존 데이터로 표현 가능한지 우선 검토

### Standardization health indicators

상태: Visual QA 이후 계획화.

- [ ] `aligned` / `recommended` / `unmatched` 상태 표현 감사
- [ ] validation severity와 guidance 문구의 일관성 감사
- [ ] vocabulary/domain/term과 DB 설계 표면 간 표현 차이 정리
- [ ] 기존 `summary`, `issues`, `changes`, `guidance`에서 파생 가능한 표현 우선

### Alignment / sync result readability

상태: Visual QA 이후 계획화.

- [ ] preview/apply 모드가 명확히 구분되는지 확인
- [ ] direct apply screenshot fixture는 reversible/reset-backed apply 조건 확정 후 진행
- [ ] `failedStep`, owner trace, 남은 validation issue가 숨겨지지 않는지 확인
- [ ] 후보 변경 사유와 후속 조치가 한국어로 충분히 설명되는지 확인
- [ ] backend owner name과 `failedStep` 의미 보존

### ERD / relation visual QA lane

상태: 별도 visual QA 후 계획화.

- [ ] 큰 그래프 탐색 UX 확인
- [ ] 빈 관계/희박 관계 상태 확인
- [ ] relation severity 설명과 관계 패널 연결성 확인
- [ ] Graphviz layout 알고리즘 변경은 visual polish와 분리

## P2 — 설계 결정이 먼저 필요한 후보

### Component primitive convergence

상태: 결정 필요.

- [ ] table pagination/sort/filter를 어느 수준까지 공통 primitive로 만들지 결정
- [ ] validation panel shell parity 범위 결정
- [ ] impact/confirmation severity 모델 표준화 범위 결정
- [ ] browse shell 규칙을 어디까지 강제할지 결정

### Home / global navigation / IA audit

상태: 감사 필요.

- [ ] 홈 카드와 전역 navigation의 route grouping 확인
- [ ] breadcrumb와 메뉴 label의 사용자 문서 정합성 확인
- [ ] 작은 화면에서 navigation 이해 가능성 확인
- [ ] Korean label과 docs/test alignment 보존

## 명시적 제외

- [ ] 백엔드 CRUD/wrapper/commonization 작업
- [ ] API response/storage contract 변경
- [ ] 새 UI dependency 또는 새 design system 도입
- [ ] 장식적 novelty 중심의 전면 redesign
- [ ] 원격 push/release handoff
- [ ] Visual QA 이전의 직접 UI source 수정

## 실행 가드레일

- [ ] UI 수정 전 browser/screenshot 또는 blocker evidence를 먼저 남긴다.
- [ ] source 변경이 필요하면 별도 plan/spec으로 분리한다.
- [ ] visible behavior 또는 label이 바뀌면 사용자 문서와 targeted test를 같은 작업 단위에서 갱신한다.
- [ ] 색상만으로 validation/warning/error 상태를 구분하지 않는다.
- [ ] dense table의 검색/필터/정렬/빈 상태/로딩 상태 접근성을 보존한다.
- [ ] 위험 작업 전 영향 파일, 대상 모델, 복구 경로를 한국어 문구로 드러낸다.
