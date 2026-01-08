# AI 컨텍스트 문서

이 문서는 AI가 프로젝트를 이해하고 코드를 작성/수정할 때 참조하는 핵심 컨텍스트입니다.

**업데이트 원칙**: 프로젝트 본질이 변경될 때만 업데이트

---

## 프로젝트 본질

### 한 줄 요약

**"한국어 표준 용어를 기반으로 데이터베이스 용어(컬럼명, 도메인명)를 체계적으로 생성하고 관리하는 시스템"**

### 핵심 목적

이 프로젝트는 **데이터 표준화**와 **용어 일관성**을 보장하기 위한 도구입니다.

### 해결하는 문제

1. **용어 불일치 문제**: 같은 개념을 다른 이름으로 표현하는 문제
2. **표준 용어 관리의 어려움**: 수동 관리의 번거로움, 매핑 관계 추적의 어려움
3. **데이터베이스 설계 시 용어 생성의 어려움**: 한국어 → 영문 변환의 복잡성

### 타겟 사용자

- 데이터 아키텍트: 데이터 표준화 및 용어 관리
- 데이터베이스 설계자: 표준 용어 기반 컬럼명/도메인명 생성
- 개발자: 일관된 용어 사용을 위한 참조 도구
- 데이터 관리자: 용어집 및 도메인 표준 관리

---

## 핵심 비즈니스 도메인

### 1. Vocabulary (단어집)

**역할**: 한국어 표준 용어와 그에 대응하는 영문 약어/전체명을 관리하는 사전

**핵심 필드**:

- `standardName`: 한국어 표준 용어 (예: "사용자")
- `abbreviation`: 데이터베이스 컬럼명에 사용 (예: "USER")
- `englishName`: 전체 영문명 (예: "User")
- `domainCategory`: 도메인 분류명 (Domain과 매핑)
- `domainGroup`: 매핑된 도메인 그룹명 (자동 설정)

**비즈니스 가치**:

- 표준 용어의 중앙 집중식 관리
- 용어 일관성 보장
- 용어 재사용 촉진

**파일 위치**: `src/lib/types/vocabulary.ts`

---

### 2. Domain (도메인)

**역할**: 공통표준도메인 정보를 관리하는 표준 도메인 사전

**핵심 필드**:

- `domainGroup`: 공통표준도메인그룹명 (예: "공통표준도메인그룹")
- `domainCategory`: 공통표준도메인분류명 (예: "사용자분류")
- `standardDomainName`: 계산된 값 (예: "공통표준도메인그룹\_사용자분류")
- `physicalDataType`: VARCHAR, INT 등

**비즈니스 가치**:

- 도메인 표준의 중앙 관리
- 단어집과 도메인 간 자동 동기화
- 데이터 타입 표준화

**파일 위치**: `src/lib/types/domain.ts`

---

### 3. Term (용어)

**역할**: 실제 데이터베이스에서 사용할 용어명, 컬럼명, 도메인명을 조합한 최종 용어

**핵심 필드**:

- `termName`: 한국어 용어 (예: "사용자\_이름") ← Vocabulary.standardName 참조
- `columnName`: 영문 컬럼명 (예: "USER_NAME") ← Vocabulary.abbreviation 참조
- `domainName`: 표준 도메인명 (예: "공통표준도메인그룹\_사용자분류") ← Domain.standardDomainName 참조
- `isMappedTerm`: 용어명 매핑 성공 여부
- `isMappedColumn`: 컬럼명 매핑 성공 여부
- `isMappedDomain`: 도메인 매핑 성공 여부

**비즈니스 가치**:

- 표준 용어 기반 데이터베이스 설계
- 용어 일관성 자동 검증
- 매핑 상태 추적

**파일 위치**: `src/lib/types/term.ts`

---

## 핵심 비즈니스 로직

### 1. Vocabulary ↔ Domain 매핑

**매핑 키**: `domainCategory`

**매핑 방식**:

```typescript
VocabularyEntry.domainCategory ↔ DomainEntry.domainCategory
```

**자동 설정**:

- 매핑 성공 시 `VocabularyEntry.domainGroup`에 `DomainEntry.domainGroup` 자동 설정
- `VocabularyEntry.isDomainCategoryMapped` 플래그로 매핑 상태 표시

**동기화 API**: `POST /api/vocabulary/sync-domain`

**구현 위치**: `src/routes/api/vocabulary/sync-domain/+server.ts`

**비즈니스 의미**:

