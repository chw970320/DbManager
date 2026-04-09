# 공통 유틸리티(Common Utils) 테스트 설명

이 문서는 `src/lib/utils` 디렉토리에 위치한 공통 유틸리티 함수들에 대한 모든 테스트 케이스에 대한 상세 설명을 제공합니다.

## 테스트 현황 요약

| 테스트 파일                          | 테스트 수 | 상태 |
| ------------------------------------ | --------- | ---- |
| `validation.test.ts`                 | 34개      | 완료 |
| `xlsx-parser.test.ts`                | 10개      | 완료 |
| `cache.test.ts`                      | 13개      | 완료 |
| `file-filter.test.ts`                | 29개      | 완료 |
| `file-selection.test.ts`             | 6개       | 완료 |
| `test-data-reset.test.ts`            | 2개       | 완료 |
| `upload-history-registry.test.ts`    | 3개       | 완료 |
| `navigation.test.ts`                 | 2개       | 완료 |
| `debounce.test.ts`                   | 8개       | 완료 |
| `shared-file-mapping-name.test.ts`   | 3개       | 완료 |
| `editor-close-guard.test.ts`         | 5개       | 완료 |
| `cascade-update-rules.test.ts`       | 3개       | 완료 |
| `cascade-update-plan.test.ts`        | 2개       | 완료 |
| `cascade-update-transaction.test.ts` | 1개       | 완료 |
| **합계**                             | **120개** |      |

**참고**: `file-handler.test.ts`와 `database-design-handler.test.ts`는 복잡한 파일 시스템 의존성으로 인해 API 테스트에서 간접적으로 검증됩니다.

> **추가 회귀 포인트 (2026-04-09)**:
> `cascade-update-*` 유틸은 단어집/도메인/용어집 수정 저장 시 preview/apply가 같은 dry-run 결과를 사용해야 하며,
> exact `_` token 치환, 비결정적 domain 추천 충돌 차단, 요청 단위 rollback이 유지되어야 합니다.

---

## 1. validation.test.ts (34개)

**파일 경로**: `src/lib/utils/validation.test.ts`

데이터 모델 유효성 검증 로직을 테스트합니다.

### isValidUUID (2개)

| 테스트명                             | 설명                | 검증 내용                    |
| ------------------------------------ | ------------------- | ---------------------------- |
| should return true for valid UUID v4 | 유효한 UUID v4 반환 | UUID v4 형식 검증 성공       |
| should return false for invalid UUID | 무효한 UUID 반환    | 잘못된 형식의 UUID 검증 실패 |

### isValidISODate (2개)

| 테스트명                              | 설명                 | 검증 내용                    |
| ------------------------------------- | -------------------- | ---------------------------- |
| should return true for valid ISO date | 유효한 ISO 날짜 반환 | ISO 8601 형식 검증 성공      |
| should return false for invalid date  | 무효한 날짜 반환     | 잘못된 형식의 날짜 검증 실패 |

### isNonEmptyString (2개)

| 테스트명                                           | 설명                      | 검증 내용                                  |
| -------------------------------------------------- | ------------------------- | ------------------------------------------ |
| should return true for non-empty string            | 비어있지 않은 문자열 반환 | 공백이 아닌 문자열 검증 성공               |
| should return false for empty string or whitespace | 빈 문자열 또는 공백 반환  | 빈 문자열이나 공백만 있는 문자열 검증 실패 |

### isPositiveInteger (2개)

| 테스트명                                            | 설명                    | 검증 내용                          |
| --------------------------------------------------- | ----------------------- | ---------------------------------- |
| should return true for positive integer             | 양의 정수 반환          | 양의 정수 검증 성공                |
| should return false for non-positive or non-integer | 비양수 또는 비정수 반환 | 0, 음수, 소수, 문자열 등 검증 실패 |

### isValidArray (2개)

