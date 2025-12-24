# UI 레이어 분석

## 개요

이 문서는 DbManager 프로젝트의 UI 레이어를 완전히 분석합니다. SvelteKit의 파일 기반 라우팅과 Svelte 컴포넌트를 사용하여 UI를 구성합니다.

## UI 아키텍처

### 프레임워크 및 라이브러리

- **SvelteKit**: 파일 기반 라우팅 및 서버 사이드 렌더링
- **Svelte 5**: 컴포넌트 기반 UI 프레임워크 (runes 기반)
- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크
- **Svelte Stores**: 상태 관리 (writable stores)

### 라우팅 방식

SvelteKit의 파일 기반 라우팅을 사용합니다:

- `src/routes/{path}/+page.svelte` → `/path` URL
- `src/routes/+layout.svelte` → 모든 페이지에 적용되는 공통 레이아웃
- `src/routes/+page.svelte` → 루트 경로 (`/`)

---

## 모든 페이지/라우트

### 1. 홈 페이지 (`/`)

**파일 위치:** `src/routes/+page.svelte`

**URL 경로:** `/`

**주요 기능:**

- 데이터 관리 시스템 소개
- 단어집, 도메인, 용어 관리 페이지로 이동하는 카드 링크
- 주요 기능 설명 섹션

**인증/권한:**

❌ 인증 불필요

**사용하는 컴포넌트:**

- 없음 (정적 콘텐츠)

**호출하는 API:**

- 없음

---

### 2. 단어집 관리 페이지 (`/browse`)

**파일 위치:** `src/routes/browse/+page.svelte`

**URL 경로:** `/browse`

**주요 기능:**

- 단어집 데이터 조회 및 검색
- 단어 추가/수정/삭제
- 파일 관리 (생성, 삭제, 이름 변경)
- 중복 필터링 (표준단어명, 영문약어, 영문명)
- 도메인 미매핑 필터링
- XLSX 파일 다운로드
- 단어집별 금칙어 관리 (각 단어에 금칙어 목록 포함)
- 히스토리 로그 조회
- 데이터 수정 제한 (표준단어명, 영문약어, 영문명, 도메인분류명, 이음동의어, 금칙어 수정 불가)

**인증/권한:**

❌ 인증 불필요

**사용하는 컴포넌트:**

- `SearchBar`: 검색 바
- `VocabularyTable`: 단어집 테이블
- `VocabularyEditor`: 단어 편집 모달
- `VocabularyFileManager`: 파일 관리 모달
- `HistoryLog`: 히스토리 로그

**호출하는 API:**

| HTTP 메소드 | 엔드포인트                 | 용도               |
| ----------- | -------------------------- | ------------------ |
| GET         | `/api/vocabulary`          | 단어집 데이터 조회 |
| POST        | `/api/vocabulary`          | 새 단어 추가       |
| PUT         | `/api/vocabulary`          | 단어 수정          |
| DELETE      | `/api/vocabulary`          | 단어 삭제          |
| GET         | `/api/vocabulary/files`    | 파일 목록 조회     |
| POST        | `/api/vocabulary/files`    | 파일 생성          |
| GET         | `/api/search`              | 단어 검색          |
| GET         | `/api/vocabulary/download` | XLSX 다운로드      |
| POST        | `/api/history`             | 히스토리 로그 추가 |

**폼 및 Validation:**

- **검색 폼:**
  - 검색어: 문자열 (1-100자)
  - 검색 필드: `all`, `standardName`, `abbreviation`, `englishName`
  - 정확 일치 옵션: boolean

- **단어 편집 폼 (TermEditor):**
  - 표준단어명: 필수, 문자열
  - 영문약어: 필수, 문자열, 중복 검사
  - 영문명: 필수, 문자열
  - 설명: 선택, 문자열
  - 도메인 분류명: 선택, 문자열
  - 금지어 검사: 표준단어명, 영문약어에 대해 금지어 목록과 비교

**상태 관리:**

- 로컬 상태 (`$state`):
  - `entries`: VocabularyEntry[]
  - `loading`: boolean
  - `searchQuery`, `searchField`, `searchExact`: 검색 조건
  - `currentPage`, `totalPages`, `pageSize`: 페이지네이션
  - `sortColumn`, `sortDirection`: 정렬
  - `duplicateFilters`: 중복 필터 상태
  - `unmappedDomainOnly`: 도메인 미매핑 필터
  - `vocabularyFiles`, `selectedFilename`: 파일 관리
  - `showEditor`, `currentEditingEntry`: 편집기 상태

