# 데이터 모델 명세서

## 개요

이 문서는 DbManager 프로젝트의 데이터 모델에 대한 개발자 참고 문서입니다. 각 모델의 상세 스펙, 검증 규칙, API 엔드포인트를 포함합니다.

## 데이터 저장 방식

이 프로젝트는 **JSON 파일 기반 저장소**를 사용합니다. 전통적인 데이터베이스가 아닌 파일 시스템에 JSON 형식으로 데이터를 저장합니다.

**저장 경로:**

- 기본 경로: `static/data/` (환경 변수 `DATA_PATH`로 변경 가능)
- 단어집: `static/data/vocabulary/`
- 도메인: `static/data/domain/`
- 용어: `static/data/term/`
- 데이터베이스: `static/data/database/`
- 엔터티: `static/data/entity/`
- 속성: `static/data/attribute/`
- 테이블: `static/data/table/`
- 컬럼: `static/data/column/`

---

## 매핑 해석 및 참조 무결성 (2026-02-13)

### 매핑 해석 우선순위

데이터 타입 간 관련 파일명은 아래 우선순위로 해석됩니다.

1. `static/data/registry.json`의 매핑 관계
2. 각 데이터 파일의 `mapping` 필드
3. 타입별 기본 파일명(`DEFAULT_FILENAMES`)

관련 구현:

- `src/lib/registry/mapping-registry.ts`
  - `resolveRelatedFilenames`
  - `getKnownRelatedTypes`

### 참조 검사 모델

엔트리 삭제 시 참조 검사가 제네릭 함수로 통합되었습니다.

- `checkEntryReferences(type, entry, filename?)`
- 현재 내장 규칙:
  - `vocabulary -> term` (용어명/컬럼명 파트 참조)
  - `domain -> vocabulary` (`domainCategory` 참조)
  - `domain -> term` (`domainName` 참조)

### 하위 호환성

- 파일 내 `mapping` 필드는 유지됩니다.
- `VocabularyData.mappedDomainFile`은 deprecated 상태이며 제거 예정입니다.

---

## 5개 정의서 관계 정합성/동기화 (2026-02-14)

### 관계 정합성 진단
- API: `GET /api/erd/relations`
- 대상: `database/entity/attribute/table/column`
- 결과:
  - 관계별 `matched/unmatched`
  - `error/warning` 집계
  - 이슈 샘플(`targetId`, `expectedKey`, `reason`)

### 관계 자동보정
- API: `GET/POST /api/erd/relations/sync`
- 보정 범위:
  - `Entity -> Table`: `relatedEntityName`
  - `Table -> Column`: `schemaName`, `tableEnglishName`, `relatedEntityName`
  - `Attribute -> Column`: 자동 수정 없이 추천 후보 제공

### 충돌 정책
- 관계 동기화와 컬럼 동기화(`POST /api/column/sync-term`)의 필드 소유권/실행 순서는
  `docs/specs/relation-sync-policy.md`를 따른다.

---

## 1. VocabularyEntry (단어집 엔트리)

### 개요

단어집의 개별 단어를 나타내는 엔트리입니다. 한국어 표준단어명, 영문약어, 영문명을 포함하며, 도메인과의 매핑 정보를 포함할 수 있습니다.

**파일 위치:** `src/lib/types/vocabulary.ts`

### 필드 상세

| 필드명                       | 타입        | 필수 | 기본값  | 설명                  | 용도                                           |
| ---------------------------- | ----------- | ---- | ------- | --------------------- | ---------------------------------------------- |
| `id`                         | `string`    | ✅   | -       | 고유 식별자           | Primary Key, UUID v4 형식                      |
| `standardName`               | `string`    | ✅   | -       | 표준단어명 (한국어)   | 단어의 표준 한국어 명칭                        |
| `abbreviation`               | `string`    | ✅   | -       | 영문약어              | 데이터베이스 칼럼명 등에 사용                  |
| `englishName`                | `string`    | ✅   | -       | 영문명                | 영문 전체 명칭                                 |
| `description`                | `string`    | ✅   | -       | 설명                  | 단어에 대한 상세 설명                          |
| `createdAt`                  | `string`    | ✅   | -       | 생성일시              | ISO 8601 형식 (예: `2024-01-01T00:00:00.000Z`) |
| `updatedAt`                  | `string`    | ✅   | -       | 수정일시              | ISO 8601 형식                                  |
| `isFormalWord`               | `boolean?`  | ❌   | -       | 형식단어여부          | Y/N → true/false 변환                          |
| `domainGroup`                | `string?`   | ❌   | -       | 매핑된 도메인 그룹명  | 도메인 동기화 시 자동 설정                     |
| `domainCategory`             | `string?`   | ❌   | -       | 도메인분류명          | 도메인 매핑의 기준                             |
| `isDomainCategoryMapped`     | `boolean?`  | ❌   | `false` | 도메인 매핑 성공 여부 | 매핑 상태 표시                                 |
| `synonyms`                   | `string[]?` | ❌   | `[]`    | 이음동의어 목록       | 동의어 배열                                    |
| `forbiddenWords`             | `string[]?` | ❌   | `[]`    | 금칙어 목록           | 금지된 단어 목록                               |
| `source`                     | `string?`   | ❌   | -       | 출처                  | 데이터 출처 정보                               |
| `duplicateInfo`              | `object?`   | ❌   | -       | 중복 정보             | 중복 검사 결과                                 |
| `duplicateInfo.standardName` | `boolean?`  | ❌   | -       | 표준단어명 중복 여부  | 중복 플래그                                    |
| `duplicateInfo.abbreviation` | `boolean?`  | ❌   | -       | 영문약어 중복 여부    | 중복 플래그                                    |
| `duplicateInfo.englishName`  | `boolean?`  | ❌   | -       | 영문명 중복 여부      | 중복 플래그                                    |