- 단어집의 각 단어가 어떤 도메인 분류에 속하는지 명시
- 도메인 표준 변경 시 단어집 자동 업데이트

---

### 2. Vocabulary → Term 매핑 검증

**매핑 방식**:

#### termName 검증

```typescript
// termName: "사용자_이름" → ["사용자", "이름"]
// 각 단어가 VocabularyEntry.standardName에 존재해야 함
const termParts = termName.split('_').map((p) => p.trim().toLowerCase());
const isMappedTerm = termParts.every(
	(part) => vocabularyMap.has(part) // VocabularyEntry.standardName과 일치
);
```

#### columnName 검증

```typescript
// columnName: "USER_NAME" → ["USER", "NAME"]
// 각 단어가 VocabularyEntry.abbreviation에 존재해야 함
const columnParts = columnName.split('_').map((p) => p.trim().toLowerCase());
const isMappedColumn = columnParts.every(
	(part) => vocabularyMap.has(part) // VocabularyEntry.abbreviation과 일치
);
```

**구현 위치**: `src/routes/api/term/sync/+server.ts`, `src/routes/api/term/+server.ts`

**비즈니스 의미**:

- 모든 용어가 표준 용어집 기반으로 생성됨을 보장
- 비표준 용어 사용 방지

---

### 3. Domain → Term 매핑 검증

**매핑 방식**:

```typescript
// domainName: "공통표준도메인그룹_사용자분류"
// DomainEntry.standardDomainName과 정확히 일치해야 함
const isMappedDomain = domainMap.has(domainName.trim().toLowerCase());
```

**구현 위치**: `src/routes/api/term/sync/+server.ts`

**비즈니스 의미**:

- 모든 용어가 표준 도메인을 사용함을 보장
- 도메인 표준 준수

---

### 4. 용어 자동 생성 (Term Generator)

**로직**:

1. 한국어 용어 입력 (예: "사용자 이름")
2. 단어집을 기반으로 가능한 조합 생성
   - "사용자" → ["USER", "MEMBER", ...]
   - "이름" → ["NAME", "FIRST_NAME", ...]
3. 모든 조합 생성 (Cartesian Product)
   - "USER_NAME", "USER_FIRST_NAME", "MEMBER_NAME", ...
4. 개발자가 적절한 조합 선택

**구현 위치**: `src/routes/api/generator/+server.ts`, `src/lib/components/TermGenerator.svelte`

**비즈니스 의미**:

- 표준 용어 기반 컬럼명 생성
- 여러 가능한 조합 제시
- 매핑 상태 자동 검증

---

## 주요 사용 사례

### Use Case 1: 표준 용어 등록 및 관리

1. 데이터 아키텍트가 새로운 표준 용어를 등록
2. 한국어 표준명, 영문약어, 영문명 입력
3. 도메인 분류명 지정
4. 도메인과 자동 매핑 (`POST /api/vocabulary/sync-domain`)

### Use Case 2: 용어 자동 생성

1. 개발자가 한국어 용어 입력
2. 시스템이 단어집 기반으로 가능한 조합 생성
3. 개발자가 적절한 조합 선택
4. 도메인명 매핑 확인

### Use Case 3: 용어 검증 및 자동 수정

1. 용어 업로드 또는 생성 시 매핑 검증
2. 매핑 실패 시 원인 분석
3. 자동 수정 제안 (단어집에 추가, 유사 단어 제안 등)

### Use Case 4: 대량 용어 업로드

1. Excel 파일로 대량 용어 업로드
2. 자동 매핑 검증
3. 실패한 용어 목록 표시 및 자동 수정 제안

---

## 아키텍처 제약사항

### 1. 파일 기반 저장소

**특징**:

- 전통적인 데이터베이스 대신 JSON 파일 사용
- `static/data/` 디렉토리에 저장
- 파일별로 독립적인 데이터 관리

**제약사항**:

- 동시성 제어 필요 (파일 락 메커니즘 구현됨: `src/lib/utils/file-lock.ts`)
- 대용량 데이터 처리 제한
- 트랜잭션 없음 (원자적 쓰기 패턴으로 보완: `atomicWriteFile`)

**의미**:

- 간단한 배포 (파일 복사만으로 백업/복원)
- 버전 관리 용이 (Git으로 추적 가능)
- 데이터베이스 설정 불필요

---

### 2. 다중 파일 지원

**특징**:

- Vocabulary, Domain, Term 모두 여러 파일 지원
- 파일별 독립적인 데이터 관리
- 파일 간 매핑 관계 설정 (`mapping` 필드)

