# 개발 컨벤션

이 문서는 DbManager 프로젝트의 개발 컨벤션을 정의합니다. 프로젝트 일관성을 유지하기 위해 모든 개발자는 이 문서를 준수해야 합니다.

## 목차

1. [프로젝트 정보](#프로젝트-정보)
2. [기술 스택](#기술-스택)
3. [프로젝트 구조](#프로젝트-구조)
4. [코딩 스타일](#코딩-스타일)
5. [네이밍 컨벤션](#네이밍-컨벤션)
6. [파일 구조 패턴](#파일-구조-패턴)
7. [컴포넌트 작성 패턴](#컴포넌트-작성-패턴)
8. [API 라우트 패턴](#api-라우트-패턴)
9. [상태 관리 패턴](#상태-관리-패턴)
10. [타입 정의 패턴](#타입-정의-패턴)
11. [에러 처리 패턴](#에러-처리-패턴)
12. [테스트 전략](#테스트-전략)

---

## 프로젝트 정보

### 프로젝트 버전

- **프로젝트명**: dbmanager
- **버전**: 0.0.1
- **패키지 매니저**: pnpm
- **Node.js 버전**: 권장 18.x 이상

### 프로젝트 타입

- **프레임워크**: SvelteKit (Full-stack)
- **빌드 도구**: Vite
- **어댑터**: @sveltejs/adapter-node

---

## 기술 스택

### 핵심 프레임워크 및 라이브러리

| 패키지                           | 버전    | 용도                       |
| -------------------------------- | ------- | -------------------------- |
| **svelte**                       | ^5.0.0  | UI 프레임워크 (Runes 기반) |
| **@sveltejs/kit**                | ^2.16.0 | Full-stack 프레임워크      |
| **@sveltejs/vite-plugin-svelte** | ^5.0.0  | Vite 플러그인              |
| **typescript**                   | ^5.0.0  | 타입 시스템                |
| **vite**                         | ^6.2.6  | 빌드 도구                  |

### UI 라이브러리

| 패키지           | 버전     | 용도            |
| ---------------- | -------- | --------------- |
| **tailwindcss**  | ^3.4.17  | CSS 프레임워크  |
| **autoprefixer** | ^10.4.21 | CSS 자동 접두사 |
| **postcss**      | ^8.5.6   | CSS 후처리      |

### 개발 도구

| 패키지                          | 버전    | 용도                       |
| ------------------------------- | ------- | -------------------------- |
| **eslint**                      | ^9.18.0 | 코드 린터                  |
| **prettier**                    | ^3.4.2  | 코드 포매터                |
| **typescript-eslint**           | ^8.20.0 | TypeScript ESLint 플러그인 |
| **eslint-plugin-svelte**        | ^3.0.0  | Svelte ESLint 플러그인     |
| **prettier-plugin-svelte**      | ^3.3.3  | Svelte Prettier 플러그인   |
| **prettier-plugin-tailwindcss** | ^0.6.11 | Tailwind CSS 클래스 정렬   |
| **svelte-check**                | ^4.0.0  | Svelte 타입 체크           |

### 프로덕션 의존성

| 패키지                       | 버전    | 용도              |
| ---------------------------- | ------- | ----------------- |
| **uuid**                     | ^11.1.0 | 고유 ID 생성      |
| **xlsx**                     | ^0.18.5 | Excel 파일 처리   |
| **xlsx-js-style**            | ^1.2.0  | Excel 스타일 지원 |
| **svelte-copy-to-clipboard** | ^0.2.5  | 클립보드 복사     |

---

## 프로젝트 구조

### 바렐 패턴 (Barrel Pattern)

프로젝트는 **바렐 패턴**을 사용하여 `src/lib` 디렉토리를 구성합니다.

```
src/lib/
├── components/     # 재사용 가능한 Svelte 컴포넌트
├── composables/   # 재사용 가능한 로직 (컴포저블)
├── stores/        # Svelte 스토어 (상태 관리)
├── types/         # TypeScript 타입 정의
├── utils/         # 유틸리티 함수
└── index.ts       # 공개 API (barrel export)
```

### 디렉토리 구조

```
DbManager/
├── src/
│   ├── lib/                    # 공유 라이브러리 (바렐 패턴)
│   │   ├── components/         # Svelte 컴포넌트
│   │   ├── composables/       # 재사용 로직
│   │   ├── stores/            # 상태 관리
│   │   ├── types/             # 타입 정의
│   │   ├── utils/             # 유틸리티
│   │   └── index.ts           # 공개 API
│   ├── routes/                 # SvelteKit 라우트
│   │   ├── api/               # API 엔드포인트
│   │   ├── browse/            # 페이지 라우트
│   │   └── +layout.svelte     # 레이아웃
│   ├── app.css                # 전역 스타일
│   └── app.html               # HTML 템플릿
├── static/                     # 정적 파일
│   └── data/                  # JSON 데이터 파일
├── build/                      # 빌드 출력
├── dist/                       # 패키지 배포 파일
└── docs/                       # 문서
```

### 파일 명명 규칙

- **컴포넌트**: PascalCase (예: `DomainTable.svelte`)
- **유틸리티**: kebab-case (예: `api-client.ts`)
- **타입 파일**: kebab-case (예: `vocabulary.ts`)
- **스토어**: kebab-case (예: `domain-store.ts`)
- **API 라우트**: `+server.ts` (SvelteKit 컨벤션)

---

## 코딩 스타일

### Prettier 설정

프로젝트는 Prettier를 사용하여 코드 포매팅을 자동화합니다.

**설정 파일**: `.prettierrc`

```json
{
	"useTabs": true,
	"singleQuote": true,
	"trailingComma": "none",
	"printWidth": 100,
	"plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
	"overrides": [
		{
			"files": "*.svelte",
			"options": {
				"parser": "svelte"
			}
		}
	]
}
```

**주요 규칙**:

- **들여쓰기**: 탭 사용
- **따옴표**: 단일 따옴표 (`'`)
- **후행 쉼표**: 없음
- **줄 길이**: 100자
- **Tailwind CSS 클래스**: 자동 정렬

### ESLint 설정

**설정 파일**: `eslint.config.js`

**주요 규칙**:

- TypeScript ESLint 권장 규칙 사용
- Svelte 권장 규칙 사용
- `no-undef` 비활성화 (TypeScript가 처리)
- `@typescript-eslint/no-unused-vars`: `_`로 시작하는 변수 무시
- `svelte/no-at-html-tags`: 비활성화 (XSS 경고 무시)

### TypeScript 설정

**설정 파일**: `tsconfig.json`

**주요 옵션**:

- `strict: true` - 엄격한 타입 체크
- `moduleResolution: "bundler"` - 번들러 모드
- `module: "ESNext"` - ES 모듈 사용
- `allowJs: true` - JavaScript 파일 허용
- `checkJs: true` - JavaScript 타입 체크

---

## 네이밍 컨벤션

### 변수 및 함수

- **camelCase** 사용
- 함수명은 동사로 시작 (예: `loadVocabularyData`, `handleSort`)
- Boolean 변수는 `is`, `has`, `should` 접두사 사용 (예: `isLoading`, `hasError`)

```typescript
// ✅ 좋은 예
let isLoading = $state(false);
let totalCount = $state(0);
function handleRowClick(entry: DomainEntry) {}

// ❌ 나쁜 예
let loading = $state(false);
let total_count = $state(0);
function rowClick(entry: DomainEntry) {}
```

### 타입 및 인터페이스

- **PascalCase** 사용
- 인터페이스는 명사로 명명
- 타입은 명확한 의미 전달

```typescript
// ✅ 좋은 예
interface VocabularyEntry {}
type SortDirection = 'asc' | 'desc';
type EntityType = 'vocabulary' | 'domain' | 'term';

// ❌ 나쁜 예
interface vocabularyEntry {}
type sortDirection = 'asc' | 'desc';
```

### 컴포넌트

- **PascalCase** 사용
- 명확한 기능을 나타내는 이름

```typescript
// ✅ 좋은 예
DomainTable.svelte;
VocabularyEditor.svelte;
SearchBar.svelte;

// ❌ 나쁜 예
domain - table.svelte;
vocabulary_editor.svelte;
```

### 상수

- **UPPER_SNAKE_CASE** 사용 (전역 상수)
- **camelCase** 사용 (모듈 내 상수)

```typescript
// ✅ 좋은 예
const API_BASE_URL = '/api';
const FILE_API_ENDPOINTS: Record<EntityType, string> = {
	vocabulary: '/api/vocabulary/files',
	domain: '/api/domain/files'
};
```

---

## 파일 구조 패턴

### 컴포넌트 파일 구조

Svelte 컴포넌트는 다음 순서로 구성합니다:

```svelte
<script lang="ts">
  // 1. Import 문
  import type { ... } from '...';
  import { ... } from '...';

  // 2. 타입 정의
  type EventType = { ... };

  // 3. Props 정의
  let { prop1, prop2 }: Props = $props();

  // 4. Event dispatcher
  const dispatch = createEventDispatcher<{ ... }>();

  // 5. 상태 변수 ($state)
  let state1 = $state(...);
  let state2 = $state(...);

  // 6. 파생 상태 ($derived)
  let derived = $derived(...);

  // 7. 이펙트 ($effect)
  $effect(() => { ... });

  // 8. 함수 정의
  function handleClick() { ... }
</script>

<!-- 9. 마크업 -->
<div>...</div>

<!-- 10. 스타일 (필요시) -->
<style>
  ...
</style>
```

### 유틸리티 파일 구조

```typescript
/**
 * 파일 상단 주석 (용도 설명)
 */

// ============================================================================
// 타입 정의
// ============================================================================

export interface SomeType {}

// ============================================================================
// 상수
// ============================================================================

const CONSTANT = 'value';

// ============================================================================
// 함수
// ============================================================================

/**
 * 함수 설명
 */
export function someFunction() {}
```

### API 라우트 파일 구조

```typescript
import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/...';

/**
 * GET /api/endpoint
 */
export async function GET({ url }: RequestEvent) {
	try {
		// 파라미터 추출
		const param = url.searchParams.get('param');

		// 유효성 검증
		if (!param) {
			return json({ success: false, error: '...' } as ApiResponse, { status: 400 });
		}

		// 비즈니스 로직
		const data = await loadData();

		// 성공 응답
		return json({ success: true, data } as ApiResponse, { status: 200 });
	} catch (error) {
		console.error('에러:', error);
		return json({ success: false, error: '...' } as ApiResponse, { status: 500 });
	}
}
```

---

## 컴포넌트 작성 패턴

### Svelte 5 Runes 사용

프로젝트는 **Svelte 5의 Runes**를 사용합니다.

#### 상태 관리: `$state`

```typescript
// ✅ 좋은 예
let entries = $state<VocabularyEntry[]>([]);
let loading = $state(false);
let searchQuery = $state('');

// ❌ 나쁜 예 (Svelte 4 스타일)
let entries: VocabularyEntry[] = [];
let loading = false;
```

#### 파생 상태: `$derived`

```typescript
// ✅ 좋은 예
let displayedPages = $derived(getPageNumbers());
let hasActiveFilters = $derived(Object.keys(activeFilters).length > 0);

// ❌ 나쁜 예
let displayedPages = getPageNumbers(); // 반응성 없음
```

#### 이펙트: `$effect`

```typescript
// ✅ 좋은 예
$effect(() => {
	void sourceTerm;
	void direction;
	debouncedFindCombinations();
});
```

#### Props: `$props()` 및 `$bindable()`

```typescript
// ✅ 좋은 예
let {
	query = $bindable(''),
	field = $bindable('all'),
	onsearch
}: {
	query?: string;
	field?: string;
	onsearch: (detail: SearchEvent) => void;
} = $props();
```

### 이벤트 처리

#### Event Dispatcher 사용

```typescript
// ✅ 좋은 예
const dispatch = createEventDispatcher<{
	entryclick: EntryClickEvent;
	filter: FilterEvent;
}>();

function handleClick(entry: DomainEntry) {
	dispatch('entryclick', { entry });
}
```

#### 콜백 Props 사용

```typescript
// ✅ 좋은 예
let {
	onsort,
	onpagechange,
	onfilter
}: {
	onsort: (detail: SortEvent) => void;
	onpagechange: (detail: PageChangeEvent) => void;
	onfilter?: (detail: FilterEvent) => void;
} = $props();

function handleSort(column: string) {
	onsort({ column, direction: 'asc' });
}
```

### FileManager 컴포넌트 패턴

모든 FileManager 컴포넌트는 다음 패턴을 따라야 합니다:

```typescript
// 필수 상태 변수
let files = $state<string[]>([]);
let allFiles = $state<string[]>([]);
let showSystemFiles = $state(true);

// settingsStore와 연동 필수
$effect(() => {
	const unsubscribe = settingsStore.subscribe((settings) => {
		showSystemFiles = settings.showXxxSystemFiles ?? true;
		if (allFiles.length > 0) {
			filterFiles();
		}
	});
	return unsubscribe;
});

// 시스템 파일 토글 함수 필수
async function toggleSystemFiles(event: Event) {
	const target = event.target as HTMLInputElement;
	showSystemFiles = target.checked;
	await saveSettings(showSystemFiles);
	filterFiles();
}
```

**시스템 파일 표시 체크박스 필수**:
```svelte
<label class="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
	<input
		type="checkbox"
		checked={showSystemFiles}
		onchange={toggleSystemFiles}
		class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
	/>
	<span>시스템 파일 표시</span>
</label>
```

**⚠️ 중요**: 시스템 파일 표시 설정은 해당 목록 페이지(browse 페이지)에도 영향을 주어야 합니다. `settingsStore`를 구독하여 파일 필터링을 수행하세요.

**새 파일 생성 입력 필드에 Enter 키 이벤트 필수**:
```svelte
<input
	type="text"
	bind:value={newFilename}
	onkeydown={(e) => e.key === 'Enter' && handleCreateFile()}
	placeholder="새 파일 이름"
	class="..."
/>
```

**이름변경/삭제 버튼은 아이콘으로 표시**:
```svelte
<!-- 이름변경 아이콘 버튼 -->
<button onclick={startRename} title="이름 변경">
	<svg class="h-4 w-4">...</svg>
</button>

<!-- 삭제 아이콘 버튼 -->
<button onclick={handleDelete} title="삭제">
	<svg class="h-4 w-4">...</svg>
</button>
```

### FileUpload 컴포넌트 사용 패턴

FileUpload 컴포넌트는 **검증 교체 모드**와 **단순 교체 모드**만 지원합니다.
(병합 모드와 덮어쓰기 모드는 삭제되었습니다)

**올바른 사용법**:
```svelte
<FileUpload
	disabled={isSubmitting || files.length === 0}
	apiEndpoint="/api/xxx/upload"
	contentType="데이터 타입명"
	filename={selectedUploadFile}
	replaceExisting={true}
	onuploadstart={handleUploadStart}
	onuploadsuccess={handleUploadSuccess}
	onuploaderror={handleUploadError}
	onuploadcomplete={handleUploadComplete}
/>
```

**Props 설명**:
- `apiEndpoint`: 업로드 API 엔드포인트
- `contentType`: 사용자에게 표시할 데이터 타입명
- `filename`: 대상 파일명
- `replaceExisting`: 교체 모드 (항상 true)
- `onuploadstart`: 업로드 시작 콜백
- `onuploadsuccess`: 업로드 성공 콜백 `(detail: { result: UploadResult }) => void`
- `onuploaderror`: 업로드 에러 콜백 `(detail: { error: string }) => void`
- `onuploadcomplete`: 업로드 완료 콜백

**❌ 잘못된 사용법** (사용하지 말 것):
```svelte
<!-- 이러한 props는 존재하지 않습니다 -->
<FileUpload
	uploadUrl="/api/xxx/upload"
	mode="merge"
	acceptedFormats={['.xlsx']}
	on:success={handler}
	on:error={handler}
/>
```

### Editor 컴포넌트 레이아웃 패턴

모든 정의서 추가/수정 팝업(Editor 컴포넌트)은 **1행 1열 레이아웃**을 사용합니다:

```svelte
<div class="grid gap-4 md:grid-cols-1">
	<!-- 모든 폼 필드는 한 행에 하나씩 배치 -->
	<div>
		<label>필드 1</label>
		<input ... />
	</div>
	<div>
		<label>필드 2</label>
		<input ... />
	</div>
	<!-- ... -->
</div>
```

**❌ 잘못된 예** (복수 컬럼 레이아웃 사용하지 말 것):
```svelte
<div class="grid gap-4 md:grid-cols-2">
	<!-- 2열 레이아웃 사용 금지 -->
</div>
```

### Table 컴포넌트의 ColumnFilter 사용 패턴

테이블 컴포넌트에서 컬럼 필터링을 구현할 때는 `ColumnFilter` 컴포넌트를 다음 패턴으로 사용합니다:

```typescript
// 상태 변수
let openFilterColumn = $state<string | null>(null);

// 필터 핸들러
function handleFilter(column: string, value: string | null) {
	if (onfilter) onfilter({ column, value });
	dispatch('filter', { column, value });
	openFilterColumn = null;
}
```

```svelte
<!-- ColumnFilter 사용 - 올바른 패턴 -->
{#if column.filterable}
	<ColumnFilter
		columnKey={column.key}
		columnLabel={column.label}
		filterType="select"
		currentValue={activeFilters[column.key] || null}
		options={filterOptions[column.key] || getUniqueValues(column.key)}
		isOpen={openFilterColumn === column.key}
		onOpen={(key) => { openFilterColumn = key; }}
		onClose={() => { openFilterColumn = null; }}
		onApply={(value) => handleFilter(column.key, value)}
		onClear={() => handleFilter(column.key, null)}
	/>
{/if}
```

**⚠️ 잘못된 패턴** (사용하지 말 것):
```svelte
<!-- 이전 방식 - 사용하지 말 것 -->
<ColumnFilter
	options={...}
	value={activeFilters[column.key] || null}
	type={column.filterType || 'text'}
	onselect={(value) => handleFilter(column.key, value)}
	onclose={() => (openFilterColumn = null)}
/>
```

**Props 설명**:
- `columnKey`: 컬럼 식별자
- `columnLabel`: 사용자에게 표시할 컬럼 라벨
- `filterType`: 필터 유형 (`'text'` | `'select'`)
- `currentValue`: 현재 적용된 필터 값
- `options`: 선택 가능한 필터 옵션 목록
- `isOpen`: 필터 팝업 열림 상태
- `onOpen`: 필터 열기 콜백
- `onClose`: 필터 닫기 콜백
- `onApply`: 필터 적용 콜백
- `onClear`: 필터 초기화 콜백

### Browse 페이지 파일 선택 패턴

Browse 페이지에서는 파일 삭제나 시스템 파일 표시 변경 시 현재 선택 파일을 자동으로 업데이트해야 합니다:

```typescript
// settingsStore 구독하여 시스템 파일 표시 설정 반영
$effect(() => {
	const unsubscribe = settingsStore.subscribe((settings) => {
		showSystemFiles = settings.showXxxSystemFiles ?? true;
		if (allFiles.length > 0) {
			files = filterXxxFiles(allFiles, showSystemFiles);
			// 현재 선택된 파일이 필터링된 목록에 없으면 첫 번째 파일 선택
			if (!files.includes(selectedFilename) && files.length > 0) {
				handleFileSelect(files[0]);
			}
		}
	});
	return unsubscribe;
});

// 파일 목록 로드 시에도 동일한 패턴 적용
async function loadFiles() {
	const response = await fetch('/api/xxx/files');
	const result = await response.json();
	if (result.success && Array.isArray(result.data)) {
		allFiles = result.data;
		files = filterXxxFiles(allFiles, showSystemFiles);
		
		// 현재 선택된 파일이 목록에 없으면 첫 번째 파일 선택
		if (!files.includes(selectedFilename) && files.length > 0) {
			handleFileSelect(files[0]);
		}
	}
}
```

**⚠️ 중요**: 파일 삭제, 이름 변경, 시스템 파일 표시 토글 후에는 항상 현재 선택된 파일이 유효한지 확인해야 합니다.

### 조건부 렌더링

```svelte
<!-- ✅ 좋은 예 -->
{#if loading}
	<div>로딩 중...</div>
{:else if entries.length === 0}
	<div>데이터 없음</div>
{:else}
	{#each entries as entry (entry.id)}
		<div>{entry.name}</div>
	{/each}
{/if}
```

### 반복 렌더링

```svelte
<!-- ✅ 좋은 예: key 사용 -->
{#each entries as entry (entry.id)}
	<div>{entry.name}</div>
{/each}

<!-- ❌ 나쁜 예: key 없음 -->
{#each entries as entry}
	<div>{entry.name}</div>
{/each}
```

### XLSX 파서 컬럼 매핑 패턴

Excel 파일을 파싱할 때는 **번호 열이 없음**을 전제로 합니다. A열부터 바로 데이터가 시작됩니다.

```typescript
// 파싱 함수 예시 (database-design-xlsx-parser.ts)
for (let i = 0; i < dataRows.length; i++) {
	const row = dataRows[i];
	if (isEmptyRow(row)) continue;

	// ✅ 올바른 컬럼 매핑: A열(index 0)부터 시작
	const field1 = parseRequiredText(row[0]); // A열
	const field2 = parseRequiredText(row[1]); // B열
	const field3 = parseOptionalText(row[2]); // C열
	// ...
}
```

**⚠️ 주의사항**:
- 엑셀 파일에 번호(순번) 열이 **없다고 가정**
- A열 = `row[0]`, B열 = `row[1]`, ...
- **절대로** `row[1]`부터 시작하지 말 것 (한 칸 밀림 발생)

**각 정의서별 컬럼 매핑**:

| 정의서 | A열 | B열 | C열 | ... |
|--------|-----|-----|-----|-----|
| 데이터베이스 | 기관명 | 부서명 | 적용업무 | ... |
| 엔터티 | 논리DB명 | 스키마명 | 엔터티명 | ... |
| 속성 | 스키마명 | 엔터티명 | 속성명 | ... |
| 테이블 | 물리DB명 | 테이블소유자 | 주제영역 | ... |
| 컬럼 | 사업범위여부 | 주제영역 | 스키마명 | ... |

---

## API 라우트 패턴

### HTTP 메서드별 패턴

#### GET - 데이터 조회

```typescript
export async function GET({ url }: RequestEvent) {
	try {
		// 1. 쿼리 파라미터 추출
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '100');

		// 2. 유효성 검증
		if (page < 1 || limit < 1) {
			return json({ success: false, error: '...' } as ApiResponse, { status: 400 });
		}

		// 3. 데이터 로드
		const data = await loadData();

		// 4. 필터링/정렬/페이지네이션
		const filtered = applyFilters(data);
		const sorted = applySort(filtered);
		const paginated = applyPagination(sorted);

		// 5. 성공 응답
		return json({ success: true, data: paginated } as ApiResponse, { status: 200 });
	} catch (error) {
		console.error('에러:', error);
		return json({ success: false, error: '...' } as ApiResponse, { status: 500 });
	}
}
```

#### POST - 데이터 생성

```typescript
export async function POST({ request, url }: RequestEvent) {
	try {
		// 1. 요청 본문 파싱
		const newEntry: Partial<Entry> = await request.json();

		// 2. 필수 필드 검증
		if (!newEntry.requiredField) {
			return json({ success: false, error: '...' } as ApiResponse, { status: 400 });
		}

		// 3. 비즈니스 로직 검증 (중복 체크 등)
		const isDuplicate = await checkDuplicate(newEntry);
		if (isDuplicate) {
			return json({ success: false, error: '...' } as ApiResponse, { status: 409 });
		}

		// 4. 데이터 저장
		const saved = await saveData(newEntry);

		// 5. 캐시 무효화
		invalidateCache('entity', filename);

		// 6. 성공 응답
		return json({ success: true, data: saved } as ApiResponse, { status: 201 });
	} catch (error) {
		console.error('에러:', error);
		return json({ success: false, error: '...' } as ApiResponse, { status: 500 });
	}
}
```

#### PUT - 데이터 수정

```typescript
export async function PUT({ request, url }: RequestEvent) {
	try {
		const updatedEntry: Entry = await request.json();

		if (!updatedEntry.id) {
			return json({ success: false, error: 'ID 필요' } as ApiResponse, { status: 400 });
		}

		const data = await loadData();
		const index = data.entries.findIndex((e) => e.id === updatedEntry.id);

		if (index === -1) {
			return json({ success: false, error: '찾을 수 없음' } as ApiResponse, { status: 404 });
		}

		data.entries[index] = {
			...data.entries[index],
			...updatedEntry,
			updatedAt: new Date().toISOString()
		};
		await saveData(data);
		invalidateCache('entity', filename);

		return json({ success: true, data: data.entries[index] } as ApiResponse, { status: 200 });
	} catch (error) {
		console.error('에러:', error);
		return json({ success: false, error: '...' } as ApiResponse, { status: 500 });
	}
}
```

#### DELETE - 데이터 삭제

```typescript
export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) {
			return json({ success: false, error: 'ID 필요' } as ApiResponse, { status: 400 });
		}

		const data = await loadData();
		const entry = data.entries.find((e) => e.id === id);

		if (!entry) {
			return json({ success: false, error: '찾을 수 없음' } as ApiResponse, { status: 404 });
		}

		// 참조 검증 (선택적)
		const refCheck = await checkReferences(entry);
		if (!refCheck.canDelete) {
			return json(
				{ success: false, error: '참조됨', warnings: refCheck.references } as ApiResponse,
				{ status: 409 }
			);
		}

		data.entries = data.entries.filter((e) => e.id !== id);
		await saveData(data);
		invalidateCache('entity', filename);

		return json({ success: true, message: '삭제 완료' } as ApiResponse, { status: 200 });
	} catch (error) {
		console.error('에러:', error);
		return json({ success: false, error: '...' } as ApiResponse, { status: 500 });
	}
}
```

### API 응답 형식

모든 API는 다음 형식을 따릅니다:

```typescript
interface ApiResponse {
	success: boolean;
	data?: unknown;
	error?: string;
	message?: string;
}
```

**성공 응답**:

```typescript
{
  success: true,
  data: { ... },
  message: '성공 메시지'
}
```

**에러 응답**:

```typescript
{
  success: false,
  error: '에러 메시지',
  message: 'Error message'
}
```

---

## 상태 관리 패턴

### Svelte Stores

간단한 전역 상태는 Svelte Stores를 사용합니다.

```typescript
// stores/domain-store.ts
import { writable } from 'svelte/store';

export const domainStore = writable({
	selectedFilename: 'domain.json'
});
```

**사용법**:

```typescript
import { domainStore } from '$lib/stores/domain-store';
import { get } from 'svelte/store';

// 읽기
const filename = get(domainStore).selectedFilename;

// 구독
domainStore.subscribe((value) => {
	console.log(value.selectedFilename);
});
```

### 로컬 상태 ($state)

컴포넌트 내부 상태는 `$state` rune을 사용합니다.

```typescript
let entries = $state<VocabularyEntry[]>([]);
let loading = $state(false);
let currentPage = $state(1);
```

### 파생 상태 ($derived)

계산된 값은 `$derived` rune을 사용합니다.

```typescript
let displayedPages = $derived(getPageNumbers());
let hasActiveFilters = $derived(Object.keys(activeFilters).length > 0);
```

### Composable 패턴

재사용 가능한 로직은 composable로 분리합니다.

```typescript
// composables/use-data-table.ts
export function createInitialState<T>(config: DataTableConfig): DataTableState<T> {
	return {
		entries: [],
		loading: false
		// ...
	};
}

export function createSortHandler<T>(
	state: DataTableState<T>,
	onStateChange: (newState: Partial<DataTableState<T>>) => void
) {
	return (event: SortEvent) => {
		onStateChange({
			sortColumn: event.column,
			sortDirection: event.direction,
			currentPage: 1
		});
	};
}
```

---

## 타입 정의 패턴

### 인터페이스 정의

```typescript
/**
 * 데이터 관리 시스템을 위한 TypeScript 타입 정의
 */

// 개별 엔트리 인터페이스
export interface VocabularyEntry {
	id: string;
	standardName: string;
	abbreviation: string;
	englishName: string;
	description: string;
	createdAt: string; // ISO 8601 날짜 문자열
	updatedAt: string; // ISO 8601 날짜 문자열
	// 선택적 필드
	isFormalWord?: boolean;
	domainGroup?: string;
}

// 전체 데이터 구조
export interface VocabularyData {
	entries: VocabularyEntry[];
	lastUpdated: string;
	totalCount: number;
	mapping?: {
		domain: string;
	};
}
```

### 타입 가드

```typescript
// utils/type-guards.ts
export function safeMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
	const result = { ...target };
	for (const key in source) {
		if (source[key] !== undefined) {
			result[key] = source[key] as T[Extract<keyof T, string>];
		}
	}
	return result;
}
```

### 유니온 타입

```typescript
type SortDirection = 'asc' | 'desc';
type EntityType = 'vocabulary' | 'domain' | 'term';
type ActionType = 'add' | 'update' | 'delete' | 'UPLOAD_MERGE';
```

---

## 에러 처리 패턴

### API 에러 처리

```typescript
try {
	const response = await fetch('/api/endpoint');
	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || `HTTP error: ${response.status}`);
	}
	const data = await response.json();
	return data;
} catch (error) {
	console.error('API 에러:', error);
	// 사용자에게 에러 표시
	error = error instanceof Error ? error.message : '알 수 없는 오류';
	return null;
}
```

### 컴포넌트 에러 처리

```typescript
let error = $state<string | null>(null);

async function loadData() {
	error = null;
	try {
		const data = await fetchData();
		// 처리
	} catch (e) {
		error = e instanceof Error ? e.message : '알 수 없는 오류';
	}
}
```

```svelte
{#if error}
	<div class="error-message">{error}</div>
{/if}
```

---

## 테스트 전략

### 현재 상태

프로젝트에는 아직 테스트 설정이 없습니다.

### 권장 테스트 전략

1. **단위 테스트**: 유틸리티 함수
2. **컴포넌트 테스트**: Svelte 컴포넌트
3. **API 테스트**: API 엔드포인트
4. **E2E 테스트**: 주요 사용자 플로우

### 권장 도구

- **Vitest**: 단위 테스트
- **@testing-library/svelte**: 컴포넌트 테스트
- **Playwright**: E2E 테스트

---

## 코드 리뷰 체크리스트

코드 리뷰 시 다음 사항을 확인합니다:

- [ ] Prettier 포매팅 적용됨
- [ ] ESLint 오류 없음
- [ ] TypeScript 타입 오류 없음
- [ ] 네이밍 컨벤션 준수
- [ ] 파일 구조 패턴 준수
- [ ] 에러 처리 구현됨
- [ ] 주석이 필요한 부분에 주석 추가됨
- [ ] 불필요한 코드 제거됨
- [ ] 성능 고려사항 반영됨

---

## Git 커밋 컨벤션

### 커밋 메시지 형식

```
<type>: <subject>

<body>

<footer>
```

### Type

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포매팅
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 설정 등

### 예시

```
feat: 단어집 검색 기능 추가

- 검색어 하이라이팅 기능 구현
- 필드별 검색 옵션 추가
- 정확 일치 검색 옵션 추가

Closes #123
```

---

## 참고 자료

- [Svelte 5 공식 문서](https://svelte.dev/docs)
- [SvelteKit 공식 문서](https://kit.svelte.dev/docs)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [Prettier 문서](https://prettier.io/docs/en/)
- [ESLint 문서](https://eslint.org/docs/latest/)

---

## 변경 이력

| 버전  | 날짜    | 변경 내용      | 작성자 |
| ----- | ------- | -------------- | ------ |
| 1.0.0 | 2024-12 | 초기 문서 작성 | -      |
| 1.1.0 | 2026-01 | FileManager/Editor 컴포넌트 패턴 추가 | -      |
| 1.2.0 | 2026-01 | ColumnFilter, Browse 페이지, XLSX 파서 패턴 추가 | -      |

---

**마지막 업데이트**: 2026-01-08
