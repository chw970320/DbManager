# 변경 이력

## 2026-06-09

### 요약

- ERD 화면의 관계 검증 표시를 미매칭·오류·경고 건수만 보이도록 축소했습니다.
- FK 외부참조 체크박스와 렌더/생성 API 파라미터 계약은 유지했습니다.
- ERD 미리보기에서 테이블 위치를 현재 세션 동안 드래그로 조정하고, 수정된 배치를 SVG/PNG 다운로드에 반영할 수 있게 했습니다.

### 상세 변경

- ERDViewer 안내 영역과 `/erd` 데이터 연관관계 요약에서 관계 검증 이슈 상세, 참여 정의서,
  수정 대상, 조치 가이드를 숨겼습니다.
- 관계 검증 API 응답, validation report, 정의서 유효성 검사 패널의 상세 데이터와 조치 가이드는
  그대로 유지했습니다.
- `/erd`의 별도 이미지 다운로드 카드를 제거하고 ERDViewer 상단에 현재 배치 기준 SVG/PNG
  다운로드 버튼을 배치했습니다.
- 수동 테이블 배치는 서버에 저장하지 않으며 파일, 조건, 선택 테이블, 새로고침 변경 시 초기화됩니다.
- 수동 배치 다운로드는 현재 노드 위치 기준으로 SVG viewBox를 확장해 잘림을 방지하고, 미수정
  PNG는 기존 서버 렌더를 사용하도록 유지했습니다.

## 2026-06-04

### 요약

- DB/엔터티/속성/테이블/컬럼 정의서에 후보 선택형 관계 유효성 검사와 자동 수정 패널을 추가했습니다.
- ERD 관계 검증 요약에서도 같은 미매칭·후보·조치 가이드 정보를 표시하도록 맞췄습니다.
- 용어 browse의 `용어계 관계 진단 요약` 카드와 5개 정의서 browse의 `연관 파일` 패널을 제거했습니다.
- 관계 검증·보정 API와 파일 매핑 기능은 ERD, validation report, 자동 반영, 파일 관리 mapping tab에서 계속 쓰는 내부 capability로 보존했습니다.

### 상세 변경

- 6개 canonical 관계 규칙(DB↔엔터티, 엔터티↔속성, 엔터티↔테이블, 테이블↔컬럼, 속성↔컬럼 키, 표준 참조)을 기준으로 `validation.issues[].candidates/manualTargets/actionGuide`를 반환합니다.
- `/api/validation/design-relations`, `/preview`, `/apply`를 추가하고, 신규 검증 API는 완전한 8종 파일 번들이 없으면 400으로 처리합니다.
- 후보가 여러 개인 이슈는 사용자가 후보 정의서를 선택해야 미리보기/자동 수정이 가능하며, 후보가 없거나 `autoFixable=false`이면 수동 수정만 허용합니다.
- 신규 검증 API는 8종 파일명뿐 아니라 단어집/도메인/용어 파일의 실제 로딩 가능 여부까지 확인하며, 통합 validation report에도 relation 후보/조치 가이드 메타데이터를 유지합니다.
- `/api/erd/relations`는 canonical 검증 서비스를 사용하는 호환 API로 유지하고, `/api/erd/relations/sync`는 레거시 동기화 미리보기만 제공하며 `apply=true`는 410으로 차단합니다.
- ERD 화면의 데이터 연관관계 요약과 ERDViewer 안내 영역은 관계 미매칭의 후보 수, 후보 요약, 조치 가이드를 표시합니다.
- `term/browse`는 더 이상 `/api/term/relationship-summary`를 호출하지 않으며 전용 route와 회귀 테스트도 제거했습니다.
- database/entity/attribute/table/column browse 화면에서 `DesignRelationPanel` 기반 `연관 파일` 섹션을 삭제했습니다.
- 삭제된 패널 전용 component/test와 E2E screenshot fixture를 정리하고, 회귀 스크립트와 디자인 백로그의 active 참조를 갱신했습니다.
- ERD, validation report, upload postprocess, alignment sync, shared file mapping, 파일 관리 mapping tab은 보존했습니다.

## 2026-06-01

### 요약

- 8종 파일 매핑 정본을 `shared-file-mappings.json` v2로 고정했습니다.
- 서버 시작/첫 registry 접근에서 기존 공유 매핑, `registry.json`, 레거시 `mapping` 필드를 자동 마이그레이션합니다.
- 마이그레이션 후 `registry.json`과 파일 내 `mapping`은 런타임 fallback이 아니라 마이그레이션 입력으로만 사용합니다.

### 상세 변경

- `/api/*/files/mapping` 응답 shape은 유지하면서 canonical shared bundle만 조회/저장하도록 정리했습니다.
- 비기본 파일에 v2 공유 번들이 없거나 v2 파일이 손상된 경우 fail-fast 오류를 반환합니다.
- 파일 생성은 기본 관련 파일을 가진 v2 공유 번들을 seed하고, rename/delete는 공통 매핑 파일만 결정적으로 동기화합니다.
- `registry.json` 파일 매핑 dual-write와 best-effort 동기화를 제거했습니다.

## 2026-05-29

### 요약

- `AGENTS.md`를 DbManager 에이전트 작업 지침의 단일 기준으로 정리했습니다.
- `docs/` 문서를 사용자 가이드, 현재 API/데이터 모델 명세, 변경 이력 중심으로 경량화했습니다.
- 전역 `dbmanager-workflow` 스킬은 저장소 `AGENTS.md`로 위임하는 포인터로 축소했습니다.
- 데이터베이스 정의서 테이블과 공통 컬럼 필터를 대표 UI 슬라이스로 삼아 루트 `DESIGN.md`의 시맨틱 토큰/공통 상태 패턴을 실제 코드에 반영했습니다.
- 저장 전 영향도와 단어집/도메인 유효성 검사 패널에 색상만으로 구분되지 않는 상태/심각도 문구를 보강했습니다.
- Node.js 20+ / pnpm 11.2+ 실행 기준을 `package.json`과 빠른 시작 문서에 고정했습니다.

### 상세 변경

- 삭제/병합 대상 문서는 `docs/README.md`의 2026-05-29 cleanup audit summary에 남겼습니다.
- 루트 `DESIGN.md`를 제품/UI 디자인 기준으로 추가하고, legacy `docs/DESIGN.md` 초안은 백업 후 제거했습니다.
- 관계 동기화 정책의 활성 참조를 `docs/specs/data-model.md`로 통합했습니다.
- `DatabaseTable`과 공통 `ColumnFilter`의 raw Tailwind color 조합을 `brand`/`surface`/`content`/`border`/`status` 토큰 기반 표현으로 정리했습니다.
- `ColumnFilter`의 미구현 `text|select` 분기 계약을 제거하고 현재 동작인 고유값 선택 필터로 API를 명확히 했습니다.
- `ColumnFilter`의 활성 필터 상태를 `적용` 배지, `aria-pressed`, 현재 선택값 안내로 보강해 색상만으로 상태를 구분하지 않게 했습니다.
- 빈 결과 UI는 공통 `EmptyState`, 로딩 행은 공통 `Skeleton`을 사용하도록 바꾸고 table `aria-busy`/caption으로 로딩 상태를 노출했습니다.
- 단어집/도메인/용어 테이블의 로딩/빈 상태를 공통 `Skeleton`/`EmptyState`와 table caption으로 정리해 표준화 화면의 상태 표현을 수렴시켰습니다.
- 엔터티/속성/테이블/컬럼 정의서 테이블도 같은 공통 상태 컴포넌트와 시맨틱 토큰을 사용하도록 정리했습니다.
- 공통 `SearchBar`는 `role="search"`, 로딩 `aria-busy`, 고급 검색 펼침 상태를 노출하고 시맨틱 토큰 기반 스타일을 사용합니다.
- 프로파일링 browse 화면의 대상 조회 액션과 테이블 필터를 공통 `ActionBar`/`SearchBar` 패턴에 맞췄습니다.
- 업로드 교체 이력 패널은 대상 파일명, 오류 알림, 로딩 상태, 복원 버튼 맥락을 접근 가능한 복구 흐름으로 노출합니다.
- 공통 연관 상태 패널은 관계 심각도, 매칭 출처, 보정 미리보기/응답 모드, 변경 후보 근거를 텍스트로 함께 표시합니다.
- 품질 규칙 목록은 활성 여부와 별개로 규칙 심각도를 한국어 라벨과 원본 severity 값으로 함께 표시합니다.
- DB 설계/표준화 테이블의 검색어 하이라이트는 `{@html}` 삽입 대신 공통 텍스트 세그먼트 helper와 `<mark>`를 직접 렌더링하도록 바꿔 업로드 데이터의 HTML 문자열이 실행되지 않게 했습니다.
- `Skeleton`도 `bg-surface-raised` 기반 토큰을 사용하도록 조정해 향후 테이블 상태 UI 수렴의 기준을 마련했습니다.
- 표준화/DB 설계 테이블과 컬럼 필터 테스트에 빈 상태, 검색 빈 상태, 로딩 접근성, 안전한 하이라이트, 정렬, 페이지 이동, 필터 적용 회귀 검증을 보강했습니다.
- `ImpactConfirmDialog`와 `EditorSaveImpactSummary`는 `저장 차단`, `검토 필요`, `원본 변경`, `영향 없음` 상태를 명시해 원본/연관 파일 영향과 취소 시 복구 경로를 더 분명히 보여줍니다.
- 단어집/도메인 유효성 검사 패널은 `상태: 검토 필요` 또는 `상태: 통과`와 오류 코드 배지를 함께 표시해 색상에 의존하지 않고 문제 항목을 확인할 수 있습니다.
- 용어 유효성 검사 패널은 디버그 로그를 제거하고 필터/검색/용어 수정/자동 수정 동작을 실제 DOM 이벤트 테스트로 고정했습니다.
- `packageManager`와 `engines`로 Node.js 20+ / pnpm 11.2+ 개발 환경 기준을 명시하고, QUICK_START의 오래된 Node 18 권장 문구를 현재 기준으로 갱신했습니다.

## 2026-05-28

### 요약

- ERD 미리보기를 단순 이미지 스크롤에서 inline SVG 기반 탐색 뷰어로 전환했습니다.
- ERD 보기 도구에 **맞춤**, **100%**, **축소**, **확대**, **초기화**와 drag 이동을 추가했습니다.
- 관계가 없거나 희박한 Graphviz ERD의 세로형 단일 스택을 줄이도록 disconnected graph packing을 개선했습니다.
- 용어 변환기에 **한글→영문 / 영문→한글** 방향 토글을 추가해, 영문 약어 조합을 연결 단어집 기준 한글 표준단어명으로 조회할 수 있게 했습니다.

### 상세 변경

1. ERD 미리보기 탐색 UX 개선

- 대상:
  - `src/lib/components/ERDViewer.svelte`
- 변경:
  - `/api/erd/render?format=svg` 응답을 같은 출처에서 fetch해 inline SVG로 표시
  - 이전 render 요청은 `AbortController`와 request sequence로 취소/무시해 stale SVG가 현재 화면을 덮지 않도록 처리
  - `Content-Type`, SVG root, 위험 태그/속성 제거를 거친 뒤 미리보기에 주입
  - SVG URL guard/sanitizer는 ERD Graphviz preview 전용 유틸로 분리하고, 범용 SVG sanitizer로 재사용하지 않도록 boundary를 명시
  - 최초 로드와 초기화는 미리보기 영역에 맞춤 배율로 가운데 정렬
  - 100% 보기, 확대/축소, 맞춤, 초기화, pointer drag 이동 지원

2. Graphviz layout packing 개선