**의미**:

- 프로젝트별/부서별 용어집 분리 관리
- 표준 용어집과 프로젝트 용어집 구분

---

### 3. 매핑 기반 검증 시스템

**핵심 원칙**:

- 모든 Term은 Vocabulary와 Domain을 참조해야 함
- 매핑 실패 시 자동 수정 제안
- 매핑 상태 추적 (`isMapped*` 플래그)

**의미**:

- 표준 준수 자동화
- 비표준 용어 사용 방지
- 데이터 품질 보장

---

### 4. 히스토리 추적 시스템

**특징**:

- 모든 변경사항 히스토리 로그 기록
- 파일별 히스토리 관리 (Vocabulary만)
- 변경 전/후 데이터 저장

**의미**:

- 감사 추적 (Audit Trail)
- 변경 이력 추적
- 롤백 가능성

---

## 코딩 컨벤션 핵심

### 파일 구조 패턴

**바렐 패턴** 사용:

```
src/lib/
├── components/     # 재사용 가능한 Svelte 컴포넌트
├── composables/   # 재사용 가능한 로직
├── stores/        # Svelte Stores (상태 관리)
├── types/         # TypeScript 타입 정의
├── utils/         # 유틸리티 함수
└── index.ts       # 공개 API (barrel export)
```

### 네이밍 컨벤션

- **컴포넌트**: PascalCase (예: `VocabularyTable.svelte`)
- **유틸리티**: kebab-case (예: `api-client.ts`)
- **타입 파일**: kebab-case (예: `vocabulary.ts`)
- **스토어**: kebab-case (예: `domain-store.ts`)
- **API 라우트**: `+server.ts` (SvelteKit 컨벤션)

### 타입 정의 위치

- **핵심 타입**: `src/lib/types/`
  - `vocabulary.ts`: VocabularyEntry, VocabularyData
  - `domain.ts`: DomainEntry, DomainData
  - `term.ts`: TermEntry, TermData

### 에러 처리 패턴

**API 응답 형식**:

```typescript
interface ApiResponse {
	success: boolean;
	data?: unknown;
	error?: string;
	message?: string;
}
```

**에러 처리 위치**: `src/routes/api/**/+server.ts`

### FileManager 컴포넌트 패턴

모든 FileManager 컴포넌트는 다음 기능을 포함해야 합니다:

1. **시스템 파일 표시 토글**: `showSystemFiles` 상태와 `toggleSystemFiles` 함수
2. **settingsStore 연동**: 설정 저장 및 로드
3. **파일 필터링**: 시스템 파일 표시 여부에 따른 필터링
4. **목록 페이지 연동**: 시스템 파일 표시 설정이 해당 browse 페이지에도 영향을 줌
5. **Enter 키 이벤트**: 새 파일 생성 입력 필드에서 Enter 키로 생성 가능
6. **아이콘 버튼**: 이름변경/삭제 버튼은 텍스트가 아닌 아이콘으로 표시

**필수 설정 키** (settings-store.ts와 settings.ts):

- `showVocabularySystemFiles` (기본값: false)
- `showDomainSystemFiles` (기본값: false)
- `showTermSystemFiles` (기본값: false)
- `showDatabaseSystemFiles` (기본값: false)
- `showEntitySystemFiles` (기본값: false)
- `showAttributeSystemFiles` (기본값: false)
- `showTableSystemFiles` (기본값: false)
- `showColumnSystemFiles` (기본값: false)

**⚠️ 중요**:

- 설정은 `static/global/settings.json`에 저장되며 새로고침/서비스 재시작 후에도 유지됩니다.
- `src/lib/utils/settings.ts`에서 서버 사이드 설정을 처리합니다.
- `src/lib/stores/settings-store.ts`에서 클라이언트 사이드 상태를 관리합니다.
- API `/api/settings`를 통해 설정을 읽고 저장합니다.

### Editor 컴포넌트 패턴

정의서 추가/수정 팝업(Editor 컴포넌트)은 다음 패턴을 따릅니다:

1. **1행 1열 레이아웃**: 모든 폼 필드는 `md:grid-cols-1`로 한 행에 하나씩 배치
2. **일관된 스타일**: Tailwind CSS 클래스 사용
3. **스크롤 위치**: 모달 전체가 아닌 내부 콘텐츠만 스크롤

**올바른 Editor 스크롤 구조**:

