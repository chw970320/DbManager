# 단어(Vocabulary) 주제영역 테스트 설명

이 문서는 단어(Vocabulary) 주제영역의 모든 테스트 케이스에 대한 상세 설명을 제공합니다.

## 테스트 현황 요약

| 테스트 파일                                 | 테스트 수 | 상태 |
| ------------------------------------------- | --------- | ---- |
| `vocabulary/+server.test.ts`                | 18개      | 완료 |
| `vocabulary/validate/+server.test.ts`       | 8개       | 완료 |
| `vocabulary/duplicates/+server.test.ts`     | 4개       | 완료 |
| `vocabulary/files/+server.test.ts`          | 12개      | 완료 |
| `vocabulary/files/mapping/+server.test.ts`  | 10개      | 완료 |
| `vocabulary/sync-domain/+server.test.ts`    | 9개       | 완료 |
| `vocabulary/download/+server.test.ts`       | 8개       | 완료 |
| `vocabulary/filter-options/+server.test.ts` | 9개       | 완료 |
| `search/+server.test.ts`                    | 19개      | 완료 |
| `VocabularyEditor.test.ts`                  | 18개      | 완료 |
| **합계**                                    | **113개** |      |

---

## 1. vocabulary/+server.test.ts (18개)

**파일 경로**: `src/routes/api/vocabulary/+server.test.ts`

단어집 CRUD API의 핵심 기능을 검증합니다.

### GET (5개)

| 테스트명                                            | 설명                         | 검증 내용                                  |
| --------------------------------------------------- | ---------------------------- | ------------------------------------------ |
| should return vocabulary data successfully          | 단어 데이터 조회 성공        | 200 응답, success=true, entries 배열 반환  |
| should return paginated data correctly              | 페이지네이션 정상 동작       | page/limit 파라미터 적용, hasNextPage 계산 |
| should return 400 for invalid pagination parameters | 잘못된 페이지네이션 파라미터 | page=0 또는 limit 범위 초과 시 400 에러    |
| should return 400 for invalid sort field            | 지원하지 않는 정렬 필드      | 유효하지 않은 sortBy 값에 400 에러         |
| should handle data loading error gracefully         | 데이터 로딩 오류 처리        | 파일 로드 실패 시 500 에러                 |
| should use specified filename parameter             | 파일명 파라미터 사용         | filename 쿼리 파라미터 적용                |
| should use default filename when not specified      | 기본 파일명 사용             | 파라미터 없을 때 undefined 전달            |

### POST (4개)

| 테스트명                                           | 설명                 | 검증 내용                                           |
| -------------------------------------------------- | -------------------- | --------------------------------------------------- |
| should create a new vocabulary entry successfully  | 새 단어 생성 성공    | 201 응답, UUID 생성, createdAt/updatedAt 설정       |
| should return 400 when required fields are missing | 필수 필드 누락       | standardName, abbreviation, englishName 누락 시 400 |
| should return 409 when abbreviation is duplicate   | 영문약어 중복        | 이미 존재하는 abbreviation 입력 시 409              |
| should use specified filename parameter            | 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 및 저장 확인            |

### PUT (4개)

| 테스트명                                     | 설명                 | 검증 내용                                |
| -------------------------------------------- | -------------------- | ---------------------------------------- |
| should update an existing entry successfully | 단어 수정 성공       | 200 응답, description 등 필드 업데이트   |
| should return 400 when id is missing         | ID 누락              | id 필드 없이 요청 시 400 에러            |
| should return 404 when entry not found       | 존재하지 않는 항목   | 없는 id로 수정 시도 시 404 에러          |
| should use specified filename parameter      | 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 및 저장 확인 |

### DELETE (4개)

| 테스트명                                     | 설명                 | 검증 내용                                |
| -------------------------------------------- | -------------------- | ---------------------------------------- |
| should delete an existing entry successfully | 단어 삭제 성공       | 200 응답, 삭제 완료 메시지               |
| should return 400 when id is missing         | ID 누락              | id 파라미터 없이 요청 시 400 에러        |
| should return 404 when entry not found       | 존재하지 않는 항목   | 없는 id로 삭제 시도 시 404 에러          |
| should use specified filename parameter      | 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 및 저장 확인 |

---

## 2. vocabulary/validate/+server.test.ts (8개)