### Validation 규칙

#### 필수 필드 검증

```typescript
// file-handler.ts에서 수행
const isValid =
	entry.id && entry.standardName && entry.abbreviation && entry.englishName && entry.createdAt;
```

#### 필드별 검증 규칙

1. **`id`**
   - 형식: UUID v4
   - 생성: `uuidv4()` 함수 사용
   - 중복 불가

2. **`standardName`**
   - 필수 필드
   - 빈 문자열 불가
   - 앞뒤 공백 제거 (trim)
   - 금지어 검증 대상

3. **`abbreviation`**
   - 필수 필드
   - 빈 문자열 불가
   - 앞뒤 공백 제거 (trim)
   - 금지어 검증 대상
   - 중복 검사 대상

4. **`englishName`**
   - 필수 필드
   - 빈 문자열 불가
   - 앞뒤 공백 제거 (trim)
   - 중복 검사 대상

5. **`createdAt`, `updatedAt`**
   - ISO 8601 형식 필수
   - 예: `2024-01-01T00:00:00.000Z`
   - 자동 생성/업데이트

6. **`domainCategory`**
   - 도메인 동기화 시 검증
   - `DomainEntry.domainCategory`와 매칭

### 제약조건

- **Primary Key:** `id` (UUID, 고유)
- **Unique Constraints:** 없음 (중복 허용, `duplicateInfo`로 표시)
- **Foreign Key:** 없음 (논리적 참조만 존재)
- **Index:** 없음 (파일 기반 저장소)