- 전역 상태 (Stores):
  - `vocabularyStore`: 선택된 파일명 저장
  - `settingsStore`: 시스템 파일 표시 설정

---

### 3. 도메인 관리 페이지 (`/domain/browse`)

**파일 위치:** `src/routes/domain/browse/+page.svelte`

**URL 경로:** `/domain/browse`

**주요 기능:**

- 도메인 데이터 조회 및 검색
- 도메인 수정/삭제
- 파일 관리 (생성, 삭제, 이름 변경)
- XLSX 파일 다운로드
- 히스토리 로그 조회

**인증/권한:**

❌ 인증 불필요

**사용하는 컴포넌트:**

- `SearchBar`: 검색 바
- `DomainTable`: 도메인 테이블
- `DomainEditor`: 도메인 편집 모달
- `DomainFileManager`: 파일 관리 모달
- `HistoryLog`: 히스토리 로그

**호출하는 API:**

| HTTP 메소드 | 엔드포인트             | 용도               |
| ----------- | ---------------------- | ------------------ |
| GET         | `/api/domain`          | 도메인 데이터 조회 |
| PUT         | `/api/domain`          | 도메인 수정        |
| DELETE      | `/api/domain`          | 도메인 삭제        |
| GET         | `/api/domain/files`    | 파일 목록 조회     |
| POST        | `/api/domain/files`    | 파일 생성          |
| GET         | `/api/domain/download` | XLSX 다운로드      |
| POST        | `/api/history`         | 히스토리 로그 추가 |

**폼 및 Validation:**

- **검색 폼:**
  - 검색어: 문자열
  - 검색 필드: `all`, `domainGroup`, `domainCategory`, `standardDomainName`, `physicalDataType`

- **도메인 편집 폼 (DomainEditor):**
  - 도메인 그룹: 필수, 문자열
  - 도메인 분류명: 필수, 문자열
  - 표준 도메인명: 필수, 문자열
  - 논리 데이터 타입: 선택, 문자열
  - 물리 데이터 타입: 선택, 문자열

**상태 관리:**

- 로컬 상태 (`$state`):
  - `entries`: DomainEntry[]
  - `loading`: boolean
  - `searchQuery`, `searchField`: 검색 조건
  - `currentPage`, `totalPages`, `pageSize`: 페이지네이션
  - `sortColumn`, `sortDirection`: 정렬
  - `fileList`, `selectedFilename`: 파일 관리
  - `showEditor`, `currentEditingEntry`: 편집기 상태

- 전역 상태 (Stores):
  - `domainStore`: 선택된 파일명 저장
  - `settingsStore`: 시스템 파일 표시 설정

---

### 4. 용어 관리 페이지 (`/term/browse`)

**파일 위치:** `src/routes/term/browse/+page.svelte`

**URL 경로:** `/term/browse`

**주요 기능:**

- 용어 데이터 조회 및 검색
- 용어 추가/수정/삭제
- 파일 관리 (생성, 삭제, 이름 변경)
- 용어 매핑 동기화
- 용어 변환기 (TermGenerator)
- XLSX 파일 다운로드
- 히스토리 로그 조회

**인증/권한:**

❌ 인증 불필요

**사용하는 컴포넌트:**

- `SearchBar`: 검색 바
- `TermTable`: 용어 테이블
- `TermEditor`: 용어 편집 모달
- `TermFileManager`: 파일 관리 모달
- `TermGenerator`: 용어 변환기
- `HistoryLog`: 히스토리 로그

**호출하는 API:**

| HTTP 메소드 | 엔드포인트                | 용도               |
| ----------- | ------------------------- | ------------------ |
| GET         | `/api/term`               | 용어 데이터 조회   |
| POST        | `/api/term`               | 새 용어 추가       |
| PUT         | `/api/term`               | 용어 수정          |
| DELETE      | `/api/term`               | 용어 삭제          |
| GET         | `/api/term/files`         | 파일 목록 조회     |
| POST        | `/api/term/files`         | 파일 생성          |
| GET         | `/api/term/files/mapping` | 매핑 정보 조회     |
| POST        | `/api/term/sync`          | 용어 매핑 동기화   |
| GET         | `/api/term/download`      | XLSX 다운로드      |
| POST        | `/api/history`            | 히스토리 로그 추가 |