```svelte
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
	<div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
		<!-- 헤더 (고정) -->
		<div class="flex flex-shrink-0 items-center justify-between border-b p-6">
			<h2>제목</h2>
			<button>닫기</button>
		</div>
		<!-- 스크롤 가능한 콘텐츠 -->
		<div class="flex-1 overflow-y-auto p-6">
			<form>...</form>
		</div>
	</div>
</div>
```

**❌ 잘못된 구조** (전체 모달 스크롤):

```svelte
<div class="max-h-[90vh] overflow-y-auto">
	<div class="sticky top-0">헤더</div>
	<form>...</form>
</div>
```

### 검색 필드 정의 (SearchBar searchFields)

각 메뉴별 통합검색 대상 항목:

| 메뉴       | 검색 필드                                                            |
| ---------- | -------------------------------------------------------------------- |
| **DB**     | 기관명, 논리DB명, 물리DB명                                           |
| **엔터티** | 스키마명, 엔터티명, 주식별자, 수퍼타입엔터티명, 테이블한글명         |
| **속성**   | 스키마명, 엔터티명, 속성명                                           |
| **테이블** | 물리DB명, 스키마명, 테이블영문명, 테이블한글명, 테이블유형, 주제영역 |
| **컬럼**   | 스키마명, 테이블영문명, 컬럼영문명, 컬럼한글명, 자료타입             |

**Browse 페이지에서 SearchBar 사용 예시**:

```svelte
<SearchBar
	bind:query={searchQuery}
	bind:field={searchField}
	searchFields={[
		{ value: 'all', label: '전체' },
		{ value: 'organizationName', label: '기관명' },
		{ value: 'logicalDbName', label: '논리DB명' },
		{ value: 'physicalDbName', label: '물리DB명' }
	]}
	onsearch={handleSearch}
	onclear={handleSearchClear}
/>
```

**API 엔드포인트 검색 필터 처리**:

- 각 API의 `switch (searchField)` 블록에 해당 필드들을 모두 포함해야 함
- `case 'all'` 또는 `default`에서는 해당 메뉴의 모든 검색 필드를 OR 조건으로 검색
- 검색 파라미터: `q` 또는 `query` 모두 지원 (호환성을 위해)
- **정확히 일치 검색**: `exact=true` 파라미터 지원 필수

```typescript
// API 검색 파라미터 처리 패턴
const searchQuery = url.searchParams.get('q') || url.searchParams.get('query') || '';
const searchExact = url.searchParams.get('exact') === 'true';

// 검색 필터링 시 정확히 일치/부분 일치 구분
const matchFn = (value: string | undefined | null) => {
	if (!value) return false;
	const target = value.toLowerCase();
	return searchExact ? target === query : target.includes(query);
};
```

### filter-options API 패턴

각 메뉴에 대해 전체 데이터 기준으로 필터 옵션을 조회하는 API가 필요합니다:

**API 엔드포인트 패턴**: `/api/{메뉴}/filter-options`

```typescript
// GET /api/{메뉴}/filter-options
const filterableColumns = ['column1', 'column2', ...];
const options: Record<string, string[]> = {};

// Nullable 필드 목록 정의
const nullableColumns = new Set(['column1', 'column2', ...]);

filterableColumns.forEach((columnKey) => {
	const values = new Set<string>();
	let hasEmptyValue = false;

	data.entries.forEach((entry) => {
		const value = entry[columnKey as keyof EntryType];
		if (value !== null && value !== undefined && value !== '') {
			values.add(String(value));
		} else if (nullableColumns.has(columnKey)) {
			hasEmptyValue = true;
		}
	});

	const sortedValues = Array.from(values).sort();
	// Nullable 필드이고 빈값이 있으면 "(빈값)" 옵션 추가
	if (nullableColumns.has(columnKey) && hasEmptyValue) {
		sortedValues.unshift('(빈값)');
	}
	options[columnKey] = sortedValues;
});
```

**API 필터링 로직에서 빈값 처리**:

```typescript
// 컬럼 필터 적용 시
if (filterValue === '(빈값)') {
	return entryValue === null || entryValue === undefined || entryValue === '';
}
```

**Browse 페이지에서 호출 패턴**:

```typescript
async function loadFilterOptions() {
	const params = new URLSearchParams({ filename: selectedFilename });
	const response = await fetch(`/api/{메뉴}/filter-options?${params}`);
	const result = await response.json();
	if (result.success && result.data) {
		filterOptions = result.data;
	}
}

// 초기 로드 및 파일 선택 시 호출
onMount(async () => {
	await loadFilterOptions();
	await loadData();
});

async function handleFileSelect(filename: string) {
	await loadFilterOptions();
	await loadData();
}
```