| 테스트명                          | 설명        | 검증 내용                       |
| --------------------------------- | ----------- | ------------------------------- |
| should return true for array      | 배열 반환   | 배열 검증 성공                  |
| should return false for non-array | 비배열 반환 | 객체, 문자열, null 등 검증 실패 |

### validateVocabularyEntryStrict (3개)

| 테스트명                                      | 설명                    | 검증 내용                                    |
| --------------------------------------------- | ----------------------- | -------------------------------------------- |
| should validate valid vocabulary entry        | 유효한 단어 엔트리 검증 | 필수 필드 및 형식 검증 성공                  |
| should throw error for invalid UUID           | 무효한 UUID 에러        | 잘못된 UUID 형식 시 DataValidationError 발생 |
| should throw error for missing required field | 필수 필드 누락 에러     | 필수 필드 누락 시 DataValidationError 발생   |

### validateDomainEntryStrict (2개)

| 테스트명                             | 설명                      | 검증 내용                                 |
| ------------------------------------ | ------------------------- | ----------------------------------------- |
| should validate valid domain entry   | 유효한 도메인 엔트리 검증 | 필수 필드 및 형식 검증 성공               |
| should throw error for invalid entry | 무효한 엔트리 에러        | 잘못된 엔트리 시 DataValidationError 발생 |

### validateTermEntryStrict (2개)

| 테스트명                             | 설명                    | 검증 내용                                 |
| ------------------------------------ | ----------------------- | ----------------------------------------- |
| should validate valid term entry     | 유효한 용어 엔트리 검증 | 필수 필드 및 형식 검증 성공               |
| should throw error for invalid entry | 무효한 엔트리 에러      | 잘못된 엔트리 시 DataValidationError 발생 |

### validateIdParam (2개)

| 테스트명                               | 설명                    | 검증 내용                    |
| -------------------------------------- | ----------------------- | ---------------------------- |
| should not throw for valid UUID string | 유효한 UUID 문자열 검증 | 유효한 UUID 문자열 검증 성공 |
| should throw for invalid id            | 무효한 ID 에러          | 잘못된 ID 형식 시 에러 발생  |

### validatePagination (3개)

| 테스트명                                     | 설명                              | 검증 내용                                |
| -------------------------------------------- | --------------------------------- | ---------------------------------------- |
| should return valid pagination params        | 유효한 페이지네이션 파라미터 반환 | 정상적인 page/limit 파라미터 처리        |
| should use default values for invalid params | 무효한 파라미터 기본값 사용       | 잘못된 파라미터 시 기본값(1, 20) 사용    |
| should clamp values to valid ranges          | 값 범위 제한                      | page는 최소 1, limit은 최대 100으로 제한 |

---

### validateTermColumnOrderMapping (10개)

| 테스트명                                                                                          | 설명                       | 검증 내용                                      |
| ------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------- |
| should pass when term and column order match correctly                                            | 정상 순서 매핑             | 오류 없음, mismatch 없음                       |
| should detect order mismatch when column parts are swapped                                        | 순서 뒤바뀜 감지           | mismatch 2건, correctedColumnName 생성         |
| should detect when a valid abbreviation from vocabulary is in wrong position                      | 유효 약어의 위치 오류 감지 | 단어집에 있는 약어라도 위치가 다르면 오류 반환 |
| should skip validation when term and column part counts differ                                    | 파트 수 불일치 스킵        | 검증 생략, 오류 없음                           |
| should skip validation when termName is empty                                                     | 빈 용어명 스킵             | 검증 생략                                      |
| should skip validation when columnName is empty                                                   | 빈 컬럼명 스킵             | 검증 생략                                      |
| should not report mismatch when column part is not in vocabulary (handled by COLUMN_NAME_MAPPING) | 미등록 컬럼 파트 예외      | 별도 매핑 검증에 위임                          |
| should not report mismatch when term part is not in vocabulary (handled by TERM_NAME_MAPPING)     | 미등록 용어 파트 예외      | 별도 매핑 검증에 위임                          |
| should handle case-insensitive comparison                                                         | 대소문자 무시 비교         | 소문자 컬럼명도 정상 처리                      |
| should detect partial order mismatch (only some positions swapped)                                | 부분 순서 오류 감지        | 잘못된 위치만 mismatch로 수집                  |

