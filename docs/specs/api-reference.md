# API 레퍼런스

이 문서는 DbManager 프로젝트의 모든 API 엔드포인트에 대한 상세한 레퍼런스입니다. 개발자와 프론트엔드 개발자가 API를 사용할 때 참고할 수 있습니다.

## 목차

- [기본 정보](#기본-정보)
- [Vocabulary API](#vocabulary-api)
- [Domain API](#domain-api)
- [Term API](#term-api)
- [Database API](#database-api)
- [Entity API](#entity-api)
- [Attribute API](#attribute-api)
- [Table API](#table-api)
- [Column API](#column-api)
- [Data Source API](#data-source-api)
- [Quality Rule API](#quality-rule-api)
- [Design Snapshot API](#design-snapshot-api)
- [ERD API](#erd-api)
- [Forbidden Words API](#forbidden-words-api)
- [Search API](#search-api)
- [Settings API](#settings-api)
- [에러 코드](#에러-코드)

---

## 기본 정보

### Base URL

```
http://localhost:5173/api
```

### 응답 형식

모든 API 응답은 다음 형식을 따릅니다:

```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  message: string;
}
```

### 인증

현재 모든 API는 인증이 필요하지 않습니다.

### Content-Type

- 요청: `application/json`
- 응답: `application/json`

---

## 최근 변경 사항 (2026-02-13)

아래 API들은 직접 관계 파일 해석 시 공통으로 3단계 폴백을 사용합니다.

1. `registry.json`의 직접 관계
2. 레거시 각 파일의 `mapping` 필드
3. 기본 파일명(`vocabulary.json`, `domain.json`, `term.json` 등)

적용 API:

- `POST /api/term/sync`
- `POST /api/vocabulary/sync-domain`
- `GET/POST /api/column/sync-term`
- `POST /api/column/recommend-standard`
- `POST /api/term/validate`
- `GET /api/term/validate-all`

추가 변경:

- `DELETE /api/vocabulary`, `DELETE /api/domain`
  - 삭제 전 참조 검증이 `checkEntryReferences` 기반으로 통합되었습니다.
- `GET /api/erd/generate`
  - 파일 목록 조회 및 데이터 로드가 `data-registry` 기반으로 정리되었습니다.

---

## 최근 변경 사항 (2026-03-11)

- 도메인 표준명 생성 규칙이 `도메인분류명 + 데이터타입 매핑약어 + 데이터길이 + 데이터소수점길이`로 변경되었습니다.
- 데이터타입 매핑은 `static/data/settings/domain-data-type-mappings.json`으로 관리되며, 등록되지 않은 데이터타입은 하위 호환성을 위해 첫 글자를 사용합니다.
- `GET/POST/PUT/DELETE /api/domain/type-mappings`
  - 도메인 데이터타입 매핑 목록 조회 및 CRUD를 제공합니다.
  - 매핑 변경 후 도메인명 재생성과 함께 관련 `term.domainName`, `column.domainName` 참조를 자동 동기화합니다.
- `POST /api/domain`, `PUT /api/domain`, `POST /api/domain/validate`, `GET /api/domain/validate-all`, `POST /api/domain/upload`
  - 도메인명 생성/검증 시 공통 데이터타입 매핑을 사용합니다.

---

## 최근 변경 사항 (2026-03-13)

- `GET/POST/DELETE /api/design-snapshots`
  - 8종 설계 파일 번들의 스냅샷 목록 조회, 생성, 삭제를 제공합니다.
  - 조회 응답은 `snapshots`와 현재 저장 가능한 `bundles`를 함께 반환합니다.
  - 스냅샷 정본은 `static/data/settings/design-snapshots.json`에 저장됩니다.
- `POST /api/design-snapshots/restore`
  - 저장된 스냅샷으로 현재 8종 파일 번들을 복원합니다.
  - 복원 시 공통 파일 매핑 번들도 함께 다시 저장해 browse/ERD 흐름과 정합성을 맞춥니다.

---

## 최근 변경 사항 (2026-03-12)

- `GET/POST/PUT/DELETE /api/quality-rules`
  - 프로파일링 기반 품질 규칙 목록 조회 및 CRUD를 제공합니다.
  - 규칙은 `static/data/settings/quality-rules.json`에 저장됩니다.
- `GET /api/data-sources/profile/targets`
  - 저장된 PostgreSQL 데이터 소스를 기준으로 조회 가능한 사용자 스키마/테이블 목록을 반환합니다.
  - 각 테이블마다 `estimatedRowCount`, `columnCount`를 함께 제공합니다.
- `POST /api/data-sources/profile/run`
  - 선택한 PostgreSQL 테이블의 컬럼 프로파일링을 실행합니다.
  - 결과에는 `rowCount`, `nullCount/nullRatio`, `distinctCount/distinctRatio`, `minLength/maxLength`가 포함됩니다.
  - 저장된 활성 품질 규칙이 있으면 `qualityRuleEvaluation.summary`, `qualityRuleEvaluation.violations`도 함께 반환합니다.
- `GET/POST/PUT/DELETE /api/data-sources`
  - 내부 관리자용 PostgreSQL 데이터 소스 연결 정의 CRUD를 제공합니다.
  - 응답 요약에는 비밀번호 원문 대신 `config.hasPassword`만 노출됩니다.
- `POST /api/data-sources/test`
  - 저장된 연결 ID 기반 테스트와 저장 전 직접 테스트를 제공합니다.
  - 편집 중 `id + config`를 함께 보내면, 비밀번호 공란일 때 저장된 비밀번호를 재사용해 테스트할 수 있습니다.

- `GET/PUT /api/vocabulary/files/mapping`
- `GET/PUT /api/domain/files/mapping`
- `GET/PUT /api/term/files/mapping`
- `GET/PUT /api/database/files/mapping`
- `GET/PUT /api/entity/files/mapping`
- `GET/PUT /api/attribute/files/mapping`
- `GET/PUT /api/table/files/mapping`
- `GET/PUT /api/column/files/mapping`
  - 8종 파일 매핑 응답은 각 화면의 직접 연결 일부만이 아니라, `vocabulary/domain/term/database/entity/attribute/table/column` 전체 연결 상태를 공유 번들로 반환합니다.
  - 정본 저장소는 `static/data/settings/shared-file-mappings.json`이며, 각 번들은 8개 파일명을 한 번에 보관합니다.
  - 각 `PUT` 요청은 현재 파일을 제외한 나머지 7개 파일명을 모두 받아 저장합니다.
  - 저장 시 공통 매핑 파일을 우선 갱신하고, 직접 레지스트리 관계는 파생 정보로 best-effort 동기화합니다.
  - 개별 데이터 JSON의 `mapping`은 저장 정본이 아니며, 로드/API 응답 시 공통 매핑 파일 기준으로 런타임 주입될 수 있습니다.
  - DB 5개 browse 화면의 연관 상태 상세/정렬 동기화도 같은 8종 파일 번들을 사용합니다.

예시: `GET /api/table/files/mapping`

```json
{
	"success": true,
	"data": {
		"mapping": {
			"vocabulary": "vocabulary.json",
			"domain": "domain.json",
			"term": "term.json",
			"database": "database.json",
			"entity": "entity.json",
			"attribute": "attribute.json",
			"column": "column.json"
		}
	},
	"message": "Mapping retrieved successfully"
}
```

예시: `PUT /api/vocabulary/files/mapping`

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

---

## Vocabulary API

### GET /api/vocabulary

단어집 데이터를 페이지네이션, 정렬, 필터링하여 조회합니다.

#### 설명

단어집 데이터를 조회하며, 페이지네이션, 정렬, 중복 필터링, 도메인 미매핑 필터링을 지원합니다.

#### 요청 파라미터

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

**curl:**

```bash
curl -X GET "http://localhost:5173/api/vocabulary?page=1&limit=50&sortBy=standardName&sortOrder=asc&filter=duplicates" \
  -H "Content-Type: application/json"
```

**JavaScript (fetch):**

```javascript
const response = await fetch(
	'http://localhost:5173/api/vocabulary?page=1&limit=50&sortBy=standardName&sortOrder=asc&filter=duplicates',
	{
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	}
);
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"entries": [
			{
				"id": "550e8400-e29b-41d4-a716-446655440000",
				"standardName": "사용자",
				"abbreviation": "USER",
				"englishName": "User",
				"description": "시스템을 사용하는 개인 또는 조직",
				"domainCategory": "사용자관리",
				"domainGroup": "사용자",
				"isDomainCategoryMapped": true,
				"createdAt": "2024-01-01T00:00:00.000Z",
				"updatedAt": "2024-01-01T00:00:00.000Z",
				"duplicateInfo": {
					"standardName": false,
					"abbreviation": false,
					"englishName": false
				}
			}
		],
		"pagination": {
			"currentPage": 1,
			"totalPages": 10,
			"totalCount": 500,
			"limit": 50,
			"hasNextPage": true,
			"hasPrevPage": false
		},
		"sorting": {
			"sortBy": "standardName",
			"sortOrder": "asc"
		},
		"filtering": {
			"filter": "duplicates",
			"isFiltered": true
		},
		"lastUpdated": "2024-01-01T00:00:00.000Z"
	},
	"message": "Vocabulary data retrieved successfully"
}
```

**에러 (400):**

```json
{
	"success": false,
	"error": "잘못된 페이지네이션 파라미터입니다. (page >= 1, 1 <= limit <= 1000)",
	"message": "Invalid pagination parameters"
}
```

**에러 (500):**

```json
{
	"success": false,
	"error": "서버에서 데이터 조회 중 오류가 발생했습니다.",
	"message": "Internal server error"
}
```

#### 에러 코드

- `400`: 잘못된 파라미터
- `500`: 서버 오류

---

### POST /api/vocabulary

새로운 단어를 추가합니다.

#### 설명

새로운 단어를 단어집에 추가합니다. 필수 필드 검증, 금지어 검사, 영문약어 중복 검사를 수행합니다.

#### 요청 파라미터

| 파라미터   | 타입     | 필수 | 기본값            | 설명          |
| ---------- | -------- | ---- | ----------------- | ------------- |
| `filename` | `string` | ❌   | `vocabulary.json` | 저장할 파일명 |

#### 요청 바디

```typescript
{
  standardName: string;      // 필수
  abbreviation: string;      // 필수
  englishName: string;       // 필수
  description?: string;
  domainCategory?: string;
  domainGroup?: string;
  isDomainCategoryMapped?: boolean;
}
```

#### 요청 예시

**curl:**

```bash
curl -X POST "http://localhost:5173/api/vocabulary?filename=vocabulary.json" \
  -H "Content-Type: application/json" \
  -d '{
    "standardName": "사용자",
    "abbreviation": "USER",
    "englishName": "User",
    "description": "시스템을 사용하는 개인 또는 조직"
  }'
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:5173/api/vocabulary?filename=vocabulary.json', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		standardName: '사용자',
		abbreviation: 'USER',
		englishName: 'User',
		description: '시스템을 사용하는 개인 또는 조직'
	})
});
const data = await response.json();
```

#### 응답 예시

**성공 (201):**

```json
{
	"success": true,
	"data": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"standardName": "사용자",
		"abbreviation": "USER",
		"englishName": "User",
		"description": "시스템을 사용하는 개인 또는 조직",
		"createdAt": "2024-01-01T00:00:00.000Z",
		"updatedAt": "2024-01-01T00:00:00.000Z",
		"isDomainCategoryMapped": false
	},
	"message": "새로운 단어가 성공적으로 추가되었습니다."
}
```

**에러 (400):**

```json
{
	"success": false,
	"error": "표준단어명, 영문약어, 영문명은 필수 항목입니다.",
	"message": "Missing required fields"
}
```

**에러 (400 - 금지어):**

```json
{
	"success": false,
	"error": "금지된 단어입니다. 사유: 부적절한 용어",
	"message": "Forbidden word detected"
}
```

**에러 (409 - 중복):**

```json
{
	"success": false,
	"error": "이미 존재하는 영문약어입니다.",
	"message": "Duplicate abbreviation"
}
```

#### 에러 코드

- `400`: 필수 필드 누락, 금지어 검출
- `409`: 중복된 영문약어
- `500`: 서버 오류

---

### PUT /api/vocabulary

단어를 수정합니다.

#### 설명

기존 단어의 정보를 수정합니다. ID는 필수이며, 존재하지 않는 ID인 경우 404를 반환합니다.

#### 요청 파라미터

| 파라미터   | 타입     | 필수 | 기본값            | 설명          |
| ---------- | -------- | ---- | ----------------- | ------------- |
| `filename` | `string` | ❌   | `vocabulary.json` | 수정할 파일명 |

#### 요청 바디

```typescript
{
  id: string;                // 필수
  standardName?: string;
  abbreviation?: string;
  englishName?: string;
  description?: string;
  domainCategory?: string;
  domainGroup?: string;
  isDomainCategoryMapped?: boolean;
  // ... 기타 필드
}
```

#### 요청 예시

**curl:**

```bash
curl -X PUT "http://localhost:5173/api/vocabulary?filename=vocabulary.json" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "description": "수정된 설명"
  }'
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:5173/api/vocabulary?filename=vocabulary.json', {
	method: 'PUT',
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		id: '550e8400-e29b-41d4-a716-446655440000',
		description: '수정된 설명'
	})
});
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"standardName": "사용자",
		"abbreviation": "USER",
		"englishName": "User",
		"description": "수정된 설명",
		"updatedAt": "2024-01-01T01:00:00.000Z"
	},
	"message": "단어가 성공적으로 수정되었습니다."
}
```

**에러 (400):**

```json
{
	"success": false,
	"error": "단어 ID가 필요합니다.",
	"message": "Missing vocabulary ID"
}
```

**에러 (404):**

```json
{
	"success": false,
	"error": "수정할 단어를 찾을 수 없습니다.",
	"message": "Entry not found"
}
```

#### 에러 코드

- `400`: ID 누락
- `404`: 단어를 찾을 수 없음
- `500`: 서버 오류

---

### DELETE /api/vocabulary

단어를 삭제합니다.

#### 설명

ID를 기반으로 단어를 삭제합니다.

#### 요청 파라미터

| 파라미터   | 타입     | 필수 | 기본값            | 설명             |
| ---------- | -------- | ---- | ----------------- | ---------------- |
| `id`       | `string` | ✅   | -                 | 삭제할 단어의 ID |
| `filename` | `string` | ❌   | `vocabulary.json` | 삭제할 파일명    |

#### 요청 예시

**curl:**

```bash
curl -X DELETE "http://localhost:5173/api/vocabulary?id=550e8400-e29b-41d4-a716-446655440000&filename=vocabulary.json" \
  -H "Content-Type: application/json"
```

**JavaScript (fetch):**

```javascript
const response = await fetch(
	'http://localhost:5173/api/vocabulary?id=550e8400-e29b-41d4-a716-446655440000&filename=vocabulary.json',
	{
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json'
		}
	}
);
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"message": "단어가 성공적으로 삭제되었습니다."
}
```

**에러 (400):**

```json
{
	"success": false,
	"error": "삭제할 단어의 ID가 필요합니다.",
	"message": "Missing vocabulary ID"
}
```

**에러 (404):**

```json
{
	"success": false,
	"error": "삭제할 단어를 찾을 수 없습니다.",
	"message": "Entry not found"
}
```

#### 에러 코드

- `400`: ID 누락
- `404`: 단어를 찾을 수 없음
- `500`: 서버 오류

---

### POST /api/vocabulary/sync-domain

도메인 매핑을 동기화합니다.

#### 설명

단어집의 도메인 분류명(`domainCategory`)을 도메인 데이터와 매칭하여 도메인 그룹(`domainGroup`)을 자동으로 매핑합니다.

#### 요청 파라미터

| 파라미터             | 타입     | 필수 | 기본값            | 설명          |
| -------------------- | -------- | ---- | ----------------- | ------------- |
| `vocabularyFilename` | `string` | ❌   | `vocabulary.json` | 단어집 파일명 |
| `domainFilename`     | `string` | ❌   | `domain.json`     | 도메인 파일명 |

#### 요청 예시

**curl:**

```bash
curl -X POST "http://localhost:5173/api/vocabulary/sync-domain?vocabularyFilename=vocabulary.json&domainFilename=domain.json" \
  -H "Content-Type: application/json"
```

**JavaScript (fetch):**

```javascript
const response = await fetch(
	'http://localhost:5173/api/vocabulary/sync-domain?vocabularyFilename=vocabulary.json&domainFilename=domain.json',
	{
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	}
);
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"vocabularyFilename": "vocabulary.json",
		"domainFilename": "domain.json",
		"updated": 150,
		"matched": 120,
		"unmatched": 30,
		"total": 500
	},
	"message": "도메인 매핑 동기화가 완료되었습니다."
}
```

#### 에러 코드

- `400`: 잘못된 파라미터
- `500`: 서버 오류

---

## Domain API

### GET /api/domain

도메인 데이터를 페이지네이션, 정렬, 검색하여 조회합니다.

#### 설명

도메인 데이터를 조회하며, 페이지네이션, 정렬, 검색 기능을 지원합니다.

#### 요청 파라미터

| 파라미터    | 타입     | 필수 | 기본값        | 설명                                                                                         |
| ----------- | -------- | ---- | ------------- | -------------------------------------------------------------------------------------------- |
| `filename`  | `string` | ❌   | `domain.json` | 조회할 파일명                                                                                |
| `page`      | `number` | ❌   | `1`           | 페이지 번호 (>= 1)                                                                           |
| `limit`     | `number` | ❌   | `20`          | 페이지 크기 (1-100)                                                                          |
| `sortBy`    | `string` | ❌   | `createdAt`   | 정렬 필드                                                                                    |
| `sortOrder` | `string` | ❌   | `desc`        | 정렬 순서                                                                                    |
| `query`     | `string` | ❌   | -             | 검색어                                                                                       |
| `field`     | `string` | ❌   | `all`         | 검색 필드 (`all`, `domainGroup`, `domainCategory`, `standardDomainName`, `physicalDataType`) |

#### 요청 예시

**curl:**

```bash
curl -X GET "http://localhost:5173/api/domain?page=1&limit=20&sortBy=createdAt&sortOrder=desc&query=사용자&field=all" \
  -H "Content-Type: application/json"
```

**JavaScript (fetch):**

```javascript
const response = await fetch(
	'http://localhost:5173/api/domain?page=1&limit=20&sortBy=createdAt&sortOrder=desc&query=사용자&field=all',
	{
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	}
);
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"entries": [
			{
				"id": "550e8400-e29b-41d4-a716-446655440000",
				"domainGroup": "사용자",
				"domainCategory": "사용자관리",
				"standardDomainName": "사용자ID",
				"logicalDataType": "식별자",
				"physicalDataType": "VARCHAR(50)",
				"createdAt": "2024-01-01T00:00:00.000Z",
				"updatedAt": "2024-01-01T00:00:00.000Z"
			}
		],
		"pagination": {
			"currentPage": 1,
			"totalPages": 5,
			"totalCount": 100,
			"limit": 20,
			"hasNextPage": true,
			"hasPrevPage": false
		},
		"sorting": {
			"sortBy": "createdAt",
			"sortOrder": "desc"
		},
		"search": {
			"query": "사용자",
			"field": "all",
			"isFiltered": true
		},
		"lastUpdated": "2024-01-01T00:00:00.000Z"
	},
	"message": "Domain data retrieved successfully"
}
```

#### 에러 코드

- `400`: 잘못된 파라미터
- `500`: 서버 오류

---

### OPTIONS /api/domain

도메인 통계 정보를 조회합니다.

#### 설명

도메인 데이터의 통계 정보(도메인 그룹별 개수, 데이터 타입별 개수 등)를 조회합니다.

#### 요청 파라미터

| 파라미터   | 타입     | 필수 | 기본값        | 설명          |
| ---------- | -------- | ---- | ------------- | ------------- |
| `filename` | `string` | ❌   | `domain.json` | 조회할 파일명 |

#### 요청 예시

**curl:**

```bash
curl -X OPTIONS "http://localhost:5173/api/domain?filename=domain.json" \
  -H "Content-Type: application/json"
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:5173/api/domain?filename=domain.json', {
	method: 'OPTIONS',
	headers: {
		'Content-Type': 'application/json'
	}
});
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"totalEntries": 100,
		"lastUpdated": "2024-01-01T00:00:00.000Z",
		"domainGroups": {
			"사용자": 30,
			"주문": 25,
			"상품": 45
		},
		"logicalDataTypes": {
			"식별자": 40,
			"문자열": 35,
			"숫자": 25
		},
		"physicalDataTypes": {
			"VARCHAR(50)": 30,
			"INT": 25,
			"BIGINT": 45
		},
		"summary": {
			"uniqueGroups": 3,
			"uniqueLogicalDataTypes": 3,
			"uniquePhysicalDataTypes": 3
		}
	},
	"message": "Domain statistics retrieved successfully"
}
```

#### 에러 코드

- `500`: 서버 오류

---

### POST /api/domain

새로운 도메인을 생성합니다.

#### 설명

새로운 도메인을 생성합니다. 필수 필드 검증 및 중복 검사를 수행합니다.
`standardDomainName`은 서버에서 `도메인분류명 + 데이터타입 매핑약어 + 데이터길이 + 데이터소수점길이`
규칙으로 자동 생성됩니다.

#### 요청 바디

```typescript
{
  domainGroup: string;          // 필수
  domainCategory: string;       // 필수
  physicalDataType: string;     // 필수
  dataLength?: string;
  decimalPlaces?: string;
  description?: string;
  revision?: string;
  filename?: string;            // 기본값: 'domain.json'
}
```

#### 요청 예시

**curl:**

```bash
curl -X POST "http://localhost:5173/api/domain" \
  -H "Content-Type: application/json" \
  -d '{
    "domainGroup": "사용자",
    "domainCategory": "사용자관리",
    "physicalDataType": "VARCHAR",
    "dataLength": "100"
  }'
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:5173/api/domain', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		domainGroup: '사용자',
		domainCategory: '사용자관리',
		physicalDataType: 'VARCHAR',
		dataLength: '100'
	})
});
const data = await response.json();
```

#### 응답 예시

**성공 (201):**

```json
{
	"success": true,
	"data": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"domainGroup": "사용자",
		"domainCategory": "사용자관리",
		"standardDomainName": "사용자관리V100",
		"physicalDataType": "VARCHAR",
		"dataLength": "100",
		"createdAt": "2024-01-01T00:00:00.000Z",
		"updatedAt": "2024-01-01T00:00:00.000Z"
	},
	"message": "도메인이 성공적으로 추가되었습니다."
}
```

**에러 (400) - 필수 필드 누락:**

```json
{
	"success": false,
	"error": "필수 필드가 누락되었습니다: physicalDataType",
	"message": "Missing required fields"
}
```

**에러 (409) - 중복:**

```json
{
	"success": false,
	"error": "이미 동일한 도메인이 존재합니다.",
	"message": "Duplicate domain"
}
```

---

### PUT /api/domain

도메인을 수정합니다.

#### 설명

기존 도메인의 정보를 수정합니다.
`domainCategory`, `physicalDataType`, `dataLength`, `decimalPlaces`가 변경되면
`standardDomainName`도 동일 규칙으로 자동 재생성됩니다.

#### 요청 바디

```typescript
{
  id: string;                // 필수
  domainGroup?: string;
  domainCategory?: string;
  physicalDataType?: string;
  dataLength?: string;
  decimalPlaces?: string;
  // ... 기타 필드
  filename?: string;         // 기본값: 'domain.json'
}
```

#### 요청 예시

**curl:**

```bash
curl -X PUT "http://localhost:5173/api/domain" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "physicalDataType": "TIMESTAMP",
    "dataLength": "14"
  }'
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:5173/api/domain', {
	method: 'PUT',
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		id: '550e8400-e29b-41d4-a716-446655440000',
		physicalDataType: 'TIMESTAMP',
		dataLength: '14'
	})
});
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"domainGroup": "사용자",
		"domainCategory": "사용자관리",
		"standardDomainName": "사용자관리TS14",
		"physicalDataType": "TIMESTAMP",
		"dataLength": "14",
		"updatedAt": "2024-01-01T01:00:00.000Z"
	},
	"message": "도메인 수정 완료"
}
```

**에러 (404):**

```json
{
	"success": false,
	"error": "수정할 도메인을 찾을 수 없습니다.",
	"message": "Not found"
}
```

#### 에러 코드

- `400`: ID 누락
- `404`: 도메인을 찾을 수 없음
- `500`: 서버 오류

---

### DELETE /api/domain

도메인을 삭제합니다.

#### 설명

ID를 기반으로 도메인을 삭제합니다.

#### 요청 파라미터

| 파라미터   | 타입     | 필수 | 기본값        | 설명             |
| ---------- | -------- | ---- | ------------- | ---------------- |
| `id`       | `string` | ✅   | -             | 삭제할 도메인 ID |
| `filename` | `string` | ❌   | `domain.json` | 삭제할 파일명    |

#### 요청 예시

**curl:**

```bash
curl -X DELETE "http://localhost:5173/api/domain?id=550e8400-e29b-41d4-a716-446655440000&filename=domain.json" \
  -H "Content-Type: application/json"
```

**JavaScript (fetch):**

```javascript
const response = await fetch(
	'http://localhost:5173/api/domain?id=550e8400-e29b-41d4-a716-446655440000&filename=domain.json',
	{
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json'
		}
	}
);
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"message": "도메인 삭제 완료"
}
```

#### 에러 코드

- `400`: ID 누락
- `404`: 도메인을 찾을 수 없음
- `500`: 서버 오류

---

### POST /api/domain/impact-preview

도메인 저장/삭제 전 참조 영향도를 미리 계산합니다.

#### 설명

도메인 editor에서 저장 전에 현재 참조 수와 즉시 파급 범위를 확인할 때 사용합니다.
`update` 모드에서는 단어/용어/컬럼 참조 수와 컬럼 동기화 영향 가능 건수를,
`delete` 모드에서는 삭제 시 끊기는 참조 건수를 함께 반환합니다.

#### 요청 바디

```typescript
{
  filename?: string; // 기본값: 'domain.json'
  mode?: 'create' | 'update' | 'delete';
  currentEntry?: {
    id?: string;
    domainCategory?: string;
    standardDomainName?: string;
    physicalDataType?: string;
    dataLength?: string;
    decimalPlaces?: string;
  };
  proposedEntry?: {
    id?: string;
    domainCategory?: string;
    standardDomainName?: string;
    physicalDataType?: string;
    dataLength?: string;
    decimalPlaces?: string;
  };
}
```

#### 응답 예시

```json
{
  "success": true,
  "data": {
    "files": {
      "domain": "domain.json",
      "vocabulary": "vocabulary.json",
      "term": "term.json",
      "column": "column.json"
    },
    "mode": "delete",
    "summary": {
      "vocabularyReferenceCount": 1,
      "termReferenceCount": 2,
      "columnReferenceCount": 3,
      "totalReferenceCount": 6,
      "downstreamBreakCount": 6,
      "affectedColumnSyncCount": 0
    },
    "guidance": [
      "현재 이 도메인은 단어 1건, 용어 2건, 컬럼 3건에서 참조되고 있습니다.",
      "삭제 시 총 6건이 미참조 또는 매핑 누락 상태가 될 수 있습니다."
    ]
  },
  "message": "도메인 변경 영향도 미리보기를 생성했습니다."
}
```

---

### GET /api/domain/type-mappings

도메인 데이터타입 매핑 목록을 조회합니다.

#### 설명

도메인 표준명 생성 시 사용하는 데이터타입별 약어 목록을 반환합니다.

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"entries": [
			{
				"id": "datatype-varchar",
				"dataType": "VARCHAR",
				"abbreviation": "V",
				"createdAt": "2026-03-11T00:00:00.000Z",
				"updatedAt": "2026-03-11T00:00:00.000Z"
			}
		],
		"lastUpdated": "2026-03-11T00:00:00.000Z",
		"totalCount": 1
	},
	"message": "데이터타입 매핑 목록을 조회했습니다."
}
```

---

### POST /api/domain/type-mappings

도메인 데이터타입 매핑을 등록합니다.

#### 요청 바디

```typescript
{
	dataType: string; // 필수
	abbreviation: string; // 필수
}
```

#### 설명

등록 후 전체 도메인 파일의 `standardDomainName`을 재계산하고, 변경된 이름을 참조하는
용어와 컬럼의 `domainName`도 함께 동기화합니다.

#### 응답 예시

**성공 (201):**

```json
{
	"success": true,
	"data": {
		"entry": {
			"id": "map-1",
			"dataType": "TIMESTAMP",
			"abbreviation": "TS",
			"createdAt": "2026-03-11T00:00:00.000Z",
			"updatedAt": "2026-03-11T00:00:00.000Z"
		},
		"data": {
			"entries": [],
			"lastUpdated": "2026-03-11T00:00:00.000Z",
			"totalCount": 1
		},
		"sync": {
			"domainFilesUpdated": 1,
			"domainsUpdated": 3,
			"termFilesUpdated": 1,
			"termsUpdated": 2,
			"columnFilesUpdated": 1,
			"columnsUpdated": 2
		}
	},
	"message": "데이터타입 매핑이 등록되었습니다."
}
```

#### 에러 코드

- `400`: 필수 필드 누락, 중복 데이터타입, 중복 약어
- `500`: 서버 오류

---

### PUT /api/domain/type-mappings

도메인 데이터타입 매핑을 수정합니다.

#### 요청 바디

```typescript
{
	id: string; // 필수
	dataType: string; // 필수
	abbreviation: string; // 필수
}
```

#### 설명

수정 후 전체 도메인명과 관련 용어/컬럼의 도메인 참조를 다시 동기화합니다.

#### 에러 코드

- `400`: 필수 필드 누락, 중복 데이터타입, 중복 약어
- `404`: 수정할 매핑을 찾을 수 없음
- `500`: 서버 오류

---

### DELETE /api/domain/type-mappings

도메인 데이터타입 매핑을 삭제합니다.

#### 요청 바디

```typescript
{
	id: string; // 필수
}
```

#### 설명

삭제 후 남아 있는 매핑 기준으로 전체 도메인명을 재계산합니다. 매핑이 없는 데이터타입은 첫
글자 규칙으로 fallback 되며, 관련 용어/컬럼의 도메인 참조도 함께 동기화됩니다.

#### 에러 코드

- `400`: ID 누락
- `404`: 삭제할 매핑을 찾을 수 없음
- `500`: 서버 오류

---

## Term API

### GET /api/term

용어 데이터를 페이지네이션, 정렬, 검색하여 조회합니다.

#### 설명

용어 데이터를 조회하며, 페이지네이션, 정렬, 검색 기능을 지원합니다.

#### 요청 파라미터

| 파라미터    | 타입     | 필수 | 기본값      | 설명                |
| ----------- | -------- | ---- | ----------- | ------------------- |
| `filename`  | `string` | ❌   | `term.json` | 조회할 파일명       |
| `page`      | `number` | ❌   | `1`         | 페이지 번호         |
| `limit`     | `number` | ❌   | `20`        | 페이지 크기 (1-100) |
| `sortBy`    | `string` | ❌   | `createdAt` | 정렬 필드           |
| `sortOrder` | `string` | ❌   | `desc`      | 정렬 순서           |
| `query`     | `string` | ❌   | -           | 검색어              |
| `field`     | `string` | ❌   | `all`       | 검색 필드           |

#### 요청 예시

**curl:**

```bash
curl -X GET "http://localhost:5173/api/term?page=1&limit=20&sortBy=createdAt&sortOrder=desc" \
  -H "Content-Type: application/json"
```

**JavaScript (fetch):**

```javascript
const response = await fetch(
	'http://localhost:5173/api/term?page=1&limit=20&sortBy=createdAt&sortOrder=desc',
	{
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	}
);
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"entries": [
			{
				"id": "550e8400-e29b-41d4-a716-446655440000",
				"termName": "사용자ID",
				"columnName": "user_id",
				"domainName": "사용자ID",
				"mappingStatus": {
					"termName": true,
					"columnName": true,
					"domainName": true
				},
				"createdAt": "2024-01-01T00:00:00.000Z",
				"updatedAt": "2024-01-01T00:00:00.000Z"
			}
		],
		"pagination": {
			"currentPage": 1,
			"totalPages": 5,
			"totalCount": 100,
			"limit": 20,
			"hasNextPage": true,
			"hasPrevPage": false
		}
	},
	"message": "Term data retrieved successfully"
}
```

---

### POST /api/term

새로운 용어를 추가하고 매핑 검증을 수행합니다.

#### 설명

새로운 용어를 추가하며, 용어명, 칼럼명, 도메인명의 매핑 상태를 자동으로 검증합니다.

#### 요청 바디

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

#### 요청 예시

**curl:**

```bash
curl -X POST "http://localhost:5173/api/term?filename=term.json" \
  -H "Content-Type: application/json" \
  -d '{
    "entry": {
      "termName": "사용자ID",
      "columnName": "user_id",
      "domainName": "사용자ID"
    }
  }'
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:5173/api/term?filename=term.json', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		entry: {
			termName: '사용자ID',
			columnName: 'user_id',
			domainName: '사용자ID'
		}
	})
});
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"termName": "사용자ID",
		"columnName": "user_id",
		"domainName": "사용자ID",
		"mappingStatus": {
			"termName": true,
			"columnName": true,
			"domainName": true
		},
		"createdAt": "2024-01-01T00:00:00.000Z",
		"updatedAt": "2024-01-01T00:00:00.000Z"
	},
	"message": "용어가 성공적으로 추가되었습니다."
}
```

---

### POST /api/term/impact-preview

용어 저장 전 컬럼 연결 영향도를 미리 계산합니다.

#### 설명

용어 editor에서 입력값이 바뀔 때 호출하며, 현재 연결 컬럼 수와 저장 후 연결될 컬럼 수를 비교합니다.
`columnName`이 바뀌면 끊기는 연결과 새 연결 후보를, `termName`/`domainName`이 바뀌면
같은 연결을 유지한 상태에서 표준화 결과가 달라지는 컬럼 수를 반환합니다.

#### 요청 바디

```typescript
{
  filename?: string; // 기본값: 'term.json'
  currentEntry?: {
    id?: string;
    termName?: string;
    columnName?: string;
    domainName?: string;
  };
  proposedEntry: {
    id?: string;
    termName: string;
    columnName: string;
    domainName: string;
  };
}
```

#### 응답 예시

```json
{
  "success": true,
  "data": {
    "files": {
      "term": "term.json",
      "domain": "domain.json",
      "column": "column.json"
    },
    "mode": "update",
    "summary": {
      "currentLinkedColumnCount": 2,
      "nextLinkedColumnCount": 1,
      "columnLinksToBeBroken": 2,
      "newColumnLinksDetected": 1,
      "affectedColumnStandardizationCount": 0,
      "proposedDomainExists": true
    },
    "guidance": [
      "기존 columnName과 연결된 2개 컬럼은 저장 후 이 용어 기준에서 벗어납니다.",
      "새 columnName과 일치하는 1개 컬럼이 이후 동기화 대상이 됩니다."
    ]
  },
  "message": "용어 변경 영향도 미리보기를 생성했습니다."
}
```

---

### POST /api/term/sync

용어의 매핑 상태를 재검증하고 동기화합니다.

#### 설명

모든 용어의 매핑 상태를 재검증하고 동기화합니다.

#### 요청 바디

```typescript
{
  filename?: string;  // 기본값: 'term.json'
}
```

#### 요청 예시

**curl:**

```bash
curl -X POST "http://localhost:5173/api/term/sync?filename=term.json" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:5173/api/term/sync?filename=term.json', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({})
});
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"filename": "term.json",
		"updated": 100,
		"matchedTerm": 80,
		"matchedColumn": 75,
		"matchedDomain": 70,
		"total": 100
	},
	"message": "용어 매핑 동기화가 완료되었습니다."
}
```

---

## Database API

데이터베이스 정의서 데이터를 관리합니다.

### GET /api/database

데이터베이스 목록을 조회합니다. 페이지네이션, 정렬, 검색을 지원합니다.

### POST /api/database

새로운 데이터베이스 정의를 추가합니다.

### PUT /api/database

기존 데이터베이스 정의를 수정합니다.

### DELETE /api/database

ID를 기반으로 데이터베이스 정의를 삭제합니다.

---

## Entity API

엔터티 정의서 데이터를 관리합니다.

### GET /api/entity

엔터티 목록을 조회합니다. 페이지네이션, 정렬, 검색을 지원합니다.

### POST /api/entity

새로운 엔터티 정의를 추가합니다.

### PUT /api/entity

기존 엔터티 정의를 수정합니다.

### DELETE /api/entity

ID를 기반으로 엔터티 정의를 삭제합니다.

---

## Attribute API

속성 정의서 데이터를 관리합니다.

### GET /api/attribute

속성 목록을 조회합니다. 페이지네이션, 정렬, 검색을 지원합니다.

### POST /api/attribute

새로운 속성 정의를 추가합니다.

### PUT /api/attribute

기존 속성 정의를 수정합니다.

### DELETE /api/attribute

ID를 기반으로 속성 정의를 삭제합니다.

---

## Table API

테이블 정의서 데이터를 관리합니다.

### GET /api/table

테이블 목록을 조회합니다. 페이지네이션, 정렬, 검색을 지원합니다.

### POST /api/table

새로운 테이블 정의를 추가합니다.

### PUT /api/table

기존 테이블 정의를 수정합니다.

### DELETE /api/table

ID를 기반으로 테이블 정의를 삭제합니다.

---

## Column API

컬럼 정의서 데이터를 관리합니다.

### GET /api/column

컬럼 목록을 조회합니다. 페이지네이션, 정렬, 검색을 지원합니다.

- 검색 필드: `all`, `schemaName`, `tableEnglishName`, `columnEnglishName`, `columnKoreanName`, `domainName`, `dataType`

### POST /api/column

새로운 컬럼 정의를 추가합니다.

- 필수 필드:
  - `scopeFlag`
  - `subjectArea`
  - `schemaName`
  - `tableEnglishName`
  - `columnEnglishName`
  - `columnKoreanName`
  - `relatedEntityName`
  - `domainName`
  - `dataType`
  - `notNullFlag`
  - `personalInfoFlag`
  - `encryptionFlag`
  - `publicFlag`

### PUT /api/column

기존 컬럼 정의를 수정합니다.

- `id` + POST와 동일한 필수 필드가 필요합니다.

### DELETE /api/column

ID를 기반으로 컬럼 정의를 삭제합니다.

### GET /api/column/sync-term

컬럼-용어-도메인 매핑 상태를 조회합니다.

- 기본 파일:
  - `columnFilename`: `column.json`
  - `termFilename`: `term.json`
  - `domainFilename`: `domain.json`
- 반환 핵심 지표:
  - `matched`, `unmatched`
  - `matchedDomain`, `unmatchedDomain`
  - `total`, `termCount`, `domainCount`

### POST /api/column/sync-term

컬럼 정의서를 시스템 용어집/도메인 기준으로 동기화합니다.

- 동기화 규칙:
  - `columnEnglishName` ↔ `term.columnName`
  - 매핑 성공 시 `columnKoreanName`/`domainName` 갱신
  - `domainName`이 `domain.standardDomainName`과 매핑되면 `dataType`/`dataLength`/`dataDecimalLength` 갱신
- 요청 바디(선택):
  - `columnFilename`
  - `termFilename`
  - `domainFilename`

### POST /api/column/recommend-standard

컬럼 editor에서 단건 입력값 기준의 표준 추천과 경고를 계산합니다.

- 기본 파일:
  - `columnFilename`: `column.json`
  - `termFilename`: `term.json`
  - `domainFilename`: `domain.json`
- 요청 바디:
  - `columnFilename?`
  - `termFilename?`
  - `domainFilename?`
  - `entry`
    - `columnEnglishName`
    - `columnKoreanName?`
    - `domainName?`
    - `dataType?`
    - `dataLength?`
    - `dataDecimalLength?`
- 응답 핵심:
  - `files.column`, `files.term`, `files.domain`
  - `matchedTerm`, `matchedDomain`
  - `recommendedValues`
  - `changes[]`
  - `issues[]`
  - `summary.status`
  - `summary.changeCount`, `summary.issueCount`
  - `summary.exactTermMatch`, `summary.domainResolved`
  - `guidance[]`

---

## Data Source API

내부 관리자용 데이터 소스 연결 정의와 PostgreSQL 연결 테스트를 관리합니다.

### GET /api/data-sources

저장된 데이터 소스 요약 목록을 조회합니다.

- 응답 핵심:
  - `id`, `name`, `type`, `description`
  - `config.host`, `config.port`, `config.database`, `config.schema`, `config.username`
  - `config.ssl`, `config.connectionTimeoutSeconds`, `config.hasPassword`
- 보안 정책:
  - 비밀번호 원문은 응답에 포함되지 않습니다.

### POST /api/data-sources

새 PostgreSQL 데이터 소스를 등록합니다.

- 요청 바디:

```json
{
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
	}
}
```

- 에러 코드:
  - `400`: 필수 입력 누락, 지원하지 않는 타입, 잘못된 포트/타임아웃
  - `409`: 동일한 연결 이름 중복

### PUT /api/data-sources

기존 데이터 소스를 수정합니다.

- 요청 바디:
  - `id` 필수
  - 나머지 필드는 POST와 동일
- 비밀번호 정책:
  - `config.password`가 빈 문자열이면 기존 저장 비밀번호를 유지합니다.

### DELETE /api/data-sources

저장된 데이터 소스를 삭제합니다.

- 요청 바디:

```json
{
	"id": "source-uuid"
}
```

- 에러 코드:
  - `400`: `id` 누락
  - `404`: 대상 없음

### POST /api/data-sources/test

PostgreSQL 연결 테스트를 실행합니다.

#### 1. 저장된 연결 테스트

```json
{
	"id": "source-uuid"
}
```

#### 2. 저장 전 직접 테스트

```json
{
	"type": "postgresql",
	"config": {
		"host": "localhost",
		"port": 5432,
		"database": "metadata",
		"schema": "public",
		"username": "postgres",
		"password": "secret",
		"ssl": false,
		"connectionTimeoutSeconds": 5
	}
}
```

#### 3. 편집 중 테스트

```json
{
	"id": "source-uuid",
	"type": "postgresql",
	"config": {
		"host": "db.internal",
		"port": 5433,
		"database": "metadata",
		"schema": "audit",
		"username": "dbadmin",
		"password": "",
		"ssl": true,
		"connectionTimeoutSeconds": 10
	}
}
```

- 동작:
  - `id`만 보내면 저장된 연결 그대로 테스트
  - `id + config`를 함께 보내면 수정 중 값으로 테스트
  - `password`가 비어 있으면 저장된 비밀번호를 이어받아 테스트
- 성공 응답 핵심:
  - `success`
  - `message`
  - `details.host`, `details.port`, `details.database`, `details.schema`, `details.serverVersion`
  - `latencyMs`, `testedAt`

### GET /api/data-sources/profile/targets

저장된 PostgreSQL 데이터 소스에서 프로파일링 가능한 스키마/테이블 목록을 조회합니다.

- 필수 쿼리 파라미터:
  - `dataSourceId`
- 동작:
  - 저장된 연결 ID를 사용해 DB에 직접 접속
  - `information_schema`, `pg_catalog`를 제외한 사용자 테이블만 조회
- 성공 응답 핵심:
  - `dataSourceId`, `dataSourceName`, `defaultSchema`
  - `schemas`
  - `tables[].schema`, `tables[].table`, `tables[].tableType`
  - `tables[].estimatedRowCount`, `tables[].columnCount`

예시:

```json
{
	"success": true,
	"data": {
		"dataSourceId": "source-1",
		"dataSourceName": "운영 PostgreSQL",
		"defaultSchema": "public",
		"schemas": ["audit", "public"],
		"tables": [
			{
				"schema": "public",
				"table": "customers",
				"tableType": "BASE TABLE",
				"estimatedRowCount": 1200,
				"columnCount": 8
			}
		]
	}
}
```

### POST /api/data-sources/profile/run

선택한 PostgreSQL 테이블의 컬럼 프로파일링을 실행합니다.

- 요청 바디:

```json
{
	"dataSourceId": "source-1",
	"schema": "public",
	"table": "customers"
}
```

- 성공 응답 핵심:
  - `dataSourceId`, `dataSourceName`, `schema`, `table`
  - `rowCount`, `profiledAt`
  - `columns[].columnName`, `columns[].ordinalPosition`, `columns[].dataType`, `columns[].isNullable`
  - `columns[].nullCount`, `columns[].nullRatio`
  - `columns[].distinctCount`, `columns[].distinctRatio`
  - `columns[].minLength`, `columns[].maxLength`
  - `qualityRuleEvaluation.summary.totalRules`, `matchedRules`, `passedRules`, `failedRules`
  - `qualityRuleEvaluation.summary.warningCount`, `errorCount`
  - `qualityRuleEvaluation.violations[].ruleName`, `target`, `metric`, `actualValue`, `threshold`

예시:

```json
{
	"success": true,
	"data": {
		"dataSourceId": "source-1",
		"dataSourceName": "운영 PostgreSQL",
		"schema": "public",
		"table": "customers",
		"rowCount": 1200,
		"profiledAt": "2026-03-12T08:00:00.000Z",
		"columns": [
			{
				"columnName": "customer_id",
				"ordinalPosition": 1,
				"dataType": "integer",
				"isNullable": false,
				"nullCount": 0,
				"nullRatio": 0,
				"distinctCount": 1200,
				"distinctRatio": 1,
				"minLength": 1,
				"maxLength": 5
			}
		],
		"qualityRuleEvaluation": {
			"evaluatedAt": "2026-03-12T08:00:00.000Z",
			"summary": {
				"totalRules": 2,
				"matchedRules": 2,
				"passedRules": 1,
				"failedRules": 1,
				"infoCount": 0,
				"warningCount": 1,
				"errorCount": 0
			},
			"violations": [
				{
					"ruleId": "rule-1",
					"ruleName": "고객 이메일 NULL 비율 1% 이하",
					"severity": "warning",
					"scope": "column",
					"target": {
						"schema": "public",
						"table": "customers",
						"column": "email"
					},
					"metric": "nullRatio",
					"operator": "lte",
					"threshold": 0.01,
					"actualValue": 0.02,
					"message": "public.customers.email의 nullRatio 값 0.02이(가) 기준 0.01 이하 조건을 만족하지 않습니다."
				}
			]
		}
	}
}
```

---

## Quality Rule API

프로파일링 결과에 즉시 적용할 품질 규칙을 관리합니다.

### GET /api/quality-rules

저장된 품질 규칙 목록을 조회합니다.

- 응답 핵심:
  - `entries[].id`, `entries[].name`, `entries[].description`
  - `entries[].enabled`, `entries[].severity`, `entries[].scope`
  - `entries[].metric`, `entries[].operator`, `entries[].threshold`
  - `entries[].target.schemaPattern`, `tablePattern`, `columnPattern`

### POST /api/quality-rules

새 품질 규칙을 등록합니다.

- 요청 바디:

```json
{
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
	}
}
```

- 에러 코드:
  - `400`: 필수 입력 누락, 범위와 메트릭 조합 오류, 숫자 기준값 오류
  - `409`: 동일한 규칙 이름 중복

### PUT /api/quality-rules

기존 품질 규칙을 수정합니다.

- 요청 바디:
  - `id` 필수
  - 나머지 필드는 POST와 동일

### DELETE /api/quality-rules

저장된 품질 규칙을 삭제합니다.

- 요청 바디:

```json
{
	"id": "rule-uuid"
}
```

- 에러 코드:
  - `400`: `id` 누락
  - `404`: 대상 없음

---

## Design Snapshot API

표준/설계 변경 전에 8종 파일 번들의 상태를 저장하고 복원하는 API입니다.

### GET /api/design-snapshots

저장된 스냅샷 목록과 현재 선택 가능한 공통 파일 매핑 번들을 함께 조회합니다.

- 응답 핵심:
  - `snapshots[].id`, `name`, `description`
  - `snapshots[].bundle.vocabulary ... column`
  - `snapshots[].counts.vocabulary ... column`
  - `snapshots[].createdAt`, `updatedAt`, `restoredAt`
  - `bundles[].id`, `bundles[].files`, `bundles[].createdAt`, `bundles[].updatedAt`

예시:

```json
{
	"success": true,
	"data": {
		"snapshots": [
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
				"counts": {
					"vocabulary": 120,
					"domain": 48,
					"term": 230,
					"database": 1,
					"entity": 10,
					"attribute": 42,
					"table": 10,
					"column": 91
				},
				"createdAt": "2026-03-13T09:00:00.000Z",
				"updatedAt": "2026-03-13T09:00:00.000Z",
				"restoredAt": null
			}
		],
		"bundles": [
			{
				"id": "default-shared-file-mapping",
				"files": {
					"vocabulary": "vocabulary.json",
					"domain": "domain.json",
					"term": "term.json",
					"database": "database.json",
					"entity": "entity.json",
					"attribute": "attribute.json",
					"table": "table.json",
					"column": "column.json"
				},
				"createdAt": "2026-03-12T00:00:00.000Z",
				"updatedAt": "2026-03-12T00:00:00.000Z"
			}
		]
	}
}
```

### POST /api/design-snapshots

현재 8종 파일 번들을 새 스냅샷으로 저장합니다.

- 요청 바디:

```json
{
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
	}
}
```

- 응답 핵심:
  - `data.entry`에 생성된 스냅샷 요약 반환
- 에러 코드:
  - `400`: 8종 파일 번들 누락 또는 형식 오류

### DELETE /api/design-snapshots

저장된 스냅샷을 삭제합니다.

- 요청 바디:

```json
{
	"id": "snapshot-1"
}
```

- 에러 코드:
  - `400`: `id` 누락
  - `404`: 대상 스냅샷 없음

### POST /api/design-snapshots/restore

저장된 스냅샷으로 8종 파일 번들을 복원합니다.

- 요청 바디:

```json
{
	"id": "snapshot-1"
}
```

- 동작:
  - 스냅샷에 저장된 8종 JSON 데이터를 각 파일에 다시 저장
  - 공통 파일 매핑 번들을 다시 적용
  - 캐시를 무효화하고 `restoredAt` 시각 갱신
- 응답 핵심:
  - `data.entry.id`, `name`
  - `data.entry.bundle`
  - `data.entry.counts`
  - `data.entry.restoredAt`
- 에러 코드:
  - `400`: `id` 누락
  - `404`: 대상 스냅샷 없음

---

## ERD API

ERD/관계 분석 관련 API입니다.

### GET /api/erd/generate

ERD 노드/엣지/매핑 데이터를 생성합니다.

- 주요 파라미터:
  - `databaseFile`, `entityFile`, `attributeFile`, `tableFile`, `columnFile`, `domainFile`
  - `tableIds`, `includeRelated`
- 응답 추가 정보:
  - `data.relationValidation` (5개 정의서 연관관계 정합성 요약)

### GET /api/erd/tables

ERD 대상 테이블 목록을 조회합니다.

- 주요 파라미터:
  - `filename`
  - `q` (검색어)

### GET /api/erd/relations

5개 정의서(`database/entity/attribute/table/column`)의 연관관계 정합성을 검증합니다.

- 주요 파라미터:
  - `databaseFile`, `entityFile`, `attributeFile`, `tableFile`, `columnFile`
- 응답 핵심:
  - `files`: 실제 검증에 사용한 파일명
  - `validation.specs`: 관계 규칙 정의
  - `validation.summaries`: 관계별 `matched/unmatched` 및 이슈 샘플
  - `validation.totals`: 전체 집계(`errorCount`, `warningCount` 포함)

### GET /api/erd/relations/sync

5개 정의서 관계 자동보정 미리보기를 조회합니다.

- 주요 파라미터:
  - `apply` (`true`면 즉시 반영)
  - `databaseFile`, `entityFile`, `attributeFile`, `tableFile`, `columnFile`
- 응답 핵심:
  - `data.mode`: `preview` | `apply`
  - `data.counts`: 후보 건수/적용 건수/추천 건수
  - `data.changes`: 필드별 변경 후보
  - `data.suggestions`: Attribute->Column 추천 후보
  - `data.validationBefore`, `data.validationAfter`: 보정 전/후 정합성 결과

### POST /api/erd/relations/sync

5개 정의서 관계 자동보정을 실행하거나 미리보기를 생성합니다.

- 요청 바디(선택):
  - `apply` (`true`면 실제 저장)
  - `databaseFile`, `entityFile`, `attributeFile`, `tableFile`, `columnFile`
- 자동보정 범위:
  - `Entity -> Table`: `relatedEntityName` 보정
  - `Table -> Column`: `schemaName`, `tableEnglishName`, `relatedEntityName` 보정
  - `Attribute -> Column`: 자동 수정 없이 추천 후보만 제공
- 충돌 정책:
  - 관계 동기화와 컬럼 동기화(`POST /api/column/sync-term`)의 필드 소유권/실행 순서는 `docs/specs/relation-sync-policy.md`를 따릅니다.

---

## Forbidden Words API

### GET /api/forbidden-words

금지어 목록을 조회합니다.

#### 설명

금지어 목록을 페이지네이션하여 조회합니다.

#### 요청 파라미터

| 파라미터    | 타입     | 필수 | 기본값      | 설명                        |
| ----------- | -------- | ---- | ----------- | --------------------------- |
| `page`      | `number` | ❌   | `1`         | 페이지 번호                 |
| `limit`     | `number` | ❌   | `100`       | 페이지 크기 (1-1000)        |
| `sortBy`    | `string` | ❌   | `createdAt` | 정렬 필드                   |
| `sortOrder` | `string` | ❌   | `desc`      | 정렬 순서                   |
| `scope`     | `string` | ❌   | -           | 필터 (`global` 또는 파일명) |

#### 요청 예시

**curl:**

```bash
curl -X GET "http://localhost:5173/api/forbidden-words?page=1&limit=100" \
  -H "Content-Type: application/json"
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:5173/api/forbidden-words?page=1&limit=100', {
	method: 'GET',
	headers: {
		'Content-Type': 'application/json'
	}
});
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"entries": [
			{
				"id": "550e8400-e29b-41d4-a716-446655440000",
				"keyword": "부적절한용어",
				"type": "standardName",
				"reason": "부적절한 용어",
				"createdAt": "2024-01-01T00:00:00.000Z"
			}
		],
		"totalCount": 10,
		"page": 1,
		"limit": 100,
		"totalPages": 1,
		"lastUpdated": "2024-01-01T00:00:00.000Z"
	},
	"message": "Forbidden words retrieved successfully"
}
```

---

### POST /api/forbidden-words

새로운 금지어를 추가합니다.

#### 설명

새로운 금지어를 추가합니다.

#### 요청 바디

```typescript
{
  keyword: string;                    // 필수
  type: 'standardName' | 'abbreviation';  // 필수
  reason?: string;
  targetFile?: string;                // 특정 파일에만 적용
}
```

#### 요청 예시

**curl:**

```bash
curl -X POST "http://localhost:5173/api/forbidden-words" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "부적절한용어",
    "type": "standardName",
    "reason": "부적절한 용어"
  }'
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:5173/api/forbidden-words', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		keyword: '부적절한용어',
		type: 'standardName',
		reason: '부적절한 용어'
	})
});
const data = await response.json();
```

#### 응답 예시

**성공 (201):**

```json
{
	"success": true,
	"data": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"keyword": "부적절한용어",
		"type": "standardName",
		"reason": "부적절한 용어",
		"createdAt": "2024-01-01T00:00:00.000Z"
	},
	"message": "Forbidden word added successfully"
}
```

**에러 (409):**

```json
{
	"success": false,
	"error": "이미 존재하는 금지어입니다.",
	"message": "Duplicate forbidden word"
}
```

#### 에러 코드

- `400`: 필수 필드 누락
- `409`: 중복된 금지어
- `500`: 서버 오류

---

## Search API

### GET /api/search

단어집을 검색합니다.

#### 설명

단어집에서 검색어를 기반으로 검색을 수행합니다. 부분 일치 및 정확 일치 검색을 지원하며, 중복 필터링과 도메인 미매핑 필터링을 지원합니다.

#### 요청 파라미터

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

#### 요청 예시

**curl:**

```bash
curl -X GET "http://localhost:5173/api/search?q=사용자&field=all&page=1&limit=50&exact=false" \
  -H "Content-Type: application/json"
