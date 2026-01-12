# 용어(Term) 주제영역 테스트 설명

이 문서는 용어(Term) 주제영역의 모든 테스트 케이스에 대한 상세 설명을 제공합니다.

## 테스트 현황 요약

| 테스트 파일                          | 테스트 수 | 상태 |
| ------------------------------------ | --------- | ---- |
| `term/server.test.ts`                | 18개      | 완료 |
| `term/sync/server.test.ts`           | 7개       | 완료 |
| `term/validate/server.test.ts`       | 9개       | 완료 |
| `term/validate-all/server.test.ts`   | 5개       | 완료 |
| `term/files/server.test.ts`          | 12개      | 완료 |
| `term/upload/server.test.ts`         | 5개       | 완료 |
| `term/download/server.test.ts`       | 5개       | 완료 |
| `term/filter-options/server.test.ts` | 7개       | 완료 |
| `term/recommend/server.test.ts`      | 6개       | 완료 |
| `generator/server.test.ts`           | 8개       | 완료 |
| `TermEditor.test.ts`                 | 12개      | 완료 |
| `TermFileManager.test.ts`            | 9개       | 완료 |
| `TermTable.test.ts`                  | 6개       | 완료 |
| `TermGenerator.test.ts`              | 4개       | 완료 |
| `TermValidationPanel.test.ts`        | 6개       | 완료 |
| **합계**                             | **112개** |      |

---

## 1. term/server.test.ts (18개)

**파일 경로**: `src/routes/api/term/server.test.ts`

용어 CRUD API의 핵심 기능을 검증합니다. 매핑 상태 확인이 포함됩니다.

### GET (7개)

| 테스트명                                            | 설명                         | 검증 내용                                  |
| --------------------------------------------------- | ---------------------------- | ------------------------------------------ |
| should return term data successfully                | 용어 데이터 조회 성공        | 200 응답, success=true, entries 배열 반환  |
| should return paginated data correctly              | 페이지네이션 정상 동작       | page/limit 파라미터 적용, hasNextPage 계산 |
| should return 400 for invalid pagination parameters | 잘못된 페이지네이션 파라미터 | page=0 또는 limit 범위 초과 시 400 에러    |
| should return 400 for invalid sort field            | 지원하지 않는 정렬 필드      | 유효하지 않은 sortBy 값에 400 에러         |
| should handle data loading error gracefully         | 데이터 로딩 오류 처리        | 파일 로드 실패 시 500 에러                 |
| should use specified filename parameter             | 파일명 파라미터 사용         | filename 쿼리 파라미터 적용                |
| should use default filename when not specified      | 기본 파일명 사용             | 파라미터 없을 때 term.json 사용            |

### POST (4개)

| 테스트명                                                      | 설명                          | 검증 내용                                            |
| ------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------- |
| should create a new term entry successfully (mapping success) | 새 용어 생성 성공 (매핑 성공) | 201 응답, UUID 생성, isMappedTerm/Column/Domain=true |
| should create a new term entry with mapping failure           | 새 용어 생성 (매핑 실패)      | 매핑 실패 시 isMapped... 플래그가 false인지 확인     |
| should return 400 when required fields are missing            | 필수 필드 누락                | termName, columnName, domainName 누락 시 400         |
| should use specified filename parameter                       | 파일명 파라미터 사용          | filename 쿼리 파라미터 적용 및 저장 확인             |

### PUT (via POST with id) (3개)

| 테스트명                                     | 설명                 | 검증 내용                                |
| -------------------------------------------- | -------------------- | ---------------------------------------- |
| should update an existing entry successfully | 용어 수정 성공       | 200 응답, 매핑 상태 재계산 확인          |
| should return 404 when entry not found       | 존재하지 않는 항목   | 없는 id로 수정 시도 시 404 에러          |
| should use specified filename parameter      | 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 및 저장 확인 |

### DELETE (4개)

| 테스트명                                     | 설명                 | 검증 내용                                |
| -------------------------------------------- | -------------------- | ---------------------------------------- |
| should delete an existing entry successfully | 용어 삭제 성공       | 200 응답, 삭제 완료 메시지               |
| should return 400 when id is missing         | ID 누락              | id 파라미터 없이 요청 시 400 에러        |
| should return 404 when entry not found       | 존재하지 않는 항목   | 없는 id로 삭제 시도 시 404 에러          |
| should use specified filename parameter      | 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 및 저장 확인 |