**폼 및 Validation:**

- **검색 폼:**
  - 검색어: 문자열
  - 검색 필드: `all`, `termName`, `columnName`, `domainName`

- **용어 편집 폼 (TermEditor):**
  - 용어명: 필수, 문자열
  - 칼럼명: 필수, 문자열
  - 도메인명: 필수, 문자열
  - 매핑 검증: 용어명, 칼럼명, 도메인명이 각각 vocabulary, domain과 매핑되는지 검증

**상태 관리:**

- 로컬 상태 (`$state`):
  - `entries`: TermEntry[]
  - `loading`: boolean
  - `searchQuery`, `searchField`: 검색 조건
  - `currentPage`, `totalPages`, `pageSize`: 페이지네이션
  - `sortColumn`, `sortDirection`: 정렬
  - `fileList`, `selectedFilename`: 파일 관리
  - `showEditor`, `currentEditingEntry`: 편집기 상태

- 전역 상태 (Stores):
  - `termStore`: 선택된 파일명 저장
  - `settingsStore`: 시스템 파일 표시 설정

---

### 5. 공통 레이아웃 (`+layout.svelte`)

**파일 위치:** `src/routes/+layout.svelte`

**주요 기능:**

- 모든 페이지에 공통으로 적용되는 레이아웃
- 네비게이션 헤더 (데스크탑/모바일)
- 푸터
- ScrollToTop 컴포넌트

**인증/권한:**

❌ 인증 불필요

**사용하는 컴포넌트:**

- `ScrollToTop`: 스크롤 상단 이동 버튼

**네비게이션 메뉴:**

- 단어집 (`/browse`)
- 도메인 (`/domain/browse`)
- 용어 (`/term/browse`)

---

## 컴포넌트 분석

### 컴포넌트 계층 구조

#### 단어집 관리 페이지 (`/browse`)

```
+layout.svelte
└── +page.svelte (browse)
    ├── SearchBar
    ├── VocabularyTable
    ├── TermEditor (모달)
    ├── ForbiddenWordManager (모달)
    ├── VocabularyFileManager (모달)
    └── HistoryLog
```

#### 도메인 관리 페이지 (`/domain/browse`)

```
+layout.svelte
└── +page.svelte (domain/browse)
    ├── SearchBar
    ├── DomainTable
    ├── DomainEditor (모달)
    ├── DomainFileManager (모달)
    └── HistoryLog
```

#### 용어 관리 페이지 (`/term/browse`)

```
+layout.svelte
└── +page.svelte (term/browse)
    ├── SearchBar
    ├── TermTable
    ├── TermEditor (모달)
    ├── TermFileManager (모달)
    ├── TermGenerator
    └── HistoryLog
```

---

### 재사용 가능한 공통 컴포넌트

#### 1. SearchBar

**파일 위치:** `src/lib/components/SearchBar.svelte`

**설명:** 검색 바 컴포넌트. 검색어 입력, 필드 선택, 정확 일치 옵션 제공.

**Props 인터페이스:**

```typescript
{
  placeholder?: string;                    // 기본값: '단어를 검색하세요...'
  disabled?: boolean;                      // 기본값: false
  loading?: boolean;                       // 기본값: false
  query?: string;                          // 바인딩 가능
  field?: string;                          // 바인딩 가능, 기본값: 'all'
  exact?: boolean;                         // 바인딩 가능, 기본값: false
  searchFields?: Array<{                   // 검색 필드 옵션
    value: string;
    label: string;
  }>;
  onsearch: (detail: {                     // 검색 이벤트 핸들러
    query: string;
    field: string;
    exact: boolean;
  }) => void;
  onclear: () => void;                     // 검색 초기화 핸들러
}
```

**주요 기능:**

- 디바운스된 검색 (300ms)
- Enter 키로 검색 실행
- Escape 키로 검색 초기화
- 검색 필드 선택 드롭다운
- 정확 일치 옵션 체크박스

---

#### 2. ScrollToTop

**파일 위치:** `src/lib/components/ScrollToTop.svelte`

**설명:** 페이지 스크롤 시 상단으로 이동하는 버튼.

**Props:**

- 없음