**파일 경로**: `src/routes/api/vocabulary/validate/+server.test.ts`

단어 유효성 검증 API를 테스트합니다. 금칙어, 이음동의어, 영문약어 중복을 검사합니다.

| 테스트명                                       | 설명                            | 검증 내용                             |
| ---------------------------------------------- | ------------------------------- | ------------------------------------- |
| 금칙어 검증 성공                               | 금칙어가 아닌 단어 입력         | success=true 반환                     |
| 금칙어 검증 실패                               | 금칙어로 등록된 단어 입력       | 에러 메시지와 함께 실패 반환          |
| 이음동의어 검증                                | 이음동의어로 등록된 단어 입력   | 경고 메시지 반환                      |
| 영문약어 중복 검사 (신규)                      | 이미 존재하는 abbreviation 입력 | 중복 에러 반환                        |
| 영문약어 중복 검사 (수정)                      | 자기 자신 제외하고 중복 검사    | entryId 전달 시 자신 제외             |
| 필수 파라미터 누락                             | standardName/abbreviation 누락  | 400 에러 반환                         |
| should use specified filename parameter        | 파일명 파라미터 사용            | filename 쿼리 파라미터 적용           |
| should use default filename when not specified | 기본 파일명 사용                | 파라미터 없을 때 vocabulary.json 사용 |

---

## 3. vocabulary/duplicates/+server.test.ts (4개)

**파일 경로**: `src/routes/api/vocabulary/duplicates/+server.test.ts`

중복된 영문약어를 가진 단어 그룹을 조회하는 API를 테스트합니다.

| 테스트명            | 설명                          | 검증 내용                               |
| ------------------- | ----------------------------- | --------------------------------------- |
| 중복 단어 조회 성공 | 중복된 abbreviation 그룹 반환 | 동일 abbreviation을 가진 entries 그룹화 |
| 중복 없음           | 중복이 없을 때 빈 배열 반환   | data: [] 반환                           |
| 파일명 지정         | 특정 파일에서만 중복 조회     | filename 파라미터로 파일 지정           |
| 에러 처리           | 데이터 로드 실패 시 500 에러  | loadVocabularyData 실패 시 에러 응답    |

---

## 4. vocabulary/files/+server.test.ts (12개)

**파일 경로**: `src/routes/api/vocabulary/files/+server.test.ts`

단어집 파일 관리 API를 테스트합니다. 파일 목록 조회, 생성, 이름 변경, 삭제 기능을 검증합니다.

### GET (2개)

| 테스트명                             | 설명                | 검증 내용                     |
| ------------------------------------ | ------------------- | ----------------------------- |
| should return file list successfully | 파일 목록 조회 성공 | 200 응답, 파일 목록 배열 반환 |
| should return 500 on error           | 조회 오류 처리      | 파일 시스템 오류 시 500 에러  |

### POST (3개)

| 테스트명                                   | 설명              | 검증 내용                           |
| ------------------------------------------ | ----------------- | ----------------------------------- |
| should create a new file successfully      | 새 파일 생성 성공 | 201 응답, createVocabularyFile 호출 |
| should return 400 when filename is missing | 파일명 누락       | filename 없이 요청 시 400 에러      |
| should return 500 when file creation fails | 파일 생성 실패    | 이미 존재하는 파일 등 오류 시 500   |

### PUT (4개)

| 테스트명                                      | 설명             | 검증 내용                           |
| --------------------------------------------- | ---------------- | ----------------------------------- |
| should rename file successfully               | 파일명 변경 성공 | 200 응답, renameVocabularyFile 호출 |
| should return 400 when oldFilename is missing | 기존 파일명 누락 | oldFilename 없이 요청 시 400 에러   |
| should return 400 when newFilename is missing | 새 파일명 누락   | newFilename 없이 요청 시 400 에러   |
| should return 500 when rename fails           | 파일명 변경 실패 | 파일 없음 등 오류 시 500            |

### DELETE (3개)

| 테스트명                                   | 설명           | 검증 내용                           |
| ------------------------------------------ | -------------- | ----------------------------------- |
| should delete file successfully            | 파일 삭제 성공 | 200 응답, deleteVocabularyFile 호출 |
| should return 400 when filename is missing | 파일명 누락    | filename 없이 요청 시 400 에러      |
| should return 500 when delete fails        | 파일 삭제 실패 | 삭제 권한 없음 등 오류 시 500       |

