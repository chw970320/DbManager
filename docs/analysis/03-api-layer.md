# API 레이어 분석

## 개요

이 문서는 DbManager 프로젝트의 API 레이어를 완전히 분석합니다. SvelteKit의 파일 기반 라우팅을 사용하여 API 엔드포인트를 구현합니다.

## API 아키텍처

### 라우팅 방식

SvelteKit의 파일 기반 라우팅을 사용합니다:

- `src/routes/api/{path}/+server.ts` 파일이 `GET`, `POST`, `PUT`, `DELETE` 등의 HTTP 메소드를 export
- 각 파일은 해당 경로의 API 엔드포인트를 처리

### 데이터 접근 방식

이 프로젝트는 **전통적인 데이터베이스를 사용하지 않고**, JSON 파일 기반 저장소를 사용합니다:

- 데이터 접근: `file-handler.ts` 유틸리티 함수 사용
- ORM/쿼리 빌더: 없음 (직접 파일 I/O)
- 트랜잭션: 없음 (파일 기반 특성상 원자성 보장 어려움)

---

## API 엔드포인트 목록

### Vocabulary (단어집) API

| HTTP 메소드 | 경로                            | 파일 위치                                            | 설명                   |
| ----------- | ------------------------------- | ---------------------------------------------------- | ---------------------- |
| GET         | `/api/vocabulary`               | `src/routes/api/vocabulary/+server.ts`               | 단어집 데이터 조회     |
| POST        | `/api/vocabulary`               | `src/routes/api/vocabulary/+server.ts`               | 새 단어 추가           |
| PUT         | `/api/vocabulary`               | `src/routes/api/vocabulary/+server.ts`               | 단어 수정              |
| DELETE      | `/api/vocabulary`               | `src/routes/api/vocabulary/+server.ts`               | 단어 삭제              |
| GET         | `/api/vocabulary/files`         | `src/routes/api/vocabulary/files/+server.ts`         | 파일 목록 조회         |
| POST        | `/api/vocabulary/files`         | `src/routes/api/vocabulary/files/+server.ts`         | 파일 생성              |
| PUT         | `/api/vocabulary/files`         | `src/routes/api/vocabulary/files/+server.ts`         | 파일 이름 변경         |
| DELETE      | `/api/vocabulary/files`         | `src/routes/api/vocabulary/files/+server.ts`         | 파일 삭제              |
| GET         | `/api/vocabulary/files/mapping` | `src/routes/api/vocabulary/files/mapping/+server.ts` | 매핑 정보 조회         |
| PUT         | `/api/vocabulary/files/mapping` | `src/routes/api/vocabulary/files/mapping/+server.ts` | 매핑 정보 저장         |
| POST        | `/api/vocabulary/sync-domain`   | `src/routes/api/vocabulary/sync-domain/+server.ts`   | 도메인 매핑 동기화     |
| GET         | `/api/vocabulary/duplicates`    | `src/routes/api/vocabulary/duplicates/+server.ts`    | 중복 단어 조회         |
| GET         | `/api/vocabulary/download`      | `src/routes/api/vocabulary/download/+server.ts`      | 단어집 다운로드 (XLSX) |

### Domain (도메인) API

| HTTP 메소드 | 경로                   | 파일 위치                                   | 설명                   |
| ----------- | ---------------------- | ------------------------------------------- | ---------------------- |
| GET         | `/api/domain`          | `src/routes/api/domain/+server.ts`          | 도메인 데이터 조회     |
| OPTIONS     | `/api/domain`          | `src/routes/api/domain/+server.ts`          | 도메인 통계 정보 조회  |
| PUT         | `/api/domain`          | `src/routes/api/domain/+server.ts`          | 도메인 수정            |
| DELETE      | `/api/domain`          | `src/routes/api/domain/+server.ts`          | 도메인 삭제            |
| GET         | `/api/domain/files`    | `src/routes/api/domain/files/+server.ts`    | 파일 목록 조회         |
| POST        | `/api/domain/files`    | `src/routes/api/domain/files/+server.ts`    | 파일 생성              |
| PUT         | `/api/domain/files`    | `src/routes/api/domain/files/+server.ts`    | 파일 이름 변경         |
| DELETE      | `/api/domain/files`    | `src/routes/api/domain/files/+server.ts`    | 파일 삭제              |
| GET         | `/api/domain/download` | `src/routes/api/domain/download/+server.ts` | 도메인 다운로드 (XLSX) |
| POST        | `/api/domain/upload`   | `src/routes/api/domain/upload/+server.ts`   | 도메인 업로드 (XLSX)   |

### Term (용어) API