---

#### 3. HistoryLog

**파일 위치:** `src/lib/components/HistoryLog.svelte`

**설명:** 히스토리 로그를 표시하는 컴포넌트.

**Props 인터페이스:**

```typescript
{
	type: 'vocabulary' | 'domain' | 'term'; // 히스토리 타입
}
```

**호출하는 API:**

- `GET /api/history?type={type}`

---

### 페이지 전용 컴포넌트

#### 1. VocabularyTable

**파일 위치:** `src/lib/components/VocabularyTable.svelte`

**설명:** 단어집 데이터를 테이블 형식으로 표시.

**Props 인터페이스:**

```typescript
{
  entries?: VocabularyEntry[];             // 표시할 엔트리 목록
  loading?: boolean;                       // 로딩 상태
  searchQuery?: string;                    // 검색어
  totalCount?: number;                     // 전체 개수
  currentPage?: number;                    // 현재 페이지
  totalPages?: number;                     // 전체 페이지 수
  pageSize?: number;                       // 페이지 크기
  sortColumn?: string;                     // 정렬 컬럼
  sortDirection?: 'asc' | 'desc';         // 정렬 방향
  searchField?: string;                    // 검색 필드
  _selectedFilename?: string;              // 선택된 파일명
  onsort: (detail: {                      // 정렬 이벤트 핸들러
    column: string;
    direction: 'asc' | 'desc';
  }) => void;
  onpagechange: (detail: {                // 페이지 변경 이벤트 핸들러
    page: number;
  }) => void;
  onentryclick?: (detail: {               // 엔트리 클릭 이벤트 핸들러
    entry: VocabularyEntry;
  }) => void;
}
```

**주요 기능:**

- 컬럼별 정렬
- 페이지네이션
- 엔트리 클릭 시 편집 모달 열기
- 중복 정보 표시 (표준단어명, 영문약어, 영문명)
- 도메인 매핑 상태 표시

---

#### 2. DomainTable

**파일 위치:** `src/lib/components/DomainTable.svelte`

**설명:** 도메인 데이터를 테이블 형식으로 표시.

**Props 인터페이스:**

```typescript
{
  entries?: DomainEntry[];                 // 표시할 엔트리 목록
  loading?: boolean;                       // 로딩 상태
  searchQuery?: string;                    // 검색어
  totalCount?: number;                     // 전체 개수
  currentPage?: number;                    // 현재 페이지
  totalPages?: number;                     // 전체 페이지 수
  pageSize?: number;                       // 페이지 크기
  sortColumn?: string;                     // 정렬 컬럼
  sortDirection?: 'asc' | 'desc';         // 정렬 방향
  searchField?: string;                    // 검색 필드
  _selectedFilename?: string;              // 선택된 파일명
  onsort: (detail: {                      // 정렬 이벤트 핸들러
    column: string;
    direction: 'asc' | 'desc';
  }) => void;
  onpagechange: (detail: {                // 페이지 변경 이벤트 핸들러
    page: number;
  }) => void;
  onentryclick?: (detail: {               // 엔트리 클릭 이벤트 핸들러
    entry: DomainEntry;
  }) => void;
}
```

---

#### 3. TermTable

**파일 위치:** `src/lib/components/TermTable.svelte`

**설명:** 용어 데이터를 테이블 형식으로 표시.

**Props 인터페이스:**

```typescript
{
  entries?: TermEntry[];                   // 표시할 엔트리 목록
  loading?: boolean;                       // 로딩 상태
  searchQuery?: string;                    // 검색어
  totalCount?: number;                     // 전체 개수
  currentPage?: number;                    // 현재 페이지
  totalPages?: number;                     // 전체 페이지 수
  pageSize?: number;                       // 페이지 크기
  sortColumn?: string;                     // 정렬 컬럼
  sortDirection?: 'asc' | 'desc';         // 정렬 방향
  searchField?: string;                    // 검색 필드
  _selectedFilename?: string;              // 선택된 파일명
  onsort: (detail: {                      // 정렬 이벤트 핸들러
    column: string;
    direction: 'asc' | 'desc';
  }) => void;
  onpagechange: (detail: {                // 페이지 변경 이벤트 핸들러
    page: number;
  }) => void;
  onentryclick?: (detail: {               // 엔트리 클릭 이벤트 핸들러
    entry: TermEntry;
  }) => void;
}
```