---

## 2. term/sync/server.test.ts (7개)

**파일 경로**: `src/routes/api/term/sync/server.test.ts`

용어 매핑 동기화 API를 테스트합니다.

| 테스트명                                                                                   | 설명                        | 검증 내용                            |
| ------------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------ |
| 매핑 동기화 성공: 단어집/도메인 변경 후 동기화 시 매핑 상태가 올바르게 업데이트되는지 확인 | 매핑 동기화 성공            | matched/unmatched 카운트 정확히 반환 |
| 동기화 결과 카운트: 업데이트된 항목 수가 정확히 반환되는지 확인                            | 업데이트 카운트 정확히 반환 | 변경된 항목 수 정확히 계산           |
| filename 파라미터 사용: filename 파라미터로 특정 파일에서 동기화 수행                      | 지정된 파일명 사용          | filename 파라미터 적용               |
| should use default filename when not specified                                             | 기본 파일명 사용            | 파라미터 없을 때 term.json 사용      |
| should return 500 on vocabulary load error                                                 | 단어집 로드 오류 처리       | loadVocabularyData 실패 시 500 에러  |
| should return 500 on domain load error                                                     | 도메인 로드 오류 처리       | loadDomainData 실패 시 500 에러      |
| should return 500 on save error                                                            | 저장 오류 처리              | saveTermData 실패 시 500 에러        |

---

## 3. term/validate/server.test.ts (9개)

**파일 경로**: `src/routes/api/term/validate/server.test.ts`

용어 유효성 검증 API를 테스트합니다.

| 테스트명                                                                    | 설명                 | 검증 내용                       |
| --------------------------------------------------------------------------- | -------------------- | ------------------------------- |
| 용어 유효성 검증 성공: 유효한 용어 입력 시 success를 반환한다               | 유효성 검증 성공     | success=true 반환               |
| 필수 필드 누락: termName 누락 시 400 에러를 반환한다                        | termName 누락        | 400 에러 반환                   |
| 필수 필드 누락: columnName 누락 시 400 에러를 반환한다                      | columnName 누락      | 400 에러 반환                   |
| 용어명이 2단어 미만인 경우 400 에러를 반환한다                              | 용어명 길이 검증     | 2단어 미만 시 400 에러          |
| 용어명 접미사 validation 실패 시 400 에러를 반환한다                        | 접미사 검증 실패     | 접미사 규칙 위반 시 400 에러    |
| 용어명 중복 검사 (신규): 이미 존재하는 termName 입력 시 409 에러를 반환한다 | 중복 검사 (신규)     | 중복 에러 반환                  |
| 용어명 중복 검사 (수정): 자기 자신을 제외하고 중복 검사를 통과한다          | 중복 검사 (수정)     | entryId 전달 시 자신 제외       |
| should use specified filename parameter                                     | 파일명 파라미터 사용 | filename 쿼리 파라미터 적용     |
| should use default filename when not specified                              | 기본 파일명 사용     | 파라미터 없을 때 term.json 사용 |

---

## 4. term/validate-all/server.test.ts (5개)

**파일 경로**: `src/routes/api/term/validate-all/server.test.ts`

전체 용어 일괄 검증 API를 테스트합니다.

| 테스트명                                            | 설명                    | 검증 내용                              |
| --------------------------------------------------- | ----------------------- | -------------------------------------- |
| should validate all terms successfully              | 전체 용어 검증 성공     | 200 응답, 검증 결과 배열 반환          |
| should return validation errors for invalid entries | 유효하지 않은 항목 검증 | 검증 오류가 있는 항목에 대한 오류 반환 |
| should use specified filename parameter             | 파일명 파라미터 사용    | filename 쿼리 파라미터 적용            |
| should use default filename when not specified      | 기본 파일명 사용        | 파라미터 없을 때 term.json 사용        |
| should return 500 on data load error                | 데이터 로드 오류 처리   | loadTermData 실패 시 500 에러          |

---

## 5. term/files/server.test.ts (12개)

**파일 경로**: `src/routes/api/term/files/server.test.ts`