- 대상:
  - `src/lib/utils/graphviz-dot.ts`
- 변경:
  - 관계가 없는 다중 테이블 모델은 `pack=12`, `packmode="array_iN"`, tighter spacing을 사용해 grid형 배치를 유도
  - 관계가 있는 모델은 기존 `rankdir=LR`, `splines=ortho`, crow/tee edge 계약을 유지하면서 보수적 packing 적용
  - 화면 미리보기와 SVG/PNG 다운로드가 같은 개선 DOT를 사용

3. 테스트/문서 갱신

- 대상:
  - `src/lib/components/ERDViewer.test.ts`
  - `src/lib/utils/graphviz-dot.test.ts`
  - `src/lib/utils/erd-svg-preview.test.ts`
  - `src/routes/api/erd/render/server.test.ts`
  - `docs/USER_GUIDE.md`
  - `docs/tests/ERD_TEST_DESCRIPTION.md`
- 변경:
  - viewer toolbar, SVG guard/sanitization, zoom/reset/pan, sparse graph packing, render API layout DOT 전달 테스트 추가
  - ERD 사용자 가이드에 보기 도구와 improved SVG/PNG 배치 정책 설명 추가

4. 용어 변환기 역방향 조회

- 대상:
  - `src/lib/components/TermGenerator.svelte`
  - `src/lib/components/TermGenerator.test.ts`
  - `src/routes/api/generator/+server.ts`
  - `src/routes/api/generator/server.test.ts`
  - `src/routes/api/generator/segment/+server.ts`
  - `src/routes/api/generator/segment/server.test.ts`
  - `docs/USER_GUIDE.md`
  - `docs/QUICK_START.md`
  - `docs/tests/TERM_TEST_DESCRIPTION.md`
- 변경:
  - 단일 변환 방향 토글 버튼으로 기본 한글→영문 흐름을 유지하면서 영문→한글 조회 모드를 추가
  - 영문→한글 모드는 연결된 단어집의 `abbreviation → standardName` 기준으로 결과를 표시하고, 조회 전용 요구에 맞춰 validation 및 `새 용어 추가` 액션을 숨김
  - 미매칭 영문 약어는 기존 변환기 계약처럼 `##`으로 표시
  - generator API와 segment API가 지원하지 않는 `direction` 값을 400으로 거부하도록 보강
  - 역방향 API 결과와 UI 조회 전용 동작을 회귀 테스트로 고정

## 2026-05-22

### 요약

- ERD 화면의 정의서 파일 선택/매핑 기준은 좌측 제어판에 유지하고, 조회 조건/테이블 선택/이미지 다운로드는 본문 제어 영역으로 이동했습니다.
- ERD 주제영역/스키마 조회 조건에서 `전체` 옵션을 제거하고, 최초 조건 결과 테이블을 기본 전체 선택하되 테이블 선택은 접힌 상태로 시작합니다.
- ERD API가 `columnFile`만 받아도 공통 파일 매핑으로 관련 정의서와 테이블 정의서를 해석하도록 보강했습니다.
- ERD 이미지가 `excel2image` 샘플 방향의 정보 구성에 가깝도록 PK/FK/NN 열, 사업범위 색상, 명시 FK 관계선, 관계 metadata 표시를 보강했습니다.
- 논리/물리 ERD의 이름 label에서 한글·영문 보조명을 섞지 않도록 분리하고, FK 칸의 `PK01` 같은 PK 순번 값은 관계로 해석하지 않도록 정리했습니다.
- ERD 이미지에서 그래프 제목, 주제영역/사업범위 문구, 컬럼 머리행, 관계선 라벨을 제거해 핵심 테이블/컬럼 정보만 보이도록 정리했습니다.
- 대형 ERD의 PNG 다운로드 글자 깨짐을 줄이기 위해 기본 PNG 렌더링을 192DPI로 높이고 `pngDpi` 조정 파라미터를 추가했습니다.
- Graphviz 이미지 렌더에 영향을 주지 않는 `관련 논리 정의 포함` 화면 옵션을 제거해 조회 조건을 단순화했습니다.

### 상세 변경

1. ERD 좌측 제어판 전환

- 대상:
  - `src/routes/erd/+page.svelte`
- 변경:
  - `BrowsePageLayout`의 `sidebarSurface="plain"` 패턴으로 ERD 파일 선택과 매핑 기준을 좌측 제어판에 배치
  - 컬럼 정의서 파일만 직접 선택하고, 테이블 정의서는 매핑된 파일명을 읽기 전용으로 표시
  - 주제영역/스키마 단일 selectbox를 본문 조회 조건 카드에서 제공
  - 테이블명 검색, 테이블 다중 선택, 사업범위여부, FK 외부참조 포함/제외, SVG/PNG 다운로드를 본문 상단 제어 영역으로 이동
  - 현재 Graphviz 이미지 렌더 범위와 무관한 `관련 논리 정의 포함` 체크박스를 화면에서 제거
  - 기존 상단 필터 패널과 수동 `ERD 생성` 버튼 제거

2. ERD 조회 범위 기본값 조정

- 대상:
  - `src/routes/erd/+page.svelte`
- 변경:
  - 주제영역/스키마 selectbox에서 `전체` 옵션을 제거하고 첫 유효 주제영역/스키마를 자동 선택
  - 컬럼 정의서 로드 후 현재 조건 결과의 테이블을 기본 전체 선택
  - 테이블 선택 카드는 기본 접힘 상태로 표시하고, 펼친 뒤 테이블명 검색과 전체 선택/해제 및 개별 선택을 수정하도록 정리

3. ERD API 파일 매핑/필터 계약 보강

- 대상:
  - `src/lib/utils/erd-file-context.ts`
  - `src/lib/utils/erd-filter.ts`
  - `src/routes/api/erd/tables/+server.ts`
  - `src/routes/api/erd/render/+server.ts`
  - `src/routes/api/erd/generate/+server.ts`
  - `src/routes/api/erd/relations/sync/+server.ts`
- 변경:
  - `columnFile` 기준 공통 파일 매핑으로 `tableFile`과 관련 정의서를 서버에서 해석
  - `/api/erd/tables` 응답에 주제영역/사업범위 정보를 포함
  - `/api/erd/generate`가 렌더 API와 같은 주제영역/스키마/검색/사업범위/FK 외부참조 필터 계약을 처리

4. 테스트/문서 갱신

- 대상:
  - `src/lib/utils/erd-file-context.test.ts`
  - `src/routes/erd/page-source.test.ts`
  - `src/routes/api/erd/tables/server.test.ts`
  - `src/routes/api/erd/render/server.test.ts`
  - `src/routes/api/erd/generate/server.test.ts`
  - `docs/USER_GUIDE.md`
  - `docs/specs/api-reference.md`
  - `docs/tests/ERD_TEST_DESCRIPTION.md`

5. ERD 이미지 품질/관계 metadata 보강

- 대상:
  - `src/lib/utils/erd-fk-reference.ts`
  - `src/lib/utils/erd-graphviz-model.ts`
  - `src/lib/utils/graphviz-dot.ts`
  - `src/lib/utils/erd-filter.ts`
  - `src/lib/utils/erd-mapper.ts`
  - `src/lib/utils/erd-generator.ts`
  - `src/lib/types/erd-mapping.ts`
  - `src/lib/components/ERDViewer.svelte`
- 변경:
  - FK 파서를 공유 유틸리티로 분리해 Graphviz 모델, 외부참조 필터, 기존 ERD mapping/generate 경로가 `schema.table.column`과 `table.column` 축약형을 동일하게 해석하도록 정리
  - `Y/YES/TRUE` FK 값은 관계 대상이 아닌 FK marker로만 유지하고, 컬럼명만 있는 1-part 값은 관계를 추론하지 않도록 조정
  - 같은 source/target 테이블 사이 복수 FK를 Graphviz 관계 1개로 축약
  - DOT HTML label에 PK/FK/NN 좁은 열, 타입 길이/소수점 표시, 사업범위 `#4A90E2`, 사업범위 외 `#9B9B9B`, 외부참조 회색/점선 스타일을 반영
  - ERDData metadata에 Graphviz 이미지 기준 `totalRelationships`, `externalRelationships`, `unresolvedForeignKeys`를 추가하고 ERDViewer는 구조적 edge 수 대신 관계 수를 표시
  - FK 칸에 들어온 `PK01`/`PK02` 같은 PK 순번 값은 명시 참조가 아니므로 FK marker, warning, 관계선에서 제외
  - 논리 ERD label은 한글 테이블/컬럼명만, 물리 ERD label은 스키마 접두어를 제외한 테이블 영문명과 컬럼 영문명만 표시하도록 DOT 직렬화 조정
  - 그래프 전체 제목, 주제영역 행, 사업범위 문구 행, `PK/FK/컬럼/타입/NN` 머리행, 관계선 라벨은 제거하고 사업범위 색상과 외부참조 점선 스타일은 유지
  - PNG 렌더링은 기본 192DPI를 사용하고, 필요 시 `pngDpi=96..600` 범위에서 조정 가능하도록 지원

6. ERD 품질 테스트/문서 갱신

- 대상:
  - `src/lib/utils/erd-graphviz-model.test.ts`
  - `src/lib/utils/graphviz-dot.test.ts`
  - `src/lib/utils/erd-filter.test.ts`
  - `src/lib/utils/erd-mapper.test.ts`
  - `src/lib/utils/erd-generator.test.ts`
  - `src/lib/components/ERDViewer.test.ts`
  - `docs/USER_GUIDE.md`
  - `docs/specs/data-model.md`
  - `docs/specs/api-reference.md`
  - `docs/tests/ERD_TEST_DESCRIPTION.md`
  - `README.md`
- 변경:
  - 명시 FK만 관계선을 생성하고, 픽셀 단위 `excel2image` 동일성은 비목표임을 문서화
  - 이미지 관계 metadata와 기존 구조적 edge 수의 의미 차이를 API/데이터 모델 문서에 반영

### 요약

- ERD 화면에서 렌더러 기술명 노출과 중복 헤더를 제거했습니다.
- ERD 이미지 렌더링 폰트 스택을 서비스 기본 폰트 우선순위와 맞췄습니다.

### 상세 변경

1. ERD 화면 문구 정리

- 대상:
  - `src/lib/components/ERDViewer.svelte`
  - `src/routes/erd/+page.svelte`
- 변경:
  - 미리보기 영역의 별도 헤더와 렌더러 설명 문구 제거
  - 이미지 로딩/오류/메타데이터 문구에서 렌더러 기술명 제거

2. ERD 이미지 폰트 정렬

- 대상:
  - `src/app.css`
  - `src/lib/utils/graphviz-dot.ts`
- 변경:
  - 서비스와 ERD 이미지 모두 `Pretendard Variable`, `Pretendard`, `Inter` 순서의 폰트 스택을 우선 사용

## 2026-05-21

### 요약

- ERD 화면이 Mermaid 런타임 대신 Graphviz 기반 SVG/PNG 이미지 생성으로 전환되었습니다.
- 주제영역, 스키마, 테이블명 검색, 사업범위여부, FK 외부참조 포함/제외 필터를 지원합니다.
- BKSP 테이블 정의서 형식의 `순번/schema/테이블 영문명` 헤더 매핑을 보정했습니다.

### 상세 변경

1. Graphviz ERD 모델/API/UI 추가

- 대상:
  - `src/lib/utils/erd-graphviz-model.ts`
  - `src/lib/utils/graphviz-dot.ts`
  - `src/lib/server/graphviz-renderer.ts`
  - `src/routes/api/erd/render/+server.ts`
  - `src/lib/components/ERDViewer.svelte`
  - `src/routes/erd/+page.svelte`
