# 공통 유틸리티(Common Utils) 테스트 설명

이 문서는 `src/lib/utils` 디렉토리에 위치한 공통 유틸리티 함수들에 대한 모든 테스트 케이스에 대한 상세 설명을 제공합니다.

## 테스트 현황 요약

| 테스트 파일                              | 테스트 수 | 상태 |
| ---------------------------------------- | --------- | ---- |
| `validation.test.ts`                     | 22개      | 완료 |
| `xlsx-parser.test.ts`                    | 10개      | 완료 |
| `cache.test.ts`                          | 13개      | 완료 |
| `file-filter.test.ts`                    | 29개      | 완료 |
| `debounce.test.ts`                       | 8개       | 완료 |
| **합계**                                 | **82개**  |      |

**참고**: `file-handler.test.ts`와 `database-design-handler.test.ts`는 복잡한 파일 시스템 의존성으로 인해 API 테스트에서 간접적으로 검증됩니다.

---

## 1. validation.test.ts (22개)

**파일 경로**: `src/lib/utils/validation.test.ts`

데이터 모델 유효성 검증 로직을 테스트합니다.

### isValidUUID (2개)

| 테스트명                          | 설명                | 검증 내용                                   |
| --------------------------------- | ------------------- | ------------------------------------------- |
| should return true for valid UUID v4 | 유효한 UUID v4 반환 | UUID v4 형식 검증 성공                      |
| should return false for invalid UUID | 무효한 UUID 반환    | 잘못된 형식의 UUID 검증 실패                |

### isValidISODate (2개)

| 테스트명                            | 설명                    | 검증 내용                                   |
| ----------------------------------- | ----------------------- | ------------------------------------------- |
| should return true for valid ISO date | 유효한 ISO 날짜 반환    | ISO 8601 형식 검증 성공                     |
| should return false for invalid date | 무효한 날짜 반환        | 잘못된 형식의 날짜 검증 실패                |

### isNonEmptyString (2개)

| 테스트명                              | 설명                    | 검증 내용                                   |
| ------------------------------------- | ----------------------- | ------------------------------------------- |
| should return true for non-empty string | 비어있지 않은 문자열 반환 | 공백이 아닌 문자열 검증 성공                |
| should return false for empty string or whitespace | 빈 문자열 또는 공백 반환 | 빈 문자열이나 공백만 있는 문자열 검증 실패 |

### isPositiveInteger (2개)

| 테스트명                              | 설명                    | 검증 내용                                   |
| ------------------------------------- | ----------------------- | ------------------------------------------- |
| should return true for positive integer | 양의 정수 반환          | 양의 정수 검증 성공                         |
| should return false for non-positive or non-integer | 비양수 또는 비정수 반환 | 0, 음수, 소수, 문자열 등 검증 실패          |

### isValidArray (2개)

| 테스트명                      | 설명        | 검증 내용                                   |
| ----------------------------- | ----------- | ------------------------------------------- |
| should return true for array  | 배열 반환   | 배열 검증 성공                               |
| should return false for non-array | 비배열 반환 | 객체, 문자열, null 등 검증 실패             |

### validateVocabularyEntryStrict (3개)

| 테스트명                                      | 설명                    | 검증 내용                                   |
| --------------------------------------------- | ----------------------- | ------------------------------------------- |
| should validate valid vocabulary entry        | 유효한 단어 엔트리 검증 | 필수 필드 및 형식 검증 성공                 |
| should throw error for invalid UUID          | 무효한 UUID 에러        | 잘못된 UUID 형식 시 DataValidationError 발생 |
| should throw error for missing required field | 필수 필드 누락 에러      | 필수 필드 누락 시 DataValidationError 발생  |

### validateDomainEntryStrict (2개)

| 테스트명                              | 설명                    | 검증 내용                                   |
| ------------------------------------- | ----------------------- | ------------------------------------------- |
| should validate valid domain entry    | 유효한 도메인 엔트리 검증 | 필수 필드 및 형식 검증 성공                 |
| should throw error for invalid entry  | 무효한 엔트리 에러      | 잘못된 엔트리 시 DataValidationError 발생    |