---

## 5. vocabulary/files/mapping/+server.test.ts (10개)

**파일 경로**: `src/routes/api/vocabulary/files/mapping/+server.test.ts`

단어집과 도메인 파일 간의 매핑 정보를 관리하는 API를 테스트합니다.

### GET (5개)

| 테스트명                                       | 설명                 | 검증 내용                             |
| ---------------------------------------------- | -------------------- | ------------------------------------- |
| should return mapping info successfully        | 매핑 정보 조회 성공  | 200 응답, mapping.domain 반환         |
| should use specified filename parameter        | 파일명 파라미터 사용 | filename 쿼리 파라미터 적용           |
| should use default filename when not specified | 기본 파일명 사용     | 파라미터 없을 때 vocabulary.json 사용 |
| should return default mapping when not set     | 기본 매핑값 반환     | mapping 없을 때 domain.json 기본값    |
| should return 500 on error                     | 조회 오류 처리       | 파일 로드 실패 시 500 에러            |

### PUT (5개)

| 테스트명                                         | 설명                | 검증 내용                            |
| ------------------------------------------------ | ------------------- | ------------------------------------ |
| should save mapping info successfully            | 매핑 정보 저장 성공 | 200 응답, saveVocabularyData 호출    |
| should return 400 when filename is missing       | 파일명 누락         | filename 없이 요청 시 400 에러       |
| should return 400 when mapping is missing        | 매핑 정보 누락      | mapping 없이 요청 시 400 에러        |
| should return 400 when mapping.domain is missing | domain 필드 누락    | mapping.domain 없이 요청 시 400 에러 |
| should return 500 on save error                  | 저장 오류 처리      | saveVocabularyData 실패 시 500 에러  |

---

## 6. vocabulary/sync-domain/+server.test.ts (9개)

**파일 경로**: `src/routes/api/vocabulary/sync-domain/+server.test.ts`

도메인 데이터와 단어 데이터를 동기화하는 API를 테스트합니다.

| 테스트명                                                    | 설명                          | 검증 내용                                        |
| ----------------------------------------------------------- | ----------------------------- | ------------------------------------------------ |
| should sync domain mapping successfully                     | 도메인 매핑 동기화 성공       | matched/unmatched 카운트 정확히 반환             |
| should use specified vocabulary and domain filenames        | 지정된 파일명 사용            | vocabularyFilename, domainFilename 파라미터 적용 |
| should use mapping.domain when domainFilename not specified | 매핑 정보의 domain 사용       | domainFilename 없을 때 mapping.domain 사용       |
| should return updated count correctly                       | 업데이트 카운트 정확히 반환   | 변경된 항목 수 정확히 계산                       |
| should handle entries without domainCategory as unmatched   | domainCategory 없는 항목 처리 | domainCategory 없으면 unmatched로 카운트         |
| should return 500 on vocabulary load error                  | 단어집 로드 오류 처리         | loadVocabularyData 실패 시 500 에러              |
| should return 500 on domain load error                      | 도메인 로드 오류 처리         | loadDomainData 실패 시 500 에러                  |
| should return 500 on save error                             | 저장 오류 처리                | saveVocabularyData 실패 시 500 에러              |

---

## 7. vocabulary/download/+server.test.ts (8개)

**파일 경로**: `src/routes/api/vocabulary/download/+server.test.ts`

단어집 데이터를 XLSX 파일로 다운로드하는 API를 테스트합니다.

| 테스트명                                       | 설명                    | 검증 내용                                   |
| ---------------------------------------------- | ----------------------- | ------------------------------------------- |
| should download XLSX file successfully         | XLSX 파일 다운로드 성공 | Content-Type, Content-Disposition 헤더 확인 |
| should apply sortBy and sortOrder correctly    | 정렬 적용 확인          | sortBy, sortOrder 파라미터에 따른 정렬      |
| should apply filter correctly                  | 필터 적용 확인          | filter 파라미터에 따른 필터링               |
| should return 400 for invalid sort field       | 잘못된 정렬 필드        | 유효하지 않은 sortBy 값에 400 에러          |
| should return 500 on data load error           | 데이터 로드 오류 처리   | loadVocabularyData 실패 시 500 에러         |
| should use specified filename parameter        | 파일명 파라미터 사용    | filename 쿼리 파라미터 적용                 |
| should use default filename when not specified | 기본 파일명 사용        | 파라미터 없을 때 undefined 전달             |