### generateStandardDomainName (2개)

| 테스트명                                                        | 설명                 | 검증 내용                                        |
| --------------------------------------------------------------- | -------------------- | ------------------------------------------------ |
| should use mapped abbreviation for registered data types        | 등록된 매핑약어 사용 | `TIMESTAMP -> TS`, `DOUBLE PRECISION -> DP` 생성 |
| should fall back to the first character for unmapped data types | 미등록 타입 fallback | 매핑이 없으면 첫 글자 규칙 유지                  |

---

## 2. xlsx-parser.test.ts (10개)

**파일 경로**: `src/lib/utils/xlsx-parser.test.ts`

XLSX 파일 파싱 로직을 테스트합니다.

### parseWorkbookToArray (3개)

| 테스트명                                       | 설명                    | 검증 내용                           |
| ---------------------------------------------- | ----------------------- | ----------------------------------- |
| should parse valid workbook to array           | 유효한 워크북 배열 파싱 | XLSX 파일을 2D 배열로 변환          |
| should throw error when workbook has no sheets | 시트 없음 에러          | 시트가 없는 파일 처리               |
| should throw error when data is insufficient   | 데이터 부족 에러        | 헤더만 있고 데이터가 없는 파일 처리 |

### parseArrayField (3개)

| 테스트명                                          | 설명                       | 검증 내용                                           |
| ------------------------------------------------- | -------------------------- | --------------------------------------------------- |
| should parse comma-separated string to array      | 쉼표 구분 문자열 배열 파싱 | "item1, item2, item3" → ['item1', 'item2', 'item3'] |
| should return empty array for empty or dash value | 빈 값 또는 대시 처리       | '', '-', undefined → []                             |
| should trim whitespace from items                 | 항목 공백 제거             | " item1 , item2 " → ['item1', 'item2']              |

### isEmptyRow (2개)

| 테스트명                                 | 설명              | 검증 내용                       |
| ---------------------------------------- | ----------------- | ------------------------------- |
| should return true for empty row         | 빈 행 반환        | 빈 배열이나 공백만 있는 행 검출 |
| should return false for row with content | 내용 있는 행 반환 | 실제 데이터가 있는 행 검출      |

### parseXlsxToJson (2개)

| 테스트명                                      | 설명                           | 검증 내용                               |
| --------------------------------------------- | ------------------------------ | --------------------------------------- |
| should parse valid XLSX to vocabulary entries | 유효한 XLSX 단어집 엔트리 파싱 | XLSX 파일을 VocabularyEntry 배열로 변환 |
| should skip empty rows                        | 빈 행 건너뛰기                 | 빈 행은 파싱 결과에서 제외              |

---

## 3. file-selection.test.ts (6개)

**파일 경로**: `src/lib/utils/file-selection.test.ts`

파일 업로드 관리 모달에서 대상 파일 select box 기본값을 결정하는 공통 로직을 테스트합니다.

| 테스트명                                                                 | 설명                           | 검증 내용                                                       |
| ------------------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------- |
| 선호 파일이 목록에 있으면 우선 선택한다                                  | 현재 browse 파일 우선 적용     | `preferredFilename`이 존재하면 해당 파일을 반환                 |
| 선호 파일이 없으면 현재 선택을 유지한다                                  | 사용자가 고른 업로드 대상 유지 | 유효한 `currentSelection`이 있으면 그대로 반환                  |
| 선호 파일과 현재 선택이 모두 없으면 첫 번째 파일을 선택한다              | 파일 목록 기본 폴백            | 목록 첫 번째 파일을 반환                                        |
| 파일이 없으면 fallback 파일을 선택한다                                   | 빈 목록 처리                   | 시스템 기본 파일명 같은 `fallbackFilename`을 반환               |
| 저장된 browse 선택 파일이 있으면 첫 번째 bksp 파일보다 우선 복원한다     | 탭 이동 후 파일 복원 회귀 방지 | 저장된 파일명이 목록에 있으면 첫 번째 `bksp.json`보다 우선 반환 |
| 저장된 browse 선택 파일이 사라졌으면 현재 목록의 첫 번째 파일로 폴백한다 | 삭제/필터링 이후 복구          | 저장된 파일이 없을 때 현재 목록 첫 번째 파일을 반환             |