### 예시 데이터

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"standardName": "사용자",
	"abbreviation": "USER",
	"englishName": "User",
	"description": "시스템을 사용하는 개인 또는 조직",
	"createdAt": "2024-01-15T10:30:00.000Z",
	"updatedAt": "2024-01-15T10:30:00.000Z",
	"isFormalWord": true,
	"domainGroup": "공통표준도메인그룹",
	"domainCategory": "사용자분류",
	"isDomainCategoryMapped": true,
	"synonyms": ["유저", "사용자계정"],
	"source": "표준용어집",
	"duplicateInfo": {
		"standardName": false,
		"abbreviation": false,
		"englishName": false
	}
}
```

### 관련 API 엔드포인트

#### CRUD 작업

- **GET** `/api/vocabulary?filename={filename}&page={page}&limit={limit}&sortBy={field}&sortOrder={asc|desc}`
  - 단어집 데이터 조회 (페이지네이션, 정렬 지원)
  - Query Parameters:
    - `filename`: 파일명 (기본값: `vocabulary.json`)
    - `page`: 페이지 번호 (기본값: 1)
    - `limit`: 페이지 크기 (기본값: 100, 최대: 1000)
    - `sortBy`: 정렬 필드 (`standardName`, `abbreviation`, `englishName`, `createdAt`)
    - `sortOrder`: 정렬 순서 (`asc`, `desc`)
    - `filter`: 중복 필터 (`duplicate`, `unique`)
    - `unmappedDomain`: 도메인 미매핑 필터 (`true`/`false`)

- **POST** `/api/vocabulary`
  - 새 단어 추가
  - Request Body:
    ```json
    {
    	"entry": {
    		/* VocabularyEntry */
    	},
    	"filename": "vocabulary.json"
    }
    ```

- **PUT** `/api/vocabulary`
  - 단어 수정
  - Request Body:
    ```json
    {
    	"entry": {
    		/* VocabularyEntry with id */
    	},
    	"filename": "vocabulary.json"
    }
    ```

- **DELETE** `/api/vocabulary`
  - 단어 삭제
  - Request Body:
    ```json
    {
    	"id": "entry-id",
    	"filename": "vocabulary.json"
    }
    ```

#### 파일 관리

- **GET** `/api/vocabulary/files`
  - 단어집 파일 목록 조회

- **GET** `/api/vocabulary/files/mapping?filename={filename}`
  - 매핑 정보 조회

- **PUT** `/api/vocabulary/files/mapping`
  - 매핑 정보 저장
  - Request Body:
    ```json
    {
    	"filename": "vocabulary.json",
    	"mapping": {
    		"domain": "domain.json"
    	}
    }
    ```

#### 동기화 및 유틸리티

- **POST** `/api/vocabulary/sync-domain`
  - 도메인 매핑 동기화
  - Request Body:
    ```json
    {
    	"vocabularyFilename": "vocabulary.json"
    }
    ```

- **GET** `/api/vocabulary/duplicates?filename={filename}`
  - 중복 단어 검사

- **GET** `/api/vocabulary/download?filename={filename}`
  - 단어집 데이터 다운로드 (XLSX)

---

## 2. VocabularyData (단어집 데이터 컨테이너)

### 개요

단어집 파일의 전체 구조를 나타내는 컨테이너입니다. 여러 `VocabularyEntry`를 포함하며, 메타데이터를 저장합니다.

**파일 위치:** `src/lib/types/vocabulary.ts`

### 필드 상세

| 필드명             | 타입                | 필수 | 기본값 | 설명                               | 용도                     |
| ------------------ | ------------------- | ---- | ------ | ---------------------------------- | ------------------------ |
| `entries`          | `VocabularyEntry[]` | ✅   | `[]`   | 단어집 엔트리 배열                 | 실제 데이터              |
| `lastUpdated`      | `string`            | ✅   | -      | 마지막 업데이트 시간 (ISO 8601)    | 메타데이터               |
| `totalCount`       | `number`            | ✅   | `0`    | 전체 엔트리 수                     | 성능 최적화용            |
| `mappedDomainFile` | `string?`           | ❌   | -      | 매핑된 도메인 파일명 (하위 호환성) | 레거시 지원              |
| `mapping`          | `object?`           | ❌   | -      | 매핑 정보                          | 도메인 매핑 정보         |
| `mapping.domain`   | `string?`           | ❌   | -      | 매핑된 도메인 파일명               | 현재 사용 중인 매핑 정보 |

### Validation 규칙

1. **`entries`**
   - 배열 타입 필수
   - `null` 또는 `undefined` 불가
   - 각 엔트리는 `VocabularyEntry` 검증 규칙 준수

2. **`totalCount`**
   - `entries.length`와 일치해야 함
   - 자동 계산됨

3. **`lastUpdated`**
   - ISO 8601 형식
   - 저장 시 자동 업데이트

### 예시 데이터

```json
{
	"entries": [
		{
			"id": "550e8400-e29b-41d4-a716-446655440000",
			"standardName": "사용자",
			"abbreviation": "USER",
			"englishName": "User",
			"description": "시스템을 사용하는 개인 또는 조직",
			"createdAt": "2024-01-15T10:30:00.000Z",
			"updatedAt": "2024-01-15T10:30:00.000Z"
		}
	],
	"lastUpdated": "2024-01-15T10:30:00.000Z",
	"totalCount": 1,
	"mapping": {
		"domain": "domain.json"
	},
	"mappedDomainFile": "domain.json"
}
```

---

## 3. DomainEntry (도메인 엔트리)

### 개요

공통표준도메인 정보를 나타내는 엔트리입니다. 도메인 그룹, 분류, 데이터 타입 등의 정보를 포함합니다.

**파일 위치:** `src/lib/types/domain.ts`

### 필드 상세

| 필드명               | 타입      | 필수 | 기본값 | 설명                         | 용도                       |
| -------------------- | --------- | ---- | ------ | ---------------------------- | -------------------------- |
| `id`                 | `string`  | ✅   | -      | 고유 식별자                  | Primary Key, UUID v4       |
| `domainGroup`        | `string`  | ✅   | -      | 공통표준도메인그룹명         | 도메인 그룹 분류           |
| `domainCategory`     | `string`  | ✅   | -      | 공통표준도메인분류명         | 단어집 매핑의 기준         |
| `standardDomainName` | `string`  | ✅   | -      | 공통표준도메인명             | 계산된 값 (도메인명)       |
| `physicalDataType`   | `string`  | ✅   | -      | 데이터타입 (물리 데이터타입) | VARCHAR, INT 등            |
| `dataLength`         | `string?` | ❌   | -      | 데이터길이 (text 타입)       | 문자 길이 제한             |
| `decimalPlaces`      | `string?` | ❌   | -      | 데이터소수점길이 (text 타입) | 소수점 자리수              |
| `measurementUnit`    | `string?` | ❌   | -      | 단위                         | 측정 단위 (예: "cm", "kg") |
| `revision`           | `string?` | ❌   | -      | 재정차수                     | 버전 정보                  |
| `description`        | `string?` | ❌   | -      | 공통표준도메인설명           | 도메인 설명                |
| `storageFormat`      | `string?` | ❌   | -      | 저장 형식                    | 저장 형식 규칙             |
| `displayFormat`      | `string?` | ❌   | -      | 표현 형식                    | 화면 표시 형식             |
| `allowedValues`      | `string?` | ❌   | -      | 허용값                       | 허용 가능한 값 목록        |
| `createdAt`          | `string`  | ✅   | -      | 생성일시                     | ISO 8601 형식              |
| `updatedAt`          | `string`  | ✅   | -      | 수정일시                     | ISO 8601 형식              |

### Validation 규칙

#### 필수 필드 검증

```typescript
const isValid =
	entry.id &&
	entry.domainGroup &&
	entry.domainCategory &&
	entry.standardDomainName &&
	entry.physicalDataType &&
	entry.createdAt;