**주요 기능:**

- 매핑 상태 표시 (용어명, 칼럼명, 도메인명)

---

#### 4. TermEditor

**파일 위치:** `src/lib/components/TermEditor.svelte`

**설명:** 단어/용어 편집 모달. 단어집과 용어 페이지에서 공통 사용.

**Props 인터페이스:**

```typescript
{
  entry?: Partial<VocabularyEntry | TermEntry>;  // 편집할 엔트리
  isEditMode?: boolean;                          // 편집 모드 여부
  serverError?: string;                          // 서버 에러 메시지
}
```

**이벤트:**

- `save`: 저장 이벤트
- `cancel`: 취소 이벤트
- `delete`: 삭제 이벤트

**주요 기능:**

- 단어/용어 추가/수정
- 필수 필드 검증
- 자동완성 (용어명, 칼럼명, 도메인명)
- 매핑 검증 (용어 페이지에서만)

---

#### 5. DomainEditor

**파일 위치:** `src/lib/components/DomainEditor.svelte`

**설명:** 도메인 편집 모달.

**Props 인터페이스:**

```typescript
{
  entry?: Partial<DomainEntry>;           // 편집할 엔트리
  isEditMode?: boolean;                    // 편집 모드 여부
  serverError?: string;                    // 서버 에러 메시지
}
```

**이벤트:**

- `save`: 저장 이벤트
- `cancel`: 취소 이벤트
- `delete`: 삭제 이벤트

---

#### 6. VocabularyFileManager

**파일 위치:** `src/lib/components/VocabularyFileManager.svelte`

**설명:** 단어집 파일 관리 모달.

**Props 인터페이스:**

```typescript
{
	isOpen: boolean; // 모달 열림 상태
}
```

**이벤트:**

- `close`: 모달 닫기
- `change`: 파일 변경

**호출하는 API:**

- `GET /api/vocabulary/files`: 파일 목록 조회
- `POST /api/vocabulary/files`: 파일 생성
- `PUT /api/vocabulary/files`: 파일 이름 변경
- `DELETE /api/vocabulary/files`: 파일 삭제

---

#### 7. DomainFileManager

**파일 위치:** `src/lib/components/DomainFileManager.svelte`

**설명:** 도메인 파일 관리 모달.

**Props 인터페이스:**

```typescript
{
	isOpen: boolean; // 모달 열림 상태
}
```

**이벤트:**

- `close`: 모달 닫기
- `change`: 파일 변경

---

#### 8. TermFileManager

**파일 위치:** `src/lib/components/TermFileManager.svelte`

**설명:** 용어 파일 관리 모달.

**Props 인터페이스:**

```typescript
{
  isOpen: boolean;                         // 모달 열림 상태
  selectedFilename?: string;               // 선택된 파일명
}
```

**이벤트:**

- `close`: 모달 닫기
- `change`: 파일 변경

---

#### 9. ForbiddenWordManager

**파일 위치:** `src/lib/components/ForbiddenWordManager.svelte`

**설명:** 금지어 관리 모달.

**Props 인터페이스:**

```typescript
{
	isOpen: boolean; // 모달 열림 상태
}
```

**이벤트:**

- `close`: 모달 닫기

**호출하는 API:**

- `GET /api/forbidden-words`: 금지어 목록 조회
- `POST /api/forbidden-words`: 금지어 추가
- `PUT /api/forbidden-words`: 금지어 수정
- `DELETE /api/forbidden-words`: 금지어 삭제

---

#### 10. TermGenerator

**파일 위치:** `src/lib/components/TermGenerator.svelte`

**설명:** 용어 변환기 컴포넌트.

**Props:**

- 없음

**호출하는 API:**

- `POST /api/generator`: 용어 변환
- `POST /api/generator/segment`: 용어 분할

---

#### 11. FileUpload

**파일 위치:** `src/lib/components/FileUpload.svelte`

**설명:** 파일 업로드 컴포넌트.

**주요 기능:**

- XLSX 파일 업로드
- 파일 검증

---

## 상태 관리

### 전역 상태 (Svelte Stores)

#### 1. vocabularyStore

**파일 위치:** `src/lib/stores/vocabularyStore.ts`

**타입:**

```typescript
{
	selectedFilename: string; // 선택된 단어집 파일명
	selectedDomainFilename: string; // 선택된 도메인 파일명
}
```