- 변경:
  - 테이블 정의서와 컬럼 정의서를 `schemaName + tableEnglishName` 기준으로 조인해 ERD 모델 생성
  - 논리/물리 모드와 SVG/PNG 렌더링 API 제공
  - Graphviz `dot` CLI 누락/실패 시 설치 안내가 포함된 오류 응답 제공
  - ERD 화면에 Graphviz 미리보기, 필터, SVG/PNG 다운로드 연결

2. 테이블 정의서 업로드 매핑 보정

- 대상:
  - `src/lib/utils/database-design-xlsx-parser.ts`
- 변경:
  - `순번`, `schema`, `테이블 영문명`, `테이블 유형`, `공개/비공개 여부`처럼 공백/영문이 섞인 헤더를 헤더명 기준으로 매핑
  - 기존 `번호`, `스키마명`, `테이블영문명` 형식도 계속 지원

3. 런타임 의존성/문서/테스트 동기화

- 대상:
  - `Dockerfile`
  - `package.json`, `pnpm-lock.yaml`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/tests/ERD_TEST_DESCRIPTION.md`
  - `docs/USER_GUIDE.md`
  - `README.md`
- 변경:
  - Docker 런타임에 `graphviz`와 CJK 폰트 설치
  - Mermaid npm 런타임 의존성 제거
  - ERD Graphviz API/데이터 모델/사용법/검증 문서 반영

## 2026-04-09

### 요약

- 단어집, 도메인, 용어집 수정 시 잠겨 있던 필드를 편집할 수 있게 되었고, 저장 전 영향도 확인과 3영역 내부 자동 반영/롤백이 추가되었습니다.
- 영향도 계산과 자동 반영 범위에서 컬럼 정의서는 제외됩니다.

### 상세 변경

1. 3영역 수정 저장 영향도/자동 반영/롤백 추가

- 대상:
  - `src/lib/components/VocabularyEditor.svelte`
  - `src/lib/components/DomainEditor.svelte`
  - `src/lib/components/TermEditor.svelte`
  - `src/lib/components/ImpactConfirmDialog.svelte`
  - `src/routes/browse/+page.svelte`
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/term/browse/+page.svelte`
  - `src/routes/api/vocabulary/+server.ts`
  - `src/routes/api/domain/+server.ts`
  - `src/routes/api/term/+server.ts`
  - `src/routes/api/vocabulary/impact-preview/+server.ts`
  - `src/routes/api/domain/impact-preview/+server.ts`
  - `src/routes/api/term/impact-preview/+server.ts`
  - `src/lib/utils/cascade-update-plan.ts`
  - `src/lib/utils/cascade-update-transaction.ts`
- 변경:
  - 수정 모드에서 기존 잠금 필드를 편집 가능하도록 해제
  - 수정 저장 시 영향이 0건이어도 항상 영향도 확인 다이얼로그 표시
  - 단어집/도메인/용어집 3영역 안에서만 연쇄 자동 반영 수행
  - 비결정적 자동 반영은 충돌로 차단
  - 연쇄 저장 중 실패 시 요청 단위 롤백 수행
  - 컬럼 정의서는 영향도/자동 반영 범위에서 제외

2. 테스트/문서 동기화

- 대상:
  - `src/lib/components/ImpactConfirmDialog.test.ts`
  - `src/lib/components/VocabularyEditor.test.ts`
  - `src/lib/components/DomainEditor.test.ts`
  - `src/lib/components/TermEditor.test.ts`
  - `src/lib/utils/cascade-update-rules.test.ts`
  - `src/lib/utils/cascade-update-plan.test.ts`
  - `src/lib/utils/cascade-update-transaction.test.ts`
  - `src/routes/api/vocabulary/impact-preview/server.test.ts`
  - `src/routes/api/domain/impact-preview/server.test.ts`
  - `src/routes/api/term/impact-preview/server.test.ts`
  - `docs/specs/api-reference.md`
  - `docs/tests/COMMON_UTILS_TEST_DESCRIPTION.md`
  - `docs/tests/VOCABULARY_TEST_DESCRIPTION.md`
  - `docs/tests/DOMAIN_TEST_DESCRIPTION.md`
  - `docs/tests/TERM_TEST_DESCRIPTION.md`
  - `README.md`
- 변경:
  - 수정 저장 영향도, 연쇄 자동 반영, 충돌 차단, 롤백 회귀 포인트를 테스트/문서에 반영

## 2026-04-09

### 요약

- 파일 업로드가 단순 교체 한 가지 흐름으로 정리되었고, 업로드 교체 이력 조회/복원이 추가되었습니다.

### 상세 변경

1. 업로드 단일화 및 후속 매핑 자동 저장

- 대상:
  - `src/lib/components/FileUpload.svelte`
  - `src/lib/components/*FileManager.svelte`
  - `src/lib/utils/upload-orchestration.ts`
- 변경:
  - 업로드 UI에서 검증/동기화 선택을 제거하고 단순 교체만 남김
  - 업로드 성공 후 현재 화면 매핑값을 자동 저장하도록 공통 후처리 연결
  - 업로드 성공과 매핑 저장 실패를 분리 표시하도록 부분 성공 계약 추가

2. 업로드 교체 이력/복원 및 30일 보존

- 대상:
  - `src/lib/registry/upload-history-registry.ts`
  - `src/lib/registry/upload-history-scheduler.ts`
  - `src/routes/api/upload-history/+server.ts`
  - `src/routes/api/upload-history/restore/+server.ts`
  - `src/lib/components/UploadHistoryPanel.svelte`
  - `src/hooks.server.ts`
- 변경:
  - 업로드 교체 직전 JSON 본문을 타입별 settings 저장소에 기록
  - 같은 파일의 업로드 교체 이력을 조회하고 특정 시점 JSON 본문으로 복원하는 API/UI 추가
  - `lazy prune`를 기본 경로로, `hooks.server.ts` scheduler를 보조 경로로 사용해 30일 지난 이력 자동 삭제

3. 테스트/문서 동기화

- 대상:
  - `src/lib/components/FileUpload.test.ts`
  - `src/lib/components/VocabularyFileManager.test.ts`
  - `src/lib/components/TermFileManager.test.ts`
  - `src/lib/components/DatabaseFileManager.test.ts`
  - `src/lib/registry/upload-history-registry.test.ts`
  - `src/routes/api/upload-history/server.test.ts`
  - `src/routes/api/upload-history/restore/server.test.ts`
  - `docs/CONVENTIONS.md`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/tests/COMMON_UTILS_TEST_DESCRIPTION.md`
  - `docs/tests/DATABASE_TEST_DESCRIPTION.md`
  - `docs/tests/TERM_TEST_DESCRIPTION.md`
  - `docs/tests/VOCABULARY_TEST_DESCRIPTION.md`
  - `README.md`
- 변경:
  - 업로드 단일화, 자동 매핑 저장, upload-history registry/API/UI, reset baseline 회귀를 테스트와 문서에 반영

## 2026-04-08

### 요약

- 저장소 작업 가이드에 "작업 단위 완료 후 자동 커밋" 원칙이 추가되었습니다.

### 상세 변경

1. 자동 커밋 운영 규칙 명문화

- 대상:
  - `AGENTS.md`
  - `docs/CONVENTIONS.md`
  - `README.md`
- 변경:
  - 작업 단위가 구현, 검증, 문서/TDD 업데이트까지 끝나면 별도 커밋을 생성하도록 기본 원칙 추가
  - 관련 없는 사용자 변경은 커밋에 섞지 않고, 안전하게 분리할 수 없으면 차단 사유를 남기도록 예외 기준 명시
  - 사용자 명시적 지시가 있을 때만 자동 커밋 원칙을 생략하도록 README와 개발 컨벤션에 동기화

## 2026-04-08

### 요약

- 용어 browse에서 파일을 바꿔도 용어 변환기가 새 파일 기준으로 단어 조합/변환 결과를 다시 계산합니다.
- validation 요청이 실패해도 결과 행이 무한 spinner에 머물지 않고 실패 상태로 종료됩니다.

### 상세 변경

1. 용어 변환기 파일 전환/예외 처리 보강

- 대상:
  - `src/lib/components/TermGenerator.svelte`
- 변경:
  - `filename` prop 변경 시 기존 조합/변환/validation 상태를 초기화하고 같은 입력값이라도 새 파일 기준으로 다시 조회
  - 조합 조회/변환/validation에 요청 세대 구분을 추가해 파일 전환 중 늦게 도착한 이전 응답이 최신 상태를 덮어쓰지 않도록 보정
  - validation fetch 예외 시에도 각 결과를 명시적인 실패 상태로 기록해 무한 spinner를 제거

2. 회귀 테스트/문서 동기화

- 대상:
  - `src/lib/components/TermGenerator.test.ts`
  - `docs/tests/TERM_TEST_DESCRIPTION.md`
- 변경:
  - 파일 변경 시 generator가 새 filename으로 재조회하는 회귀 테스트 추가
  - validation 요청 예외 시 실패 상태로 종료되는 회귀 테스트 추가
  - term 테스트 문서의 TermGenerator 범위를 최신 테스트 구조에 맞춰 정리

## 2026-04-01

### 요약

- 단어집에 새 단어를 저장한 직후 같은 파일의 용어 변환기에서도 바로 최신 단어를 사용합니다.

### 상세 변경

1. 용어 변환기 캐시 무효화 추가

- 대상:
  - `src/lib/registry/generator-cache.ts`
  - `src/routes/api/generator/+server.ts`
  - `src/routes/api/generator/segment/+server.ts`
  - `src/routes/api/vocabulary/+server.ts`
  - `src/routes/api/term/files/mapping/+server.ts`
- 변경:
  - 용어 변환기와 단어 조합 분석 API의 메모리 캐시를 공용 모듈로 통합
  - 단어 저장/수정/삭제 후 generator 캐시를 함께 비워 즉시 최신 단어집을 반영
  - 용어 파일 매핑 변경 후에도 이전 단어집 캐시가 남지 않도록 generator 캐시 무효화 연결

2. 회귀 테스트/문서 동기화

- 대상:
  - `src/routes/api/vocabulary/server.test.ts`
  - `src/routes/api/term/files/mapping/server.test.ts`
  - `docs/tests/TERM_TEST_DESCRIPTION.md`
  - `docs/tests/VOCABULARY_TEST_DESCRIPTION.md`
- 변경:
  - 단어 저장 성공 시 generator 캐시 무효화 호출 회귀 테스트 추가
  - 용어 파일 매핑 저장 시 generator 캐시 무효화 호출 회귀 테스트 추가
  - 관련 테스트 문서에 최신 반영 규칙을 동기화

## 2026-04-01

### 요약

- 브라우저가 `crypto.randomUUID`를 지원하지 않아도 단어/정의서 신규 등록이 계속 동작합니다.

### 상세 변경

1. 클라이언트 UUID fallback 공통화

- 대상:
  - `src/lib/utils/uuid.ts`
  - `src/lib/components/VocabularyEditor.svelte`
  - `src/lib/components/AttributeEditor.svelte`
  - `src/lib/components/ColumnDefEditor.svelte`
  - `src/lib/components/DatabaseEditor.svelte`
  - `src/lib/components/EntityEditor.svelte`
  - `src/lib/components/TableDefEditor.svelte`
- 변경:
  - 브라우저에서 네이티브 `crypto.randomUUID`를 우선 사용
  - 지원되지 않는 환경에서는 `uuid` 패키지로 안전하게 fallback
  - 신규 등록 시 브라우저 호환성 문제로 저장이 중단되던 경로를 공통 유틸로 정리

2. 회귀 테스트/문서 동기화

- 대상:
  - `src/lib/components/VocabularyEditor.test.ts`
  - `docs/tests/VOCABULARY_TEST_DESCRIPTION.md`
- 변경:
  - `crypto.randomUUID`가 없는 환경에서도 단어 저장 이벤트가 정상 발생하는 회귀 테스트 추가
  - 단어 테스트 문서에 신규 브라우저 호환 회귀 포인트 반영

## 2026-03-13

### 요약

- 공통 파일 매핑 번들에 자동 생성 표시명(`name`)이 추가됐습니다.

### 상세 변경

1. 공통 파일 매핑 번들 표시명 추가

- 대상:
  - `src/lib/types/shared-file-mapping.ts`
  - `src/lib/registry/shared-file-mapping-registry.ts`
  - `src/lib/utils/shared-file-mapping-name.ts`
  - `static/data/settings/shared-file-mappings.json`
  - `src/lib/utils/test-data-reset.js`
- 변경:
  - 공통 파일 매핑 정본의 각 번들에 `name` 필드를 추가
  - 레거시 번들이 `name` 없이 로드되면 파일 조합 기준 자동 표시명을 생성해 정본에 다시 저장
  - 기본/동일 파일군/표준용어-설계 혼합 조합에 대한 자동 이름 규칙 추가
  - 테스트 데이터 초기화 기준도 `기본 공통 번들` 이름을 포함하도록 갱신

2. 테스트/문서 동기화

- 대상:
  - `src/lib/utils/shared-file-mapping-name.test.ts`
  - `src/lib/registry/shared-file-mapping-registry.test.ts`
  - `src/routes/api/design-snapshots/server.test.ts`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/tests/COMMON_UTILS_TEST_DESCRIPTION.md`