용어 파일 관리 API를 테스트합니다. 파일 목록 조회, 생성, 이름 변경, 삭제 기능을 검증합니다.

### GET (2개)

| 테스트명                             | 설명                | 검증 내용                     |
| ------------------------------------ | ------------------- | ----------------------------- |
| should return file list successfully | 파일 목록 조회 성공 | 200 응답, 파일 목록 배열 반환 |
| should return 500 on error           | 조회 오류 처리      | 파일 시스템 오류 시 500 에러  |

### POST (3개)

| 테스트명                                   | 설명              | 검증 내용                         |
| ------------------------------------------ | ----------------- | --------------------------------- |
| should create a new file successfully      | 새 파일 생성 성공 | 201 응답, createTermFile 호출     |
| should return 400 when filename is missing | 파일명 누락       | filename 없이 요청 시 400 에러    |
| should return 500 when file creation fails | 파일 생성 실패    | 이미 존재하는 파일 등 오류 시 500 |

### PUT (4개)

| 테스트명                                      | 설명             | 검증 내용                         |
| --------------------------------------------- | ---------------- | --------------------------------- |
| should rename file successfully               | 파일명 변경 성공 | 200 응답, renameTermFile 호출     |
| should return 400 when oldFilename is missing | 기존 파일명 누락 | oldFilename 없이 요청 시 400 에러 |
| should return 400 when newFilename is missing | 새 파일명 누락   | newFilename 없이 요청 시 400 에러 |
| should return 500 when rename fails           | 파일명 변경 실패 | 파일 없음 등 오류 시 500          |

### DELETE (3개)

| 테스트명                                   | 설명           | 검증 내용                      |
| ------------------------------------------ | -------------- | ------------------------------ |
| should delete file successfully            | 파일 삭제 성공 | 200 응답, deleteTermFile 호출  |
| should return 400 when filename is missing | 파일명 누락    | filename 없이 요청 시 400 에러 |
| should return 500 when delete fails        | 파일 삭제 실패 | 삭제 권한 없음 등 오류 시 500  |

---

## 6. term/upload/server.test.ts (5개)

**파일 경로**: `src/routes/api/term/upload/server.test.ts`

용어 데이터를 XLSX 파일로 업로드하는 API를 테스트합니다.

### GET (1개)

| 테스트명                               | 설명                  | 검증 내용                             |
| -------------------------------------- | --------------------- | ------------------------------------- |
| should return upload info successfully | 업로드 정보 조회 성공 | 200 응답, 지원 형식 및 컬럼 정보 반환 |

### POST (4개)

| 테스트명                                   | 설명                  | 검증 내용                              |
| ------------------------------------------ | --------------------- | -------------------------------------- |
| should upload XLSX file successfully       | XLSX 파일 업로드 성공 | 200 응답, uploadedCount 반환           |
| should return 400 for invalid content type | 잘못된 Content-Type   | multipart/form-data가 아닐 때 400 에러 |
| should return 400 for invalid file format  | 잘못된 파일 형식      | XLSX가 아닌 파일 업로드 시 400 에러    |
| should use specified filename parameter    | 파일명 파라미터 사용  | filename 파라미터 적용                 |

---

## 7. term/download/server.test.ts (5개)

**파일 경로**: `src/routes/api/term/download/server.test.ts`

용어 데이터를 XLSX 파일로 다운로드하는 API를 테스트합니다.

| 테스트명                                       | 설명                    | 검증 내용                                   |
| ---------------------------------------------- | ----------------------- | ------------------------------------------- |
| should download XLSX file successfully         | XLSX 파일 다운로드 성공 | Content-Type, Content-Disposition 헤더 확인 |
| should return 404 when no entries exist        | 데이터 없음             | entries가 없을 때 404 에러                  |
| should return 500 on data load error           | 데이터 로드 오류 처리   | loadTermData 실패 시 500 에러               |
| should use specified filename parameter        | 파일명 파라미터 사용    | filename 쿼리 파라미터 적용                 |
| should use default filename when not specified | 기본 파일명 사용        | 파라미터 없을 때 term.json 사용             |

---

## 8. term/filter-options/server.test.ts (7개)

**파일 경로**: `src/routes/api/term/filter-options/server.test.ts`