| HTTP 메소드 | 경로                      | 파일 위치                                      | 설명                 |
| ----------- | ------------------------- | ---------------------------------------------- | -------------------- |
| GET         | `/api/term`               | `src/routes/api/term/+server.ts`               | 용어 데이터 조회     |
| POST        | `/api/term`               | `src/routes/api/term/+server.ts`               | 새 용어 추가         |
| PUT         | `/api/term`               | `src/routes/api/term/+server.ts`               | 용어 수정            |
| DELETE      | `/api/term`               | `src/routes/api/term/+server.ts`               | 용어 삭제            |
| GET         | `/api/term/files`         | `src/routes/api/term/files/+server.ts`         | 파일 목록 조회       |
| POST        | `/api/term/files`         | `src/routes/api/term/files/+server.ts`         | 파일 생성            |
| PUT         | `/api/term/files`         | `src/routes/api/term/files/+server.ts`         | 파일 이름 변경       |
| DELETE      | `/api/term/files`         | `src/routes/api/term/files/+server.ts`         | 파일 삭제            |
| GET         | `/api/term/files/mapping` | `src/routes/api/term/files/mapping/+server.ts` | 매핑 정보 조회       |
| PUT         | `/api/term/files/mapping` | `src/routes/api/term/files/mapping/+server.ts` | 매핑 정보 저장       |
| POST        | `/api/term/sync`          | `src/routes/api/term/sync/+server.ts`          | 용어 매핑 동기화     |
| GET         | `/api/term/download`      | `src/routes/api/term/download/+server.ts`      | 용어 다운로드 (XLSX) |
| GET         | `/api/term/upload`        | `src/routes/api/term/upload/+server.ts`        | 업로드 정보 조회     |
| POST        | `/api/term/upload`        | `src/routes/api/term/upload/+server.ts`        | 용어 업로드 (XLSX)   |

### History (히스토리) API

| HTTP 메소드 | 경로           | 파일 위치                           | 설명               |
| ----------- | -------------- | ----------------------------------- | ------------------ |
| GET         | `/api/history` | `src/routes/api/history/+server.ts` | 히스토리 로그 조회 |
| POST        | `/api/history` | `src/routes/api/history/+server.ts` | 히스토리 로그 추가 |

### Forbidden Words (금지어) API

| HTTP 메소드 | 경로                   | 파일 위치                                   | 설명             |
| ----------- | ---------------------- | ------------------------------------------- | ---------------- |
| GET         | `/api/forbidden-words` | `src/routes/api/forbidden-words/+server.ts` | 금지어 목록 조회 |
| POST        | `/api/forbidden-words` | `src/routes/api/forbidden-words/+server.ts` | 금지어 추가      |
| PUT         | `/api/forbidden-words` | `src/routes/api/forbidden-words/+server.ts` | 금지어 수정      |
| DELETE      | `/api/forbidden-words` | `src/routes/api/forbidden-words/+server.ts` | 금지어 삭제      |

### Search (검색) API

| HTTP 메소드 | 경로          | 파일 위치                          | 설명                 |
| ----------- | ------------- | ---------------------------------- | -------------------- |
| GET         | `/api/search` | `src/routes/api/search/+server.ts` | 단어집 검색          |
| POST        | `/api/search` | `src/routes/api/search/+server.ts` | 검색 제안 (자동완성) |

### Settings (설정) API

| HTTP 메소드 | 경로            | 파일 위치                            | 설명      |
| ----------- | --------------- | ------------------------------------ | --------- |
| GET         | `/api/settings` | `src/routes/api/settings/+server.ts` | 설정 조회 |
| POST        | `/api/settings` | `src/routes/api/settings/+server.ts` | 설정 저장 |

---

## 각 엔드포인트별 상세 정보

### 1. GET /api/vocabulary

**파일 위치:** `src/routes/api/vocabulary/+server.ts`

**설명:** 단어집 데이터를 페이지네이션, 정렬, 필터링하여 조회합니다.

#### 요청 파라미터

**Query Parameters:**

| 파라미터         | 타입      | 필수 | 기본값            | 설명                                                                   |
| ---------------- | --------- | ---- | ----------------- | ---------------------------------------------------------------------- |
| `filename`       | `string`  | ❌   | `vocabulary.json` | 조회할 파일명                                                          |
| `page`           | `number`  | ❌   | `1`               | 페이지 번호 (>= 1)                                                     |
| `limit`          | `number`  | ❌   | `100`             | 페이지 크기 (1-1000)                                                   |
| `sortBy`         | `string`  | ❌   | `standardName`    | 정렬 필드 (`standardName`, `abbreviation`, `englishName`, `createdAt`) |
| `sortOrder`      | `string`  | ❌   | `asc`             | 정렬 순서 (`asc`, `desc`)                                              |
| `filter`         | `string`  | ❌   | -                 | 필터 (`duplicates`, `duplicates:standardName,abbreviation`)            |
| `unmappedDomain` | `boolean` | ❌   | `false`           | 도메인 미매핑 필터                                                     |