```

**JavaScript (fetch):**

```javascript
const response = await fetch(
	'http://localhost:5173/api/search?q=사용자&field=all&page=1&limit=50&exact=false',
	{
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	}
);
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"entries": [
			{
				"id": "550e8400-e29b-41d4-a716-446655440000",
				"standardName": "사용자",
				"abbreviation": "USER",
				"englishName": "User",
				"description": "시스템을 사용하는 개인 또는 조직"
			}
		],
		"totalCount": 1,
		"query": {
			"query": "사용자",
			"field": "all"
		},
		"pagination": {
			"currentPage": 1,
			"totalPages": 1,
			"totalResults": 1,
			"limit": 50,
			"hasNextPage": false,
			"hasPrevPage": false
		},
		"searchInfo": {
			"originalQuery": "사용자",
			"sanitizedQuery": "사용자",
			"field": "all",
			"exact": false,
			"executionTime": 1234567890
		},
		"filtering": {
			"filter": "none",
			"isFiltered": false
		}
	},
	"message": "Search completed successfully"
}
```

**에러 (400):**

```json
{
	"success": false,
	"error": "유효한 검색어를 입력해주세요. (1-100자)",
	"message": "Invalid search query"
}
```

#### 에러 코드

- `400`: 잘못된 검색어 또는 파라미터
- `500`: 서버 오류

---

### POST /api/search

검색 제안 (자동완성)을 제공합니다.

#### 설명

검색어의 시작 부분과 일치하는 단어들을 제안합니다.

#### 요청 파라미터

| 파라미터   | 타입     | 필수 | 기본값 | 설명          |
| ---------- | -------- | ---- | ------ | ------------- |
| `filename` | `string` | ❌   | -      | 검색할 파일명 |

#### 요청 바디

```typescript
{
  query: string;      // 필수 (최소 1자)
  limit?: number;     // 기본값: 10, 최대: 50
}
```

#### 요청 예시

**curl:**

```bash
curl -X POST "http://localhost:5173/api/search?filename=vocabulary.json" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "사용",
    "limit": 10
  }'
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:5173/api/search?filename=vocabulary.json', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		query: '사용',
		limit: 10
	})
});
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"suggestions": ["사용자", "사용자ID", "사용자명", "사용자그룹"],
		"query": "사용",
		"count": 4
	},
	"message": "Search suggestions retrieved successfully"
}
```

**에러 (400):**

```json
{
	"success": false,
	"error": "검색어는 최소 1자 이상이어야 합니다.",
	"message": "Invalid query for suggestions"
}
```

#### 에러 코드

- `400`: 잘못된 검색어
- `500`: 서버 오류

---

## Settings API

### GET /api/settings

애플리케이션 설정을 조회합니다.

#### 설명

애플리케이션의 현재 설정을 조회합니다.

#### 요청 예시

**curl:**

```bash
curl -X GET "http://localhost:5173/api/settings" \
  -H "Content-Type: application/json"
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:5173/api/settings', {
	method: 'GET',
	headers: {
		'Content-Type': 'application/json'
	}
});
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"showVocabularySystemFiles": false,
		"showDomainSystemFiles": false
	},
	"message": "Settings retrieved successfully"
}
```

---

### POST /api/settings

애플리케이션 설정을 저장합니다.

#### 설명

애플리케이션 설정을 저장합니다.

#### 요청 바디

```typescript
{
  showVocabularySystemFiles?: boolean;
  showDomainSystemFiles?: boolean;
  // ... 기타 설정
}
```

#### 요청 예시

**curl:**

```bash
curl -X POST "http://localhost:5173/api/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "showVocabularySystemFiles": true,
    "showDomainSystemFiles": true
  }'
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:5173/api/settings', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		showVocabularySystemFiles: true,
		showDomainSystemFiles: true
	})
});
const data = await response.json();
```

#### 응답 예시

**성공 (200):**

```json
{
	"success": true,
	"data": {
		"showVocabularySystemFiles": true,
		"showDomainSystemFiles": true
	},
	"message": "Settings saved successfully"
}
```

---

## 에러 코드

### HTTP 상태 코드

| 코드  | 설명         | 예시 상황                           |
| ----- | ------------ | ----------------------------------- |
| `200` | 성공         | 조회, 수정 성공                     |
| `201` | 생성됨       | 새 리소스 생성 성공                 |
| `400` | 잘못된 요청  | 필수 필드 누락, 잘못된 파라미터     |
| `404` | 찾을 수 없음 | 존재하지 않는 ID로 조회/수정/삭제   |
| `409` | 충돌         | 중복된 데이터 (영문약어, 금지어 등) |
| `500` | 서버 오류    | 내부 서버 오류                      |

### 에러 응답 형식

모든 에러 응답은 다음 형식을 따릅니다:

```json
{
	"success": false,
	"error": "에러 메시지 (한국어)",
	"message": "Error message (English)"
}
```

### 일반적인 에러 메시지

- **필수 필드 누락**: "표준단어명, 영문약어, 영문명은 필수 항목입니다."
- **ID 누락**: "단어 ID가 필요합니다."
- **리소스 없음**: "수정할 단어를 찾을 수 없습니다."
- **중복 데이터**: "이미 존재하는 영문약어입니다."
- **금지어 검출**: "금지된 단어입니다. 사유: {reason}"
- **잘못된 파라미터**: "잘못된 페이지네이션 파라미터입니다."
- **서버 오류**: "서버에서 데이터 조회 중 오류가 발생했습니다."

---

## 참고사항

### 파일명 파라미터

대부분의 API에서 `filename` 파라미터는 선택적입니다. 제공하지 않으면 기본 파일명이 사용됩니다:

- Vocabulary: `vocabulary.json`
- Domain: `domain.json`
- Term: `term.json`

### 페이지네이션

페이지네이션은 1부터 시작합니다 (`page >= 1`).

### 정렬

- `sortOrder`: `asc` (오름차순) 또는 `desc` (내림차순)
- 정렬 필드는 엔드포인트별로 다릅니다.

### 필터링

- 중복 필터: `filter=duplicates` 또는 `filter=duplicates:standardName,abbreviation`
- 도메인 미매핑 필터: `unmappedDomain=true`

### 검색

- 부분 일치 검색이 기본입니다.
- 정확 일치 검색: `exact=true`
- 검색어는 1-100자 사이여야 합니다.

---

**마지막 업데이트**: 2026-03-13