**기본값:**

```typescript
{
  selectedFilename: 'vocabulary.json',
  selectedDomainFilename: 'domain.json'
}
```

**사용 위치:**

- `src/routes/browse/+page.svelte`: 선택된 파일명 저장 및 구독

---

#### 2. domainStore

**파일 위치:** `src/lib/stores/domain-store.ts`

**타입:**

```typescript
{
	selectedFilename: string; // 선택된 도메인 파일명
}
```

**기본값:**

```typescript
{
	selectedFilename: 'domain.json';
}
```

**사용 위치:**

- `src/routes/domain/browse/+page.svelte`: 선택된 파일명 저장 및 구독

---

#### 3. termStore

**파일 위치:** `src/lib/stores/term-store.ts`

**타입:**

```typescript
{
	selectedFilename: string; // 선택된 용어 파일명
}
```

**기본값:**

```typescript
{
	selectedFilename: 'term.json';
}
```

**사용 위치:**

- `src/routes/term/browse/+page.svelte`: 선택된 파일명 저장 및 구독
- `src/lib/components/TermEditor.svelte`: 매핑 정보 로드 시 사용

---

#### 4. settingsStore

**파일 위치:** `src/lib/stores/settings-store.ts`

**타입:**

```typescript
interface Settings {
	showVocabularySystemFiles: boolean; // 단어집 시스템 파일 표시 여부
	showDomainSystemFiles: boolean; // 도메인 시스템 파일 표시 여부
}
```

**기본값:**

```typescript
{
  showVocabularySystemFiles: true,
  showDomainSystemFiles: true
}
```

**특징:**

- 브라우저 환경에서만 동작 (`browser` 체크)
- 초기값은 `/api/settings`에서 로드
- 변경 시 자동으로 `/api/settings`에 저장

**사용 위치:**

- 모든 페이지: 파일 목록 필터링
- 설정 변경 시 파일 목록 자동 재필터링

---

### 서버 상태

**서버 상태 관리 라이브러리:** 없음

**관리 방식:**

- 각 페이지에서 직접 `fetch` API를 사용하여 데이터 로드
- 로컬 상태 (`$state`)에 저장
- 수동으로 새로고침 (`loadVocabularyData`, `loadDomainData`, `loadTermData`)

**캐싱:**

- 없음 (매번 API 호출)

**예시:**

```typescript
// 단어집 데이터 로드
async function loadVocabularyData() {
	loading = true;
	try {
		const response = await fetch(`/api/vocabulary?${params}`);
		const result = await response.json();
		if (result.success) {
			entries = result.data.entries;
			totalCount = result.data.pagination.totalCount;
		}
	} finally {
		loading = false;
	}
}
```

---

### 로컬 상태 (Svelte 5 Runes)

각 페이지에서 `$state` rune을 사용하여 로컬 상태를 관리합니다.

#### 단어집 관리 페이지 (`/browse`)

```typescript
let entries = $state<VocabularyEntry[]>([]);
let loading = $state(false);
let searchQuery = $state('');
let searchField = $state('all');
let searchExact = $state(false);
let totalCount = $state(0);
let currentPage = $state(1);
let totalPages = $state(1);
let pageSize = $state(20);
let sortColumn = $state('standardName');
let sortDirection = $state<'asc' | 'desc'>('asc');
let duplicateFilters = $state({
	standardName: false,
	abbreviation: false,
	englishName: false
});
let unmappedDomainOnly = $state(false);
let vocabularyFiles = $state<string[]>([]);
let selectedFilename = $state('vocabulary.json');
let showEditor = $state(false);
let editorServerError = $state('');
let showForbiddenWordManager = $state(false);
let isFileManagerOpen = $state(false);
let sidebarOpen = $state(false);
let currentEditingEntry = $state<VocabularyEntry | null>(null);
```

#### 도메인 관리 페이지 (`/domain/browse`)

```typescript
let entries = $state<DomainEntry[]>([]);
let loading = $state(false);
let searchQuery = $state('');
let searchField = $state('all');
let searchExact = $state(false);
let totalCount = $state(0);
let currentPage = $state(1);
let totalPages = $state(1);
let pageSize = $state(20);
let sortColumn = $state('standardDomainName');
let sortDirection = $state<'asc' | 'desc'>('asc');
let isFileManagerOpen = $state(false);
let selectedFilename = $state('domain.json');
let fileList = $state<string[]>([]);
let sidebarOpen = $state(false);
let showEditor = $state(false);
let editorServerError = $state('');
let currentEditingEntry = $state<DomainEntry | null>(null);
```