#### 요청 예시

```
GET /api/vocabulary?filename=vocabulary.json&page=1&limit=50&sortBy=standardName&sortOrder=asc&filter=duplicates
```

#### 응답 타입

**성공 응답 (200):**

```typescript
{
  success: true;
  data: {
    entries: VocabularyEntry[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    sorting: {
      sortBy: string;
      sortOrder: string;
    };
    filtering: {
      filter: string;
      isFiltered: boolean;
    };
    lastUpdated: string;
  };
  message: string;
}
```

**에러 응답 (400, 500):**

```typescript
{
	success: false;
	error: string;
	message: string;
}
```

#### 상태 코드

- `200`: 성공
- `400`: 잘못된 파라미터
- `500`: 서버 오류

#### 인증 요구 여부

❌ 인증 불필요

#### 데이터 접근

- **로드:** `loadVocabularyData(filename)` - `file-handler.ts`
- **모델:** `VocabularyData`, `VocabularyEntry` - `src/lib/types/vocabulary.ts`
- **저장소:** `static/data/vocabulary/{filename}.json`

---

### 2. POST /api/vocabulary

**파일 위치:** `src/routes/api/vocabulary/+server.ts`

**설명:** 새로운 단어를 추가합니다.

#### 요청 파라미터

**Query Parameters:**

| 파라미터   | 타입     | 필수 | 기본값            | 설명          |
| ---------- | -------- | ---- | ----------------- | ------------- |
| `filename` | `string` | ❌   | `vocabulary.json` | 저장할 파일명 |

**Request Body:**

```typescript
{
  standardName: string;      // 필수
  abbreviation: string;      // 필수
  englishName: string;       // 필수
  description?: string;
  domainCategory?: string;
  domainGroup?: string;
  isDomainCategoryMapped?: boolean;
  // ... 기타 VocabularyEntry 필드
}
```

#### 요청 예시

```json
{
	"standardName": "사용자",
	"abbreviation": "USER",
	"englishName": "User",
	"description": "시스템을 사용하는 개인 또는 조직"
}
```

#### 응답 타입

**성공 응답 (201):**

```typescript
{
	success: true;
	data: VocabularyEntry;
	message: string;
}
```

**에러 응답 (400, 409, 500):**

- `400`: 필수 필드 누락, 금지어 검증 실패
- `409`: 중복된 영문약어
- `500`: 서버 오류

#### 상태 코드

- `201`: 생성 성공
- `400`: 잘못된 요청 (필수 필드 누락, 금지어)
- `409`: 충돌 (중복된 영문약어)
- `500`: 서버 오류

#### 인증 요구 여부

❌ 인증 불필요

#### 데이터 접근

- **로드:** `loadVocabularyData(filename)`, `loadForbiddenWordsData()`
- **저장:** `saveVocabularyData(data, filename)`
- **검증:** 금지어 검증, 중복 검사

---

### 3. PUT /api/vocabulary

**파일 위치:** `src/routes/api/vocabulary/+server.ts`

**설명:** 기존 단어를 수정합니다.

#### 요청 파라미터

**Query Parameters:**

| 파라미터   | 타입     | 필수 | 기본값            | 설명          |
| ---------- | -------- | ---- | ----------------- | ------------- |
| `filename` | `string` | ❌   | `vocabulary.json` | 수정할 파일명 |

**Request Body:**

```typescript
VocabularyEntry; // id 필수
```

#### 응답 타입

**성공 응답 (200):**

```typescript
{
	success: true;
	data: VocabularyEntry;
	message: string;
}
```

**에러 응답 (400, 404, 500):**

- `400`: ID 누락
- `404`: 엔트리를 찾을 수 없음
- `500`: 서버 오류

#### 상태 코드

- `200`: 수정 성공
- `400`: 잘못된 요청
- `404`: 엔트리를 찾을 수 없음
- `500`: 서버 오류

---

### 4. DELETE /api/vocabulary

**파일 위치:** `src/routes/api/vocabulary/+server.ts`

**설명:** 단어를 삭제합니다.

#### 요청 파라미터

**Query Parameters:**

| 파라미터   | 타입     | 필수 | 기본값            | 설명             |
| ---------- | -------- | ---- | ----------------- | ---------------- |
| `id`       | `string` | ✅   | -                 | 삭제할 단어의 ID |
| `filename` | `string` | ❌   | `vocabulary.json` | 삭제할 파일명    |