---

## 4. cache.test.ts (13개)

**파일 경로**: `src/lib/utils/cache.test.ts`

메모리 내 캐싱 처리를 테스트합니다.

### vocabularyCache (5개)

| 테스트명                                       | 설명                    | 검증 내용                             |
| ---------------------------------------------- | ----------------------- | ------------------------------------- |
| should set and get cache                       | 캐시 설정 및 조회       | 데이터 저장 후 조회 성공              |
| should return undefined for non-existent cache | 존재하지 않는 캐시 반환 | 캐시에 없는 키 조회 시 undefined 반환 |
| should invalidate specific cache               | 특정 캐시 무효화        | 특정 키의 캐시 삭제                   |
| should invalidate all caches of a type         | 타입별 전체 캐시 무효화 | 특정 타입의 모든 캐시 삭제            |
| should clear all caches                        | 전체 캐시 클리어        | 모든 캐시 삭제                        |

### getCachedVocabularyData (2개)

| 테스트명                                 | 설명                      | 검증 내용                              |
| ---------------------------------------- | ------------------------- | -------------------------------------- |
| should return cached data if available   | 캐시된 데이터 반환        | 캐시에 있으면 파일 로드 없이 반환      |
| should load and cache data if not cached | 캐시 없을 때 로드 및 캐시 | 캐시에 없으면 파일 로드 후 캐시에 저장 |

### getCachedDomainData (2개)

| 테스트명                                 | 설명                      | 검증 내용                              |
| ---------------------------------------- | ------------------------- | -------------------------------------- |
| should return cached data if available   | 캐시된 데이터 반환        | 캐시에 있으면 파일 로드 없이 반환      |
| should load and cache data if not cached | 캐시 없을 때 로드 및 캐시 | 캐시에 없으면 파일 로드 후 캐시에 저장 |

### getCachedTermData (2개)

| 테스트명                                 | 설명                      | 검증 내용                              |
| ---------------------------------------- | ------------------------- | -------------------------------------- |
| should return cached data if available   | 캐시된 데이터 반환        | 캐시에 있으면 파일 로드 없이 반환      |
| should load and cache data if not cached | 캐시 없을 때 로드 및 캐시 | 캐시에 없으면 파일 로드 후 캐시에 저장 |

### invalidateAllCaches (1개)

| 테스트명                | 설명             | 검증 내용                               |
| ----------------------- | ---------------- | --------------------------------------- |
| should clear all caches | 전체 캐시 클리어 | vocabulary, domain, term 모든 캐시 삭제 |

### invalidateCache (1개)

| 테스트명                              | 설명                  | 검증 내용                       |
| ------------------------------------- | --------------------- | ------------------------------- |
| should invalidate specific type cache | 특정 타입 캐시 무효화 | 특정 타입의 특정 파일 캐시 삭제 |

---

## 4-1. shared-file-mapping-name.test.ts (3개)

**파일 경로**: `src/lib/utils/shared-file-mapping-name.test.ts`

공통 파일 매핑 번들의 자동 표시명 생성 규칙을 테스트합니다.

| 테스트명                                                               | 설명                  | 검증 내용                                               |
| ---------------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| should return a single bundle name when all file stems match           | 동일 파일군 번들명    | `bksp.json` 8종 조합이 `bksp 번들`로 요약되는지 확인    |
| should summarize standard files separately from default design files   | 표준/설계 혼합 번들명 | 표준용어 3종 커스텀 + 설계 5종 기본 조합 이름 생성 확인 |
| should return the default shared bundle label for the built-in mapping | 기본 번들명           | 기본 파일 조합이 `기본 공통 번들`로 생성되는지 확인     |

