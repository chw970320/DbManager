# 프로젝트 구조 분석

## 개요

이 문서는 DbManager 프로젝트의 전체 디렉토리 구조와 아키텍처를 분석합니다.

## 디렉토리 트리 구조

```
DbManager/
├── .vscode/                    # VS Code 설정
│   └── settings.json
├── docs/                       # 프로젝트 문서
│   ├── analysis/               # 분석 문서
│   ├── issues/                 # 이슈 추적
│   ├── specs/                  # 명세서
│   └── plans/                  # 계획 문서
├── init-db/                    # 초기 데이터베이스 파일
│   └── forbidden-words.json
├── src/                        # 소스 코드
│   ├── lib/                    # 재사용 가능한 라이브러리 코드
│   │   ├── components/         # Svelte 컴포넌트
│   │   ├── stores/             # Svelte Stores (상태 관리)
│   │   ├── types/              # TypeScript 타입 정의
│   │   └── utils/              # 유틸리티 함수
│   ├── routes/                 # SvelteKit 라우팅
│   │   ├── api/                # API 엔드포인트
│   │   ├── browse/             # 단어집 브라우징 페이지
│   │   ├── domain/             # 도메인 관련 페이지
│   │   └── term/               # 용어 관련 페이지
│   ├── types/                  # 타입 정의 (외부 라이브러리)
│   ├── app.css                 # 전역 스타일
│   ├── app.d.ts                # TypeScript 타입 선언
│   └── app.html                # HTML 템플릿
├── static/                     # 정적 파일
│   ├── global/                 # 전역 설정 파일
│   └── favicon.png
├── .dockerignore
├── .gitignore
├── .npmrc
├── .prettierignore
├── .prettierrc
├── docker-compose.yml
├── Dockerfile
├── eslint.config.js
├── package.json
├── pnpm-lock.yaml
├── postcss.config.js
├── README.md
├── svelte.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 주요 폴더의 목적과 역할

### `/src` - 소스 코드 루트

프로젝트의 모든 소스 코드가 위치하는 디렉토리입니다.

### `/src/lib` - 재사용 가능한 라이브러리 코드

- **`components/`**: 재사용 가능한 Svelte 컴포넌트
  - `VocabularyTable.svelte`: 단어집 테이블 표시
  - `DomainTable.svelte`: 도메인 테이블 표시
  - `TermTable.svelte`: 용어 테이블 표시
  - `VocabularyFileManager.svelte`: 단어집 파일 관리
  - `TermFileManager.svelte`: 용어 파일 관리
  - `HistoryLog.svelte`: 히스토리 로그 표시
  - `SearchBar.svelte`: 검색 바 컴포넌트
  - `TermEditor.svelte`: 용어 편집기
  - `DomainEditor.svelte`: 도메인 편집기
  - `ForbiddenWordManager.svelte`: 금지어 관리
  - `FileUpload.svelte`: 파일 업로드 컴포넌트
  - `ScrollToTop.svelte`: 스크롤 상단 이동 버튼
  - `TermGenerator.svelte`: 용어 생성기

- **`stores/`**: Svelte Stores를 사용한 상태 관리
  - `vocabularyStore.ts`: 단어집 상태 관리
  - `domain-store.ts`: 도메인 상태 관리
  - `term-store.ts`: 용어 상태 관리
  - `settings-store.ts`: 설정 상태 관리

- **`types/`**: TypeScript 타입 정의
  - `vocabulary.ts`: 단어집 관련 타입
  - `domain.ts`: 도메인 관련 타입
  - `term.ts`: 용어 관련 타입

- **`utils/`**: 유틸리티 함수
  - `file-handler.ts`: 파일 읽기/쓰기 처리
  - `xlsx-parser.ts`: Excel 파일 파싱 및 생성
  - `history-handler.ts`: 히스토리 로그 관리
  - `validation.ts`: 데이터 검증
  - `duplicate-handler.ts`: 중복 처리
  - `file-filter.ts`: 파일 필터링
  - `settings.ts`: 설정 관리
  - `debounce.ts`: 디바운스 유틸리티

### `/src/routes` - 라우팅 디렉토리

SvelteKit의 파일 기반 라우팅 시스템을 사용합니다.

- **`+layout.svelte`**: 전역 레이아웃 컴포넌트
- **`+page.svelte`**: 홈 페이지 (`/`)
- **`browse/+page.svelte`**: 단어집 브라우징 페이지 (`/browse`)
- **`domain/browse/+page.svelte`**: 도메인 브라우징 페이지 (`/domain/browse`)
- **`term/browse/+page.svelte`**: 용어 브라우징 페이지 (`/term/browse`)

### `/src/routes/api` - API 엔드포인트

서버 사이드 API 라우트입니다. 각 폴더의 `+server.ts` 파일이 엔드포인트를 정의합니다.

- **`vocabulary/`**: 단어집 관련 API
  - `+server.ts`: 단어집 CRUD
  - `download/+server.ts`: 단어집 다운로드
  - `files/+server.ts`: 파일 목록 관리
  - `mapping/+server.ts`: 매핑 정보 관리
  - `duplicates/+server.ts`: 중복 검사
  - `sync-domain/+server.ts`: 도메인 동기화

- **`domain/`**: 도메인 관련 API
  - `+server.ts`: 도메인 CRUD
  - `download/+server.ts`: 도메인 다운로드
  - `files/+server.ts`: 파일 목록 관리
  - `upload/+server.ts`: 도메인 업로드

- **`term/`**: 용어 관련 API
  - `+server.ts`: 용어 CRUD
  - `download/+server.ts`: 용어 다운로드
  - `files/+server.ts`: 파일 목록 관리
  - `mapping/+server.ts`: 매핑 정보 관리
  - `sync/+server.ts`: 동기화
  - `upload/+server.ts`: 용어 업로드

- **`history/+server.ts`**: 히스토리 로그 API
- **`search/+server.ts`**: 검색 API
- **`settings/+server.ts`**: 설정 API
- **`forbidden-words/+server.ts`**: 금지어 관리 API
- **`generator/+server.ts`**: 용어 생성 API
- **`upload/+server.ts`**: 일반 업로드 API

### `/static` - 정적 파일

빌드 시 그대로 복사되는 정적 파일들입니다.

- **`global/settings.json`**: 전역 설정 파일
- **`favicon.png`**: 파비콘

### `/init-db` - 초기 데이터베이스

초기 데이터베이스 파일이 저장되는 디렉토리입니다.

- **`forbidden-words.json`**: 초기 금지어 목록

### `/docs` - 문서 디렉토리

프로젝트 문서를 체계적으로 관리하는 디렉토리입니다.

## 사용 중인 프레임워크

### 메인 프레임워크

- **SvelteKit** (`^2.16.0`): 풀스택 웹 프레임워크
  - 파일 기반 라우팅
  - 서버 사이드 렌더링 (SSR)
  - API 라우트 지원
  - 자동 코드 스플리팅

### 빌드 도구

- **Vite** (`^6.2.6`): 차세대 프론트엔드 빌드 도구
  - 빠른 HMR (Hot Module Replacement)
  - 최적화된 프로덕션 빌드

### UI 프레임워크

- **Svelte** (`^5.0.0`): 컴파일 타임 프레임워크
  - 반응형 시스템
  - 컴포넌트 기반 아키텍처

### 스타일링

- **Tailwind CSS** (`^3.4.17`): 유틸리티 우선 CSS 프레임워크
- **PostCSS** (`^8.5.6`): CSS 후처리기
- **Autoprefixer** (`^10.4.21`): CSS 벤더 프리픽스 자동 추가

## 주요 Dependencies

### 프로덕션 의존성

```json
{
	"svelte-copy-to-clipboard": "^0.2.5", // 클립보드 복사 기능
	"uuid": "^11.1.0", // UUID 생성
	"xlsx": "^0.18.5", // Excel 파일 읽기/쓰기
	"xlsx-js-style": "^1.2.0" // Excel 스타일링 지원
}
```

### 개발 의존성 (주요)

```json
{
	"@sveltejs/kit": "^2.16.0", // SvelteKit 프레임워크
	"@sveltejs/adapter-node": "^5.2.12", // Node.js 어댑터
	"svelte": "^5.0.0", // Svelte 컴파일러
	"typescript": "^5.0.0", // TypeScript
	"vite": "^6.2.6", // 빌드 도구
	"tailwindcss": "^3.4.17", // CSS 프레임워크
	"eslint": "^9.18.0", // 린터
	"prettier": "^3.4.2" // 코드 포맷터
}
```

## 설정 파일 요약

### `package.json`

- 프로젝트 메타데이터 및 의존성 관리
- npm/pnpm 스크립트 정의
- 패키지 빌드 설정

### `svelte.config.js`

```javascript
{
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),        // Node.js 어댑터 사용
    csrf: {
      checkOrigin: false      // CSRF 검사 비활성화 (개발 환경)
    }
  }
}
```

### `vite.config.ts`

```typescript
{
  plugins: [sveltekit()],
  css: {
    postcss: './postcss.config.js'  // PostCSS 설정
  },
  optimizeDeps: {
    include: ['tailwindcss']        // 최적화 대상
  }
}
```

### `tsconfig.json`

- TypeScript 컴파일러 설정
- 엄격한 타입 체크 활성화
- ESNext 모듈 시스템 사용
- SvelteKit 타입 정의 확장

### `tailwind.config.js`

- Tailwind CSS 설정
- 컨텐츠 경로: `./src/**/*.{html,js,svelte,ts}`
- Safelist에 동적 클래스 포함

### `postcss.config.js`

- PostCSS 플러그인 설정
- Tailwind CSS 및 Autoprefixer 사용

### `eslint.config.js`

- ESLint 설정
- Svelte 플러그인 통합
- Prettier 통합

### `.prettierrc`

- Prettier 코드 포맷팅 설정
- Svelte 및 Tailwind CSS 플러그인 사용

## 프로젝트 진입점 파일들

### 1. `src/app.html`

메인 HTML 템플릿 파일입니다. SvelteKit이 이 파일을 기반으로 HTML을 생성합니다.

```html
<!doctype html>
<html lang="ko" class="h-full">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" href="%sveltekit.assets%/favicon.png" />
		<!-- SvelteKit이 head 내용을 주입 -->
		%sveltekit.head%
	</head>
	<body>
		<!-- SvelteKit이 앱 내용을 주입 -->
		%sveltekit.body%
	</body>