### validateTermEntryStrict (2개)

| 테스트명                            | 설명                    | 검증 내용                                   |
| ----------------------------------- | ----------------------- | ------------------------------------------- |
| should validate valid term entry    | 유효한 용어 엔트리 검증 | 필수 필드 및 형식 검증 성공                 |
| should throw error for invalid entry | 무효한 엔트리 에러      | 잘못된 엔트리 시 DataValidationError 발생    |

### validateIdParam (2개)

| 테스트명                          | 설명                    | 검증 내용                                   |
| --------------------------------- | ----------------------- | ------------------------------------------- |
| should not throw for valid UUID string | 유효한 UUID 문자열 검증 | 유효한 UUID 문자열 검증 성공                |
| should throw for invalid id       | 무효한 ID 에러          | 잘못된 ID 형식 시 에러 발생                 |

### validatePagination (3개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should return valid pagination params       | 유효한 페이지네이션 파라미터 반환 | 정상적인 page/limit 파라미터 처리           |
| should use default values for invalid params | 무효한 파라미터 기본값 사용 | 잘못된 파라미터 시 기본값(1, 20) 사용      |
| should clamp values to valid ranges        | 값 범위 제한            | page는 최소 1, limit은 최대 100으로 제한   |

---

## 2. xlsx-parser.test.ts (10개)

**파일 경로**: `src/lib/utils/xlsx-parser.test.ts`

XLSX 파일 파싱 로직을 테스트합니다.

### parseWorkbookToArray (3개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should parse valid workbook to array        | 유효한 워크북 배열 파싱  | XLSX 파일을 2D 배열로 변환                  |
| should throw error when workbook has no sheets | 시트 없음 에러        | 시트가 없는 파일 처리                       |
| should throw error when data is insufficient | 데이터 부족 에러        | 헤더만 있고 데이터가 없는 파일 처리         |

### parseArrayField (3개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should parse comma-separated string to array | 쉼표 구분 문자열 배열 파싱 | "item1, item2, item3" → ['item1', 'item2', 'item3'] |
| should return empty array for empty or dash value | 빈 값 또는 대시 처리    | '', '-', undefined → []                     |
| should trim whitespace from items          | 항목 공백 제거          | "  item1  ,  item2  " → ['item1', 'item2'] |

### isEmptyRow (2개)

| 테스트명                          | 설명        | 검증 내용                                   |
| --------------------------------- | ----------- | ------------------------------------------- |
| should return true for empty row | 빈 행 반환   | 빈 배열이나 공백만 있는 행 검출             |
| should return false for row with content | 내용 있는 행 반환 | 실제 데이터가 있는 행 검출                 |

### parseXlsxToJson (2개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should parse valid XLSX to vocabulary entries | 유효한 XLSX 단어집 엔트리 파싱 | XLSX 파일을 VocabularyEntry 배열로 변환     |
| should skip empty rows                      | 빈 행 건너뛰기          | 빈 행은 파싱 결과에서 제외                  |

---

## 3. cache.test.ts (13개)

**파일 경로**: `src/lib/utils/cache.test.ts`

메모리 내 캐싱 처리를 테스트합니다.

### vocabularyCache (5개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should set and get cache                    | 캐시 설정 및 조회        | 데이터 저장 후 조회 성공                    |
| should return undefined for non-existent cache | 존재하지 않는 캐시 반환 | 캐시에 없는 키 조회 시 undefined 반환       |
| should invalidate specific cache            | 특정 캐시 무효화        | 특정 키의 캐시 삭제                         |
| should invalidate all caches of a type      | 타입별 전체 캐시 무효화 | 특정 타입의 모든 캐시 삭제                  |
| should clear all caches                     | 전체 캐시 클리어        | 모든 캐시 삭제                              |