필터 옵션 조회 API를 테스트합니다. 각 필터 가능한 컬럼의 고유값을 반환합니다.

| 테스트명                                               | 설명                  | 검증 내용                            |
| ------------------------------------------------------ | --------------------- | ------------------------------------ |
| should return filter options successfully              | 필터 옵션 조회 성공   | 200 응답, 각 컬럼별 고유값 배열 반환 |
| should return unique values for each filterable column | 각 컬럼별 고유값 반환 | 중복 제거된 값들 반환                |
| should use specified filename parameter                | 파일명 파라미터 사용  | filename 쿼리 파라미터 적용          |
| should use default filename when not specified         | 기본 파일명 사용      | 파라미터 없을 때 term.json 사용      |
| should return 500 on data load error                   | 데이터 로드 오류 처리 | loadTermData 실패 시 500 에러        |
| should sort filter options alphabetically              | 필터 옵션 정렬        | 가나다순 정렬 확인                   |
| should handle empty entries array                      | 빈 entries 배열 처리  | entries가 비어있을 때 빈 배열 반환   |

---

## 9. term/recommend/server.test.ts (6개)

**파일 경로**: `src/routes/api/term/recommend/server.test.ts`

도메인 추천 API를 테스트합니다.

| 테스트명                                                        | 설명                  | 검증 내용                                |
| --------------------------------------------------------------- | --------------------- | ---------------------------------------- |
| should return domain recommendations successfully               | 도메인 추천 성공      | 200 응답, 추천 도메인 목록 반환          |
| should return empty recommendations when termName is empty      | 빈 용어명 처리        | termName이 없을 때 빈 배열 반환          |
| should return empty recommendations when last segment not found | 마지막 세그먼트 없음  | 단어집에 없는 세그먼트일 때 빈 배열 반환 |
| should use specified filename parameter                         | 파일명 파라미터 사용  | filename 쿼리 파라미터 적용              |
| should use default filename when not specified                  | 기본 파일명 사용      | 파라미터 없을 때 term.json 사용          |
| should return 500 on data load error                            | 데이터 로드 오류 처리 | loadTermData 실패 시 500 에러            |

---

## 10. generator/server.test.ts (8개)

**파일 경로**: `src/routes/api/generator/server.test.ts`

용어 자동 생성 API를 테스트합니다.

| 테스트명                                                              | 설명                    | 검증 내용                           |
| --------------------------------------------------------------------- | ----------------------- | ----------------------------------- |
| 용어 조합 생성 성공: 한국어 입력 시 가능한 영문 컬럼명 조합 반환      | 용어 조합 생성 성공     | 200 응답, results 배열 반환         |
| 단어집에 없는 단어: 단어집에 없는 단어 포함 시 빈 배열 또는 에러 반환 | 단어집에 없는 단어 처리 | '##'이 포함된 결과 반환             |
| 한 단어 입력: 단일 단어 입력 시 조합 생성                             | 단일 단어 처리          | 단일 단어로도 조합 생성             |
| filename 파라미터 사용: filename 파라미터로 특정 단어집 파일 사용     | 파일명 파라미터 사용    | filename 파라미터 적용              |
| should use default filename when not specified                        | 기본 파일명 사용        | 파라미터 없을 때 term.json 사용     |
| should return 400 when term is missing                                | 용어 누락               | term 없을 때 400 에러               |
| should return 500 on vocabulary load error                            | 단어집 로드 오류 처리   | loadVocabularyData 실패 시 500 에러 |

---

## 11. TermEditor.test.ts (12개)

**파일 경로**: `src/lib/components/TermEditor.test.ts`

용어 생성/수정 모달 컴포넌트를 테스트합니다.

### Rendering (5개)

| 테스트명                                                            | 설명                    | 검증 내용                               |
| ------------------------------------------------------------------- | ----------------------- | --------------------------------------- |
| should render modal with "새 용어 추가" title when not in edit mode | 생성 모드 타이틀        | isEditMode=false 시 "새 용어 추가" 표시 |
| should render modal with "용어 수정" title when in edit mode        | 수정 모드 타이틀        | isEditMode=true 시 "용어 수정" 표시     |
| should display required field labels                                | 필수 필드 라벨 표시     | 용어명, 컬럼명, 도메인명 라벨 존재      |
| should populate form with entry data in edit mode                   | 수정 모드 데이터 바인딩 | entry props 값이 폼에 표시              |
| should show server error message when provided                      | 서버 에러 표시          | serverError props 값 표시               |