```

#### 필드별 검증 규칙

1. **`id`**
   - UUID v4 형식
   - 중복 불가

2. **`domainGroup`**
   - 필수 필드
   - 빈 문자열 불가
   - 단어집 매핑 시 사용

3. **`domainCategory`**
   - 필수 필드
   - 빈 문자열 불가
   - 단어집의 `domainCategory`와 매칭

4. **`standardDomainName`**
   - 필수 필드
   - 계산된 값 (일반적으로 `domainGroup` + `domainCategory` 조합)
   - 용어 매핑의 기준

5. **`physicalDataType`**
   - 필수 필드
   - 예: `VARCHAR`, `INT`, `DATE`, `DECIMAL` 등

### 제약조건

- **Primary Key:** `id` (UUID, 고유)
- **Unique Constraints:** 없음
- **Foreign Key:** 없음

### 예시 데이터

```json
{
	"id": "660e8400-e29b-41d4-a716-446655440001",
	"domainGroup": "공통표준도메인그룹",
	"domainCategory": "사용자분류",
	"standardDomainName": "공통표준도메인그룹_사용자분류",
	"physicalDataType": "VARCHAR",
	"dataLength": "50",
	"decimalPlaces": null,
	"measurementUnit": null,
	"revision": "1.0",
	"description": "시스템 사용자 분류 도메인",
	"storageFormat": "YYYY-MM-DD",
	"displayFormat": "YYYY년 MM월 DD일",
	"allowedValues": "일반사용자,관리자,게스트",
	"createdAt": "2024-01-15T10:30:00.000Z",
	"updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 관련 API 엔드포인트

#### CRUD 작업

- **GET** `/api/domain?filename={filename}&page={page}&limit={limit}&sortBy={field}&sortOrder={asc|desc}&query={query}&field={field}`
  - 도메인 데이터 조회
  - Query Parameters:
    - `filename`: 파일명 (기본값: `domain.json`)
    - `page`: 페이지 번호 (기본값: 1)
    - `limit`: 페이지 크기 (기본값: 20, 최대: 100)
    - `sortBy`: 정렬 필드
    - `sortOrder`: 정렬 순서
    - `query`: 검색어
    - `field`: 검색 필드 (`all`, `domainGroup`, `domainCategory`, `standardDomainName`, `physicalDataType`)

- **POST** `/api/domain`
  - 새 도메인 추가

- **PUT** `/api/domain`
  - 도메인 수정

- **DELETE** `/api/domain`
  - 도메인 삭제

#### 파일 관리

- **GET** `/api/domain/files`
  - 도메인 파일 목록 조회

- **GET** `/api/domain/download?filename={filename}`
  - 도메인 데이터 다운로드 (XLSX)

- **POST** `/api/domain/upload`
  - 도메인 데이터 업로드 (XLSX)

---

## 4. DomainData (도메인 데이터 컨테이너)

### 개요

도메인 파일의 전체 구조를 나타내는 컨테이너입니다.

**파일 위치:** `src/lib/types/domain.ts`

### 필드 상세

| 필드명        | 타입            | 필수 | 기본값 | 설명                            | 용도          |
| ------------- | --------------- | ---- | ------ | ------------------------------- | ------------- |
| `entries`     | `DomainEntry[]` | ✅   | `[]`   | 도메인 엔트리 배열              | 실제 데이터   |
| `lastUpdated` | `string`        | ✅   | -      | 마지막 업데이트 시간 (ISO 8601) | 메타데이터    |
| `totalCount`  | `number`        | ✅   | `0`    | 전체 엔트리 수                  | 성능 최적화용 |

### 예시 데이터

```json
{
	"entries": [
		{
			"id": "660e8400-e29b-41d4-a716-446655440001",
			"domainGroup": "공통표준도메인그룹",
			"domainCategory": "사용자분류",
			"standardDomainName": "공통표준도메인그룹_사용자분류",
			"physicalDataType": "VARCHAR",
			"createdAt": "2024-01-15T10:30:00.000Z",
			"updatedAt": "2024-01-15T10:30:00.000Z"
		}
	],
	"lastUpdated": "2024-01-15T10:30:00.000Z",
	"totalCount": 1
}
```

---

## 5. TermEntry (용어 엔트리)

### 개요

용어를 나타내는 엔트리입니다. 단어집과 도메인을 참조하여 용어명, 칼럼명, 도메인명을 매핑합니다.

**파일 위치:** `src/lib/types/term.ts`

### 필드 상세

| 필드명           | 타입      | 필수 | 기본값  | 설명                  | 용도                             |
| ---------------- | --------- | ---- | ------- | --------------------- | -------------------------------- |
| `id`             | `string`  | ✅   | -       | 고유 식별자           | Primary Key, UUID v4             |
| `termName`       | `string`  | ✅   | -       | 용어명                | 단어집 `standardName` 기반       |
| `columnName`     | `string`  | ✅   | -       | 칼럼명                | 단어집 `abbreviation` 기반       |
| `domainName`     | `string`  | ✅   | -       | 도메인명              | 도메인 `standardDomainName` 기반 |
| `isMappedTerm`   | `boolean` | ✅   | `false` | 용어명 매핑 성공 여부 | 매핑 검증 결과                   |
| `isMappedColumn` | `boolean` | ✅   | `false` | 칼럼명 매핑 성공 여부 | 매핑 검증 결과                   |
| `isMappedDomain` | `boolean` | ✅   | `false` | 도메인 매핑 성공 여부 | 매핑 검증 결과                   |
| `createdAt`      | `string`  | ✅   | -       | 생성일시              | ISO 8601 형식                    |
| `updatedAt`      | `string`  | ✅   | -       | 수정일시              | ISO 8601 형식                    |

### Validation 규칙

#### 필수 필드 검증

```typescript
const isValid =
	entry.id && entry.termName && entry.columnName && entry.domainName && entry.createdAt;
```

#### 필드별 검증 규칙

1. **`id`**
   - UUID v4 형식
   - 중복 불가

2. **`termName`**
   - 필수 필드
   - 언더스코어(`_`)로 분리된 형태
   - 각 단어가 `VocabularyEntry.standardName`에 존재해야 매핑 성공
   - 예: `"사용자_이름"` → `["사용자", "이름"]` 각각 검증

3. **`columnName`**
   - 필수 필드
   - 언더스코어(`_`)로 분리된 형태
   - 각 단어가 `VocabularyEntry.abbreviation`에 존재해야 매핑 성공
   - 예: `"USER_NAME"` → `["USER", "NAME"]` 각각 검증

4. **`domainName`**
   - 필수 필드
   - `DomainEntry.standardDomainName`과 정확히 일치해야 매핑 성공
   - 대소문자 구분

5. **매핑 검증 로직**

```typescript
// termName 매핑 검증
const termParts = termName.split('_').map((p) => p.trim().toLowerCase());
const isMappedTerm = termParts.every((part) => {
	// VocabularyEntry.standardName과 일치하는지 확인
	return vocabularyMap.has(part);
});

// columnName 매핑 검증
const columnParts = columnName.split('_').map((p) => p.trim().toLowerCase());
const isMappedColumn = columnParts.every((part) => {
	// VocabularyEntry.abbreviation과 일치하는지 확인
	return vocabularyMap.has(part);
});

// domainName 매핑 검증
const isMappedDomain = domainMap.has(domainName.trim().toLowerCase());
```

### 제약조건

- **Primary Key:** `id` (UUID, 고유)
- **Foreign Key (논리적):**
  - `termName` → `VocabularyEntry.standardName` (참조)
  - `columnName` → `VocabularyEntry.abbreviation` (참조)
  - `domainName` → `DomainEntry.standardDomainName` (참조)

### 예시 데이터

```json
{
	"id": "770e8400-e29b-41d4-a716-446655440002",
	"termName": "사용자_이름",
	"columnName": "USER_NAME",
	"domainName": "공통표준도메인그룹_사용자분류",
	"isMappedTerm": true,
	"isMappedColumn": true,
	"isMappedDomain": true,
	"createdAt": "2024-01-15T10:30:00.000Z",
	"updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 관련 API 엔드포인트

#### CRUD 작업

- **GET** `/api/term?filename={filename}&page={page}&limit={limit}`
  - 용어 데이터 조회

- **POST** `/api/term`
  - 새 용어 추가
  - Request Body:
    ```json
    {
    	"entry": {
    		"termName": "사용자_이름",
    		"columnName": "USER_NAME",
    		"domainName": "공통표준도메인그룹_사용자분류"
    	},
    	"filename": "term.json"
    }
    ```
  - 자동으로 매핑 검증 수행

- **PUT** `/api/term`
  - 용어 수정

- **DELETE** `/api/term`
  - 용어 삭제

#### 파일 관리

- **GET** `/api/term/files`
  - 용어 파일 목록 조회

- **GET** `/api/term/files/mapping?filename={filename}`
  - 매핑 정보 조회

- **PUT** `/api/term/files/mapping`
  - 매핑 정보 저장
  - Request Body:
    ```json
    {
    	"filename": "term.json",
    	"mapping": {
    		"vocabulary": "vocabulary.json",
    		"domain": "domain.json"
    	}
    }
    ```

#### 동기화 및 유틸리티

- **POST** `/api/term/sync`
  - 용어 매핑 동기화 (재검증)
  - Request Body:
    ```json
    {
    	"filename": "term.json"
    }
    ```

- **GET** `/api/term/download?filename={filename}`
  - 용어 데이터 다운로드 (XLSX)

- **POST** `/api/term/upload`
  - 용어 데이터 업로드 (XLSX)
  - 자동으로 매핑 검증 수행

---

## 6. TermData (용어 데이터 컨테이너)

### 개요

용어 파일의 전체 구조를 나타내는 컨테이너입니다.

**파일 위치:** `src/lib/types/term.ts`

### 필드 상세

| 필드명               | 타입          | 필수 | 기본값 | 설명                            | 용도                    |
| -------------------- | ------------- | ---- | ------ | ------------------------------- | ----------------------- |
| `entries`            | `TermEntry[]` | ✅   | `[]`   | 용어 엔트리 배열                | 실제 데이터             |
| `lastUpdated`        | `string`      | ✅   | -      | 마지막 업데이트 시간 (ISO 8601) | 메타데이터              |
| `totalCount`         | `number`      | ✅   | `0`    | 전체 엔트리 수                  | 성능 최적화용           |
| `mapping`            | `object?`     | ❌   | -      | 매핑 정보                       | 참조하는 파일 정보      |
| `mapping.vocabulary` | `string?`     | ❌   | -      | 매핑된 단어집 파일명            | 용어명/칼럼명 매핑 기준 |
| `mapping.domain`     | `string?`     | ❌   | -      | 매핑된 도메인 파일명            | 도메인명 매핑 기준      |

### 예시 데이터

```json
{
	"entries": [
		{
			"id": "770e8400-e29b-41d4-a716-446655440002",
			"termName": "사용자_이름",
			"columnName": "USER_NAME",
			"domainName": "공통표준도메인그룹_사용자분류",
			"isMappedTerm": true,
			"isMappedColumn": true,
			"isMappedDomain": true,
			"createdAt": "2024-01-15T10:30:00.000Z",
			"updatedAt": "2024-01-15T10:30:00.000Z"
		}
	],
	"lastUpdated": "2024-01-15T10:30:00.000Z",
	"totalCount": 1,
	"mapping": {
		"vocabulary": "vocabulary.json",
		"domain": "domain.json"
	}
}
```

---

## 8. ForbiddenWordEntry (금지어 엔트리)

### 개요

단어집에 사용할 수 없는 금지어를 정의하는 엔트리입니다.

**파일 위치:** `src/lib/types/vocabulary.ts`

### 필드 상세

| 필드명       | 타입      | 필수 | 기본값 | 설명           | 용도                                  |
| ------------ | --------- | ---- | ------ | -------------- | ------------------------------------- |
| `id`         | `string`  | ✅   | -      | 고유 식별자    | Primary Key, UUID v4                  |
| `keyword`    | `string`  | ✅   | -      | 금지어 키워드  | 검증 대상 단어                        |
| `type`       | `string`  | ✅   | -      | 적용 타입      | 'standardName' \| 'abbreviation'      |
| `reason`     | `string?` | ❌   | -      | 금지 사유      | 관리용 설명                           |
| `targetFile` | `string?` | ❌   | -      | 적용 대상 파일 | 특정 파일에만 적용 (없으면 전체 적용) |
| `createdAt`  | `string`  | ✅   | -      | 생성일시       | ISO 8601 형식                         |

### Validation 규칙

1. **`keyword`**
   - 필수 필드
   - 빈 문자열 불가
   - `VocabularyEntry.standardName` 또는 `abbreviation`에 포함되면 검증 실패

2. **`type`**
   - 유효한 값: `'standardName'`, `'abbreviation'`
   - 유니온 타입으로 제한

3. **`targetFile`**
   - 파일명 형식
   - 없으면 모든 파일에 적용

### 예시 데이터

```json
{
	"id": "990e8400-e29b-41d4-a716-446655440004",
	"keyword": "테스트",
	"type": "standardName",
	"reason": "임시 데이터용 단어는 사용 불가",
	"targetFile": "vocabulary.json",
	"createdAt": "2024-01-15T10:30:00.000Z"
}
```

### 관련 API 엔드포인트

- **GET** `/api/forbidden-words?targetFile={filename}`
  - 금지어 목록 조회

- **POST** `/api/forbidden-words`
  - 금지어 추가

- **PUT** `/api/forbidden-words`
  - 금지어 수정

- **DELETE** `/api/forbidden-words`
  - 금지어 삭제

---

## 9. DatabaseEntry (데이터베이스 정의서 엔트리)

### 개요

데이터베이스 정의서의 개별 엔트리를 나타냅니다.

**파일 위치:** `src/lib/types/database-design.ts`

### 필드 상세

| 필드명             | 타입      | 필수 | 설명         |
| ------------------ | --------- | ---- | ------------ |
| `id`               | `string`  | ✅   | 고유 식별자  |
| `organizationName` | `string`  | ✅   | 기관명       |
| `departmentName`   | `string`  | ✅   | 부서명       |
| `appliedTask`      | `string`  | ✅   | 적용업무     |
| `relatedLaw`       | `string`  | ✅   | 관련법령     |
| `buildDate`        | `string`  | ✅   | 구축일자     |
| `osInfo`           | `string`  | ✅   | 운영체제정보 |
| `exclusionReason`  | `string`  | ✅   | 수집제외사유 |
| `logicalDbName`    | `string?` | ❌   | 논리DB명     |
| `physicalDbName`   | `string?` | ❌   | 물리DB명     |
| `dbDescription`    | `string?` | ❌   | DB설명       |
| `dbmsInfo`         | `string?` | ❌   | DBMS정보     |
| `createdAt`        | `string`  | ✅   | 생성일시     |
| `updatedAt`        | `string`  | ✅   | 수정일시     |

### 예시 데이터

```json
{
	"id": "db-uuid-1",
	"organizationName": "기관A",
	"departmentName": "개발부",
	"appliedTask": "고객관리",
	"relatedLaw": "개인정보보호법",
	"buildDate": "2024-01-01",
	"osInfo": "Linux",
	"exclusionReason": "-",
	"logicalDbName": "고객DB",
	"physicalDbName": "CUST_DB",
	"dbDescription": "고객 정보 관리",
	"dbmsInfo": "Oracle 19c",
	"createdAt": "2024-01-15T10:30:00.000Z",
	"updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 관련 API 엔드포인트

- **GET, POST, PUT, DELETE** `/api/database`

---

## 10. EntityEntry (엔터티 정의서 엔트리)

### 개요

엔터티 정의서의 개별 엔트리를 나타냅니다.

**파일 위치:** `src/lib/types/database-design.ts`

### 필드 상세

| 필드명                | 타입      | 필수 | 설명             |
| --------------------- | --------- | ---- | ---------------- |
| `id`                  | `string`  | ✅   | 고유 식별자      |
| `logicalDbName`       | `string?` | ❌   | 논리DB명         |
| `schemaName`          | `string?` | ❌   | 스키마명         |
| `entityName`          | `string?` | ❌   | 엔터티명         |
| `primaryIdentifier`   | `string?` | ❌   | 주식별자         |
| `tableKoreanName`     | `string?` | ❌   | 테이블한글명     |
| `superTypeEntityName` | `string?` | ❌   | 수퍼타입엔터티명 |
| `entityDescription`   | `string?` | ❌   | 엔터티설명       |
| `createdAt`           | `string`  | ✅   | 생성일시         |
| `updatedAt`           | `string`  | ✅   | 수정일시         |

### 예시 데이터

```json
{
	"id": "entity-uuid-1",
	"logicalDbName": "고객DB",
	"schemaName": "CUST",
	"entityName": "고객",
	"primaryIdentifier": "고객ID",
	"tableKoreanName": "고객정보",
	"entityDescription": "고객 기본 정보",
	"createdAt": "2024-01-15T10:30:00.000Z",
	"updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 관련 API 엔드포인트

- **GET, POST, PUT, DELETE** `/api/entity`

---

## 11. AttributeEntry (속성 정의서 엔트리)

### 개요

속성 정의서의 개별 엔트리를 나타냅니다.

**파일 위치:** `src/lib/types/database-design.ts`

### 필드 상세

| 필드명                 | 타입      | 필수 | 설명         |
| ---------------------- | --------- | ---- | ------------ |
| `id`                   | `string`  | ✅   | 고유 식별자  |
| `requiredInput`        | `string`  | ✅   | 필수입력여부 |
| `refEntityName`        | `string`  | ✅   | 참조엔터티명 |
| `schemaName`           | `string?` | ❌   | 스키마명     |
| `entityName`           | `string?` | ❌   | 엔터티명     |
| `attributeName`        | `string?` | ❌   | 속성명       |
| `attributeType`        | `string?` | ❌   | 속성유형     |
| `identifierFlag`       | `string?` | ❌   | 식별자여부   |
| `refAttributeName`     | `string?` | ❌   | 참조속성명   |
| `attributeDescription` | `string?` | ❌   | 속성설명     |
| `createdAt`            | `string`  | ✅   | 생성일시     |
| `updatedAt`            | `string`  | ✅   | 수정일시     |

### 예시 데이터

```json
{
	"id": "attr-uuid-1",
	"requiredInput": "Y",
	"refEntityName": "-",
	"schemaName": "CUST",
	"entityName": "고객",
	"attributeName": "고객ID",
	"attributeType": "VARCHAR",
	"identifierFlag": "Y",
	"refAttributeName": "-",
	"attributeDescription": "고객의 고유 식별자",
	"createdAt": "2024-01-15T10:30:00.000Z",
	"updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 관련 API 엔드포인트

- **GET, POST, PUT, DELETE** `/api/attribute`

---

## 12. TableEntry (테이블 정의서 엔트리)

### 개요

테이블 정의서의 개별 엔트리를 나타냅니다.

**파일 위치:** `src/lib/types/database-design.ts`

### 필드 상세

| 필드명                   | 타입      | 필수 | 설명            |
| ------------------------ | --------- | ---- | --------------- |
| `id`                     | `string`  | ✅   | 고유 식별자     |
| `businessClassification` | `string`  | ✅   | 업무분류체계    |
| `tableVolume`            | `string`  | ✅   | 테이블볼륨      |
| `nonPublicReason`        | `string`  | ✅   | 비공개사유      |
| `openDataList`           | `string`  | ✅   | 개방데이터목록  |
| `physicalDbName`         | `string?` | ❌   | 물리DB명        |
| `tableOwner`             | `string?` | ❌   | 테이블소유자    |
| `subjectArea`            | `string?` | ❌   | 주제영역        |
| `schemaName`             | `string?` | ❌   | 스키마명        |
| `tableEnglishName`       | `string?` | ❌   | 테이블영문명    |
| `tableKoreanName`        | `string?` | ❌   | 테이블한글명    |
| `tableType`              | `string?` | ❌   | 테이블유형      |
| `relatedEntityName`      | `string?` | ❌   | 관련엔터티명    |
| `tableDescription`       | `string?` | ❌   | 테이블설명      |
| `retentionPeriod`        | `string?` | ❌   | 보존기간        |
| `occurrenceCycle`        | `string?` | ❌   | 발생주기        |
| `publicFlag`             | `string?` | ❌   | 공개/비공개여부 |
| `createdAt`              | `string`  | ✅   | 생성일시        |
| `updatedAt`              | `string`  | ✅   | 수정일시        |

### 예시 데이터

```json
{
	"id": "table-uuid-1",
	"businessClassification": "고객관리",
	"tableVolume": "100000",
	"nonPublicReason": "-",
	"openDataList": "고객 기본 정보",
	"physicalDbName": "CUST_DB",
	"tableOwner": "DBA",
	"subjectArea": "고객",
	"schemaName": "CUST",
	"tableEnglishName": "TB_CUSTOMER",
	"tableKoreanName": "고객테이블",
	"tableType": "TABLE",
	"relatedEntityName": "고객",
	"tableDescription": "고객 정보를 저장하는 테이블",
	"retentionPeriod": "5년",
	"occurrenceCycle": "수시",
	"publicFlag": "Y",
	"createdAt": "2024-01-15T10:30:00.000Z",
	"updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 관련 API 엔드포인트

- **GET, POST, PUT, DELETE** `/api/table`

---

## 13. ColumnEntry (컬럼 정의서 엔트리)

### 개요

컬럼 정의서의 개별 엔트리를 나타냅니다.

**파일 위치:** `src/lib/types/database-design.ts`

### 필드 상세

| 필드명              | 타입      | 필수 | 설명            |
| ------------------- | --------- | ---- | --------------- |
| `id`                | `string`  | ✅   | 고유 식별자     |
| `dataLength`        | `string`  | ✅   | 자료길이        |
| `dataDecimalLength` | `string`  | ✅   | 자료소수점길이  |
| `dataFormat`        | `string`  | ✅   | 자료형식        |
| `pkInfo`            | `string`  | ✅   | PK정보          |
| `indexName`         | `string`  | ✅   | 인덱스명        |
| `indexOrder`        | `string`  | ✅   | 인덱스순번      |
| `akInfo`            | `string`  | ✅   | AK정보          |
| `constraint`        | `string`  | ✅   | 제약조건        |
| `scopeFlag`         | `string?` | ❌   | 사업범위여부    |
| `subjectArea`       | `string?` | ❌   | 주제영역        |
| `schemaName`        | `string?` | ❌   | 스키마명        |
| `tableEnglishName`  | `string?` | ❌   | 테이블영문명    |
| `columnEnglishName` | `string?` | ❌   | 컬럼영문명      |
| `columnKoreanName`  | `string?` | ❌   | 컬럼한글명      |
| `columnDescription` | `string?` | ❌   | 컬럼설명        |
| `relatedEntityName` | `string?` | ❌   | 연관엔터티명    |
| `domainName`        | `string?` | ❌   | 도메인명        |
| `dataType`          | `string?` | ❌   | 자료타입        |
| `notNullFlag`       | `string?` | ❌   | NOTNULL여부     |
| `fkInfo`            | `string?` | ❌   | FK정보          |
| `personalInfoFlag`  | `string?` | ❌   | 개인정보여부    |
| `encryptionFlag`    | `string?` | ❌   | 암호화여부      |
| `publicFlag`        | `string?` | ❌   | 공개/비공개여부 |
| `createdAt`         | `string`  | ✅   | 생성일시        |
| `updatedAt`         | `string`  | ✅   | 수정일시        |

### 예시 데이터

```json
{
	"id": "col-uuid-1",
	"dataLength": "50",
	"dataDecimalLength": "0",
	"dataFormat": "-",
	"pkInfo": "Y",
	"indexName": "IDX_CUSTOMER_01",
	"indexOrder": "1",
	"akInfo": "-",
	"constraint": "-",
	"scopeFlag": "Y",
	"subjectArea": "고객",
	"schemaName": "CUST",
	"tableEnglishName": "TB_CUSTOMER",
	"columnEnglishName": "CUST_ID",
	"columnKoreanName": "고객ID",
	"columnDescription": "고객의 고유 ID",
	"relatedEntityName": "고객",
	"domainName": "USER_ID_DOM",
	"dataType": "VARCHAR",
	"notNullFlag": "Y",
	"fkInfo": "-",
	"personalInfoFlag": "Y",
	"encryptionFlag": "Y",
	"publicFlag": "N",
	"createdAt": "2024-01-15T10:30:00.000Z",
	"updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 관련 API 엔드포인트

- **GET, POST, PUT, DELETE** `/api/column`
- **GET, POST** `/api/column/sync-term`

### 컬럼-용어-도메인 동기화 규칙

1. 매핑 키: `ColumnEntry.columnEnglishName` ↔ `TermEntry.columnName`
2. 용어 매핑 성공 시:
   - `ColumnEntry.columnKoreanName`을 `TermEntry.termName`으로 동기화
   - `ColumnEntry.domainName`을 `TermEntry.domainName`으로 동기화
3. 도메인 매핑 성공 시 (`TermEntry.domainName` ↔ `DomainEntry.standardDomainName`):
   - `ColumnEntry.dataType` ← `DomainEntry.physicalDataType`
   - `ColumnEntry.dataLength` ← `DomainEntry.dataLength`
   - `ColumnEntry.dataDecimalLength` ← `DomainEntry.decimalPlaces`

---

## 공통 패턴

### Entry → Data 패턴

모든 엔티티는 동일한 패턴을 따릅니다:

```typescript
interface Entry {
	id: string;
	// ... 엔티티별 필드
	createdAt: string;
	updatedAt: string;
}

interface Data {
	entries: Entry[];
	lastUpdated: string;
	totalCount: number;
	// ... 엔티티별 메타데이터
}
```

### API 응답 패턴

모든 API 응답은 공통 형식을 따릅니다:

```typescript
interface ApiResponse {
	success: boolean;
	data?: unknown;
	error?: string;
	message?: string;
}
```

---

## 데이터 검증 요약

### 필수 필드 검증

모든 엔트리는 다음 필드가 필수입니다:

- `id` (UUID)
- `createdAt` (ISO 8601)
- `updatedAt` (ISO 8601)

### 엔티티별 필수 필드

- **VocabularyEntry:** `standardName`, `abbreviation`, `englishName`, `description`
- **DomainEntry:** `domainGroup`, `domainCategory`, `standardDomainName`, `physicalDataType`
- **TermEntry:** `termName`, `columnName`, `domainName`

### 런타임 검증

- 필수 필드 존재 여부
- 배열 타입 검증
- 금지어 검증 (VocabularyEntry)
- 매핑 검증 (TermEntry)

### 미구현 검증

- 타입 검증 (문자열/숫자 형식)
- 형식 검증 (ISO 8601, UUID)
- 참조 무결성 검증 (외래 키)

---

## 참고사항

### 파일 기반 저장소의 제약사항

1. **외래 키 제약조건 없음**
   - 논리적 참조만 존재
   - 런타임에 매핑 검증 수행

2. **인덱스 없음**
   - 전체 파일 로드 후 메모리에서 검색
   - 대용량 데이터 시 성능 고려 필요

3. **트랜잭션 없음**
   - 원자성 보장 어려움
   - 파일 저장 실패 시 롤백 불가

### 권장 사항

1. **JSON Schema 도입**
   - 런타임 타입 검증 강화
   - 파일 로드 시 스키마 검증

2. **타입 가드 함수 추가**

   ```typescript
   function isVocabularyEntry(obj: unknown): obj is VocabularyEntry {
   	// 런타임 타입 검증
   }
   ```

3. **참조 무결성 검증 강화**
   - TermEntry 저장 시 VocabularyEntry, DomainEntry 존재 확인
   - 매핑 동기화 시 참조 무결성 검증

4. **하위 호환성 필드 제거 계획**
   - `VocabularyData.mappedDomainFile` 제거
   - 마이그레이션 스크립트 제공