### getCachedVocabularyData (2개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should return cached data if available      | 캐시된 데이터 반환       | 캐시에 있으면 파일 로드 없이 반환           |
| should load and cache data if not cached    | 캐시 없을 때 로드 및 캐시 | 캐시에 없으면 파일 로드 후 캐시에 저장      |

### getCachedDomainData (2개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should return cached data if available      | 캐시된 데이터 반환       | 캐시에 있으면 파일 로드 없이 반환           |
| should load and cache data if not cached    | 캐시 없을 때 로드 및 캐시 | 캐시에 없으면 파일 로드 후 캐시에 저장      |

### getCachedTermData (2개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should return cached data if available      | 캐시된 데이터 반환       | 캐시에 있으면 파일 로드 없이 반환           |
| should load and cache data if not cached    | 캐시 없을 때 로드 및 캐시 | 캐시에 없으면 파일 로드 후 캐시에 저장      |

### invalidateAllCaches (1개)

| 테스트명                          | 설명            | 검증 내용                                   |
| --------------------------------- | --------------- | ------------------------------------------- |
| should clear all caches            | 전체 캐시 클리어 | vocabulary, domain, term 모든 캐시 삭제     |

### invalidateCache (1개)

| 테스트명                              | 설명                    | 검증 내용                                   |
| ------------------------------------- | ----------------------- | ------------------------------------------- |
| should invalidate specific type cache | 특정 타입 캐시 무효화    | 특정 타입의 특정 파일 캐시 삭제             |

---

## 4. file-filter.test.ts (29개)

**파일 경로**: `src/lib/utils/file-filter.test.ts`

파일 목록 필터링 로직을 테스트합니다.

### isSystemVocabularyFile (2개)

| 테스트명                              | 설명                    | 검증 내용                                   |
| ------------------------------------- | ----------------------- | ------------------------------------------- |
| should return true for system vocabulary files | 시스템 단어집 파일 확인  | vocabulary.json, history.json 확인         |
| should return false for user files    | 사용자 파일 확인         | 사용자 정의 파일은 시스템 파일 아님        |

### isSystemDomainFile (2개)

| 테스트명                          | 설명                | 검증 내용                                   |
| --------------------------------- | ------------------- | ------------------------------------------- |
| should return true for system domain files | 시스템 도메인 파일 확인 | domain.json, history.json 확인              |
| should return false for user files | 사용자 파일 확인     | 사용자 정의 파일은 시스템 파일 아님        |

### isSystemTermFile (2개)

| 테스트명                        | 설명              | 검증 내용                                   |
| ------------------------------- | ----------------- | ------------------------------------------- |
| should return true for system term files | 시스템 용어 파일 확인 | term.json, history.json 확인                |
| should return false for user files | 사용자 파일 확인   | 사용자 정의 파일은 시스템 파일 아님        |

### isSystemDatabaseFile (2개)

| 테스트명                              | 설명                    | 검증 내용                                   |
| ------------------------------------- | ----------------------- | ------------------------------------------- |
| should return true for system database files | 시스템 데이터베이스 파일 확인 | database.json 확인                          |
| should return false for user files    | 사용자 파일 확인         | 사용자 정의 파일은 시스템 파일 아님        |

### isSystemEntityFile (2개)

| 테스트명                          | 설명                | 검증 내용                                   |
| --------------------------------- | ------------------- | ------------------------------------------- |
| should return true for system entity files | 시스템 엔터티 파일 확인 | entity.json 확인                            |
| should return false for user files | 사용자 파일 확인     | 사용자 정의 파일은 시스템 파일 아님        |

### isSystemAttributeFile (2개)

| 테스트명                                | 설명                  | 검증 내용                                   |
| --------------------------------------- | --------------------- | ------------------------------------------- |
| should return true for system attribute files | 시스템 속성 파일 확인 | attribute.json 확인                         |
| should return false for user files      | 사용자 파일 확인       | 사용자 정의 파일은 시스템 파일 아님        |

### isSystemTableFile (2개)