---

## 8. vocabulary/filter-options/+server.test.ts (9개)

**파일 경로**: `src/routes/api/vocabulary/filter-options/+server.test.ts`

필터 옵션 조회 API를 테스트합니다. 각 필터 가능한 컬럼의 고유값을 반환합니다.

| 테스트명                                               | 설명                      | 검증 내용                                   |
| ------------------------------------------------------ | ------------------------- | ------------------------------------------- |
| should return filter options successfully              | 필터 옵션 조회 성공       | 200 응답, 각 컬럼별 고유값 배열 반환        |
| should return unique values for each filterable column | 각 컬럼별 고유값 반환     | 중복 제거된 값들 반환                       |
| should include "(빈값)" option for nullable fields     | nullable 필드 빈값 처리   | domainCategory, source에 "(빈값)" 옵션 포함 |
| should convert isFormalWord boolean to Y/N             | boolean 값을 Y/N으로 변환 | isFormalWord true/false를 Y/N으로 변환      |
| should use specified filename parameter                | 파일명 파라미터 사용      | filename 쿼리 파라미터 적용                 |
| should use default filename when not specified         | 기본 파일명 사용          | 파라미터 없을 때 vocabulary.json 사용       |
| should return 500 on data load error                   | 데이터 로드 오류 처리     | loadVocabularyData 실패 시 500 에러         |
| should sort filter options alphabetically              | 필터 옵션 정렬            | 가나다순 정렬 확인                          |
| should handle empty entries array                      | 빈 entries 배열 처리      | entries가 비어있을 때 빈 배열 반환          |

---

## 9. search/+server.test.ts (19개)

**파일 경로**: `src/routes/api/search/+server.test.ts`

통합 검색 및 자동완성 API를 테스트합니다.

### GET (11개)

| 테스트명                                                 | 설명                  | 검증 내용                            |
| -------------------------------------------------------- | --------------------- | ------------------------------------ |
| should return partial match search results               | 부분 일치 검색 결과   | query로 부분 일치 검색 수행          |
| should return exact match search results when exact=true | 정확 일치 검색 결과   | exact=true 파라미터로 정확 일치 검색 |
| should sort results correctly                            | 검색 결과 정렬        | 정확 일치 > 시작 일치 > 포함 순 정렬 |
| should return 400 when query is empty                    | 빈 쿼리 처리          | query 없을 때 400 에러               |
| should search in synonyms when field=all                 | 이음동의어 검색       | field=all일 때 synonyms도 검색 대상  |
| should search in specific field when field is specified  | 특정 필드 검색        | field 파라미터로 특정 필드만 검색    |
| should apply pagination correctly                        | 페이지네이션 적용     | page, limit 파라미터 적용            |
| should return 400 for invalid field                      | 잘못된 필드           | 유효하지 않은 field 값에 400 에러    |
| should return 500 on data load error                     | 데이터 로드 오류 처리 | loadVocabularyData 실패 시 500 에러  |
| should use specified filename parameter                  | 파일명 파라미터 사용  | filename 쿼리 파라미터 적용          |
| should use default filename when not specified           | 기본 파일명 사용      | 파라미터 없을 때 undefined 전달      |

### POST (8개)

| 테스트명                                          | 설명                  | 검증 내용                           |
| ------------------------------------------------- | --------------------- | ----------------------------------- |
| should return search suggestions for autocomplete | 자동완성 제안 반환    | 검색어 기반 자동완성 제안           |
| should return suggestions from synonyms           | 이음동의어 제안       | synonyms에서도 제안 반환            |
| should limit suggestions to specified limit       | 제안 개수 제한        | limit 파라미터에 따른 제한          |
| should return 400 when query is empty             | 빈 쿼리 처리          | query 없을 때 400 에러              |
| should return 400 when query is too short         | 너무 짧은 쿼리        | 최소 길이 미달 시 400 에러          |
| should return 500 on data load error              | 데이터 로드 오류 처리 | loadVocabularyData 실패 시 500 에러 |
| should use specified filename parameter           | 파일명 파라미터 사용  | filename 쿼리 파라미터 적용         |
| should use default filename when not specified    | 기본 파일명 사용      | 파라미터 없을 때 undefined 전달     |

