# DbManager

DbManager는 SvelteKit 기반의 표준 단어/도메인/용어/DB설계 데이터를 JSON 파일로 관리하는 웹 애플리케이션입니다.

## 핵심 기능

- 단어집(`vocabulary`) CRUD, 중복 탐지, 도메인 동기화
- 도메인(`domain`) CRUD, 검증, 단어집/용어 참조 기반 삭제 보호
- 용어(`term`) CRUD, 매핑 검증, 전체 동기화/일괄 검증
- DB 설계 데이터(`database`, `entity`, `attribute`, `table`, `column`) 관리
- ERD 생성 API 및 컬럼-용어 동기화 API
- 다중 파일 운영 및 파일 간 매핑 관리

## 최근 변경 사항

### 2026-03-12 8종 파일 매핑 통합

- 8종 파일 매핑 정본을 `static/data/settings/shared-file-mappings.json`으로 분리
- 단어집/도메인/용어/DB/엔터티/속성/테이블/컬럼 파일 관리 모달이 공통 매핑 UI를 사용하도록 정리
- 8개 화면 어디서든 나머지 7개 파일을 모두 지정할 수 있고, 저장 시 같은 8종 파일 조합이 공유
- 개별 데이터 JSON의 `mapping` 필드는 저장 정본으로 유지하지 않고, 로드 시 공통 매핑 파일 기준으로 런타임 주입
- DB 5개 browse 화면의 연관 상태 상세/정렬 동기화도 같은 8종 파일 번들을 기준으로 동작

### 2026-02-16 프론트엔드 디자인 개선

- 시맨틱 컬러 토큰 및 공통 UI 클래스 정비(`tailwind.config.js`, `src/app.css`)
- 공통 UI 컴포넌트 추가
  - `Icon`, `Toast`, `ConfirmDialog`, `ValidationPanelShell`, `FormField`
  - `EmptyState`, `Skeleton`, `Breadcrumb`, `BrowsePageLayout`, `ActionBar`
- 사용자 상호작용 표준화
  - 브라우저 `alert/confirm` 대신 `addToast`/`showConfirm` 사용
  - `src/routes/+layout.svelte`에서 `Toast`/`ConfirmDialog` 전역 마운트
- 검증 상태
  - `pnpm check` 통과
  - `pnpm vitest run` 통과 (946 tests)

### 2026-02-13 초기 매핑/레지스트리 개선

- 매핑 해석 로직을 `mapping-registry` 중심으로 통합
  - 직접 관계 해석 기준 3단계 폴백: `registry.json` -> 레거시 파일 내 `mapping` -> 기본 파일명
- 초기 파일 매핑 저장 API에 듀얼 라이트 적용
  - 이후 2026-03-12부터 8종 공통 매핑 정본은 `shared-file-mappings.json`으로 이관
- 엔트리 삭제 전 참조 검사 로직을 제네릭화
  - `checkEntryReferences`로 Vocabulary/Domain 삭제 참조 검사 통합
- 주요 API를 `data-registry`/`cache-registry` 기반으로 전환
  - `term/*`, `vocabulary/sync-domain`, `column/sync-term`, `erd/generate` 등

상세 내역은 `docs/CHANGELOG.md`를 참고하세요.

## 기술 스택

- SvelteKit 2
- Svelte 5
- TypeScript
- Tailwind CSS
- Vite
- Vitest / Playwright
- pnpm

## 프로젝트 구조

```text
src/
  lib/
    registry/      # data-registry, mapping-registry, cache-registry
    utils/         # 파서/검증/파일 처리/ERD 생성
    components/    # UI 컴포넌트
    stores/        # 상태 관리
    types/         # 타입 정의
  routes/
    api/           # 서버 API
docs/
  specs/           # API/데이터 모델 명세
  CHANGELOG.md     # 변경 이력
static/
  data/            # JSON 데이터 저장소
```

## 시작하기

### 요구 사항

- Node.js 20+
- pnpm

### 로컬 실행

```bash
pnpm install
pnpm run dev
```

접속: `http://localhost:5173`

### Docker 실행

```bash
docker-compose up --build
```

접속: `http://localhost:63000`

## 스크립트

- `pnpm run dev`
- `pnpm run build`
- `pnpm run preview`
- `pnpm run check`
- `pnpm run lint`
- `pnpm run format`
- `pnpm run test`
- `pnpm run reset:test-data`
  - 단어집, 도메인, 용어집, DB/엔터티/속성/테이블/컬럼 정의서 JSON을 빈 기본 파일로 다시 만들고 `registry.json`, `static/data/settings/shared-file-mappings.json`도 기본 상태로 초기화합니다.
  - `static/data/settings/domain-data-type-mappings.json` 같은 비대상 설정 파일은 유지합니다.
- `pnpm run test:e2e`
- `pnpm run finalize:branch -- <branch-name>`
  - 예외적으로 사용한 기능 브랜치를 `main` 기준 반영, 검증, `main` fast-forward 병합, 브랜치 삭제 순서로 정리합니다.
  - 현재 브랜치가 곧 정리 대상이면 `<branch-name>`은 생략할 수 있습니다.
  - 추가 테스트가 필요하면 `pnpm run finalize:branch -- <branch-name> -AdditionalTestCommand "pnpm vitest run ..."` 형태로 실행합니다.

## 개발 워크플로

- 이 저장소의 커밋 메시지는 항상 한글로 작성합니다.
  - `feat`, `fix`, `docs` 같은 타입 접두사는 유지해도 되지만, 제목과 본문 설명은 한글로 작성합니다.
- 기본 작업 브랜치는 `main`입니다.
  - Codex를 포함한 자동화 도구는 사용자가 명시적으로 요청하지 않는 한 기능 브랜치를 임의로 생성하지 않습니다.
- 예외적으로 별도 브랜치를 사용했다면, 작업 완료 기준은 구현 완료가 아니라 `main` 병합 및 브랜치 정리 완료입니다.
  - 최신 `main` 기준을 현재 브랜치에 반영합니다.
  - 충돌이 있으면 현재 브랜치에서 해결합니다.
  - 반영 후 `pnpm check`와 변경 범위 테스트를 다시 실행합니다.
  - 검증이 끝나면 `main`으로 fast-forward 병합하고 브랜치를 삭제합니다.
  - 가능하면 `pnpm run finalize:branch`로 이 절차를 한 번에 수행합니다.
  - 이 과정을 완료하지 못하면 차단 사유를 명시적으로 남깁니다.

## 문서

- 문서 인덱스: `docs/README.md`
- 빠른 시작: `docs/QUICK_START.md`
- 사용자 가이드: `docs/USER_GUIDE.md`
- API 명세: `docs/specs/api-reference.md`
- 데이터 모델: `docs/specs/data-model.md`