</html>
```

### 2. `src/routes/+layout.svelte`

전역 레이아웃 컴포넌트입니다. 모든 페이지에 공통으로 적용되는 레이아웃을 정의합니다.

- 네비게이션 바
- 모바일 메뉴
- 공통 스타일 및 구조

### 3. `src/routes/+page.svelte`

홈 페이지 (`/`)입니다. 애플리케이션의 랜딩 페이지 역할을 합니다.

### 4. `src/app.css`

전역 CSS 스타일입니다. Tailwind CSS 디렉티브와 커스텀 스타일을 포함합니다.

### 5. `src/lib/index.ts`

라이브러리 코드의 진입점입니다. 외부에서 사용할 수 있는 컴포넌트와 유틸리티를 export합니다.

## 라우팅 구조

### SvelteKit 파일 기반 라우팅

SvelteKit은 파일 시스템 기반 라우팅을 사용합니다. `src/routes` 디렉토리의 파일 구조가 URL 경로를 결정합니다.

### 라우팅 규칙

1. **페이지 라우트**: `+page.svelte` 파일이 페이지를 정의합니다.
   - `src/routes/+page.svelte` → `/`
   - `src/routes/browse/+page.svelte` → `/browse`
   - `src/routes/domain/browse/+page.svelte` → `/domain/browse`
   - `src/routes/term/browse/+page.svelte` → `/term/browse`

2. **레이아웃 라우트**: `+layout.svelte` 파일이 레이아웃을 정의합니다.
   - `src/routes/+layout.svelte`: 모든 페이지에 적용되는 전역 레이아웃

3. **API 라우트**: `+server.ts` 파일이 API 엔드포인트를 정의합니다.
   - `src/routes/api/vocabulary/+server.ts` → `GET/POST /api/vocabulary`
   - `src/routes/api/vocabulary/files/+server.ts` → `GET/POST /api/vocabulary/files`
   - `src/routes/api/vocabulary/mapping/+server.ts` → `GET/PUT /api/vocabulary/files/mapping`

### 라우트 구조 예시

```
src/routes/
├── +layout.svelte          # 전역 레이아웃
├── +page.svelte            # / (홈)
├── browse/
│   └── +page.svelte        # /browse
├── domain/
│   └── browse/
│       └── +page.svelte    # /domain/browse
├── term/
│   └── browse/
│       └── +page.svelte    # /term/browse
└── api/
    ├── vocabulary/
    │   ├── +server.ts       # /api/vocabulary
    │   ├── files/
    │   │   └── +server.ts   # /api/vocabulary/files
    │   └── mapping/
    │       └── +server.ts  # /api/vocabulary/files/mapping
    └── ...