- 변경:
  - 번들명 생성 규칙, 레거시 정규화, API 응답 shape를 테스트와 스펙 문서에 반영
  - 공통 유틸리티 테스트 문서에 새 표시명 생성 테스트 범위를 추가

## 2026-03-13

### 요약

- 스냅샷 추가 팝업과 저장된 스냅샷 목록에서 더 이상 `column / term` 임시 조합 대신 의미 있는 번들명이 표시됩니다.

### 상세 변경

1. 스냅샷 화면 표시명 적용

- 대상:
  - `src/lib/components/DesignSnapshotEditor.test.ts`
  - `src/lib/components/DesignSnapshotEditor.svelte`
  - `src/routes/snapshot/browse/+page.svelte`
  - `src/routes/snapshot/browse/page.test.ts`
- 변경:
  - 스냅샷 추가 모달의 대상 번들 select가 자동 생성 표시명을 사용하도록 변경
  - 저장된 스냅샷 목록의 `번들` 열도 표시명 중심으로 보여주고, 실제 컬럼/용어 파일은 보조 정보로 유지
  - 통합 검색(`all`)에서도 번들 표시명을 함께 검색할 수 있도록 확장

2. 테스트/문서 동기화

- 대상:
  - `docs/USER_GUIDE.md`
  - `docs/tests/SNAPSHOT_TEST_DESCRIPTION.md`
- 변경:
  - 스냅샷 UI 표시명 렌더링과 번들 선택 옵션 노출을 테스트로 고정
  - 사용자 가이드와 스냅샷 테스트 문서에 새 표시 규칙을 반영

## 2026-03-13

### 요약

- 용어 browse에서 파일을 바꿀 때 `용어계 관계 진단 요약` 카드와 좌측 검색 결과 요약이 갱신 중 상태를 바로 표시합니다.
- 단어집/도메인/용어/DB 설계/운영·품질 browse 메뉴의 좌측 요약 카드도 공통 로딩 오버레이와 `aria-busy` 상태를 사용합니다.

### 상세 변경

1. 좌측 요약 카드 공통 로딩 상태 추가

- 대상:
  - `src/lib/components/BrowseSidebarSummary.svelte`
  - `src/lib/components/BrowseSidebarSummary.test.ts`
  - `src/routes/browse/+page.svelte`
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/term/browse/+page.svelte`
  - `src/routes/database/browse/+page.svelte`
  - `src/routes/entity/browse/+page.svelte`
  - `src/routes/attribute/browse/+page.svelte`
  - `src/routes/table/browse/+page.svelte`
  - `src/routes/column/browse/+page.svelte`
  - `src/routes/data-source/browse/+page.svelte`
  - `src/routes/profiling/browse/+page.svelte`
  - `src/routes/quality-rule/browse/+page.svelte`
  - `src/routes/snapshot/browse/+page.svelte`
- 변경:
  - 공통 `BrowseSidebarSummary`에 `loading`, `loadingText` props 추가
  - 갱신 중 배지, 오버레이, `aria-busy` 속성을 공통으로 제공
  - 각 browse 페이지가 기존 로딩 플래그를 좌측 요약 카드에 전달하도록 연결

2. 용어 관계 진단 요약 갱신 상태 표시

- 대상:
  - `src/routes/term/browse/+page.svelte`
  - `src/routes/term/browse/page.test.ts`
- 변경:
  - `relationshipSummaryLoading` 상태를 분리해 파일 전환 시 관계 진단 카드가 즉시 `갱신 중` 상태를 표시
  - 새 파일 기준 진단 결과가 도착할 때까지 스피너와 안내 문구를 노출

3. 테스트/문서 동기화

- 대상:
  - `docs/FRONTEND_UI_UX_GUIDE.md`
  - `docs/tests/TERM_TEST_DESCRIPTION.md`
- 변경:
  - sidebar/진단 요약 카드의 로딩 피드백 원칙과 term browse 회귀 테스트 범위를 문서에 반영

## 2026-03-13

### 요약

- 스냅샷 생성이 페이지 내 고정 카드가 아니라 `스냅샷 추가` 팝업 등록 흐름으로 바뀌었습니다.
- 선택할 수 없는 상태였던 상단 `현재 번들 스냅샷 저장` 버튼은 제거됐고, 검색/목록 중심 레이아웃으로 정리됐습니다.

### 상세 변경

1. 스냅샷 생성 진입점 정리

- 대상:
  - `src/lib/components/DesignSnapshotEditor.svelte`
  - `src/routes/snapshot/browse/+page.svelte`
- 변경:
  - 상단 액션을 `스냅샷 추가` 버튼으로 통일하고 전용 모달에서 번들 선택/이름/설명 입력 후 저장하도록 변경
  - 페이지 본문에서 인라인 `스냅샷 생성` 카드를 제거하고 저장된 스냅샷 목록을 전체 폭으로 확장
  - 선택 불가능해 의미가 없던 `현재 번들 스냅샷 저장` 버튼 제거
  - 저장 가능한 번들이 없을 때는 모달 안에서 empty state로 원인을 안내

2. 테스트/문서 동기화

- 대상:
  - `src/lib/components/DesignSnapshotEditor.test.ts`
  - `src/routes/snapshot/browse/page.test.ts`
  - `docs/USER_GUIDE.md`
  - `docs/tests/SNAPSHOT_TEST_DESCRIPTION.md`
- 변경:
  - 모달 렌더링, 번들 전환, 저장 이벤트 전달, browse 페이지의 팝업 기반 생성 흐름을 테스트로 고정
  - 사용자 가이드와 스냅샷 테스트 문서에 `스냅샷 추가` 팝업 절차 반영

## 2026-03-13

### 요약

- 좌측 검색 결과 요약 플로팅 카드의 내부 레이아웃이 `2 x N`에서 `1 x N` 단일 컬럼 스택으로 변경됐습니다.

### 상세 변경

1. 좌측 요약 카드 레이아웃 단일 컬럼화

- 대상:
  - `src/lib/components/BrowseSidebarSummary.svelte`
  - `src/lib/components/BrowseSidebarSummary.test.ts`
  - `docs/FRONTEND_UI_UX_GUIDE.md`
- 변경:
  - 공통 좌측 요약 카드의 내부 그리드를 단일 컬럼으로 통일
  - 기존 `span` 지정 항목도 추가 컬럼을 만들지 않고 같은 세로 스택 안에서 렌더링
  - 컴포넌트 테스트와 프론트엔드 가이드에 1열 배치 규칙 반영

## 2026-03-13

### 요약

- 프로파일링 화면의 `테이블 불러오기` 흐름이 `대상 선택` 카드 안으로 이동해 선택과 실행이 같은 영역에서 이어집니다.
- 프로파일링 대상 테이블 목록이 10건 단위 페이지네이션으로 바뀌어 긴 목록에서도 화면 길이가 과도하게 늘어나지 않습니다.
- 프로파일링 실행 결과가 대상 목록 위로 이동하고, 실행 완료 시 결과 카드로 즉시 스크롤됩니다.

### 상세 변경

1. 프로파일링 워크플로우/가시성 개선

- 대상:
  - `src/routes/profiling/browse/+page.svelte`
- 변경:
  - `데이터 소스 새로고침`, `테이블 불러오기` 버튼을 상단 액션바에서 `대상 선택` 카드 내부로 이동
  - 프로파일링 결과 카드를 대상 목록 위에 배치하고, 실행 성공/실패 직후 결과 영역으로 자동 이동
  - 좌측 요약에 현재 목록 페이지 정보를 추가

2. 대상 테이블 목록 페이지네이션 추가

- 대상:
  - `src/routes/profiling/browse/+page.svelte`
- 변경:
  - 조회된 대상 테이블 목록을 페이지당 10건으로 제한
  - 스키마 필터/검색어 변경 시 첫 페이지로 재이동
  - 현재 표시 범위와 이전/다음, 번호 버튼 기반 페이지 이동 UI 추가

3. 테스트/문서 동기화

- 대상:
  - `src/routes/profiling/browse/page.test.ts`
  - `docs/tests/DATA_PROFILING_TEST_DESCRIPTION.md`
  - `docs/tests/QUALITY_RULE_TEST_DESCRIPTION.md`
  - `docs/USER_GUIDE.md`
- 변경:
  - 버튼 재배치, 10건 페이지네이션, 실행 후 결과 이동을 페이지 테스트로 고정
  - 사용자 가이드와 테스트 설명 문서에 새 워크플로우를 반영

## 2026-03-13

### 요약

- 표준 용어/DB 설계 browse 화면의 파일 선택/결과 요약 sidebar UI가 모두 같은 `plain sidebar + 개별 floating 카드` 패턴으로 통일됐습니다.
- 운영 · 품질 browse 화면도 요약 정보를 좌측 sticky sidebar로 옮겼고, summary-only sidebar는 모바일에서 버튼/드로어를 노출하지 않습니다.
- 좌측으로 이동한 요약은 모두 `lg` 미만 화면에서 숨겨져 모바일과 소형 화면 밀도를 낮춥니다.

### 상세 변경

1. browse 요약/사이드바 패턴 통일

- 대상:
  - `src/lib/components/BrowsePageLayout.svelte`
  - `src/lib/components/BrowseSidebarSummary.svelte`
  - `src/routes/browse/+page.svelte`
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/term/browse/+page.svelte`
  - `src/routes/database/browse/+page.svelte`
  - `src/routes/entity/browse/+page.svelte`
  - `src/routes/attribute/browse/+page.svelte`
  - `src/routes/table/browse/+page.svelte`
  - `src/routes/column/browse/+page.svelte`
  - `src/routes/data-source/browse/+page.svelte`
  - `src/routes/profiling/browse/+page.svelte`
  - `src/routes/quality-rule/browse/+page.svelte`
  - `src/routes/snapshot/browse/+page.svelte`