#### 응답 타입

**성공 응답 (200):**

```typescript
{
	success: true;
	message: string;
}
```

**에러 응답 (400, 404, 500):**

- `400`: ID 누락
- `404`: 엔트리를 찾을 수 없음
- `500`: 서버 오류

---

### 5. POST /api/vocabulary/sync-domain

**파일 위치:** `src/routes/api/vocabulary/sync-domain/+server.ts`

**설명:** 단어집의 도메인 분류명을 도메인 데이터와 동기화하여 매핑합니다.

#### 요청 파라미터

**Request Body:**

```typescript
{
  vocabularyFilename?: string;  // 기본값: 'vocabulary.json'
  domainFilename?: string;      // 기본값: 매핑 정보 또는 'domain.json'
}
```

#### 응답 타입

**성공 응답 (200):**

```typescript
{
	success: true;
	data: {
		vocabularyFilename: string;
		domainFilename: string;
		updated: number; // 업데이트된 엔트리 수
		matched: number; // 매핑 성공 수
		unmatched: number; // 매핑 실패 수
		total: number; // 전체 엔트리 수
	}
	message: string;
}
```

#### 데이터 접근

- **로드:** `loadVocabularyData()`, `loadDomainData()`
- **로직:** `VocabularyEntry.domainCategory` ↔ `DomainEntry.domainCategory` 매칭
- **저장:** `saveVocabularyData()`

---

### 6. GET /api/domain

**파일 위치:** `src/routes/api/domain/+server.ts`

**설명:** 도메인 데이터를 페이지네이션, 정렬, 검색하여 조회합니다.

#### 요청 파라미터

**Query Parameters:**

| 파라미터    | 타입     | 필수 | 기본값        | 설명                                                                                         |
| ----------- | -------- | ---- | ------------- | -------------------------------------------------------------------------------------------- |
| `filename`  | `string` | ❌   | `domain.json` | 조회할 파일명                                                                                |
| `page`      | `number` | ❌   | `1`           | 페이지 번호 (>= 1)                                                                           |
| `limit`     | `number` | ❌   | `20`          | 페이지 크기 (1-100)                                                                          |
| `sortBy`    | `string` | ❌   | `createdAt`   | 정렬 필드                                                                                    |
| `sortOrder` | `string` | ❌   | `desc`        | 정렬 순서                                                                                    |
| `query`     | `string` | ❌   | -             | 검색어                                                                                       |
| `field`     | `string` | ❌   | `all`         | 검색 필드 (`all`, `domainGroup`, `domainCategory`, `standardDomainName`, `physicalDataType`) |

#### 응답 타입

**성공 응답 (200):**

```typescript
{
  success: true;
  data: {
    entries: DomainEntry[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    sorting: {
      sortBy: string;
      sortOrder: string;
    };
    search: {
      query: string;
      field: string;
      isFiltered: boolean;
    };
    lastUpdated: string;
  };
  message: string;
}
```

---

### 7. OPTIONS /api/domain

**파일 위치:** `src/routes/api/domain/+server.ts`

**설명:** 도메인 통계 정보를 조회합니다.

#### 응답 타입

**성공 응답 (200):**

```typescript
{
	success: true;
	data: {
		totalEntries: number;
		lastUpdated: string;
		domainGroups: Record<string, number>;
		logicalDataTypes: Record<string, number>;
		physicalDataTypes: Record<string, number>;
		summary: {
			uniqueGroups: number;
			uniqueLogicalDataTypes: number;
			uniquePhysicalDataTypes: number;
		}
	}
	message: string;
}
```

---

### 8. GET /api/term

**파일 위치:** `src/routes/api/term/+server.ts`

**설명:** 용어 데이터를 페이지네이션, 정렬, 검색하여 조회합니다.

#### 요청 파라미터

**Query Parameters:**

| 파라미터    | 타입     | 필수 | 기본값      | 설명                |
| ----------- | -------- | ---- | ----------- | ------------------- |
| `filename`  | `string` | ❌   | `term.json` | 조회할 파일명       |
| `page`      | `number` | ❌   | `1`         | 페이지 번호         |
| `limit`     | `number` | ❌   | `20`        | 페이지 크기 (1-100) |
| `sortBy`    | `string` | ❌   | `createdAt` | 정렬 필드           |
| `sortOrder` | `string` | ❌   | `desc`      | 정렬 순서           |
| `query`     | `string` | ❌   | -           | 검색어              |
| `field`     | `string` | ❌   | `all`       | 검색 필드           |

---