**테이블 컴포넌트에서 사용**:

```svelte
options={filterOptions[column.key] || column.filterOptions || getUniqueValues(column.key)}
```

### Editor 삭제 버튼 패턴

Editor 컴포넌트에서 삭제 버튼은 **브라우저 confirm() 다이얼로그**를 사용합니다:

**✅ 올바른 패턴** (confirm 다이얼로그 사용):

```typescript
function handleDelete() {
	if (!entry.id) return;

	if (confirm('정말로 이 항목을 삭제하시겠습니까?')) {
		const entryToDelete = { ... };
		dispatch('delete', entryToDelete);
	}
}
```

**❌ 잘못된 패턴** (인라인 확인 UI 사용):

```svelte
{#if showDeleteConfirm}
	<span>정말 삭제하시겠습니까?</span>
	<button onclick={handleDelete}>확인</button>
	<button onclick={() => (showDeleteConfirm = false)}>취소</button>
{:else}
	<button onclick={() => (showDeleteConfirm = true)}>삭제</button>
{/if}
```

**삭제 버튼 스타일 (DomainEditor 참고)**:

```svelte
<button
	type="button"
	onclick={handleDelete}
	class="group inline-flex items-center space-x-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 ..."
	disabled={isSubmitting}
>
	<svg>...</svg>
	<span>삭제</span>
</button>
```

**저장/취소 버튼**:

```svelte
<button type="button" onclick={handleCancel} class="btn btn-secondary">취소</button>
<button type="submit" class="btn btn-primary">{isEditMode ? '수정' : '저장'}</button>
```

### FileUpload 컴포넌트 패턴

**지원 모드**:

- `validated-replace`: 검증 교체 모드 (데이터 검증 후 교체)
- `simple-replace`: 단순 교체 모드 (검증 없이 바로 교체)

**⚠️ 주의**: 병합(merge) 모드와 덮어쓰기(replace) 모드는 더 이상 지원되지 않습니다.

**올바른 Props 사용**:

- `apiEndpoint`: 업로드 API 엔드포인트
- `contentType`: 데이터 타입명
- `filename`: 대상 파일명
- `replaceExisting`: 교체 모드 (항상 true)
- `onuploadstart`, `onuploadsuccess`, `onuploaderror`, `onuploadcomplete`: 콜백 함수

**잘못된 Props** (사용하지 말 것):

- `uploadUrl` → `apiEndpoint` 사용
- `mode` → FileUpload 내부에서 처리
- `on:success` → `onuploadsuccess` 사용 (Svelte 5 방식)

### Table 컴포넌트 ColumnFilter 패턴

테이블 컴포넌트에서 컬럼 필터링 시 `ColumnFilter` 컴포넌트를 올바른 props로 사용:

```svelte
<ColumnFilter
	columnKey={column.key}
	columnLabel={column.label}
	filterType="select"
	currentValue={activeFilters[column.key] || null}
	options={filterOptions[column.key] || getUniqueValues(column.key)}
	isOpen={openFilterColumn === column.key}
	onOpen={(key) => {
		openFilterColumn = key;
	}}
	onClose={() => {
		openFilterColumn = null;
	}}
	onApply={(value) => handleFilter(column.key, value)}
	onClear={() => handleFilter(column.key, null)}
/>
```

**❌ 잘못된 Props** (사용하지 말 것):

- `value` → `currentValue` 사용
- `type` → `filterType` 사용
- `onselect` → `onApply` 사용
- `onclose` → `onClose` 사용

### Browse 페이지 파일 선택 패턴

파일 삭제나 시스템 파일 표시 변경 시, 현재 선택된 파일이 더 이상 목록에 없으면 자동으로 첫 번째 파일을 선택합니다:

```typescript
// settingsStore 구독하여 파일 자동 선택
$effect(() => {
	const unsubscribe = settingsStore.subscribe((settings) => {
		showSystemFiles = settings.showXxxSystemFiles ?? false; // 기본값 false
		files = filterXxxFiles(allFiles, showSystemFiles);
		// 현재 파일이 목록에 없으면 첫 번째 파일 선택
		if (!files.includes(selectedFilename) && files.length > 0) {
			handleFileSelect(files[0]);
		}
	});
	return unsubscribe;
});
```

