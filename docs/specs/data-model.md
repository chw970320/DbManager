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
- 설정 파일: `static/data/settings/`

---

## 매핑 해석 및 참조 무결성 (2026-02-13)

### 매핑 해석 우선순위

데이터 타입 간 관련 파일명은 아래 우선순위로 해석됩니다.

1. `static/data/settings/shared-file-mappings.json`의 8종 공통 매핑 번들
2. 레거시 각 데이터 파일의 `mapping` 필드
3. 타입별 기본 파일명(`DEFAULT_FILENAMES`)

`static/data/registry.json`은 8종 공통 번들의 정본이 아니라, 직접 관계 해석과 레거시 복원을 돕는 파생 레지스트리입니다.

관련 구현:

- `src/lib/registry/shared-file-mapping-registry.ts`
- `src/lib/registry/db-design-file-mapping.ts`
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

- 파일 내 `mapping` 필드는 더 이상 저장 정본이 아닙니다.
- `loadData(...)`는 공통 매핑 파일을 기준으로 `mapping` 필드를 런타임 주입하며, 저장 시에는 해당 필드를 제거합니다.
- `VocabularyData.mappedDomainFile`은 제거되었으며, 현재는 공통 매핑 파일 기준의 런타임 `mapping`만 사용합니다.

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

## 8종 공통 파일 매핑 (2026-03-12)

`vocabulary/domain/term/database/entity/attribute/table/column` 8개 데이터 파일은 개별 화면마다 다른 부분 매핑을 따로 저장하지 않고,
서로 같은 파일 조합을 공유하는 공통 매핑 번들을 사용합니다.

### 공통 규칙

- 8종 파일 매핑의 저장 정본은 `static/data/settings/shared-file-mappings.json`입니다.
- 각 `/files/mapping` API는 이 공통 매핑 파일을 기준으로 현재 파일을 포함한 8종 번들을 조회/저장합니다.
- 저장 시 직접 관계(`vocabulary -> domain`, `term -> vocabulary/domain`, `database -> entity/table`, `entity -> attribute`, `table -> entity/column`, `attribute -> column`, `column -> term/domain`)도 `registry.json`에 파생 정보로 함께 반영됩니다.
- 파일 이름 변경/삭제 시 공통 매핑 파일도 새 파일명 또는 타입별 기본 파일명으로 함께 동기화됩니다.
- 공유 번들이 아직 없는 레거시 파일은 기존 `mapping` 필드, 직접 관계 레지스트리, 기본 파일명을 조합해 복원됩니다.
- DB 5개 browse 화면의 연관 상태 상세/정렬 동기화는 같은 8종 파일 번들을 그대로 전달받습니다.

### 저장 타입

- 정본 저장 타입:
  - `SharedFileMappingBundle = Record<DataType, string>`
  - `SharedFileMappingRegistryData`
- 저장 위치:
  - `static/data/settings/shared-file-mappings.json`
- 런타임/API 응답 타입:
  - `SharedDataFileMapping = Partial<Record<DataType, string>>`
  - `VocabularyData.mapping`
  - `DomainData.mapping`
  - `TermData.mapping`
  - `DatabaseData.mapping`
  - `EntityData.mapping`
  - `AttributeData.mapping`
  - `TableData.mapping`
  - `ColumnData.mapping`
- 런타임 `mapping`에는 현재 파일 타입 키를 제외한 나머지 7개 키만 노출됩니다.

### 기본값

기본 파일명은 `DEFAULT_FILENAMES`를 사용하며, 신규/기본 공통 번들은 아래 조합으로 시작합니다.

```json
{
	"vocabulary": "vocabulary.json",
	"domain": "domain.json",
	"term": "term.json",
	"database": "database.json",
	"entity": "entity.json",
	"attribute": "attribute.json",
	"table": "table.json",
	"column": "column.json"
}
```

컨테이너 예시의 `mapping` 필드는 `loadData(...)` 또는 `/files/mapping` 응답 기준의 런타임 shape이며, 원본 데이터 JSON 저장 시에는 포함되지 않습니다.

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
  - 현재 파일을 제외한 나머지 7개 파일 매핑 정보 조회