### Form Validation (3개)

| 테스트명                                                                 | 설명                       | 검증 내용                   |
| ------------------------------------------------------------------------ | -------------------------- | --------------------------- |
| should disable save button when required fields are empty                | 필수 필드 빈값 시 비활성화 | 저장 버튼 disabled 상태     |
| should enable save button when all required fields are filled            | 필수 필드 입력 시 활성화   | 저장 버튼 enabled 상태      |
| should show error message for empty required field after input and clear | 필수 필드 에러 메시지      | 값 삭제 시 에러 메시지 표시 |

### Edit Mode Behavior (1개)

| 테스트명                                    | 설명                  | 검증 내용          |
| ------------------------------------------- | --------------------- | ------------------ |
| should show "저장" button text in edit mode | 수정 모드 버튼 텍스트 | "저장" 텍스트 표시 |

### User Interactions (2개)

| 테스트명                                          | 설명                | 검증 내용                    |
| ------------------------------------------------- | ------------------- | ---------------------------- |
| should have cancel button that can be clicked     | 취소 버튼 클릭 가능 | 취소 버튼 존재 및 활성화     |
| should have close icon button that can be clicked | 닫기 버튼 클릭 가능 | X 아이콘 버튼 존재 및 활성화 |

### Mapping Status (1개)

| 테스트명                                                         | 설명                  | 검증 내용             |
| ---------------------------------------------------------------- | --------------------- | --------------------- |
| should display mapping status icons when entry has mapping flags | 매핑 상태 아이콘 표시 | 매핑 상태 아이콘 표시 |
| should display mapping status icons when entry has mapping flags | 매핑 상태 아이콘 표시 | 매핑 상태 아이콘 표시 |

---

## 12. TermFileManager.test.ts (9개)

**파일 경로**: `src/lib/components/TermFileManager.test.ts`

파일 관리 모달 컴포넌트를 테스트합니다.

### Rendering (2개)

| 테스트명                        | 설명                 | 검증 내용               |
| ------------------------------- | -------------------- | ----------------------- |
| 모달이 열릴 때 파일 목록 렌더링 | 모달 열기 시 UI 표시 | "파일 관리" 텍스트 표시 |
| 파일 목록 표시                  | 파일 목록 API 호출   | `/api/term/files` 호출  |

### File Operations (3개)

| 테스트명               | 설명           | 검증 내용              |
| ---------------------- | -------------- | ---------------------- |
| 새 파일 생성 버튼 표시 | 생성 버튼 존재 | 새 파일 생성 버튼 표시 |
| 파일 이름 변경 기능    | 파일 이름 변경 | PUT 요청 처리          |
| 파일 삭제 기능         | 파일 삭제      | DELETE 요청 처리       |

### Selected File (2개)

| 테스트명                        | 설명                | 검증 내용             |
| ------------------------------- | ------------------- | --------------------- |
| 선택된 파일 강조 표시           | 선택된 파일 UI 강조 | 선택된 파일 강조 표시 |
| 파일 선택 시 change 이벤트 발생 | 파일 선택 이벤트    | 파일 목록 로드 확인   |

### Upload Tab (1개)

| 테스트명       | 설명         | 검증 내용      |
| -------------- | ------------ | -------------- |
| 업로드 탭 표시 | 업로드 탭 UI | 업로드 탭 표시 |

### Domain Mapping (1개)

| 테스트명              | 설명                  | 검증 내용                     |
| --------------------- | --------------------- | ----------------------------- |
| 도메인 파일 매핑 기능 | 도메인 파일 목록 로드 | `/api/domain/files` 호출 확인 |

> **참고**: Svelte 5에서는 `component.$on()`이 더 이상 사용되지 않으므로, 이벤트 직접 테스트 대신 컴포넌트의 동작(API 호출, UI 표시 등)을 확인하는 방식으로 테스트를 작성했습니다.

---

## 13. TermTable.test.ts (6개)

**파일 경로**: `src/lib/components/TermTable.test.ts`

데이터 테이블 컴포넌트를 테스트합니다.