| 테스트명                          | 설명                | 검증 내용                                   |
| --------------------------------- | ------------------- | ------------------------------------------- |
| should return true for system table files | 시스템 테이블 파일 확인 | table.json 확인                             |
| should return false for user files | 사용자 파일 확인     | 사용자 정의 파일은 시스템 파일 아님        |

### isSystemColumnFile (2개)

| 테스트명                            | 설명                | 검증 내용                                   |
| ----------------------------------- | ------------------- | ------------------------------------------- |
| should return true for system column files | 시스템 컬럼 파일 확인 | column.json 확인                            |
| should return false for user files  | 사용자 파일 확인     | 사용자 정의 파일은 시스템 파일 아님        |

### filterVocabularyFiles (3개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링       | showSystemFiles=false 시 시스템 파일 제외  |
| should return all files when showSystemFiles is true | 전체 파일 반환           | showSystemFiles=true 시 모든 파일 반환      |
| should return system files when no user files exist | 사용자 파일 없을 때 시스템 파일 반환 | 사용자 파일이 없으면 시스템 파일도 반환     |

### filterDomainFiles (2개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링       | showSystemFiles=false 시 시스템 파일 제외  |
| should return all files when showSystemFiles is true | 전체 파일 반환           | showSystemFiles=true 시 모든 파일 반환      |

### filterTermFiles (2개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링       | showSystemFiles=false 시 시스템 파일 제외  |
| should return all files when showSystemFiles is true | 전체 파일 반환           | showSystemFiles=true 시 모든 파일 반환      |

### filterDatabaseFiles (2개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링       | showSystemFiles=false 시 시스템 파일 제외  |
| should return all files when showSystemFiles is true | 전체 파일 반환           | showSystemFiles=true 시 모든 파일 반환      |

### filterEntityFiles (1개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링       | showSystemFiles=false 시 시스템 파일 제외  |

### filterAttributeFiles (1개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링       | showSystemFiles=false 시 시스템 파일 제외  |

### filterTableFiles (1개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링       | showSystemFiles=false 시 시스템 파일 제외  |

### filterColumnFiles (1개)

| 테스트명                                    | 설명                    | 검증 내용                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링       | showSystemFiles=false 시 시스템 파일 제외  |

---

## 5. debounce.test.ts (8개)

**파일 경로**: `src/lib/utils/debounce.test.ts`

디바운스 기능을 테스트합니다. (이미 완료된 테스트)

---

## 실행 명령어

```bash
# 전체 유틸리티 테스트 실행
pnpm test src/lib/utils

# 특정 파일 테스트
pnpm test src/lib/utils/file-handler.test.ts
pnpm test src/lib/utils/database-design-handler.test.ts
pnpm test src/lib/utils/validation.test.ts
pnpm test src/lib/utils/xlsx-parser.test.ts
pnpm test src/lib/utils/cache.test.ts
pnpm test src/lib/utils/file-filter.test.ts

# 감시 모드
pnpm test src/lib/utils --watch
```

---

## 변경 이력

| 날짜       | 변경 내용                                    |
| ---------- | -------------------------------------------- |
| 2025-01-09 | 초기 문서 작성 (82개 테스트)                 |

---

## 참고사항

### file-handler.test.ts 및 database-design-handler.test.ts

`file-handler.ts`와 `database-design-handler.ts`는 복잡한 파일 시스템 의존성(`fs/promises`, `fs`, `path` 등)과 내부 함수들(`ensureDataDirectory`, `getDataPath` 등)을 가지고 있어 완전한 단위 테스트 작성이 어렵습니다. 

대신 이 함수들은 다음 API 테스트에서 간접적으로 검증됩니다:
- `/api/vocabulary`, `/api/domain`, `/api/term` API 테스트
- `/api/database`, `/api/entity`, `/api/attribute`, `/api/table`, `/api/column` API 테스트

이러한 API 테스트들이 실제로 파일 핸들러 함수들을 호출하므로, 핵심 기능은 충분히 검증됩니다.