### API 응답 pagination 접근 패턴

API 응답에서 pagination 정보는 `result.data.pagination`에 위치합니다:

```typescript
const result: ApiResponse = await response.json();
if (result.success && result.data) {
	const data = result.data as {
		entries: Entry[];
		pagination?: { totalCount: number; totalPages: number };
	};
	entries = data.entries || [];
	// ⚠️ result.pagination이 아닌 data.pagination 사용
	if (data.pagination) {
		totalCount = data.pagination.totalCount || 0;
		totalPages = data.pagination.totalPages || 1;
	}
}
```

**⚠️ 잘못된 접근**: `result.pagination` (undefined가 됨)
**✅ 올바른 접근**: `data.pagination` (result.data 내부)

### XLSX 파서 컬럼 매핑 패턴

Excel 파일 파싱 시 **번호 열 없음** 전제:

```typescript
// A열(index 0)부터 데이터 시작
const field1 = parseRequiredText(row[0]); // A열
const field2 = parseRequiredText(row[1]); // B열
```

**⚠️ 주의**: `row[1]`부터 시작하면 한 칸 밀림 발생

---

## 변경 시 주의사항

### Vocabulary 변경 시

**영향 범위**:

- Term의 `termName`, `columnName` 매핑 재검증 필요
- `POST /api/term/sync` 호출 필요

**주의사항**:

- `standardName` 변경 시 해당 단어를 사용하는 모든 Term 재검증
- `abbreviation` 변경 시 해당 약어를 사용하는 모든 Term 재검증
- `domainCategory` 변경 시 Domain 매핑 재검증 필요

---

### Domain 변경 시

**영향 범위**:

- Vocabulary의 `domainGroup` 자동 업데이트 필요
- Term의 `domainName` 매핑 재검증 필요

**주의사항**:

- `domainCategory` 변경 시 해당 분류를 사용하는 Vocabulary 재매핑
- `standardDomainName` 변경 시 해당 도메인을 사용하는 Term 재검증

---

### 매핑 로직 변경 시

**영향 범위**:

- 모든 Term 재검증 필요
- 모든 Vocabulary-Domain 매핑 재검증 필요

**주의사항**:

- `src/routes/api/term/sync/+server.ts`의 `checkTermMapping` 함수 변경 시
- `src/routes/api/vocabulary/sync-domain/+server.ts`의 매핑 로직 변경 시
- 기존 데이터와의 호환성 확인 필요

---

### 파일 구조 변경 시

**영향 범위**:

- 파일 핸들러 (`src/lib/utils/file-handler.ts`)
- API 엔드포인트의 파일 경로 처리
- 파일 필터 (`src/lib/utils/file-filter.ts`)

**주의사항**:

- 경로 검증 로직 (`validateFilename`) 확인
- 파일 락 메커니즘 (`file-lock.ts`) 확인
- 다중 파일 지원 로직 확인

---

## 핵심 파일 위치

### 타입 정의

- `src/lib/types/vocabulary.ts`: Vocabulary 타입
- `src/lib/types/domain.ts`: Domain 타입
- `src/lib/types/term.ts`: Term 타입

### 핵심 비즈니스 로직

- `src/routes/api/vocabulary/sync-domain/+server.ts`: Vocabulary-Domain 매핑
- `src/routes/api/term/sync/+server.ts`: Term 매핑 검증
- `src/routes/api/term/+server.ts`: Term CRUD 및 매핑 검증
- `src/routes/api/generator/+server.ts`: 용어 자동 생성

### 파일 관리

- `src/lib/utils/file-handler.ts`: 파일 읽기/쓰기
- `src/lib/utils/file-lock.ts`: 파일 락 및 원자적 쓰기
- `src/lib/utils/file-operations.ts`: 제네릭 파일 관리

### 검증 및 매핑

- `src/lib/utils/type-guards.ts`: 타입 가드 및 검증
- `src/lib/utils/validation.ts`: 데이터 검증
- `src/lib/utils/cache.ts`: 메모리 캐싱

---

## 프로젝트의 독특한 점

1. **한국어 중심**: 한국어 표준 용어를 중심으로 설계
2. **매핑 기반 검증**: 용어 간 매핑 관계를 추적하고 검증
3. **파일 기반 단순함**: JSON 파일만으로 모든 데이터 관리
4. **실용적 자동화**: 실제 개발 과정에서 바로 사용 가능한 자동화

---

**마지막 업데이트**: 2026-01-08