### 9. POST /api/term

**파일 위치:** `src/routes/api/term/+server.ts`

**설명:** 새로운 용어를 추가하고 매핑 검증을 수행합니다.

#### 요청 파라미터

**Request Body:**

```typescript
{
  entry: {
    termName: string;      // 필수
    columnName: string;    // 필수
    domainName: string;    // 필수
    id?: string;           // 선택 (없으면 자동 생성)
    createdAt?: string;    // 선택
  };
  filename?: string;       // 기본값: 'term.json'
}
```

#### 응답 타입

**성공 응답 (200):**

```typescript
{
	success: true;
	data: TermEntry; // 매핑 검증 결과 포함
	message: string;
}
```

#### 데이터 접근

- **로드:** `loadTermData()`, `loadVocabularyData()`, `loadDomainData()`
- **매핑 검증:** `checkTermMapping()` - 런타임 검증
- **저장:** `saveTermData()`

---

### 10. POST /api/term/sync

**파일 위치:** `src/routes/api/term/sync/+server.ts`

**설명:** 용어의 매핑 상태를 재검증하고 동기화합니다.

#### 요청 파라미터

**Request Body:**

```typescript
{
  filename?: string;  // 기본값: 'term.json'
}
```

#### 응답 타입

**성공 응답 (200):**

```typescript
{
	success: true;
	data: {
		filename: string;
		updated: number; // 업데이트된 엔트리 수
		matchedTerm: number; // 용어명 매핑 성공 수
		matchedColumn: number; // 칼럼명 매핑 성공 수
		matchedDomain: number; // 도메인명 매핑 성공 수
		total: number; // 전체 엔트리 수
	}
	message: string;
}
```

---

### 11. GET /api/history

**파일 위치:** `src/routes/api/history/+server.ts`

**설명:** 히스토리 로그를 조회합니다.

#### 요청 파라미터

**Query Parameters:**

| 파라미터   | 타입     | 필수 | 기본값       | 설명                                           |
| ---------- | -------- | ---- | ------------ | ---------------------------------------------- |
| `type`     | `string` | ❌   | `vocabulary` | 히스토리 타입 (`vocabulary`, `domain`, `term`) |
| `filename` | `string` | ❌   | -            | 파일명 (vocabulary만 필요)                     |
| `limit`    | `number` | ❌   | `50`         | 조회 개수 (1-200)                              |
| `offset`   | `number` | ❌   | `0`          | 오프셋 (>= 0)                                  |

#### 응답 타입

**성공 응답 (200):**

```typescript
{
  success: true;
  data: {
    logs: (HistoryLogEntry | DomainHistoryLogEntry | TermHistoryLogEntry)[];
    pagination: {
      offset: number;
      limit: number;
      totalCount: number;
      hasMore: boolean;
    };
    lastUpdated: string;
  };
  message: string;
}
```

---

### 12. POST /api/history

**파일 위치:** `src/routes/api/history/+server.ts`

**설명:** 새로운 히스토리 로그를 추가합니다.

#### 요청 파라미터

**Query Parameters:**

| 파라미터 | 타입     | 필수 | 기본값       | 설명          |
| -------- | -------- | ---- | ------------ | ------------- |
| `type`   | `string` | ❌   | `vocabulary` | 히스토리 타입 |

**Request Body:**

```typescript
{
  action: 'add' | 'update' | 'delete' | 'UPLOAD_MERGE';  // 필수
  targetId: string;      // 필수
  targetName: string;    // 필수
  filename?: string;      // vocabulary만
  details?: {
    before?: Partial<Entry>;
    after?: Partial<Entry>;
    fileName?: string;
    fileSize?: number;
    processedCount?: number;
    replaceMode?: boolean;
  };
}
```

---

### 13. GET /api/forbidden-words

**파일 위치:** `src/routes/api/forbidden-words/+server.ts`

**설명:** 금지어 목록을 조회합니다.

#### 요청 파라미터

**Query Parameters:**

| 파라미터    | 타입     | 필수 | 기본값      | 설명                        |
| ----------- | -------- | ---- | ----------- | --------------------------- |
| `page`      | `number` | ❌   | `1`         | 페이지 번호                 |
| `limit`     | `number` | ❌   | `100`       | 페이지 크기 (1-1000)        |
| `sortBy`    | `string` | ❌   | `createdAt` | 정렬 필드                   |
| `sortOrder` | `string` | ❌   | `desc`      | 정렬 순서                   |
| `scope`     | `string` | ❌   | -           | 필터 (`global` 또는 파일명) |

---

### 14. POST /api/forbidden-words

**파일 위치:** `src/routes/api/forbidden-words/+server.ts`