### Rendering (2개)

| 테스트명                        | 설명             | 검증 내용                      |
| ------------------------------- | ---------------- | ------------------------------ |
| should render entries correctly | 용어 목록 렌더링 | entries props에 따른 행 렌더링 |
| should display loading state    | 로딩 상태 표시   | loading props에 따른 로딩 표시 |

### Sorting (1개)

| 테스트명                                                | 설명             | 검증 내용                     |
| ------------------------------------------------------- | ---------------- | ----------------------------- |
| should trigger sort event when column header is clicked | 정렬 이벤트 발생 | 컬럼 헤더 클릭 시 sort 이벤트 |

### Pagination (1개)

| 테스트명                         | 설명               | 검증 내용                        |
| -------------------------------- | ------------------ | -------------------------------- |
| should trigger page change event | 페이지 변경 이벤트 | 페이지 변경 시 pagechange 이벤트 |

### Mapping Status (2개)

| 테스트명                                                | 설명                | 검증 내용                            |
| ------------------------------------------------------- | ------------------- | ------------------------------------ |
| should display mapping status icons for each row        | 행별 매핑 상태 표시 | 각 행에 매핑 상태 아이콘 표시        |
| should filter by mapping failure when filter is applied | 매핑 실패 필터      | 매핑 실패 필터 적용 시 filter 이벤트 |

---

## 14. TermGenerator.test.ts (4개)

**파일 경로**: `src/lib/components/TermGenerator.test.ts`

용어 자동 생성 UI 컴포넌트를 테스트합니다.

### Rendering (1개)

| 테스트명                     | 설명           | 검증 내용                 |
| ---------------------------- | -------------- | ------------------------- |
| should render generator form | 생성 폼 렌더링 | 생성 폼이 표시되는지 확인 |

### Term Generation (3개)

| 테스트명                                             | 설명             | 검증 내용                      |
| ---------------------------------------------------- | ---------------- | ------------------------------ |
| should call API when generate button is clicked      | 용어 생성 요청   | 생성 버튼 클릭 시 API 호출     |
| should display results list when API returns results | 결과 목록 렌더링 | API 응답에 따라 결과 목록 표시 |

---

## 15. TermValidationPanel.test.ts (6개)

**파일 경로**: `src/lib/components/TermValidationPanel.test.ts`

용어 검증 결과 패널 컴포넌트를 테스트합니다.

### Rendering (2개)

| 테스트명                                   | 설명             | 검증 내용                   |
| ------------------------------------------ | ---------------- | --------------------------- |
| should render validation results when open | 검증 결과 렌더링 | open=true 시 검증 결과 표시 |
| should display validation statistics       | 검증 통계 표시   | 통계 정보가 표시되는지 확인 |

### Filtering (2개)

| 테스트명                              | 설명           | 검증 내용                    |
| ------------------------------------- | -------------- | ---------------------------- |
| should filter results by error type   | 오류 유형 필터 | 오류 유형별 필터링 동작 확인 |
| should filter results by search query | 검색 필터      | 검색 쿼리로 필터링 동작 확인 |

### Actions (2개)

| 테스트명                                                    | 설명             | 검증 내용                             |
| ----------------------------------------------------------- | ---------------- | ------------------------------------- |
| should trigger edit event when edit button is clicked       | 편집 이벤트 발생 | 편집 버튼 클릭 시 edit 이벤트         |
| should trigger autofix event when autofix button is clicked | 자동 수정 이벤트 | 자동 수정 버튼 클릭 시 autofix 이벤트 |

---

## 실행 명령어

```bash
# 전체 용어 테스트 실행
pnpm test term

# 특정 API 테스트
pnpm test src/routes/api/term/server.test.ts

# 컴포넌트 테스트
pnpm test src/lib/components/TermEditor.test.ts
pnpm test src/lib/components/TermTable.test.ts
pnpm test src/lib/components/TermGenerator.test.ts
pnpm test src/lib/components/TermValidationPanel.test.ts
pnpm test src/lib/components/TermFileManager.test.ts

# 감시 모드
pnpm test term --watch
```

---

## 변경 이력

| 날짜       | 변경 내용                     |
| ---------- | ----------------------------- |
| 2025-01-09 | 초기 문서 작성 (112개 테스트) |