```

## 빌드 및 실행 스크립트

### 개발 스크립트

```bash
pnpm run dev
```

- Vite 개발 서버 실행
- HMR (Hot Module Replacement) 활성화
- 기본 포트: `5173`

### 빌드 스크립트

```bash
pnpm run build
```

- 프로덕션 빌드 생성
- `vite build` 실행
- `prepack` 스크립트 실행 (SvelteKit sync 및 패키징)

### 프리뷰 스크립트

```bash
pnpm run preview
```

- 프로덕션 빌드를 로컬에서 미리보기
- 빌드된 앱을 테스트

### 검사 스크립트

```bash
pnpm run check
```

- TypeScript 타입 체크
- Svelte 코드 검증
- `svelte-check` 실행

```bash
pnpm run check:watch
```

- 타입 체크를 watch 모드로 실행

### 포맷팅 스크립트

```bash
pnpm run format
```

- Prettier로 전체 코드 포맷팅

```bash
pnpm run lint
```

- Prettier 및 ESLint로 코드 검사

### 기타 스크립트

```bash
pnpm run prepare
```

- Git hooks 설정 시 자동 실행
- SvelteKit sync 실행

```bash
pnpm run prepack
```

- 패키지 빌드 전 실행
- SvelteKit sync, svelte-package, publint 실행

## 데이터 저장 구조

### 정적 데이터 디렉토리

데이터 파일은 `static/data` 디렉토리에 저장됩니다 (런타임에 생성).

```
static/data/
├── vocabulary/              # 단어집 데이터
│   ├── vocabulary.json
│   ├── vocabulary-*.json   # 사용자 생성 파일
│   └── history.json         # 히스토리 로그
├── domain/                 # 도메인 데이터
│   ├── domain.json
│   └── history.json
└── term/                   # 용어 데이터
    ├── term.json
    └── history.json
```

## Docker 설정

### `Dockerfile`

- Node.js 기반 이미지
- 프로덕션 빌드 생성
- 포트 3000 노출

### `docker-compose.yml`

- 서비스 정의
- 포트 매핑: `63000:3000`
- 볼륨 마운트 설정

## 요약

이 프로젝트는 **SvelteKit** 기반의 풀스택 웹 애플리케이션으로, 다음과 같은 특징을 가집니다:

1. **파일 기반 라우팅**: SvelteKit의 자동 라우팅 시스템
2. **컴포넌트 기반 아키텍처**: 재사용 가능한 Svelte 컴포넌트
3. **상태 관리**: Svelte Stores를 사용한 반응형 상태 관리
4. **타입 안정성**: TypeScript로 전체 프로젝트 타입 체크
5. **빠른 개발 경험**: Vite의 HMR과 빠른 빌드
6. **유틸리티 우선 스타일링**: Tailwind CSS
7. **서버 사이드 API**: SvelteKit의 API 라우트 활용