**설명:** 새로운 금지어를 추가합니다.

#### 요청 파라미터

**Request Body:**

```typescript
{
  keyword: string;                    // 필수
  type: 'standardName' | 'abbreviation';  // 필수
  reason?: string;
  targetFile?: string;                // 특정 파일에만 적용
}
```

#### 응답 타입

**성공 응답 (201):**

```typescript
{
  success: true;
  data: {
    entries: ForbiddenWordEntry[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
    lastUpdated: string;
  };
  message: string;
}
```

**에러 응답 (400, 409, 500):**

- `400`: 필수 필드 누락, 잘못된 타입
- `409`: 중복된 금지어
- `500`: 서버 오류

---

### 15. GET /api/search

**파일 위치:** `src/routes/api/search/+server.ts`

**설명:** 단어집을 검색합니다.

#### 요청 파라미터

**Query Parameters:**

| 파라미터         | 타입      | 필수 | 기본값  | 설명                                                             |
| ---------------- | --------- | ---- | ------- | ---------------------------------------------------------------- |
| `q`              | `string`  | ✅   | -       | 검색어 (1-100자)                                                 |
| `field`          | `string`  | ❌   | `all`   | 검색 필드 (`all`, `standardName`, `abbreviation`, `englishName`) |
| `page`           | `number`  | ❌   | `1`     | 페이지 번호                                                      |
| `limit`          | `number`  | ❌   | `50`    | 페이지 크기 (1-500)                                              |
| `exact`          | `boolean` | ❌   | `false` | 정확히 일치 검색                                                 |
| `filter`         | `string`  | ❌   | -       | 필터 (`duplicates`, `duplicates:standardName,abbreviation`)      |
| `unmappedDomain` | `boolean` | ❌   | `false` | 도메인 미매핑 필터                                               |
| `filename`       | `string`  | ❌   | -       | 검색할 파일명                                                    |

#### 응답 타입

**성공 응답 (200):**

```typescript
{
  success: true;
  data: {
    entries: VocabularyEntry[];
    totalCount: number;
    query: {
      query: string;
      field: string;
    };
    pagination: {
      currentPage: number;
      totalPages: number;
      totalResults: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    searchInfo: {
      originalQuery: string;
      sanitizedQuery: string;
      field: string;
      exact: boolean;
      executionTime: number;
    };
    filtering: {
      filter: string;
      isFiltered: boolean;
    };
  };
  message: string;
}
```

---

### 16. POST /api/search

**파일 위치:** `src/routes/api/search/+server.ts`

**설명:** 검색 제안 (자동완성)을 제공합니다.

#### 요청 파라미터

**Query Parameters:**

| 파라미터   | 타입     | 필수 | 기본값 | 설명          |
| ---------- | -------- | ---- | ------ | ------------- |
| `filename` | `string` | ❌   | -      | 검색할 파일명 |

**Request Body:**

```typescript
{
  query: string;      // 필수 (최소 1자)
  limit?: number;     // 기본값: 10, 최대: 50
}
```

#### 응답 타입

**성공 응답 (200):**

```typescript
{
  success: true;
  data: {
    suggestions: string[];
    query: string;
    count: number;
  };
  message: string;
}
```

---

### 17. GET /api/settings

**파일 위치:** `src/routes/api/settings/+server.ts`

**설명:** 애플리케이션 설정을 조회합니다.

#### 응답 타입

**성공 응답 (200):**

```typescript
{
  success: true;
  data: {
    showVocabularySystemFiles?: boolean;
    showDomainSystemFiles?: boolean;
    // ... 기타 설정
  };
}
```

---

### 18. POST /api/settings

**파일 위치:** `src/routes/api/settings/+server.ts`

**설명:** 애플리케이션 설정을 저장합니다.

#### 요청 파라미터

**Request Body:**

```typescript
{
  showVocabularySystemFiles?: boolean;
  showDomainSystemFiles?: boolean;
  // ... 기타 설정
}
```

---

## 데이터베이스 연결

### 데이터 저장소 구조

이 프로젝트는 **전통적인 데이터베이스를 사용하지 않고**, JSON 파일 기반 저장소를 사용합니다.

#### 파일 핸들러 (`file-handler.ts`)

**위치:** `src/lib/utils/file-handler.ts`

**주요 함수:**