---

## 5. file-filter.test.ts (29개)

**파일 경로**: `src/lib/utils/file-filter.test.ts`

파일 목록 필터링 로직을 테스트합니다.

### isSystemVocabularyFile (2개)

| 테스트명                                       | 설명                    | 검증 내용                           |
| ---------------------------------------------- | ----------------------- | ----------------------------------- |
| should return true for system vocabulary files | 시스템 단어집 파일 확인 | vocabulary.json, history.json 확인  |
| should return false for user files             | 사용자 파일 확인        | 사용자 정의 파일은 시스템 파일 아님 |

### isSystemDomainFile (2개)

| 테스트명                                   | 설명                    | 검증 내용                           |
| ------------------------------------------ | ----------------------- | ----------------------------------- |
| should return true for system domain files | 시스템 도메인 파일 확인 | domain.json, history.json 확인      |
| should return false for user files         | 사용자 파일 확인        | 사용자 정의 파일은 시스템 파일 아님 |

### isSystemTermFile (2개)

| 테스트명                                 | 설명                  | 검증 내용                           |
| ---------------------------------------- | --------------------- | ----------------------------------- |
| should return true for system term files | 시스템 용어 파일 확인 | term.json, history.json 확인        |
| should return false for user files       | 사용자 파일 확인      | 사용자 정의 파일은 시스템 파일 아님 |

### isSystemDatabaseFile (2개)

| 테스트명                                     | 설명                          | 검증 내용                           |
| -------------------------------------------- | ----------------------------- | ----------------------------------- |
| should return true for system database files | 시스템 데이터베이스 파일 확인 | database.json 확인                  |
| should return false for user files           | 사용자 파일 확인              | 사용자 정의 파일은 시스템 파일 아님 |

### isSystemEntityFile (2개)

| 테스트명                                   | 설명                    | 검증 내용                           |
| ------------------------------------------ | ----------------------- | ----------------------------------- |
| should return true for system entity files | 시스템 엔터티 파일 확인 | entity.json 확인                    |
| should return false for user files         | 사용자 파일 확인        | 사용자 정의 파일은 시스템 파일 아님 |

### isSystemAttributeFile (2개)

| 테스트명                                      | 설명                  | 검증 내용                           |
| --------------------------------------------- | --------------------- | ----------------------------------- |
| should return true for system attribute files | 시스템 속성 파일 확인 | attribute.json 확인                 |
| should return false for user files            | 사용자 파일 확인      | 사용자 정의 파일은 시스템 파일 아님 |

### isSystemTableFile (2개)

| 테스트명                                  | 설명                    | 검증 내용                           |
| ----------------------------------------- | ----------------------- | ----------------------------------- |
| should return true for system table files | 시스템 테이블 파일 확인 | table.json 확인                     |
| should return false for user files        | 사용자 파일 확인        | 사용자 정의 파일은 시스템 파일 아님 |

### isSystemColumnFile (2개)

| 테스트명                                   | 설명                  | 검증 내용                           |
| ------------------------------------------ | --------------------- | ----------------------------------- |
| should return true for system column files | 시스템 컬럼 파일 확인 | column.json 확인                    |
| should return false for user files         | 사용자 파일 확인      | 사용자 정의 파일은 시스템 파일 아님 |

### filterVocabularyFiles (3개)

| 테스트명                                                 | 설명                                 | 검증 내용                                 |
| -------------------------------------------------------- | ------------------------------------ | ----------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링                   | showSystemFiles=false 시 시스템 파일 제외 |
| should return all files when showSystemFiles is true     | 전체 파일 반환                       | showSystemFiles=true 시 모든 파일 반환    |
| should return system files when no user files exist      | 사용자 파일 없을 때 시스템 파일 반환 | 사용자 파일이 없으면 시스템 파일도 반환   |