- **PUT** `/api/vocabulary/files/mapping`
  - 매핑 정보 저장
  - Request Body:
    ```json
    {
    	"filename": "vocabulary.json",
    	"mapping": {
    		"domain": "domain.json",
    		"term": "term.json",
    		"database": "database.json",
    		"entity": "entity.json",
    		"attribute": "attribute.json",
    		"table": "table.json",
    		"column": "column.json"
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

| 필드명        | 타입                     | 필수 | 기본값 | 설명                            | 용도                                                                     |
| ------------- | ------------------------ | ---- | ------ | ------------------------------- | ------------------------------------------------------------------------ |
| `entries`     | `VocabularyEntry[]`      | ✅   | `[]`   | 단어집 엔트리 배열              | 실제 데이터                                                              |
| `lastUpdated` | `string`                 | ✅   | -      | 마지막 업데이트 시간 (ISO 8601) | 메타데이터                                                               |
| `totalCount`  | `number`                 | ✅   | `0`    | 전체 엔트리 수                  | 성능 최적화용                                                            |
| `mapping`     | `SharedDataFileMapping?` | ❌   | -      | 런타임 주입 공통 파일 매핑 정보 | 정본은 `shared-file-mappings.json`, 현재 파일을 제외한 나머지 7개 파일명 |

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
		"domain": "domain.json",
		"term": "term.json",
		"database": "database.json",
		"entity": "entity.json",
		"attribute": "attribute.json",
		"table": "table.json",
		"column": "column.json"
	}
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
   - 계산된 값
   - 생성 규칙: `domainCategory + dataTypeAbbreviation + dataLength + "," + decimalPlaces`
   - `dataTypeAbbreviation`은 `DomainDataTypeMappingEntry`에서 조회
   - 매핑이 없으면 하위 호환성을 위해 `physicalDataType` 첫 글자를 사용
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
	"standardDomainName": "사용자분류V50",
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
  - `standardDomainName`은 데이터타입 매핑 기준으로 서버에서 자동 생성

- **PUT** `/api/domain`
  - 도메인 수정
  - `domainCategory`, `physicalDataType`, `dataLength`, `decimalPlaces` 변경 시
    `standardDomainName` 자동 재생성

- **DELETE** `/api/domain`
  - 도메인 삭제

#### 파일 관리

- **GET** `/api/domain/files`
  - 도메인 파일 목록 조회

- **GET** `/api/domain/files/mapping?filename={filename}`
  - 현재 파일을 제외한 나머지 7개 파일 매핑 정보 조회

- **PUT** `/api/domain/files/mapping`
  - 매핑 정보 저장
  - Request Body:
    ```json
    {
    	"filename": "domain.json",
    	"mapping": {
    		"vocabulary": "vocabulary.json",
    		"term": "term.json",
    		"database": "database.json",
    		"entity": "entity.json",
    		"attribute": "attribute.json",
    		"table": "table.json",
    		"column": "column.json"
    	}
    }
    ```

- **GET** `/api/domain/download?filename={filename}`
  - 도메인 데이터 다운로드 (XLSX)

- **POST** `/api/domain/upload`
  - 도메인 데이터 업로드 (XLSX)

- **POST** `/api/domain/impact-preview`
  - 도메인 editor 저장/삭제 전 영향도 미리보기
  - 런타임 모델:
    - `summary.vocabularyReferenceCount`
    - `summary.termReferenceCount`
    - `summary.columnReferenceCount`
    - `summary.downstreamBreakCount`
    - `summary.affectedColumnSyncCount`

- **GET, POST, PUT, DELETE** `/api/domain/type-mappings`
  - 도메인 데이터타입 매핑 조회 및 관리
  - 매핑 변경 시 관련 도메인/용어/컬럼의 `domainName` 참조 자동 동기화

---

## 4. DomainData (도메인 데이터 컨테이너)

### 개요

도메인 파일의 전체 구조를 나타내는 컨테이너입니다.

**파일 위치:** `src/lib/types/domain.ts`

### 필드 상세

| 필드명        | 타입                     | 필수 | 기본값 | 설명                            | 용도                                                                     |
| ------------- | ------------------------ | ---- | ------ | ------------------------------- | ------------------------------------------------------------------------ |
| `entries`     | `DomainEntry[]`          | ✅   | `[]`   | 도메인 엔트리 배열              | 실제 데이터                                                              |
| `lastUpdated` | `string`                 | ✅   | -      | 마지막 업데이트 시간 (ISO 8601) | 메타데이터                                                               |
| `totalCount`  | `number`                 | ✅   | `0`    | 전체 엔트리 수                  | 성능 최적화용                                                            |
| `mapping`     | `SharedDataFileMapping?` | ❌   | -      | 런타임 주입 공통 파일 매핑 정보 | 정본은 `shared-file-mappings.json`, 현재 파일을 제외한 나머지 7개 파일명 |

### 예시 데이터

```json
{
	"entries": [
		{
			"id": "660e8400-e29b-41d4-a716-446655440001",
			"domainGroup": "공통표준도메인그룹",
			"domainCategory": "사용자분류",
			"standardDomainName": "사용자분류V50",
			"physicalDataType": "VARCHAR",
			"dataLength": "50",
			"createdAt": "2024-01-15T10:30:00.000Z",
			"updatedAt": "2024-01-15T10:30:00.000Z"
		}
	],
	"lastUpdated": "2024-01-15T10:30:00.000Z",
	"totalCount": 1,
	"mapping": {
		"vocabulary": "vocabulary.json",
		"term": "term.json",
		"database": "database.json",
		"entity": "entity.json",
		"attribute": "attribute.json",
		"table": "table.json",
		"column": "column.json"
	}
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
   - 데이터타입 매핑 변경으로 도메인명이 바뀌면 관련 용어의 `domainName`도 자동 동기화됨

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
	"domainName": "사용자분류V50",
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
    		"domainName": "사용자분류V50"
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
  - 현재 파일을 제외한 나머지 7개 파일 매핑 정보 조회

- **PUT** `/api/term/files/mapping`
  - 매핑 정보 저장
  - Request Body:
    ```json
    {
    	"filename": "term.json",
    	"mapping": {
    		"vocabulary": "vocabulary.json",
    		"domain": "domain.json",
    		"database": "database.json",
    		"entity": "entity.json",
    		"attribute": "attribute.json",
    		"table": "table.json",
    		"column": "column.json"
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

- **POST** `/api/term/impact-preview`
  - 용어 editor 저장 전 영향도 미리보기
  - 런타임 모델:
    - `summary.currentLinkedColumnCount`
    - `summary.nextLinkedColumnCount`
    - `summary.columnLinksToBeBroken`
    - `summary.newColumnLinksDetected`
    - `summary.affectedColumnStandardizationCount`
    - `summary.proposedDomainExists`

---

## 6. TermData (용어 데이터 컨테이너)

### 개요

용어 파일의 전체 구조를 나타내는 컨테이너입니다.

**파일 위치:** `src/lib/types/term.ts`

### 필드 상세

| 필드명        | 타입                     | 필수 | 기본값 | 설명                            | 용도                                                                     |
| ------------- | ------------------------ | ---- | ------ | ------------------------------- | ------------------------------------------------------------------------ |
| `entries`     | `TermEntry[]`            | ✅   | `[]`   | 용어 엔트리 배열                | 실제 데이터                                                              |
| `lastUpdated` | `string`                 | ✅   | -      | 마지막 업데이트 시간 (ISO 8601) | 메타데이터                                                               |
| `totalCount`  | `number`                 | ✅   | `0`    | 전체 엔트리 수                  | 성능 최적화용                                                            |
| `mapping`     | `SharedDataFileMapping?` | ❌   | -      | 런타임 주입 공통 파일 매핑 정보 | 정본은 `shared-file-mappings.json`, 현재 파일을 제외한 나머지 7개 파일명 |

### 예시 데이터

```json
{
	"entries": [
		{
			"id": "770e8400-e29b-41d4-a716-446655440002",
			"termName": "사용자_이름",
			"columnName": "USER_NAME",
			"domainName": "사용자분류V50",
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
		"domain": "domain.json",
		"database": "database.json",
		"entity": "entity.json",
		"attribute": "attribute.json",
		"table": "table.json",
		"column": "column.json"
	}
}
```

---

## 7. DomainDataTypeMappingEntry / DomainDataTypeMappingData (도메인 데이터타입 매핑)

### 개요

도메인 표준명 생성 시 `physicalDataType`을 어떤 약어로 치환할지 관리하는 설정 모델입니다.
기본 저장 파일은 `static/data/settings/domain-data-type-mappings.json`이며, 매핑이 바뀌면
도메인/용어/컬럼 참조가 함께 재동기화됩니다.

**파일 위치:** `src/lib/types/domain-data-type-mapping.ts`

### 필드 상세

#### DomainDataTypeMappingEntry

| 필드명         | 타입     | 필수 | 기본값 | 설명                 |
| -------------- | -------- | ---- | ------ | -------------------- |
| `id`           | `string` | ✅   | -      | 매핑 식별자          |
| `dataType`     | `string` | ✅   | -      | 물리 데이터타입 키   |
| `abbreviation` | `string` | ✅   | -      | 도메인명 생성용 약어 |
| `createdAt`    | `string` | ✅   | -      | 생성일시             |
| `updatedAt`    | `string` | ✅   | -      | 수정일시             |

#### DomainDataTypeMappingData

| 필드명        | 타입                           | 필수 | 기본값 | 설명            |
| ------------- | ------------------------------ | ---- | ------ | --------------- |
| `entries`     | `DomainDataTypeMappingEntry[]` | ✅   | `[]`   | 매핑 목록       |
| `lastUpdated` | `string`                       | ✅   | -      | 마지막 수정시각 |
| `totalCount`  | `number`                       | ✅   | `0`    | 매핑 수         |

#### DomainDataTypeMappingSyncResult

| 필드명               | 타입     | 설명                          |
| -------------------- | -------- | ----------------------------- |
| `domainFilesUpdated` | `number` | 재저장된 도메인 파일 수       |
| `domainsUpdated`     | `number` | 이름이 재생성된 도메인 수     |
| `termFilesUpdated`   | `number` | 재저장된 용어 파일 수         |
| `termsUpdated`       | `number` | `domainName`이 갱신된 용어 수 |
| `columnFilesUpdated` | `number` | 재저장된 컬럼 파일 수         |
| `columnsUpdated`     | `number` | `domainName`이 갱신된 컬럼 수 |

### Validation 규칙

1. `dataType`
   - trim 후 빈 문자열 불가
   - 대소문자/연속 공백을 정규화하여 중복 검사
2. `abbreviation`
   - trim 후 빈 문자열 불가
   - 공백 제거 및 대문자 정규화 후 중복 검사
3. 매핑 변경 후 연쇄 동기화
   - 모든 `DomainEntry.standardDomainName` 재생성
   - 관련 `TermEntry.domainName`, `ColumnEntry.domainName` 자동 갱신

### 예시 데이터

```json
{
	"entries": [
		{
			"id": "datatype-varchar",
			"dataType": "VARCHAR",
			"abbreviation": "V",
			"createdAt": "2026-03-11T00:00:00.000Z",
			"updatedAt": "2026-03-11T00:00:00.000Z"
		},
		{
			"id": "datatype-timestamp",
			"dataType": "TIMESTAMP",
			"abbreviation": "TS",
			"createdAt": "2026-03-11T00:00:00.000Z",
			"updatedAt": "2026-03-11T00:00:00.000Z"
		}
	],
	"lastUpdated": "2026-03-11T00:00:00.000Z",
	"totalCount": 2
}
```

### 관련 API 엔드포인트

- **GET, POST, PUT, DELETE** `/api/domain/type-mappings`

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
- **POST** `/api/column/recommend-standard`

### 컬럼-용어-도메인 동기화 규칙

1. 매핑 키: `ColumnEntry.columnEnglishName` ↔ `TermEntry.columnName`
2. 용어 매핑 성공 시:
   - `ColumnEntry.columnKoreanName`을 `TermEntry.termName`으로 동기화
   - `ColumnEntry.domainName`을 `TermEntry.domainName`으로 동기화
3. 도메인 매핑 성공 시 (`TermEntry.domainName` ↔ `DomainEntry.standardDomainName`):
   - `ColumnEntry.dataType` ← `DomainEntry.physicalDataType`
   - `ColumnEntry.dataLength` ← `DomainEntry.dataLength`
   - `ColumnEntry.dataDecimalLength` ← `DomainEntry.decimalPlaces`

### 컬럼 편집기 표준 추천 런타임 모델

컬럼 팝업의 `표준 추천` 카드와 `POST /api/column/recommend-standard` 응답에서 사용하는 런타임 모델입니다.

**파일 위치:** `src/lib/types/column-standard-recommendation.ts`

#### ColumnStandardRecommendationPreview

| 필드명                        | 타입                                           | 설명                                  |
| ----------------------------- | ---------------------------------------------- | ------------------------------------- |
| `files.column`                | `string`                                       | 기준 컬럼 파일명                      |
| `files.term`                  | `string`                                       | 연결된 용어 파일명                    |
| `files.domain`                | `string`                                       | 연결된 도메인 파일명                  |
| `entry`                       | `Partial<ColumnEntry>`                         | 현재 편집 중인 핵심 입력값            |
| `matchedTerm`                 | `TermEntry` 축약 모델 또는 `null`             | `columnEnglishName`으로 찾은 표준 용어 |
| `matchedDomain`               | `DomainEntry` 축약 모델 또는 `null`           | 용어의 `domainName`으로 찾은 도메인   |
| `recommendedValues`           | `Partial<ColumnEntry>`                         | 추천 가능한 표준 값                   |
| `changes`                     | `ColumnStandardRecommendationChange[]`         | 필드별 변경 후보                      |
| `issues`                      | `ColumnStandardRecommendationIssue[]`          | 즉시 경고/오류                        |
| `guidance`                    | `string[]`                                     | UI 안내 메시지                        |
| `summary.status`              | `'aligned' \| 'recommended' \| 'unmatched'`    | 현재 정렬 상태                        |
| `summary.changeCount`         | `number`                                       | 추천 변경 필드 수                     |
| `summary.issueCount`          | `number`                                       | 경고/오류 수                          |
| `summary.exactTermMatch`      | `boolean`                                      | 일치하는 용어 존재 여부               |
| `summary.domainResolved`      | `boolean`                                      | 연결 도메인 해석 성공 여부            |

#### ColumnStandardRecommendationChange

| 필드명             | 타입                                                                 | 설명          |
| ------------------ | -------------------------------------------------------------------- | ------------- |
| `field`            | `'columnKoreanName' \| 'domainName' \| 'dataType' \| 'dataLength' \| 'dataDecimalLength'` | 추천 대상 필드 |
| `currentValue`     | `string`                                                             | 현재 입력값   |
| `recommendedValue` | `string`                                                             | 추천값        |
| `reason`           | `string`                                                             | 추천 근거     |

#### ColumnStandardRecommendationIssue

| 필드명     | 타입                                                         | 설명             |
| ---------- | ------------------------------------------------------------ | ---------------- |
| `code`     | `'COLUMN_NAME_EMPTY' \| 'TERM_NOT_FOUND' \| 'TERM_DOMAIN_EMPTY' \| 'DOMAIN_NOT_FOUND'` | 진단 코드        |
| `severity` | `'error' \| 'warning'`                                       | 심각도           |
| `message`  | `string`                                                     | 사용자 안내 문구 |

---

## 14. DataSourceEntry / DataSourceData (데이터 소스)

### 개요

내부 관리자용 데이터 소스 연결 정의를 저장하는 설정 모델입니다. 현재는 PostgreSQL 연결만 지원하며,
향후 다른 DBMS를 추가할 수 있도록 `type` 기반으로 분기합니다.

**파일 위치:** `src/lib/types/data-source.ts`

**프로파일링 런타임 타입 위치:** `src/lib/types/data-profiling.ts`

**저장 파일:** `static/data/settings/data-sources.json`

### DataSourceEntry

| 필드명        | 타입                         | 필수 | 설명                 |
| ------------- | ---------------------------- | ---- | -------------------- |
| `id`          | `string`                     | ✅   | 고유 식별자          |
| `name`        | `string`                     | ✅   | 연결 이름            |
| `type`        | `'postgresql'`               | ✅   | 데이터 소스 유형     |
| `description` | `string?`                    | ❌   | 연결 설명            |
| `config`      | `PostgreSqlConnectionConfig` | ✅   | 실제 접속 설정       |
| `createdAt`   | `string`                     | ✅   | 생성 시각 (ISO 8601) |
| `updatedAt`   | `string`                     | ✅   | 수정 시각 (ISO 8601) |

### PostgreSqlConnectionConfig

| 필드명                     | 타입      | 필수 | 설명              |
| -------------------------- | --------- | ---- | ----------------- |
| `host`                     | `string`  | ✅   | PostgreSQL 호스트 |
| `port`                     | `number`  | ✅   | 포트 번호         |
| `database`                 | `string`  | ✅   | 데이터베이스명    |
| `schema`                   | `string?` | ❌   | 기본 스키마       |
| `username`                 | `string`  | ✅   | 사용자명          |
| `password`                 | `string`  | ✅   | 저장 비밀번호     |
| `ssl`                      | `boolean` | ✅   | SSL 사용 여부     |
| `connectionTimeoutSeconds` | `number`  | ✅   | 연결 타임아웃(초) |

### DataSourceSummaryEntry

목록 API 응답에서는 보안을 위해 `password`를 직접 노출하지 않고 아래 요약 타입을 사용합니다.

| 필드명               | 타입      | 설명                                 |
| -------------------- | --------- | ------------------------------------ |
| `config.hasPassword` | `boolean` | 비밀번호 저장 여부                   |
| 기타 `config` 필드   | 동일      | `password`를 제외한 나머지 연결 정보 |

### DataSourceData

| 필드명        | 타입                | 필수 | 설명             |
| ------------- | ------------------- | ---- | ---------------- |
| `entries`     | `DataSourceEntry[]` | ✅   | 저장된 연결 목록 |
| `lastUpdated` | `string`            | ✅   | 마지막 수정 시각 |
| `totalCount`  | `number`            | ✅   | 저장된 연결 수   |

### DataSourceConnectionTestResult

| 필드명                  | 타입      | 설명                 |
| ----------------------- | --------- | -------------------- |
| `success`               | `boolean` | 연결 성공 여부       |
| `message`               | `string`  | 성공/실패 메시지     |
| `details.host`          | `string?` | 테스트 대상 호스트   |
| `details.port`          | `number?` | 테스트 대상 포트     |
| `details.database`      | `string?` | 대상 DB명            |
| `details.schema`        | `string?` | 대상 스키마          |
| `details.serverVersion` | `string?` | PostgreSQL 서버 버전 |
| `latencyMs`             | `number?` | 연결 지연 시간       |
| `testedAt`              | `string`  | 테스트 수행 시각     |

### DataSourceProfileTarget

프로파일링 대상 목록의 개별 테이블 요약입니다.

| 필드명              | 타입      | 설명                                  |
| ------------------- | --------- | ------------------------------------- |
| `schema`            | `string`  | PostgreSQL 스키마명                   |
| `table`             | `string`  | 테이블명                              |
| `tableType`         | `string`  | 현재는 `BASE TABLE`                   |
| `estimatedRowCount` | `number?` | `pg_stat_user_tables` 기반 예상 행 수 |
| `columnCount`       | `number`  | 컬럼 수                               |

### DataSourceProfileTargetsResult

프로파일링 대상 조회 API의 응답 모델입니다.

| 필드명           | 타입                        | 설명                           |
| ---------------- | --------------------------- | ------------------------------ |
| `dataSourceId`   | `string`                    | 데이터 소스 ID                 |
| `dataSourceName` | `string`                    | 데이터 소스 이름               |
| `dataSourceType` | `'postgresql'`              | 현재 데이터 소스 유형          |
| `defaultSchema`  | `string`                    | 화면 기본 스키마               |
| `schemas`        | `string[]`                  | 조회 가능한 사용자 스키마 목록 |
| `tables`         | `DataSourceProfileTarget[]` | 프로파일링 대상 테이블 목록    |

### DataSourceColumnProfile

프로파일링 결과의 컬럼별 지표 모델입니다.

| 필드명            | 타입      | 설명                        |
| ----------------- | --------- | --------------------------- |
| `columnName`      | `string`  | 컬럼명                      |
| `ordinalPosition` | `number`  | 컬럼 순서                   |
| `dataType`        | `string`  | PostgreSQL 포맷 타입 문자열 |
| `isNullable`      | `boolean` | NULL 허용 여부              |
| `nullCount`       | `number`  | NULL 건수                   |
| `nullRatio`       | `number`  | 전체 행 대비 NULL 비율      |
| `distinctCount`   | `number`  | 고유값 건수                 |
| `distinctRatio`   | `number`  | 전체 행 대비 고유값 비율    |
| `minLength`       | `number?` | 값의 텍스트 길이 최소값     |
| `maxLength`       | `number?` | 값의 텍스트 길이 최대값     |

### DataSourceTableProfileResult

단일 테이블 프로파일링 실행 결과입니다. 결과는 파일로 저장하지 않고 API 응답으로만 반환합니다.

| 필드명                  | 타입                           | 설명                            |
| ----------------------- | ------------------------------ | ------------------------------- |
| `dataSourceId`          | `string`                       | 데이터 소스 ID                  |
| `dataSourceName`        | `string`                       | 데이터 소스 이름                |
| `dataSourceType`        | `'postgresql'`                 | 현재 데이터 소스 유형           |
| `schema`                | `string`                       | 대상 스키마                     |
| `table`                 | `string`                       | 대상 테이블                     |
| `rowCount`              | `number`                       | 정확한 `COUNT(*)` 기준 행 수    |
| `profiledAt`            | `string`                       | 프로파일링 수행 시각            |
| `columns`               | `DataSourceColumnProfile[]`    | 컬럼별 프로파일링 결과          |
| `qualityRuleEvaluation` | `QualityRuleEvaluationResult?` | 저장된 활성 품질 규칙 평가 결과 |

### Validation 규칙

1. `type`
   - 현재는 `'postgresql'`만 허용
2. `name`
   - trim 후 빈 문자열 불가
   - 대소문자 무시 기준으로 중복 불가
3. `config.host`, `config.database`, `config.username`
   - trim 후 빈 문자열 불가
4. `config.port`, `config.connectionTimeoutSeconds`
   - 1 이상의 정수
5. `config.password`
   - 신규 등록 시 필수
   - 수정 시 빈 문자열이면 기존 저장 비밀번호 유지

### 예시 데이터

```json
{
	"entries": [
		{
			"id": "source-1",
			"name": "운영 PostgreSQL",
			"type": "postgresql",
			"description": "운영 메타데이터 저장소",
			"config": {
				"host": "db.internal",
				"port": 5432,
				"database": "metadata",
				"schema": "public",
				"username": "dbadmin",
				"password": "secret",
				"ssl": false,
				"connectionTimeoutSeconds": 5
			},
			"createdAt": "2026-03-12T00:00:00.000Z",
			"updatedAt": "2026-03-12T00:00:00.000Z"
		}
	],
	"lastUpdated": "2026-03-12T00:00:00.000Z",
	"totalCount": 1
}
```

### 관련 API 엔드포인트

- **GET, POST, PUT, DELETE** `/api/data-sources`
- **POST** `/api/data-sources/test`
- **GET** `/api/data-sources/profile/targets`
- **POST** `/api/data-sources/profile/run`

---

## 15. QualityRuleEntry / QualityRuleData (품질 규칙)

### 개요

프로파일링 결과에 즉시 적용할 최소 품질 기준을 저장하는 설정 모델입니다. 현재는 PostgreSQL 프로파일링에서 계산하는
지표만 규칙으로 지원합니다.

**파일 위치:** `src/lib/types/data-quality-rule.ts`

**저장 파일:** `static/data/settings/quality-rules.json`

### QualityRuleEntry

| 필드명        | 타입                             | 필수 | 설명        |
| ------------- | -------------------------------- | ---- | ----------- |
| `id`          | `string`                         | ✅   | 고유 식별자 |
| `name`        | `string`                         | ✅   | 규칙 이름   |
| `description` | `string?`                        | ❌   | 규칙 설명   |
| `enabled`     | `boolean`                        | ✅   | 활성 여부   |
| `severity`    | `'error' \| 'warning' \| 'info'` | ✅   | 심각도      |
| `scope`       | `'table' \| 'column'`            | ✅   | 적용 범위   |
| `metric`      | `QualityRuleMetric`              | ✅   | 평가 메트릭 |
| `operator`    | `'gte' \| 'lte' \| 'eq'`         | ✅   | 비교 연산자 |
| `threshold`   | `number`                         | ✅   | 기준값      |
| `target`      | `QualityRuleTarget`              | ✅   | 타깃 패턴   |
| `createdAt`   | `string`                         | ✅   | 생성 시각   |
| `updatedAt`   | `string`                         | ✅   | 수정 시각   |

### QualityRuleTarget

| 필드명          | 타입      | 필수 | 설명                                |
| --------------- | --------- | ---- | ----------------------------------- |
| `schemaPattern` | `string?` | ❌   | 스키마 패턴, `*` 와일드카드 지원    |
| `tablePattern`  | `string?` | ❌   | 테이블 패턴, `*` 와일드카드 지원    |
| `columnPattern` | `string?` | ❌   | 컬럼 패턴, `column` 범위에서만 사용 |

### QualityRuleMetric

- `table` 범위:
  - `rowCount`
- `column` 범위:
  - `nullCount`
  - `nullRatio`
  - `distinctCount`
  - `distinctRatio`
  - `minLength`
  - `maxLength`

### QualityRuleData

| 필드명        | 타입                 | 필수 | 설명             |
| ------------- | -------------------- | ---- | ---------------- |
| `entries`     | `QualityRuleEntry[]` | ✅   | 저장된 규칙 목록 |
| `lastUpdated` | `string`             | ✅   | 마지막 수정 시각 |
| `totalCount`  | `number`             | ✅   | 저장된 규칙 수   |

### QualityRuleEvaluationResult

`POST /api/data-sources/profile/run` 응답에 포함되는 런타임 평가 결과입니다.

| 필드명                 | 타입                     | 설명                           |
| ---------------------- | ------------------------ | ------------------------------ |
| `evaluatedAt`          | `string`                 | 평가 시각                      |
| `summary.totalRules`   | `number`                 | 활성 규칙 수                   |
| `summary.matchedRules` | `number`                 | 대상과 매칭된 규칙 수          |
| `summary.passedRules`  | `number`                 | 위반 없이 통과한 규칙 수       |
| `summary.failedRules`  | `number`                 | 1건 이상 위반이 발생한 규칙 수 |
| `summary.infoCount`    | `number`                 | `info` 위반 건수               |
| `summary.warningCount` | `number`                 | `warning` 위반 건수            |
| `summary.errorCount`   | `number`                 | `error` 위반 건수              |
| `violations`           | `QualityRuleViolation[]` | 위반 상세 목록                 |

### Validation 규칙

1. `name`
   - trim 후 빈 문자열 불가
   - 대소문자 무시 기준으로 중복 불가
2. `severity`
   - `'error'`, `'warning'`, `'info'` 중 하나만 허용
3. `scope`
   - `'table'`, `'column'` 중 하나만 허용
4. `metric`
   - `scope`에 허용된 메트릭만 사용 가능
   - `table` 범위는 현재 `rowCount`만 허용
5. `operator`
   - `'gte'`, `'lte'`, `'eq'` 중 하나만 허용
6. `threshold`
   - 숫자 필수
7. `target`
   - 비워둘 수 있으며, 비우면 해당 축 전체에 적용
   - `columnPattern`은 `column` 범위에서만 사용

### 예시 데이터

```json
{
	"entries": [
		{
			"id": "rule-1",
			"name": "고객 이메일 NULL 비율 1% 이하",
			"description": "email 컬럼 NULL 비율 상한",
			"enabled": true,
			"severity": "warning",
			"scope": "column",
			"metric": "nullRatio",
			"operator": "lte",
			"threshold": 0.01,
			"target": {
				"schemaPattern": "public",
				"tablePattern": "customers",
				"columnPattern": "email"
			},
			"createdAt": "2026-03-12T00:00:00.000Z",
			"updatedAt": "2026-03-12T00:00:00.000Z"
		}
	],
	"lastUpdated": "2026-03-12T00:00:00.000Z",
	"totalCount": 1
}
```

### 관련 API 엔드포인트

- **GET, POST, PUT, DELETE** `/api/quality-rules`
- **POST** `/api/data-sources/profile/run`

---

## 16. DesignSnapshotEntry / DesignSnapshotData (설계 번들 스냅샷)

### 개요

표준/설계 변경 전에 현재 8종 파일 번들의 상태를 통째로 저장하는 복구용 설정 모델입니다.
복원 시 스냅샷 안에 저장된 데이터와 공통 파일 매핑 번들을 함께 다시 적용합니다.

**파일 위치:** `src/lib/types/design-snapshot.ts`

**저장 파일:** `static/data/settings/design-snapshots.json`

### DesignSnapshotPayload

스냅샷 안에 저장되는 타입별 개별 파일 payload입니다.

| 필드명       | 타입      | 필수 | 설명                    |
| ------------ | --------- | ---- | ----------------------- |
| `filename`   | `string`  | ✅   | 당시 저장 대상 파일명   |
| `entryCount` | `number`  | ✅   | 해당 파일의 엔트리 수   |
| `data`       | `unknown` | ✅   | 정규화된 실제 JSON 내용 |

### DesignSnapshotPayloadMap

`vocabulary/domain/term/database/entity/attribute/table/column` 8종 payload를 모두 포함하는 맵입니다.

### DesignSnapshotEntry

| 필드명        | 타입                     | 필수 | 설명                        |
| ------------- | ------------------------ | ---- | --------------------------- |
| `id`          | `string`                 | ✅   | 고유 식별자                 |
| `name`        | `string`                 | ✅   | 스냅샷 이름                 |
| `description` | `string?`                | ❌   | 사용자 메모                 |
| `bundle`      | `SharedFileMappingBundle`| ✅   | 저장 당시 8종 파일 조합     |
| `payloads`    | `DesignSnapshotPayloadMap` | ✅ | 타입별 실제 스냅샷 데이터   |
| `createdAt`   | `string`                 | ✅   | 생성 시각 (ISO 8601)        |
| `updatedAt`   | `string`                 | ✅   | 마지막 변경 시각            |
| `restoredAt`  | `string?`                | ❌   | 최근 복원 시각 (ISO 8601)   |

### DesignSnapshotSummaryEntry

목록 API와 화면에서는 payload 전체를 내려주지 않고 요약 타입을 사용합니다.

| 필드명       | 타입                      | 설명                         |
| ------------ | ------------------------- | ---------------------------- |
| `counts`     | `Record<DataType, number>`| 타입별 엔트리 수 요약        |
| `bundle`     | `SharedFileMappingBundle` | 당시 저장한 8종 파일 조합    |
| 나머지 필드  | `DesignSnapshotEntry`와 동일 | `payloads`를 제외한 메타데이터 |

### DesignSnapshotData

| 필드명        | 타입                    | 필수 | 설명              |
| ------------- | ----------------------- | ---- | ----------------- |
| `entries`     | `DesignSnapshotEntry[]` | ✅   | 저장된 스냅샷 목록 |
| `lastUpdated` | `string`                | ✅   | 마지막 수정 시각  |
| `totalCount`  | `number`                | ✅   | 저장된 스냅샷 수  |

### 저장/복원 규칙

1. `bundle`
   - 8개 타입 모두 파일명이 있어야 함
   - 하나라도 비어 있으면 스냅샷 생성 불가
2. `payloads`
   - 각 payload의 `data.entries`는 배열이어야 함
   - 런타임 `mapping` 필드는 제거한 정규화 데이터만 저장
3. `name`
   - trim 후 빈 문자열이면 기본값으로 `"{column 파일명} 스냅샷"` 사용
4. 복원 시
   - 각 payload를 해당 파일에 다시 저장
   - `saveDbDesignFileMappingBundle(...)`로 공통 파일 매핑 번들을 다시 적용
   - 캐시 무효화 후 `restoredAt` 갱신

### 예시 데이터

```json
{
	"entries": [
		{
			"id": "snapshot-1",
			"name": "표준 보정 전",
			"description": "자동 보정 전에 저장",
			"bundle": {
				"vocabulary": "vocabulary.json",
				"domain": "domain.json",
				"term": "term.json",
				"database": "database.json",
				"entity": "entity.json",
				"attribute": "attribute.json",
				"table": "table.json",
				"column": "column.json"
			},
			"payloads": {
				"vocabulary": {
					"filename": "vocabulary.json",
					"entryCount": 120,
					"data": {
						"entries": [],
						"lastUpdated": "2026-03-13T09:00:00.000Z",
						"totalCount": 0
					}
				},
				"domain": {
					"filename": "domain.json",
					"entryCount": 48,
					"data": {
						"entries": [],
						"lastUpdated": "2026-03-13T09:00:00.000Z",
						"totalCount": 0
					}
				},
				"term": {
					"filename": "term.json",
					"entryCount": 230,
					"data": {
						"entries": [],
						"lastUpdated": "2026-03-13T09:00:00.000Z",
						"totalCount": 0
					}
				},
				"database": {
					"filename": "database.json",
					"entryCount": 1,
					"data": {
						"entries": [],
						"lastUpdated": "2026-03-13T09:00:00.000Z",
						"totalCount": 0
					}
				},
				"entity": {
					"filename": "entity.json",
					"entryCount": 10,
					"data": {
						"entries": [],
						"lastUpdated": "2026-03-13T09:00:00.000Z",
						"totalCount": 0
					}
				},
				"attribute": {
					"filename": "attribute.json",
					"entryCount": 42,
					"data": {
						"entries": [],
						"lastUpdated": "2026-03-13T09:00:00.000Z",
						"totalCount": 0
					}
				},
				"table": {
					"filename": "table.json",
					"entryCount": 10,
					"data": {
						"entries": [],
						"lastUpdated": "2026-03-13T09:00:00.000Z",
						"totalCount": 0
					}
				},
				"column": {
					"filename": "column.json",
					"entryCount": 91,
					"data": {
						"entries": [],
						"lastUpdated": "2026-03-13T09:00:00.000Z",
						"totalCount": 0
					}
				}
			},
			"createdAt": "2026-03-13T09:00:00.000Z",
			"updatedAt": "2026-03-13T09:00:00.000Z",
			"restoredAt": "2026-03-13T09:30:00.000Z"
		}
	],
	"lastUpdated": "2026-03-13T09:30:00.000Z",
	"totalCount": 1
}
```

### 관련 API 엔드포인트

- **GET, POST, DELETE** `/api/design-snapshots`
- **POST** `/api/design-snapshots/restore`

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

4. **필드 정리 완료**
   - `VocabularyData.mappedDomainFile` 제거
   - 파일 간 연결 정보는 공통 `mapping` 필드로 통합
