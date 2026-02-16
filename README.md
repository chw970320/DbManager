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

### 2026-02-13 매핑/레지스트리 개선

- 매핑 해석 로직을 `mapping-registry` 중심으로 통합
  - 3단계 폴백: `registry.json` -> 파일 내 `mapping` -> 기본 파일명
- 파일 매핑 저장 API에 듀얼 라이트 적용
  - 파일 내부 `mapping` 저장 + 레지스트리 매핑 동시 갱신(best-effort)
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
- `pnpm run test:e2e`

## 문서

- 문서 인덱스: `docs/README.md`
- 빠른 시작: `docs/QUICK_START.md`
- 사용자 가이드: `docs/USER_GUIDE.md`
- API 명세: `docs/specs/api-reference.md`
- 데이터 모델: `docs/specs/data-model.md`