### filterDomainFiles (2개)

| 테스트명                                                 | 설명               | 검증 내용                                 |
| -------------------------------------------------------- | ------------------ | ----------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링 | showSystemFiles=false 시 시스템 파일 제외 |
| should return all files when showSystemFiles is true     | 전체 파일 반환     | showSystemFiles=true 시 모든 파일 반환    |

### filterTermFiles (2개)

| 테스트명                                                 | 설명               | 검증 내용                                 |
| -------------------------------------------------------- | ------------------ | ----------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링 | showSystemFiles=false 시 시스템 파일 제외 |
| should return all files when showSystemFiles is true     | 전체 파일 반환     | showSystemFiles=true 시 모든 파일 반환    |

### filterDatabaseFiles (2개)

| 테스트명                                                 | 설명               | 검증 내용                                 |
| -------------------------------------------------------- | ------------------ | ----------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링 | showSystemFiles=false 시 시스템 파일 제외 |
| should return all files when showSystemFiles is true     | 전체 파일 반환     | showSystemFiles=true 시 모든 파일 반환    |

### filterEntityFiles (1개)

| 테스트명                                                 | 설명               | 검증 내용                                 |
| -------------------------------------------------------- | ------------------ | ----------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링 | showSystemFiles=false 시 시스템 파일 제외 |

### filterAttributeFiles (1개)

| 테스트명                                                 | 설명               | 검증 내용                                 |
| -------------------------------------------------------- | ------------------ | ----------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링 | showSystemFiles=false 시 시스템 파일 제외 |

### filterTableFiles (1개)

| 테스트명                                                 | 설명               | 검증 내용                                 |
| -------------------------------------------------------- | ------------------ | ----------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링 | showSystemFiles=false 시 시스템 파일 제외 |

### filterColumnFiles (1개)

| 테스트명                                                 | 설명               | 검증 내용                                 |
| -------------------------------------------------------- | ------------------ | ----------------------------------------- |
| should filter system files when showSystemFiles is false | 시스템 파일 필터링 | showSystemFiles=false 시 시스템 파일 제외 |

---

## 6. debounce.test.ts (8개)

**파일 경로**: `src/lib/utils/debounce.test.ts`

디바운스 기능을 테스트합니다. (이미 완료된 테스트)

---

## 7. test-data-reset.test.ts (2개)

**파일 경로**: `src/lib/utils/test-data-reset.test.ts`

테스트용 전체 데이터 초기화 스크립트의 기준 상태 복원 동작을 테스트합니다.

| 테스트명                                                                   | 설명                      | 검증 내용                                                                                                                      |
| -------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| should remove user json files and recreate the default empty files         | 기존 데이터 초기화        | 사용자 JSON 삭제, 기본 파일 빈 데이터 재생성, registry/shared mapping/design snapshots/upload-history 초기화, 비대상 설정 유지 |
| should create the reset baseline even when the data directory starts empty | 빈 데이터 디렉터리 초기화 | 디렉터리가 비어 있어도 8개 기본 파일과 registry/shared mapping/design snapshots 기준 상태 생성                                 |

---

## 8. upload-history-registry.test.ts (3개)

**파일 경로**: `src/lib/registry/upload-history-registry.test.ts`

업로드 교체 이력 저장소의 타입별 분할 저장, prune, 복원 규칙을 테스트합니다.

| 테스트명                                                      | 설명           | 검증 내용                         |
| ------------------------------------------------------------- | -------------- | --------------------------------- |
| 업로드 교체 직전 JSON 본문을 타입별 저장소에 저장한다         | 이력 생성      | 타입별 파일 저장, mapping 제거    |
| 30일이 지난 이력을 prune하고 최신 순으로 반환한다             | 보존 정책/정렬 | 만료 이력 제거, 최신 순 정렬      |
| 복원은 현재 파일 JSON 본문만 되돌리고 새 이력을 만들지 않는다 | 복원 규칙      | JSON 본문 복원, 새 history 미생성 |