| 함수명                     | 설명                 | 사용 모델                                                         |
| -------------------------- | -------------------- | ----------------------------------------------------------------- |
| `loadVocabularyData()`     | 단어집 데이터 로드   | `VocabularyData`                                                  |
| `saveVocabularyData()`     | 단어집 데이터 저장   | `VocabularyData`                                                  |
| `loadDomainData()`         | 도메인 데이터 로드   | `DomainData`                                                      |
| `saveDomainData()`         | 도메인 데이터 저장   | `DomainData`                                                      |
| `loadTermData()`           | 용어 데이터 로드     | `TermData`                                                        |
| `saveTermData()`           | 용어 데이터 저장     | `TermData`                                                        |
| `loadForbiddenWordsData()` | 금지어 데이터 로드   | `ForbiddenWordsData`                                              |
| `saveForbiddenWordsData()` | 금지어 데이터 저장   | `ForbiddenWordsData`                                              |
| `loadHistoryData()`        | 히스토리 데이터 로드 | `HistoryData`, `DomainHistoryData`, `TermHistoryData`             |
| `addHistoryLog()`          | 히스토리 로그 추가   | `HistoryLogEntry`, `DomainHistoryLogEntry`, `TermHistoryLogEntry` |

#### 데이터 저장 경로

```
static/data/
├── vocabulary/
│   ├── vocabulary.json
│   ├── vocabulary-*.json
│   ├── forbidden-words.json
│   └── history.json
├── domain/
│   ├── domain.json
│   └── history.json
└── term/
    ├── term.json
    └── history.json
```

### 쿼리 로직 요약

#### 1. 조회 (Read)

**패턴:**

```typescript
// 1. 파일 로드
const data = await loadVocabularyData(filename);

// 2. 필터링/검색
const filtered = data.entries.filter(/* 조건 */);

// 3. 정렬
const sorted = filtered.sort(/* 비교 함수 */);

// 4. 페이지네이션
const paginated = sorted.slice(startIndex, endIndex);
```

**예시:** `GET /api/vocabulary`

- 전체 파일 로드 → 메모리에서 필터링/정렬/페이지네이션

#### 2. 생성 (Create)

**패턴:**

```typescript
// 1. 기존 데이터 로드
const data = await loadVocabularyData(filename);

// 2. 새 엔트리 생성
const newEntry = { id: uuidv4(), ...fields, createdAt: new Date().toISOString() };

// 3. 배열에 추가
data.entries.push(newEntry);
data.totalCount = data.entries.length;
data.lastUpdated = new Date().toISOString();

// 4. 저장
await saveVocabularyData(data, filename);
```

**예시:** `POST /api/vocabulary`

- 검증 → 로드 → 추가 → 저장

#### 3. 수정 (Update)

**패턴:**

```typescript
// 1. 기존 데이터 로드
const data = await loadVocabularyData(filename);

// 2. 엔트리 찾기
const index = data.entries.findIndex((e) => e.id === id);

// 3. 업데이트
data.entries[index] = { ...data.entries[index], ...updates, updatedAt: new Date().toISOString() };
data.lastUpdated = new Date().toISOString();

// 4. 저장
await saveVocabularyData(data, filename);
```

**예시:** `PUT /api/vocabulary`

- 로드 → 찾기 → 업데이트 → 저장

#### 4. 삭제 (Delete)

**패턴:**

```typescript
// 1. 기존 데이터 로드
const data = await loadVocabularyData(filename);

// 2. 필터링 (삭제)
data.entries = data.entries.filter((e) => e.id !== id);
data.totalCount = data.entries.length;
data.lastUpdated = new Date().toISOString();

// 3. 저장
await saveVocabularyData(data, filename);
```

**예시:** `DELETE /api/vocabulary`

- 로드 → 필터링 → 저장

#### 5. 매핑 동기화

**패턴:**

```typescript
// 1. 관련 데이터 로드
const vocabularyData = await loadVocabularyData(vocabFile);
const domainData = await loadDomainData(domainFile);

// 2. 맵 생성
const domainMap = new Map<string, string>();
domainData.entries.forEach((entry) => {
	domainMap.set(entry.domainCategory.toLowerCase(), entry.domainGroup);
});

// 3. 매핑 수행
const mappedEntries = vocabularyData.entries.map((entry) => {
	const mapped = domainMap.get(entry.domainCategory?.toLowerCase());
	return { ...entry, domainGroup: mapped, isDomainCategoryMapped: !!mapped };
});

// 4. 저장
await saveVocabularyData({ ...vocabularyData, entries: mappedEntries }, vocabFile);
```

**예시:** `POST /api/vocabulary/sync-domain`

- 두 파일 로드 → 맵 생성 → 매핑 → 저장

### ORM/쿼리 빌더 사용 방식

**없음** - 직접 파일 I/O를 사용합니다.

- 파일 읽기: `readFile()` (Node.js `fs/promises`)
- 파일 쓰기: `writeFile()` (Node.js `fs/promises`)
- JSON 파싱: `JSON.parse()`
- JSON 직렬화: `JSON.stringify()`