---

## 10. VocabularyEditor.test.ts (18개)

**파일 경로**: `src/lib/components/VocabularyEditor.test.ts`

단어 생성/수정/삭제 모달 컴포넌트를 테스트합니다.

### Rendering (6개)

| 테스트명                                                            | 설명                    | 검증 내용                               |
| ------------------------------------------------------------------- | ----------------------- | --------------------------------------- |
| should render modal with "새 단어 추가" title when not in edit mode | 생성 모드 타이틀        | isEditMode=false 시 "새 단어 추가" 표시 |
| should render modal with "단어 수정" title when in edit mode        | 수정 모드 타이틀        | isEditMode=true 시 "단어 수정" 표시     |
| should display required field labels                                | 필수 필드 라벨 표시     | 표준단어명, 영문약어, 영문명 라벨 존재  |
| should display optional field labels                                | 선택 필드 라벨 표시     | 설명, 이음동의어, 금칙어 라벨 존재      |
| should populate form with entry data in edit mode                   | 수정 모드 데이터 바인딩 | entry props 값이 폼에 표시              |
| should show server error message when provided                      | 서버 에러 표시          | serverError props 값 표시               |

### Form Validation (3개)

| 테스트명                                                      | 설명                       | 검증 내용                   |
| ------------------------------------------------------------- | -------------------------- | --------------------------- |
| should disable save button when required fields are empty     | 필수 필드 빈값 시 비활성화 | 저장 버튼 disabled 상태     |
| should enable save button when all required fields are filled | 필수 필드 입력 시 활성화   | 저장 버튼 enabled 상태      |
| should show error message for empty required field            | 필수 필드 에러 메시지      | 값 삭제 시 에러 메시지 표시 |

### Edit Mode Behavior (4개)

| 테스트명                                     | 설명                         | 검증 내용                                        |
| -------------------------------------------- | ---------------------------- | ------------------------------------------------ |
| should disable core inputs in edit mode      | 수정 모드 핵심 필드 비활성화 | standardName, abbreviation, englishName disabled |
| should show delete button in edit mode       | 수정 모드 삭제 버튼          | 삭제 버튼 표시                                   |
| should not show delete button in create mode | 생성 모드 삭제 버튼 없음     | 삭제 버튼 미표시                                 |
| should show "수정" button text in edit mode  | 수정 모드 버튼 텍스트        | "수정" 텍스트 표시                               |

### User Interactions (3개)

| 테스트명                                                 | 설명                | 검증 내용                    |
| -------------------------------------------------------- | ------------------- | ---------------------------- |
| should have cancel button that can be clicked            | 취소 버튼 클릭 가능 | 취소 버튼 존재 및 활성화     |
| should have close icon button that can be clicked        | 닫기 버튼 클릭 가능 | X 아이콘 버튼 존재 및 활성화 |
| should show confirm dialog when delete button is clicked | 삭제 확인 대화상자  | confirm 호출 확인            |

### Domain Category (2개)

| 테스트명                                                         | 설명                      | 검증 내용            |
| ---------------------------------------------------------------- | ------------------------- | -------------------- |
| should load domain category options on mount                     | 도메인 카테고리 로드      | API 호출 확인        |
| should disable domain category select when isFormalWord is false | 형식단어 아닐 때 비활성화 | select disabled 상태 |

---

## 실행 명령어

```bash
# 전체 단어 테스트 실행
pnpm test vocabulary

# 특정 API 테스트
pnpm test src/routes/api/vocabulary/+server.test.ts

# 컴포넌트 테스트
pnpm test src/lib/components/VocabularyEditor.test.ts

# 감시 모드
pnpm test vocabulary --watch
```

---

## 변경 이력

| 날짜       | 변경 내용                                                                    |
| ---------- | ---------------------------------------------------------------------------- |
| 2025-01-09 | 초기 문서 작성 (64개 테스트)                                                 |
| 2025-01-09 | sync-domain, download, filter-options, search API 테스트 추가 (105개 테스트) |
| 2025-01-09 | filename 파라미터 테스트 추가 및 validate API 수정 (113개 테스트)            |