- 변경:
  - 본문 상단 `요약` 카드를 제거하고 좌측 sidebar 안으로 이동
  - 파일 선택이 있는 browse 화면은 모두 `plain sidebar` 안에 파일 카드와 요약 카드를 분리한 동일 구조로 정리
  - 운영 · 품질 화면은 같은 요약 카드 컴포넌트를 사용하되 모바일 sidebar 버튼/드로어는 비활성화
  - 검색/안내 카드는 본문 전체 폭으로 확장해 요약 제거 후 생기는 빈 영역을 없앰
  - 좌측 요약에는 `hidden lg:block` 규칙을 적용해 작은 화면에서는 표시하지 않음

2. 테스트/문서 동기화

- 대상:
  - `src/lib/components/BrowseSidebarSummary.test.ts`
  - `src/routes/browse/page.test.ts`
  - `src/routes/domain/browse/page.test.ts`
  - `src/routes/data-source/browse/page.test.ts`
  - `src/routes/profiling/browse/page.test.ts`
  - `src/routes/quality-rule/browse/page.test.ts`
  - `src/routes/snapshot/browse/page.test.ts`
  - `docs/tests/DATA_SOURCE_TEST_DESCRIPTION.md`
  - `docs/tests/DATA_PROFILING_TEST_DESCRIPTION.md`
  - `docs/tests/QUALITY_RULE_TEST_DESCRIPTION.md`
  - `docs/tests/SNAPSHOT_TEST_DESCRIPTION.md`
  - `docs/tests/VOCABULARY_TEST_DESCRIPTION.md`
  - `docs/tests/DOMAIN_TEST_DESCRIPTION.md`
  - `docs/FRONTEND_UI_UX_GUIDE.md`
- 변경:
  - 공통 요약 컴포넌트 렌더링과 좌측 배치/반응형 숨김 동작을 테스트로 고정
  - summary-only sidebar 화면의 모바일 토글 비노출도 페이지 테스트로 고정
  - 프론트엔드 가이드에 sidebar 카드 분리와 모바일 토글 규칙을 반영

## 2026-03-13

### 요약

- 파일 관리 팝업의 공통 파일 매핑 설정이 `파일 목록`에서 분리되어 별도 `파일 매핑` 탭으로 이동했습니다.
- 도메인 포함 8종 파일 관리 화면 모두 같은 3탭 구조(`파일 목록 / 파일 매핑 / 파일 업로드`)를 사용합니다.

### 상세 변경

1. 파일 매핑 탭 분리

- 대상:
  - `src/lib/components/VocabularyFileManager.svelte`
  - `src/lib/components/DomainFileManager.svelte`
  - `src/lib/components/TermFileManager.svelte`
  - `src/lib/components/DatabaseFileManager.svelte`
  - `src/lib/components/EntityFileManager.svelte`
  - `src/lib/components/AttributeFileManager.svelte`
  - `src/lib/components/TableDefFileManager.svelte`
  - `src/lib/components/ColumnDefFileManager.svelte`
- 변경:
  - 기존 `파일 목록` 탭 안에 있던 매핑 설정을 별도 `파일 매핑` 탭으로 이동
  - 파일 생성/삭제 작업과 파일 연결 작업을 시각적으로 분리해 역할이 섞이지 않도록 정리
  - Vocabulary/Term의 저장 후 동기화 액션도 새 `파일 매핑` 탭에서 실행하도록 유지

2. 테스트/문서 동기화

- 대상:
  - `src/lib/components/DatabaseFileManager.test.ts`
  - `src/lib/components/DomainFileManager.test.ts`
  - `src/lib/components/AttributeFileManager.test.ts`
  - `src/lib/components/EntityFileManager.test.ts`
  - `src/lib/components/TableDefFileManager.test.ts`
  - `src/lib/components/ColumnDefFileManager.test.ts`
  - `docs/USER_GUIDE.md`
- 변경:
  - FileManager 테스트를 `파일 매핑` 탭 클릭 기준으로 갱신
  - 사용자 가이드에 파일 관리 팝업의 3탭 구조를 반영

## 2026-03-13

### 요약

- 도메인 browse 화면의 데이터타입 매핑 관리 진입점이 메인 카드에서 좌측 독립 플로팅 패널로 이동했습니다.
- `도메인 파일` 카드 안에 포함하지 않고 별도 sticky 카드로 분리해 전역 규칙 성격을 더 분명하게 표시합니다.

### 상세 변경

1. 도메인 전역 규칙 진입점 재배치

- 대상:
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/domain/browse/page.test.ts`
  - `docs/tests/DOMAIN_TEST_DESCRIPTION.md`
- 변경:
  - 전역 데이터타입 매핑 관리 버튼과 설명을 메인 본문 카드에서 좌측 독립 sidebar 패널로 이동
  - `도메인 파일` 선택 카드와 분리된 별도 sticky 카드로 렌더링되도록 `BrowsePageLayout`의 plain sidebar surface를 추가
  - browse 페이지 테스트와 도메인 테스트 문서에 독립 플로팅 패널 배치 기준 반영

## 2026-03-13

### 요약

- 파일 관리 팝업의 공통 파일 매핑 설정이 `표준 용어`와 `DB 설계` 그룹으로 나뉘어 표시됩니다.
- 8종 화면 어디서 열어도 같은 분류 기준으로 매핑 대상을 빠르게 찾을 수 있습니다.

### 상세 변경

1. 파일 매핑 UI 카테고리화

- 대상:
  - `src/lib/components/DbDesignFileMappingFields.svelte`
  - `src/lib/utils/db-design-file-mapping.ts`
- 변경:
  - 공통 파일 매핑 필드를 `표준 용어`, `DB 설계` 두 섹션으로 그룹화
  - 각 섹션에 설명, 항목 수, 카드형 셀렉트 스타일을 추가해 연결 범위를 즉시 파악할 수 있도록 정리
  - 현재 열어 둔 파일 유형을 제외한 나머지 매핑 항목만 그룹별로 표시

2. 테스트/문서 동기화

- 대상:
  - `src/lib/components/DbDesignFileMappingFields.test.ts`
  - `src/lib/components/DatabaseFileManager.test.ts`
  - `docs/USER_GUIDE.md`
- 변경:
  - 공통 매핑 필드의 그룹 렌더링과 실제 파일 관리 팝업 노출 여부를 테스트로 고정
  - 사용자 가이드에 파일 관리 팝업의 새 분류 기준을 반영

## 2026-03-13

### 요약

- 2단계 프로젝트 메뉴 구조에 맞춰 각 화면 상단에 breadcrumb가 추가되었습니다.
- breadcrumb의 상위 항목을 클릭하면 같은 그룹의 다른 메뉴로 바로 이동할 수 있습니다.

### 상세 변경

1. 공용 navigation/breadcrumb 구조 정리

- 대상:
  - `src/lib/utils/navigation.ts`
  - `src/routes/+layout.svelte`
  - `src/lib/components/Breadcrumb.svelte`
  - `src/lib/components/BrowsePageLayout.svelte`
- 변경:
  - 상단 2단계 메뉴 정의를 공용 navigation 유틸로 이동
  - 현재 경로 기준 breadcrumb 파생 로직 추가
  - `lv1` breadcrumb는 동료 `lv1` 그룹 목록, `lv2` breadcrumb는 현재 그룹의 동료 `lv2` 메뉴 목록을 각각 여는 UI로 정리
  - 상위 breadcrumb를 셀렉트박스 느낌보다 버튼형 칩 스타일로 조정해 구분자와 시각 충돌 완화
  - 작은 화면에서는 breadcrumb를 숨겨 모바일 상단 밀도를 낮춤

2. 프로젝트 메뉴 화면 breadcrumb 적용

- 대상:
  - `src/routes/browse/+page.svelte`
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/term/browse/+page.svelte`
  - `src/routes/database/browse/+page.svelte`
  - `src/routes/entity/browse/+page.svelte`
  - `src/routes/attribute/browse/+page.svelte`
  - `src/routes/table/browse/+page.svelte`
  - `src/routes/column/browse/+page.svelte`
  - `src/routes/erd/+page.svelte`
  - `src/routes/data-source/browse/+page.svelte`
  - `src/routes/quality-rule/browse/+page.svelte`
  - `src/routes/profiling/browse/+page.svelte`
  - `src/routes/snapshot/browse/+page.svelte`
- 변경:
  - browse/ERD 화면에서 현재 메뉴 그룹과 현재 페이지를 breadcrumb로 표시
  - `lv1`/`lv2` breadcrumb 각각에서 맞는 수준의 메뉴로 이동 가능하도록 연결

3. 테스트/문서 동기화

- 대상:
  - `src/lib/utils/navigation.test.ts`
  - `src/routes/data-source/browse/page.test.ts`
  - `docs/tests/COMMON_UTILS_TEST_DESCRIPTION.md`
  - `docs/tests/DATA_SOURCE_TEST_DESCRIPTION.md`
  - `docs/USER_GUIDE.md`
  - `docs/FRONTEND_UI_UX_GUIDE.md`
- 변경:
  - breadcrumb 파생 유틸리티와 `lv1`/`lv2` 레벨별 메뉴 이동 UI를 테스트로 고정
  - 사용자 가이드와 프론트엔드 가이드에 새 breadcrumb 이동 패턴 반영

## 2026-03-13

### 요약

- 검증 스크립트를 `lint`, `lint:all`, `format:check`, `validate`로 분리해 기본 게이트를 현실화했습니다.
- 최근 기능 추가 이후 어긋난 회귀 테스트와 ESLint 오류 패턴을 함께 정리했습니다.

### 상세 변경

1. 검증 스크립트 정리

- 대상:
  - `package.json`
  - `README.md`
  - `docs/CONVENTIONS.md`
- 변경:
  - `lint`를 `eslint . --quiet`로 변경해 경고 백로그와 분리된 오류 게이트로 재정의
  - `lint:all`, `format:check`, `validate` 스크립트 추가
  - 저장소 문서에 검증 명령 사용 기준 반영

2. 회귀 테스트/ESLint 오류 정리