---

## 타입 일관성 검증

### API 응답 타입 vs DB 스키마

#### ✅ 일치하는 부분

1. **VocabularyEntry**
   - API 요청/응답 타입: `VocabularyEntry` (`src/lib/types/vocabulary.ts`)
   - 저장소 스키마: JSON 파일의 `VocabularyEntry` 구조
   - **일치도:** 완전 일치

2. **DomainEntry**
   - API 요청/응답 타입: `DomainEntry` (`src/lib/types/domain.ts`)
   - 저장소 스키마: JSON 파일의 `DomainEntry` 구조
   - **일치도:** 완전 일치

3. **TermEntry**
   - API 요청/응답 타입: `TermEntry` (`src/lib/types/term.ts`)
   - 저장소 스키마: JSON 파일의 `TermEntry` 구조
   - **일치도:** 완전 일치

4. **ApiResponse**
   - 모든 API가 `ApiResponse` 타입 사용
   - 일관된 응답 구조

#### ⚠️ 주의사항

1. **타입 단언 사용**

   **위치:** `src/routes/api/domain/download/+server.ts:59`

   ```typescript
   return new Response(buffer as unknown as BodyInit, {
   ```

   **문제:** `unknown`을 거쳐 `BodyInit`으로 타입 단언
   - **권장:** `Buffer`를 직접 `BodyInit`으로 변환하거나 타입 가드 사용

2. **Partial 타입 사용**

   **위치:** 여러 API 엔드포인트

   ```typescript
   const newEntry: Partial<VocabularyEntry> = await request.json();
   ```

   **문제:** `Partial`로 인해 필수 필드 검증이 런타임에만 수행
   - **현재:** 런타임 검증으로 보완
   - **권장:** 요청 바디 타입을 명확히 정의

3. **유니온 타입 응답**

   **위치:** `GET /api/history`

   ```typescript
   let historyData: HistoryData | DomainHistoryData | TermHistoryData;
   ```

   **문제:** 타입이 너무 넓어 타입 안정성 저하
   - **현재:** `type` 파라미터로 구분
   - **권장:** 제네릭 타입 사용 고려

### any 타입 사용

**검색 결과:** `any` 타입 사용 없음 ✅

**unknown 타입 사용:**

- `src/routes/api/domain/download/+server.ts:59` - 타입 단언용 (1곳)

### 타입 안정성 개선 제안

1. **요청 바디 타입 명확화**

   ```typescript
   // 현재
   const body = await request.json();

   // 권장
   interface CreateVocabularyRequest {
   	standardName: string;
   	abbreviation: string;
   	englishName: string;
   	description?: string;
   }
   const body: CreateVocabularyRequest = await request.json();
   ```

2. **제네릭 타입 사용**

   ```typescript
   // 현재
   let historyData: HistoryData | DomainHistoryData | TermHistoryData;

   // 권장
   function loadHistoryData<T extends HistoryType>(
   	type: T
   ): Promise<
   	T extends 'vocabulary' ? HistoryData : T extends 'domain' ? DomainHistoryData : TermHistoryData
   >;
   ```

3. **타입 가드 함수 추가**

   ```typescript
   function isVocabularyEntry(obj: unknown): obj is VocabularyEntry {
   	return (
   		typeof obj === 'object' &&
   		obj !== null &&
   		'id' in obj &&
   		'standardName' in obj &&
   		'abbreviation' in obj &&
   		'englishName' in obj
   	);
   }
   ```

---

## 요약

### API 구조

- ✅ **총 18개 엔드포인트** (Vocabulary: 7, Domain: 5, Term: 7, History: 2, Forbidden Words: 4, Search: 2, Settings: 2)
- ✅ **일관된 응답 형식** (`ApiResponse` 타입)
- ✅ **RESTful 설계** (GET, POST, PUT, DELETE)

### 데이터 접근

- ✅ **파일 기반 저장소** (JSON 파일)
- ✅ **직접 파일 I/O** (ORM/쿼리 빌더 없음)
- ⚠️ **트랜잭션 없음** (파일 기반 특성)

### 타입 안정성

- ✅ **TypeScript 타입 정의** 완비
- ✅ **any 타입 사용 없음**
- ⚠️ **타입 단언 일부 사용** (`unknown` → `BodyInit`)
- ⚠️ **Partial 타입 사용** (런타임 검증으로 보완)

### 개선 제안

1. **요청 바디 타입 명확화**
2. **제네릭 타입 활용**
3. **타입 가드 함수 추가**
4. **JSON Schema 검증 도입**