---

## 9. navigation.test.ts (2개)

**파일 경로**: `src/lib/utils/navigation.test.ts`

상단 2단계 메뉴 정의에서 현재 경로의 breadcrumb와 그룹 정보를 파생하는 공통 로직을 테스트합니다.

| 테스트명                                                                | 설명                         | 검증 내용                                                          |
| ----------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| should resolve a grouped route to its menu group and current item       | 현재 경로의 메뉴 매칭 확인   | `/profiling/browse` 같은 경로에서 그룹/현재 메뉴를 정확히 찾음     |
| should build breadcrumb items with sibling menu links for grouped pages | breadcrumb 파생 및 이동 목록 | `lv1`에는 동료 그룹 목록, `lv2`에는 현재 그룹의 메뉴 목록이 포함됨 |

---

## 9. editor-close-guard.test.ts (5개)

**파일 경로**: `src/lib/utils/editor-close-guard.test.ts`

입력형 Editor 모달의 공통 닫기 가드를 테스트합니다.

| 테스트명                                                     | 설명               | 검증 내용                                              |
| ------------------------------------------------------------ | ------------------ | ------------------------------------------------------ |
| should detect pristine state for equal values                | 동일 상태 비교     | 키 순서가 달라도 dirty=false 로 판단되는지 확인        |
| should detect dirty state when a value changes               | 변경 상태 비교     | 값이 하나라도 바뀌면 dirty=true 로 판단되는지 확인     |
| should close immediately without confirm when pristine       | pristine 즉시 닫기 | 확인 다이얼로그 없이 `onClose`가 호출되는지 확인       |
| should ask for confirm when dirty and only close on approval | dirty 확인 후 닫기 | 확인 거절 시 유지, 승인 시에만 닫히는지 확인           |
| should ignore close requests while submitting                | 제출 중 닫기 차단  | 저장/제출 중에는 확인 없이 닫기 요청이 무시되는지 확인 |

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
pnpm test src/lib/utils/test-data-reset.test.ts
pnpm test src/lib/utils/navigation.test.ts
pnpm test src/lib/utils/editor-close-guard.test.ts

# 감시 모드
pnpm test src/lib/utils --watch
```

---

## 변경 이력

| 날짜       | 변경 내용                                                         |
| ---------- | ----------------------------------------------------------------- |
| 2025-01-09 | 초기 문서 작성 (82개 테스트)                                      |
| 2026-03-11 | validation 유틸리티 테스트 확장 (98개 테스트)                     |
| 2026-03-12 | file-selection 복원 회귀 테스트 추가 (100개 테스트)               |
| 2026-03-12 | test-data-reset 초기화 테스트 추가 (102개 테스트)                 |
| 2026-03-13 | navigation breadcrumb 유틸리티 테스트 추가 (104개 테스트)         |
| 2026-03-13 | test-data-reset에 design snapshots 초기화 반영                    |
| 2026-04-08 | editor-close-guard 공통 모달 닫기 회귀 테스트 추가 (112개 테스트) |

---

## 참고사항

### file-handler.test.ts 및 database-design-handler.test.ts

`file-handler.ts`와 `database-design-handler.ts`는 복잡한 파일 시스템 의존성(`fs/promises`, `fs`, `path` 등)과 내부 함수들(`ensureDataDirectory`, `getDataPath` 등)을 가지고 있어 완전한 단위 테스트 작성이 어렵습니다.

대신 이 함수들은 다음 API 테스트에서 간접적으로 검증됩니다:

- `/api/vocabulary`, `/api/domain`, `/api/term` API 테스트
- `/api/database`, `/api/entity`, `/api/attribute`, `/api/table`, `/api/column` API 테스트

이러한 API 테스트들이 실제로 파일 핸들러 함수들을 호출하므로, 핵심 기능은 충분히 검증됩니다.