- 대상:
  - `src/lib/components/DesignRelationPanel.test.ts`
  - `src/lib/components/Icon.svelte`
  - `src/lib/components/QualityRuleEditor.svelte`
  - `src/lib/components/Skeleton.svelte`
  - `src/lib/utils/debounce.ts`
  - `src/routes/browse/+page.svelte`
  - `src/routes/attribute/browse/+page.svelte`
  - `src/routes/column/browse/+page.svelte`
  - `src/routes/database/browse/+page.svelte`
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/entity/browse/+page.svelte`
  - `src/routes/profiling/browse/+page.svelte`
  - `src/routes/snapshot/browse/+page.svelte`
  - `src/routes/table/browse/+page.svelte`
  - `src/routes/term/browse/+page.svelte`
  - `vitest-setup.ts`
- 변경:
  - `DesignRelationPanel` 테스트를 현재 UI 문구 기준으로 수정
  - Svelte `{#each}` key 누락, `any` 사용, `no-unsafe-finally`, 불필요한 escape, 불필요한 가변 선언 등 실제 ESLint 오류 패턴 정리
  - 도메인 browse 페이지의 보조 landmark 마크업을 정리해 접근성 경고 제거

## 2026-03-13

### 요약

- 8종 설계 파일 번들을 통째로 저장/복원하는 `스냅샷` 메뉴가 추가되었습니다.
- 복원 시 공통 파일 매핑 번들도 함께 다시 적용되어 browse/ERD 흐름과 정합성이 유지됩니다.

### 상세 변경

1. 스냅샷 타입/저장소/API 추가

- 대상:
  - `src/lib/types/design-snapshot.ts`
  - `src/lib/registry/design-snapshot-registry.ts`
  - `src/routes/api/design-snapshots/+server.ts`
  - `src/routes/api/design-snapshots/restore/+server.ts`
  - `static/data/settings/design-snapshots.json`
- 변경:
  - 8종 파일 번들의 현재 JSON 상태를 스냅샷으로 저장하는 설정 모델과 레지스트리 추가
  - 스냅샷 생성 시 런타임 `mapping` 필드를 제거한 정규화 payload 저장
  - 스냅샷 복원 시 각 파일 데이터 저장과 공통 파일 매핑 번들 재적용, 캐시 무효화 수행

2. 스냅샷 화면/메뉴 추가

- 대상:
  - `src/routes/snapshot/browse/+page.svelte`
  - `src/routes/+layout.svelte`
- 변경:
  - 상단 네비게이션에 `스냅샷` 메뉴 추가
  - 번들 선택, 스냅샷 생성, 검색, 복원, 삭제 흐름을 한 화면에서 제공
  - 최근 복원 시각과 번들 요약 카드 표시

3. 테스트/문서 동기화

- 대상:
  - `src/lib/registry/design-snapshot-registry.test.ts`
  - `src/routes/api/design-snapshots/server.test.ts`
  - `src/routes/api/design-snapshots/restore/server.test.ts`
  - `src/routes/snapshot/browse/page.test.ts`
  - `src/lib/utils/test-data-reset.test.ts`
  - `src/lib/utils/test-data-reset.js`
  - `docs/tests/SNAPSHOT_TEST_DESCRIPTION.md`
  - `docs/tests/COMMON_UTILS_TEST_DESCRIPTION.md`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/USER_GUIDE.md`
  - `README.md`
- 변경:
  - 스냅샷 저장소, API, browse 화면 흐름을 테스트로 고정
  - 테스트 데이터 초기화 시 `design-snapshots.json`도 빈 기준 상태로 재생성하도록 보강
  - 사용자 문서와 API/모델 문서에 새 메뉴 및 복원 흐름 반영

## 2026-03-13

### 요약

- 컬럼 editor에 `표준 추천` 패널이 추가되었습니다.
- 저장 전에 term/domain 기준 추천값과 경고를 즉시 보고, 필요한 필드만 바로 적용할 수 있습니다.

### 상세 변경

1. 컬럼 표준 추천 타입/유틸리티/API 추가

- 대상:
  - `src/lib/types/column-standard-recommendation.ts`
  - `src/lib/utils/column-standard-recommendation.ts`
  - `src/routes/api/column/recommend-standard/+server.ts`
- 변경:
  - `columnEnglishName` 기준 단건 표준 추천 모델 추가
  - term/domain 매핑 결과를 `matchedTerm`, `matchedDomain`, `recommendedValues`, `changes`, `issues`로 구조화
  - 컬럼 파일 매핑을 따라 연결된 term/domain 파일을 해석하는 preview API 추가

2. 컬럼 editor 사전예방형 UX 추가

- 대상:
  - `src/lib/components/ColumnDefEditor.svelte`
- 변경:
  - 입력 중 `컬럼영문명` 기준 자동 추천 조회
  - 상태 배지, 연결된 용어/도메인 요약, 경고, 필드별 추천값 표시
  - `추천값 전체 적용` 및 필드별 `적용` 버튼 추가

3. 테스트/문서 동기화

- 대상:
  - `src/lib/utils/column-standard-recommendation.test.ts`
  - `src/routes/api/column/recommend-standard/server.test.ts`
  - `src/lib/components/ColumnDefEditor.test.ts`
  - `docs/tests/COLUMN_TEST_DESCRIPTION.md`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/USER_GUIDE.md`
  - `README.md`
- 변경:
  - 추천 계산 로직, preview API, editor 적용 버튼을 테스트로 고정
  - 사용자 문서와 API/런타임 모델 문서에 컬럼 표준 추천 흐름 반영

## 2026-03-12

### 요약

- 도메인/용어 editor에 `변경 영향도` 미리보기가 추가되었습니다.
- 저장 또는 삭제 전에 downstream 참조 수와 컬럼 표준화 파급을 즉시 확인할 수 있습니다.

### 상세 변경

1. 영향도 preview 타입/유틸리티/API 추가

- 대상:
  - `src/lib/types/change-impact.ts`
  - `src/lib/utils/change-impact-preview.ts`
  - `src/routes/api/domain/impact-preview/+server.ts`
  - `src/routes/api/term/impact-preview/+server.ts`
- 변경:
  - 용어 저장 전 컬럼 연결 수, 끊기는 연결, 새 연결 후보, 도메인 존재 여부 계산 추가
  - 도메인 저장/삭제 전 단어/용어/컬럼 참조 수와 삭제 영향 계산 추가
  - 기존 `checkEntryReferences`와 파일 매핑 해석을 재사용하는 preview API 추가

2. 도메인/용어 editor 영향도 패널 추가

- 대상:
  - `src/lib/components/DomainEditor.svelte`
  - `src/lib/components/TermEditor.svelte`
- 변경:
  - 용어 editor에서 입력값 변경 시 영향도 자동 재계산
  - 도메인 editor에서 현재 참조 수와 즉시 파급 여부 표시
  - 도메인 삭제 확인창에 참조 건수 요약 포함

3. 테스트/문서 동기화

- 대상:
  - `src/lib/utils/change-impact-preview.test.ts`
  - `src/routes/api/domain/impact-preview/server.test.ts`
  - `src/routes/api/term/impact-preview/server.test.ts`
  - `src/lib/components/DomainEditor.test.ts`
  - `src/lib/components/TermEditor.test.ts`
  - `docs/tests/DOMAIN_TEST_DESCRIPTION.md`
  - `docs/tests/TERM_TEST_DESCRIPTION.md`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/USER_GUIDE.md`
  - `README.md`
- 변경:
  - 영향도 계산 로직, preview API, editor 표시/삭제 안내 문구를 테스트로 고정
  - 사용자 문서와 저장 모델 문서에 영향도 미리보기 동작과 응답 필드 반영

## 2026-03-12

### 요약

- 프로파일링 결과에 즉시 적용되는 `품질 규칙` 메뉴와 API가 추가되었습니다.
- PostgreSQL 프로파일링 실행 결과에 규칙 평가 요약과 위반 목록이 함께 표시됩니다.

### 상세 변경

1. 품질 규칙 타입/저장소/평가 엔진 추가

- 대상:
  - `src/lib/types/data-quality-rule.ts`
  - `src/lib/registry/data-quality-rule-registry.ts`
  - `src/lib/utils/data-quality-rule-evaluator.ts`
  - `static/data/settings/quality-rules.json`
- 변경:
  - `static/data/settings/quality-rules.json`에 품질 규칙을 저장하는 레지스트리 추가
  - table 범위 `rowCount`, column 범위 `null/distinct/length` 메트릭 규칙 타입 추가
  - 와일드카드 패턴 기반 타깃 매칭과 `gte/lte/eq` 비교를 수행하는 평가 유틸리티 추가

2. 품질 규칙 API/화면 및 프로파일링 연동 추가

- 대상:
  - `src/routes/api/quality-rules/+server.ts`
  - `src/routes/quality-rule/browse/+page.svelte`
  - `src/lib/components/QualityRuleEditor.svelte`
  - `src/routes/api/data-sources/profile/run/+server.ts`
  - `src/routes/profiling/browse/+page.svelte`
  - `src/routes/+layout.svelte`
- 변경:
  - 품질 규칙 목록 조회, 생성, 수정, 삭제 API 추가
  - 상단 네비게이션에 `품질 규칙` 메뉴 추가
  - 화면에서 규칙 등록/수정/삭제와 요약 조회 제공
  - 프로파일링 실행 시 저장된 활성 규칙을 즉시 평가하고 결과 화면에 요약/위반 목록 표시

3. 테스트/문서 동기화

- 대상:
  - `src/lib/utils/data-quality-rule-evaluator.test.ts`
  - `src/routes/api/quality-rules/server.test.ts`
  - `src/routes/quality-rule/browse/page.test.ts`
  - `src/routes/api/data-sources/profile/run/server.test.ts`
  - `src/routes/profiling/browse/page.test.ts`
  - `docs/tests/QUALITY_RULE_TEST_DESCRIPTION.md`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/USER_GUIDE.md`
  - `README.md`
- 변경:
  - 규칙 평가 유틸리티, CRUD API, browse 화면, 프로파일링 연동 흐름을 테스트로 고정
  - 저장소 문서와 사용자 가이드에 새 메뉴, 저장 모델, 응답 필드 반영

## 2026-03-12

### 요약

- 저장된 PostgreSQL 데이터 소스를 재사용하는 `프로파일링` 메뉴와 API가 추가되었습니다.
- 사용자 테이블 목록 조회와 컬럼 단위 실데이터 프로파일링을 즉시 실행할 수 있습니다.

### 상세 변경

1. PostgreSQL 프로파일링 타입/유틸리티 추가

- 대상:
  - `src/lib/types/data-profiling.ts`
  - `src/lib/utils/data-source-profiling.ts`
  - `src/lib/utils/data-source-connection.ts`
- 변경:
  - 프로파일링 대상/결과 타입 추가
  - 저장된 PostgreSQL 연결을 재사용해 사용자 스키마/테이블을 조회하는 유틸리티 추가
  - 단일 테이블에 대해 `rowCount`, `nullCount/nullRatio`, `distinctCount/distinctRatio`, `minLength/maxLength`를 계산하는 로직 추가

2. 프로파일링 API/화면 추가

- 대상:
  - `src/routes/api/data-sources/profile/targets/+server.ts`
  - `src/routes/api/data-sources/profile/run/+server.ts`
  - `src/routes/profiling/browse/+page.svelte`
  - `src/routes/+layout.svelte`
  - `src/lib/components/Icon.svelte`
- 변경:
  - 저장된 데이터 소스 ID 기반 프로파일링 대상 조회 API 추가
  - 선택한 스키마/테이블 기준 프로파일링 실행 API 추가
  - 상단 네비게이션에 `프로파일링` 메뉴 추가
  - 화면에서 데이터 소스 선택, 스키마/테이블 필터링, 결과 확인 흐름 제공

3. 테스트/문서 동기화

- 대상:
  - `src/routes/api/data-sources/profile/targets/server.test.ts`
  - `src/routes/api/data-sources/profile/run/server.test.ts`
  - `src/routes/profiling/browse/page.test.ts`
  - `docs/tests/DATA_PROFILING_TEST_DESCRIPTION.md`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/USER_GUIDE.md`
  - `README.md`
- 변경:
  - 프로파일링 대상 조회/실행 API와 browse 화면 흐름을 테스트로 고정
  - 저장소 문서와 사용자 가이드에 새 메뉴 및 프로파일링 모델을 반영

## 2026-03-12

### 요약

- 내부 관리자용 PostgreSQL 데이터 소스 관리 기능이 추가되었습니다.
- 저장 가능한 연결 정의와 저장 전/저장 후 연결 테스트 흐름이 새 메뉴로 분리되었습니다.

### 상세 변경

1. PostgreSQL 데이터 소스 저장소/연결 테스트 추가

- 대상:
  - `src/lib/types/data-source.ts`
  - `src/lib/registry/data-source-registry.ts`
  - `src/lib/utils/data-source-connection.ts`
  - `static/data/settings/data-sources.json`(런타임 생성)
- 변경:
  - `static/data/settings/data-sources.json`에 PostgreSQL 연결 정의를 저장하는 레지스트리 추가
  - 요약 응답에서는 비밀번호 원문을 숨기고 `hasPassword`만 노출
  - 수정 시 비밀번호를 비워두면 기존 저장값을 유지
  - `pg` 기반 연결 테스트 유틸리티 추가

2. 데이터 소스 API/화면 추가

- 대상:
  - `src/routes/api/data-sources/+server.ts`
  - `src/routes/api/data-sources/test/+server.ts`
  - `src/lib/components/DataSourceEditor.svelte`
  - `src/routes/data-source/browse/+page.svelte`
  - `src/routes/+layout.svelte`
- 변경:
  - 데이터 소스 목록 조회, 생성, 수정, 삭제 API 추가
  - 저장된 연결 ID 기반 테스트와 저장 전 직접 테스트 API 추가
  - 편집 중 비밀번호를 비워둔 상태에서도 저장된 비밀번호를 재사용해 직접 테스트 가능
  - 상단 네비게이션에 `데이터 소스` 메뉴 추가

3. 테스트/문서 동기화

- 대상:
  - `src/lib/registry/data-source-registry.test.ts`
  - `src/routes/api/data-sources/server.test.ts`
  - `src/routes/api/data-sources/test/server.test.ts`
  - `src/routes/data-source/browse/page.test.ts`
  - `docs/tests/DATA_SOURCE_TEST_DESCRIPTION.md`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/USER_GUIDE.md`
  - `README.md`
- 변경:
  - PostgreSQL 데이터 소스 CRUD, 연결 테스트, 편집기 흐름을 테스트로 고정
  - 저장소 문서와 사용자 가이드에 새 메뉴와 API/저장 모델 반영

## 2026-03-12

### 요약

- 도메인 browse 화면에서 데이터타입 매핑 버튼이 현재 파일 기준 액션 줄에서 분리되었습니다.
- 데이터타입 매핑은 "전체 파일 공통 규칙" 영역으로 이동해 전역 설정임을 명확히 표시합니다.

### 상세 변경

1. 도메인 browse 전역 규칙 배치 정리

- 대상:
  - `src/routes/domain/browse/+page.svelte`
  - `src/lib/components/DomainDataTypeMappingModal.svelte`
  - `src/routes/domain/browse/page.test.ts`
  - `src/lib/components/DomainDataTypeMappingModal.test.ts`
  - `docs/tests/DOMAIN_TEST_DESCRIPTION.md`
- 변경:
  - `새 도메인 추가`, `유효성 검사`, `XLSX 다운로드`, `새로고침`만 현재 파일 작업 그룹에 남기고 데이터타입 매핑 버튼은 별도 섹션으로 이동
  - 전역 규칙 섹션과 매핑 모달 설명에 "현재 선택 파일과 무관하게 모든 도메인 파일에 공통 적용"된다는 범위를 명시
  - browse 페이지 테스트로 파일 작업 그룹과 전역 규칙 섹션의 분리를 고정

## 2026-03-12

### 요약

- 테스트용 전체 데이터 초기화 스크립트가 추가되었습니다.
- 단어집/도메인/용어집/5개 정의서 JSON과 8종 공통 파일 매핑, 매핑 레지스트리를 기본 상태로 되돌릴 수 있습니다.

### 상세 변경

1. 테스트 데이터 초기화 스크립트 추가

- 대상:
  - `src/lib/utils/test-data-reset.js`
  - `scripts/reset-test-data.mjs`
  - `package.json`
  - `README.md`
- 변경:
  - 8개 데이터 디렉터리의 `.json` 파일을 모두 정리한 뒤 시스템 기본 파일만 빈 데이터로 재생성
  - `static/data/registry.json`을 기본 매핑 관계 기준으로 재생성
  - `static/data/settings/shared-file-mappings.json`을 기본 8종 파일 번들로 재생성
  - `static/data/settings/domain-data-type-mappings.json` 같은 비대상 설정 파일은 유지

2. 회귀 테스트 보강

- 대상:
  - `src/lib/utils/test-data-reset.test.ts`
  - `docs/tests/COMMON_UTILS_TEST_DESCRIPTION.md`
- 변경:
  - 사용자 JSON 삭제, 기본 파일 재생성, 레지스트리 초기화, 공통 파일 매핑 초기화, 비대상 설정 유지 동작을 임시 디렉터리 기반으로 검증

## 2026-03-12

### 요약

- 단어집/도메인/용어/DB/엔터티/속성/테이블/컬럼 8종 파일 매핑 정본이 `static/data/settings/shared-file-mappings.json`으로 분리되었습니다.
- 어느 파일 관리 화면에서 저장하더라도 같은 8종 연결 상태가 공유되며, DB 연관 상태 상세/정렬 화면도 동일한 파일 조합을 사용합니다.

### 상세 변경

1. 8종 공통 파일 매핑 번들 도입

- 대상:
  - `src/lib/registry/shared-file-mapping-registry.ts`
  - `src/lib/utils/db-design-file-mapping.ts`
  - `src/lib/registry/db-design-file-mapping.ts`
  - `src/lib/types/shared-file-mapping.ts`
  - `src/lib/types/base.ts`
  - `src/lib/types/vocabulary.ts`
  - `src/lib/types/domain.ts`
  - `src/lib/types/term.ts`
  - `src/lib/types/database-design.ts`
  - `src/lib/registry/data-registry.ts`
- 변경:
  - `static/data/settings/shared-file-mappings.json`에 8종 파일 조합 전체를 저장하는 공통 번들 레지스트리 추가
  - `loadData(...)`가 공통 매핑 파일을 기준으로 `mapping`을 런타임 주입하고, 개별 데이터 JSON 저장 시에는 `mapping`을 정본으로 남기지 않도록 정리
  - 레거시 부분 매핑만 남아 있어도 기존 `mapping` 필드, 직접 관계 레지스트리, 기본 파일명을 조합해 전체 8종 번들을 복원하도록 정리
  - 파일 이름 변경/삭제 시 공통 매핑 파일도 함께 동기화되도록 정리

2. 파일 매핑 API/화면 통합

- 대상:
  - `src/routes/api/vocabulary/files/mapping/+server.ts`
  - `src/routes/api/domain/files/mapping/+server.ts`
  - `src/routes/api/term/files/mapping/+server.ts`
  - `src/routes/api/database/files/mapping/+server.ts`
  - `src/routes/api/entity/files/mapping/+server.ts`
  - `src/routes/api/attribute/files/mapping/+server.ts`
  - `src/routes/api/table/files/mapping/+server.ts`
  - `src/routes/api/column/files/mapping/+server.ts`
  - `src/lib/components/DbDesignFileMappingFields.svelte`
  - `src/lib/components/VocabularyFileManager.svelte`
  - `src/lib/components/DomainFileManager.svelte`
  - `src/lib/components/TermFileManager.svelte`
  - `src/lib/components/DatabaseFileManager.svelte`
  - `src/lib/components/EntityFileManager.svelte`
  - `src/lib/components/AttributeFileManager.svelte`
  - `src/lib/components/TableDefFileManager.svelte`
  - `src/lib/components/ColumnDefFileManager.svelte`
- 변경:
  - 각 `/files/mapping` GET API가 화면 고유 일부 관계가 아니라 공통 8종 연결 상태를 반환하도록 정리
  - 각 `/files/mapping` PUT API가 저장 시 `shared-file-mappings.json`을 정본으로 갱신하고, 직접 레지스트리 관계는 파생 정보로 best-effort 동기화
  - 8개 파일 관리 모달 어디서든 나머지 7개 파일을 모두 선택 가능하도록 UI 통일

3. DB 연관 상태/정렬 화면 매핑 컨텍스트 확장

- 대상:
  - `src/lib/components/DesignRelationPanel.svelte`
  - `src/routes/database/browse/+page.svelte`
  - `src/routes/entity/browse/+page.svelte`
  - `src/routes/attribute/browse/+page.svelte`
  - `src/routes/table/browse/+page.svelte`
  - `src/routes/column/browse/+page.svelte`
- 변경:
  - DB 5개 browse 화면이 `vocabulary/domain/term`까지 포함한 동일한 8종 파일 번들을 연관 상태 패널에 전달
  - 연관 상태 상세 및 정렬 동기화 호출이 같은 파일 조합을 공유하도록 정리

4. 회귀 테스트 보강

- 대상:
  - `src/lib/registry/db-design-file-mapping.test.ts`
  - `src/routes/api/vocabulary/files/mapping/server.test.ts`
  - `src/routes/api/domain/files/mapping/server.test.ts`
  - `src/routes/api/term/files/mapping/server.test.ts`
  - `src/routes/api/database/files/mapping/server.test.ts`
  - `src/routes/api/entity/files/mapping/server.test.ts`
  - `src/routes/api/attribute/files/mapping/server.test.ts`
  - `src/routes/api/table/files/mapping/server.test.ts`
  - `src/routes/api/column/files/mapping/server.test.ts`
  - `src/lib/components/VocabularyFileManager.test.ts`
  - `src/lib/components/DomainFileManager.test.ts`
  - `src/lib/components/TermFileManager.test.ts`
  - `src/lib/components/DatabaseFileManager.test.ts`
  - `src/lib/components/EntityFileManager.test.ts`
  - `src/lib/components/AttributeFileManager.test.ts`
  - `src/lib/components/TableDefFileManager.test.ts`
  - `src/lib/components/ColumnDefFileManager.test.ts`
- 변경:
  - 레거시 부분 매핑만 존재해도 8종 공통 번들을 해석할 수 있는지 검증
  - 각 파일 매핑 API가 공통 번들을 반환/저장하는지 검증
  - 8개 파일 관리 화면이 동일한 매핑 UI와 저장 흐름을 사용하는지 검증

## 2026-03-12

### 요약

- 도메인/용어 browse 페이지가 탭 이동 후에도 마지막으로 선택한 파일을 유지하도록 복원 로직이 정리되었습니다.
- 저장된 선택 파일이 목록에 남아 있으면 첫 번째 파일(`bksp.json` 등)로 덮어쓰지 않도록 공통 선택 규칙을 다시 적용했습니다.

### 상세 변경

1. 도메인/용어 현재 파일 복원 정리

- 대상:
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/term/browse/+page.svelte`
- 변경:
  - 페이지 초기 `selectedFilename`을 각 스토어의 현재 값으로 시작
  - 마운트 시 파일 목록과 저장된 선택 파일을 reconcile 한 뒤에만 폴백
  - 스토어 구독을 추가해 재진입 시 마지막 선택 파일이 유지되도록 정리

2. 파일 선택 복원 회귀 테스트 보강

- 대상:
  - `src/lib/utils/file-selection.test.ts`
  - `docs/tests/COMMON_UTILS_TEST_DESCRIPTION.md`
- 변경:
  - 저장된 선택 파일이 있을 때 `bksp.json`보다 우선 복원되는 케이스 추가
  - 저장된 파일이 사라졌을 때 현재 목록 기준으로 폴백하는 케이스 추가

## 2026-03-12

### 요약

- 내부에서 더 이상 쓰지 않는 스토어 하위 호환 래퍼를 제거하고 `unified-store`로 정리했습니다.
- `VocabularyData.mappedDomainFile` 호환 필드를 제거하고 단어집 매핑은 `mapping.domain`만 사용하도록 정리했습니다.
- 미사용 단일 정렬 테이블 타입/헬퍼와 구 시스템 파일 설정 래퍼를 제거했습니다.

### 상세 변경

1. 스토어 호환 래퍼 제거

- 대상:
  - `src/lib/stores/database-design-store.ts`
  - `src/lib/stores/domain-store.ts`
  - `src/lib/stores/term-store.ts`
  - `src/lib/stores/vocabulary-store.ts`
  - 관련 browse 페이지 / FileManager / TermEditor
- 변경:
  - 내부 import를 `src/lib/stores/unified-store.ts` 기준으로 교체
  - 단어집-도메인 선택 동기화는 `vocabularyDataStore`, `domainDataStore` 분리 사용으로 정리

2. 단어집 레거시 매핑 필드 제거

- 대상:
  - `src/lib/types/vocabulary.ts`
  - `src/lib/utils/type-guards.ts`
  - `src/routes/api/vocabulary/files/mapping/+server.ts`
  - `src/routes/api/vocabulary/sync-domain/+server.ts`
  - `docs/specs/data-model.md`
- 변경:
  - `VocabularyData.mappedDomainFile` 정의 제거
  - 저장/동기화 로직과 문서를 `mapping.domain` 기준으로 정리

3. 미사용 호환 유틸리티 제거

- 대상:
  - `src/lib/utils/settings.ts`
  - `src/lib/components/VocabularyTable.svelte`
  - `src/lib/components/DomainTable.svelte`
  - `src/lib/components/TermTable.svelte`
  - `src/lib/composables/use-data-table.ts`
  - `src/lib/types/table.ts`
- 변경:
  - 더 이상 호출되지 않는 `getShowSystemFiles`, `setShowSystemFiles` 제거
  - 현재 browse 흐름에서 사용되지 않는 단일 정렬 props/type/helper 제거

## 2026-03-11

### 요약

- 파일 업로드 관리 모달의 대상 파일 select 기본값이 browse 페이지의 현재 선택 파일과 일치하도록 정렬되었습니다.
- 첫 번째 파일로 고정되던 기본 선택값을 공통 유틸리티 기반으로 정리해 잘못된 덮어쓰기 위험을 줄였습니다.
- 도메인 표준명 생성이 데이터타입 첫 글자 대신 관리형 매핑약어 기반으로 바뀌었습니다.
- 도메인 목록 우상단에 데이터타입 매핑 관리 팝업이 추가되었고, 매핑 변경 시 관련 용어/컬럼 참조도 함께 동기화됩니다.
- 저장소 작업 규칙에 커밋 메시지 한글 재확인과 feature branch의 `main` 병합 준비 절차가 추가되었습니다.
- 저장소 기본 작업 브랜치가 `main`으로 정리되었고, 예외 브랜치 정리용 스크립트가 추가되었습니다.

### 상세 변경

1. 업로드 대상 파일 기본 선택 동기화

- 대상:
  - `src/lib/components/VocabularyFileManager.svelte`
  - `src/lib/components/DomainFileManager.svelte`
  - `src/lib/components/TermFileManager.svelte`
  - `src/lib/components/DatabaseFileManager.svelte`
  - `src/lib/components/EntityFileManager.svelte`
  - `src/lib/components/AttributeFileManager.svelte`
  - `src/lib/components/TableDefFileManager.svelte`
  - `src/lib/components/ColumnDefFileManager.svelte`
- 변경:
  - `currentFilename` prop을 받아 업로드 대상 select 기본값을 바깥 현재 파일과 맞춤
  - 파일 목록 재로딩 시에도 현재 파일 우선 선택 규칙을 유지

2. 공통 선택 로직 유틸리티 추가

- 대상:
  - `src/lib/utils/file-selection.ts`
  - `src/lib/utils/file-selection.test.ts`
- 변경:
  - 선호 파일, 현재 선택, 첫 번째 파일, fallback 순서를 공통 함수로 정리
  - 업로드 대상 파일 기본 선택 회귀를 유틸리티 테스트로 고정

3. Browse 페이지 FileManager 연결 정리

- 대상:
  - `src/routes/browse/+page.svelte`
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/term/browse/+page.svelte`
  - `src/routes/database/browse/+page.svelte`
  - `src/routes/entity/browse/+page.svelte`
  - `src/routes/attribute/browse/+page.svelte`
  - `src/routes/table/browse/+page.svelte`
  - `src/routes/column/browse/+page.svelte`
- 변경:
  - 각 browse 페이지가 현재 선택 파일명을 FileManager 모달에 명시적으로 전달
  - 업로드 탭 기본 선택과 좌측/상단 현재 파일 표시가 동일 기준으로 동작

4. 도메인 데이터타입 매핑 관리 추가

- 대상:
  - `src/lib/utils/domain-name.ts`
  - `src/lib/registry/domain-data-type-mapping-registry.ts`
  - `src/routes/api/domain/type-mappings/+server.ts`
  - `src/lib/components/DomainDataTypeMappingModal.svelte`
  - `src/routes/domain/browse/+page.svelte`
  - `src/lib/components/DomainEditor.svelte`
  - `static/data/settings/domain-data-type-mappings.json`
- 변경:
  - 도메인명 생성 규칙을 `도메인분류명 + 데이터타입 매핑약어 + 데이터길이 + 데이터소수점길이`로 변경
  - 기본 데이터타입 약어 매핑 세트를 설정 파일로 분리
  - 도메인 목록 우상단에서 매핑 목록 조회/등록/수정/삭제 가능한 팝업 추가
  - 매핑 변경 후 도메인명 재계산과 함께 용어/컬럼의 `domainName` 참조 자동 동기화

5. 도메인 검증/업로드/샘플 데이터 동기화

- 대상:
  - `src/routes/api/domain/+server.ts`
  - `src/routes/api/domain/validate/+server.ts`
  - `src/routes/api/domain/validate-all/+server.ts`
  - `src/routes/api/domain/upload/+server.ts`
  - `static/data/domain/*.json`
  - `static/data/term/*.json`
- 변경:
  - 도메인 생성/검증/일괄검사/XLSX 업로드가 공통 데이터타입 매핑 기준으로 표준 도메인명을 생성
  - 샘플 도메인/용어 데이터도 새 생성 규칙에 맞춰 정리

6. 저장소 작업 가이드 보강

- 대상:
  - `AGENTS.md`
  - `docs/CONVENTIONS.md`
  - `README.md`
- 변경:
  - 커밋 직전 한글 메시지 규칙 재확인 절차 추가
  - 기능 브랜치 작업 종료 전 최신 `main` 반영, 충돌 해결, 검증 재실행으로 병합 가능 상태를 확보하도록 명시

7. 기본 브랜치 운영 방식 및 브랜치 정리 스크립트 추가

- 대상:
  - `AGENTS.md`
  - `docs/CONVENTIONS.md`
  - `README.md`
  - `package.json`
  - `scripts/finalize-branch.ps1`
- 변경:
  - 기본 작업 브랜치를 `main`으로 명시하고, 자동화 도구가 임의로 기능 브랜치를 만들지 않도록 규칙화
  - 예외적으로 사용한 브랜치를 `main` 기준 반영, 검증, fast-forward 병합, 로컬/원격 삭제까지 정리하는 PowerShell 스크립트 추가

## 2026-02-16

### 요약

- 프론트엔드 디자인 시스템 정비 및 공통 컴포넌트 기반으로 UI가 표준화되었습니다.
- 네이티브 `alert/confirm` 의존도를 제거하고 전역 `Toast/ConfirmDialog` 패턴으로 통합했습니다.
- 프론트엔드 검증(`pnpm check`, `pnpm vitest run`)이 모두 통과했습니다.

### 상세 변경

1. 디자인 시스템/토큰 정비

- 대상: `tailwind.config.js`, `src/app.css`
- 변경:
  - 시맨틱 색상 토큰(`brand`, `surface`, `content`, `border`, `status`) 확장
  - 버튼/배지/입력 등 공통 클래스 정리

2. 공통 컴포넌트 추가 및 페이지 재사용 구조 강화

- 신규 컴포넌트:
  - `src/lib/components/Icon.svelte`
  - `src/lib/components/Toast.svelte`
  - `src/lib/components/ConfirmDialog.svelte`
  - `src/lib/components/ValidationPanelShell.svelte`
  - `src/lib/components/FormField.svelte`
  - `src/lib/components/EmptyState.svelte`
  - `src/lib/components/Skeleton.svelte`
  - `src/lib/components/Breadcrumb.svelte`
  - `src/lib/components/BrowsePageLayout.svelte`
  - `src/lib/components/ActionBar.svelte`

3. 사용자 상호작용 패턴 표준화

- 대상:
  - `src/lib/stores/toast-store.ts`
  - `src/lib/stores/confirm-store.ts`
  - 다수 Editor/FileManager/ERD/Term 화면
- 변경:
  - `showConfirm(...)` 기반 삭제/파괴 작업 확인 패턴 적용
  - `addToast(...)` 기반 성공/실패 피드백 통일
  - `src/routes/+layout.svelte`에서 `Toast`, `ConfirmDialog` 전역 마운트

4. 검증/테스트 정합성 보강

- 대상:
  - `src/lib/components/Breadcrumb.svelte`
  - `src/lib/components/VocabularyEditor.test.ts`
  - `src/lib/components/DomainEditor.test.ts`
  - `src/lib/components/EntityEditor.test.ts`
  - `src/lib/components/ERDViewer.test.ts`
- 변경:
  - Svelte 문법 오류(`{@const}` 배치) 수정
  - Confirm/Toast 스토어 기반 테스트로 전환

## 2026-02-13

### 요약

- 매핑/참조 로직이 `mapping-registry` 중심으로 통합되었습니다.
- 다중 파일 매핑 해석이 레지스트리 우선 구조로 정리되었습니다.
- 일부 API가 `file-handler` 기반에서 `data-registry`/`cache-registry` 기반으로 전환되었습니다.

### 상세 변경

1. 매핑 해석 3단계 폴백 도입

- 대상: `src/lib/registry/mapping-registry.ts`
- 신규 함수: `resolveRelatedFilenames`, `getKnownRelatedTypes`
- 우선순위:
  - 1순위: `registry.json` 매핑
  - 2순위: 각 파일의 `mapping` 필드
  - 3순위: `DEFAULT_FILENAMES`

2. 엔트리 레벨 참조 검사 통합

- 대상: `src/lib/registry/mapping-registry.ts`
- 신규 함수: `checkEntryReferences(type, entry, filename?)`
- 적용:
  - `vocabulary` 삭제 시 `term` 참조 검사
  - `domain` 삭제 시 `vocabulary`, `term` 참조 검사
- 기존 함수:
  - `checkVocabularyReferences` / `checkDomainReferences`는 deprecated 처리

3. 매핑 API 듀얼 라이트 적용

- 대상:
  - `src/routes/api/term/files/mapping/+server.ts`
  - `src/routes/api/vocabulary/files/mapping/+server.ts`
- 동작:
  - 파일 내 `mapping` 필드 저장 (하위 호환)
  - 레지스트리 매핑 CRUD 반영 (best-effort)
  - 레지스트리 갱신 실패 시 파일 저장은 유지

4. 동기화/검증 API의 레지스트리 기반 전환

- 대상:
  - `src/routes/api/term/sync/+server.ts`
  - `src/routes/api/term/validate/+server.ts`
  - `src/routes/api/term/validate-all/+server.ts`
  - `src/routes/api/vocabulary/sync-domain/+server.ts`
  - `src/routes/api/column/sync-term/+server.ts`
- 변경:
  - `loadData` / `saveData` 사용
  - 관련 파일명은 `resolveRelatedFilenames`로 해석

5. ERD 생성 API 파일 탐색 전환

- 대상: `src/routes/api/erd/generate/+server.ts`
- 변경:
  - 타입별 파일 탐색을 `listFiles(type)`로 일원화
  - 단어집 캐시 접근을 `getCachedData`로 통합

### 호환성 메모

- 기존 파일 포맷(`mapping` 필드)은 유지됩니다.
- `VocabularyData.mappedDomainFile`은 deprecated이며 제거 방향입니다.