#### 용어 관리 페이지 (`/term/browse`)

```typescript
let entries = $state<TermEntry[]>([]);
let loading = $state(false);
let searchQuery = $state('');
let searchField = $state('all');
let searchExact = $state(false);
let totalCount = $state(0);
let currentPage = $state(1);
let totalPages = $state(1);
let pageSize = $state(20);
let sortColumn = $state('termName');
let sortDirection = $state<'asc' | 'desc'>('asc');
let isFileManagerOpen = $state(false);
let selectedFilename = $state('term.json');
let fileList = $state<string[]>([]);
let sidebarOpen = $state(false);
let showEditor = $state(false);
let editorServerError = $state('');
let currentEditingEntry = $state<TermEntry | null>(null);
```

---

## 데이터 흐름

### 1. 페이지 로드 시

```
1. onMount() 실행
   ↓
2. 파일 목록 로드 (GET /api/{entity}/files)
   ↓
3. Store에서 선택된 파일명 확인
   ↓
4. 데이터 로드 (GET /api/{entity})
   ↓
5. 로컬 상태 업데이트 (entries, totalCount 등)
   ↓
6. UI 렌더링
```

### 2. 검색 시

```
1. 사용자 검색어 입력
   ↓
2. SearchBar에서 디바운스 (300ms)
   ↓
3. handleSearch() 호출
   ↓
4. 검색 API 호출 (GET /api/search 또는 GET /api/{entity})
   ↓
5. 로컬 상태 업데이트
   ↓
6. UI 업데이트
```

### 3. 데이터 추가/수정/삭제 시

```
1. 사용자 액션 (추가/수정/삭제)
   ↓
2. API 호출 (POST/PUT/DELETE /api/{entity})
   ↓
3. 성공 시:
   - 히스토리 로그 기록 (POST /api/history)
   - 데이터 새로고침 (GET /api/{entity})
   - 모달 닫기
4. 실패 시:
   - 에러 메시지 표시
   - 모달 유지
```

### 4. 파일 변경 시

```
1. 사용자가 파일 선택
   ↓
2. handleFileSelect() 호출
   ↓
3. Store 업데이트 (vocabularyStore/domainStore/termStore)
   ↓
4. Store 구독자에서 파일명 변경 감지
   ↓
5. 데이터 새로고침 (GET /api/{entity}?filename={newFilename})
   ↓
6. UI 업데이트
```

---

## 스타일링

### CSS 프레임워크

- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크
- **커스텀 애니메이션**: CSS keyframes 사용

### 주요 스타일 패턴

- **글래스모피즘**: `backdrop-blur`, `bg-white/80` 등
- **그라데이션**: `bg-gradient-to-br`, `bg-gradient-to-r` 등
- **반응형 디자인**: `sm:`, `md:`, `lg:` 브레이크포인트 사용
- **호버 효과**: `hover:scale-105`, `hover:shadow-xl` 등

---

## 개선 제안

### 1. 서버 상태 관리

**현재 문제:**

- 서버 상태 관리 라이브러리 없음
- 매번 수동으로 API 호출
- 캐싱 없음

**개선 방안:**

- React Query 또는 SWR과 유사한 라이브러리 도입
- 또는 SvelteKit의 `load` 함수 활용

### 2. 에러 처리

**현재 문제:**

- 에러 처리가 각 페이지에 분산
- 일관성 없는 에러 메시지 표시

**개선 방안:**

- 전역 에러 핸들러 컴포넌트
- 에러 바운더리 패턴 도입

### 3. 로딩 상태

**현재 문제:**

- 각 페이지에서 개별적으로 로딩 상태 관리

**개선 방안:**

- 전역 로딩 상태 관리
- Suspense 패턴 활용

### 4. 폼 Validation

**현재 문제:**

- 각 컴포넌트에서 개별적으로 validation 로직 구현

**개선 방안:**

- 공통 validation 유틸리티 함수
- 또는 Zod 같은 validation 라이브러리 도입

---

**마지막 업데이트**: 2024-01-01
