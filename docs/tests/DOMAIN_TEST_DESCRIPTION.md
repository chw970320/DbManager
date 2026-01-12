# 도메인(Domain) 주제영역 테스트 설명

이 문서는 도메인(Domain) 주제영역의 모든 테스트 케이스에 대한 상세 설명을 제공합니다.

## 테스트 현황 요약

| 테스트 파일                            | 테스트 수 | 상태 |
| -------------------------------------- | --------- | ---- |
| `domain/server.test.ts`                | 18개      | 완료 |
| `domain/validate/server.test.ts`       | 7개       | 완료 |
| `domain/files/server.test.ts`          | 12개      | 완료 |
| `domain/upload/server.test.ts`         | 5개       | 완료 |
| `domain/download/server.test.ts`       | 6개       | 완료 |
| `domain/filter-options/server.test.ts` | 8개       | 완료 |
| `DomainEditor.test.ts`                 | 15개      | 완료 |
| `DomainFileManager.test.ts`            | 8개       | 완료 |
| **합계**                               | **79개**  |      |

---

## 1. domain/server.test.ts (18개)

**파일 경로**: `src/routes/api/domain/server.test.ts`

도메인 CRUD API의 핵심 기능을 검증합니다.

### GET (7개)

| 테스트명                                            | 설명                         | 검증 내용                                  |
| --------------------------------------------------- | ---------------------------- | ------------------------------------------ |
| should return domain data successfully              | 도메인 데이터 조회 성공      | 200 응답, success=true, entries 배열 반환  |
| should return paginated data correctly              | 페이지네이션 정상 동작       | page/limit 파라미터 적용, hasNextPage 계산 |
| should return 400 for invalid pagination parameters | 잘못된 페이지네이션 파라미터 | page=0 또는 limit 범위 초과 시 400 에러    |
| should return 400 for invalid sort field            | 지원하지 않는 정렬 필드      | 유효하지 않은 sortBy 값에 400 에러         |
| should handle data loading error gracefully         | 데이터 로딩 오류 처리        | 파일 로드 실패 시 500 에러                 |
| should use specified filename parameter             | 파일명 파라미터 사용         | filename 쿼리 파라미터 적용                |
| should use default filename when not specified      | 기본 파일명 사용             | 파라미터 없을 때 domain.json 사용          |

### POST (4개)

| 테스트명                                               | 설명                 | 검증 내용                                                 |
| ------------------------------------------------------ | -------------------- | --------------------------------------------------------- |
| should create a new domain entry successfully          | 새 도메인 생성 성공  | 201 응답, UUID 생성, createdAt/updatedAt 설정             |
| should return 400 when required fields are missing     | 필수 필드 누락       | domainGroup, domainCategory, physicalDataType 누락 시 400 |
| should return 409 when standardDomainName is duplicate | 도메인명 중복        | 이미 존재하는 standardDomainName 입력 시 409              |
| should use specified filename parameter                | 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 및 저장 확인                  |

### PUT (4개)

| 테스트명                                     | 설명                 | 검증 내용                                |
| -------------------------------------------- | -------------------- | ---------------------------------------- |
| should update an existing entry successfully | 도메인 수정 성공     | 200 응답, description 등 필드 업데이트   |
| should return 400 when id is missing         | ID 누락              | id 필드 없이 요청 시 400 에러            |
| should return 404 when entry not found       | 존재하지 않는 항목   | 없는 id로 수정 시도 시 404 에러          |
| should use specified filename parameter      | 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 및 저장 확인 |

### DELETE (4개)

| 테스트명                                     | 설명                 | 검증 내용                                |
| -------------------------------------------- | -------------------- | ---------------------------------------- |
| should delete an existing entry successfully | 도메인 삭제 성공     | 200 응답, 삭제 완료 메시지               |
| should return 400 when id is missing         | ID 누락              | id 파라미터 없이 요청 시 400 에러        |
| should return 404 when entry not found       | 존재하지 않는 항목   | 없는 id로 삭제 시도 시 404 에러          |
| should use specified filename parameter      | 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 및 저장 확인 |

---

## 2. domain/validate/server.test.ts (7개)

**파일 경로**: `src/routes/api/domain/validate/server.test.ts`

도메인 유효성 검증 API를 테스트합니다. 도메인명 중복을 검사합니다.

| 테스트명                                          | 설명                         | 검증 내용                         |
| ------------------------------------------------- | ---------------------------- | --------------------------------- |
| 유효성 검증 성공                                  | 유효한 도메인 정보 입력      | success=true 반환                 |
| 필수 필드 누락: domainCategory 누락 시 400 에러   | domainCategory 누락          | 400 에러 반환                     |
| 필수 필드 누락: physicalDataType 누락 시 400 에러 | physicalDataType 누락        | 400 에러 반환                     |
| 중복 standardDomainName                           | 이미 존재하는 도메인명 입력  | 중복 에러 반환                    |
| 영문약어 중복 검사 (수정)                         | 자기 자신 제외하고 중복 검사 | entryId 전달 시 자신 제외         |
| should use specified filename parameter           | 파일명 파라미터 사용         | filename 쿼리 파라미터 적용       |
| should use default filename when not specified    | 기본 파일명 사용             | 파라미터 없을 때 domain.json 사용 |

---

## 3. domain/files/server.test.ts (12개)

**파일 경로**: `src/routes/api/domain/files/server.test.ts`

도메인 파일 관리 API를 테스트합니다. 파일 목록 조회, 생성, 이름 변경, 삭제 기능을 검증합니다.

### GET (2개)

| 테스트명                             | 설명                | 검증 내용                     |
| ------------------------------------ | ------------------- | ----------------------------- |
| should return file list successfully | 파일 목록 조회 성공 | 200 응답, 파일 목록 배열 반환 |
| should return 500 on error           | 조회 오류 처리      | 파일 시스템 오류 시 500 에러  |

### POST (3개)

| 테스트명                                   | 설명              | 검증 내용                         |
| ------------------------------------------ | ----------------- | --------------------------------- |
| should create a new file successfully      | 새 파일 생성 성공 | 201 응답, createDomainFile 호출   |
| should return 400 when filename is missing | 파일명 누락       | filename 없이 요청 시 400 에러    |
| should return 500 when file creation fails | 파일 생성 실패    | 이미 존재하는 파일 등 오류 시 500 |

### PUT (4개)

| 테스트명                                      | 설명             | 검증 내용                         |
| --------------------------------------------- | ---------------- | --------------------------------- |
| should rename file successfully               | 파일명 변경 성공 | 200 응답, renameDomainFile 호출   |
| should return 400 when oldFilename is missing | 기존 파일명 누락 | oldFilename 없이 요청 시 400 에러 |
| should return 400 when newFilename is missing | 새 파일명 누락   | newFilename 없이 요청 시 400 에러 |
| should return 500 when rename fails           | 파일명 변경 실패 | 파일 없음 등 오류 시 500          |

### DELETE (3개)

| 테스트명                                   | 설명           | 검증 내용                       |
| ------------------------------------------ | -------------- | ------------------------------- |
| should delete file successfully            | 파일 삭제 성공 | 200 응답, deleteDomainFile 호출 |
| should return 400 when filename is missing | 파일명 누락    | filename 없이 요청 시 400 에러  |
| should return 500 when delete fails        | 파일 삭제 실패 | 삭제 권한 없음 등 오류 시 500   |

---

## 4. domain/upload/server.test.ts (5개)

**파일 경로**: `src/routes/api/domain/upload/server.test.ts`

도메인 데이터를 XLSX 파일로 업로드하는 API를 테스트합니다.

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

## 5. domain/download/server.test.ts (6개)

**파일 경로**: `src/routes/api/domain/download/server.test.ts`

도메인 데이터를 XLSX 파일로 다운로드하는 API를 테스트합니다.

| 테스트명                                       | 설명                    | 검증 내용                                   |
| ---------------------------------------------- | ----------------------- | ------------------------------------------- |
| should download XLSX file successfully         | XLSX 파일 다운로드 성공 | Content-Type, Content-Disposition 헤더 확인 |
| should apply sortBy and sortOrder correctly    | 정렬 적용 확인          | sortBy, sortOrder 파라미터에 따른 정렬      |
| should apply filter correctly                  | 필터 적용 확인          | q, field 파라미터에 따른 필터링             |
| should return 500 on data load error           | 데이터 로드 오류 처리   | loadDomainData 실패 시 500 에러             |
| should use specified filename parameter        | 파일명 파라미터 사용    | filename 쿼리 파라미터 적용                 |
| should use default filename when not specified | 기본 파일명 사용        | 파라미터 없을 때 domain.json 사용           |

---

## 6. domain/filter-options/server.test.ts (8개)

**파일 경로**: `src/routes/api/domain/filter-options/server.test.ts`

필터 옵션 조회 API를 테스트합니다. 각 필터 가능한 컬럼의 고유값을 반환합니다.

| 테스트명                                               | 설명                    | 검증 내용                            |
| ------------------------------------------------------ | ----------------------- | ------------------------------------ |
| should return filter options successfully              | 필터 옵션 조회 성공     | 200 응답, 각 컬럼별 고유값 배열 반환 |
| should return unique values for each filterable column | 각 컬럼별 고유값 반환   | 중복 제거된 값들 반환                |
| should include "(빈값)" option for nullable fields     | nullable 필드 빈값 처리 | revision에 "(빈값)" 옵션 포함        |
| should use specified filename parameter                | 파일명 파라미터 사용    | filename 쿼리 파라미터 적용          |
| should use default filename when not specified         | 기본 파일명 사용        | 파라미터 없을 때 domain.json 사용    |
| should return 500 on data load error                   | 데이터 로드 오류 처리   | loadDomainData 실패 시 500 에러      |
| should sort filter options alphabetically              | 필터 옵션 정렬          | 가나다순 정렬 확인                   |
| should handle empty entries array                      | 빈 entries 배열 처리    | entries가 비어있을 때 빈 배열 반환   |

---

## 7. DomainEditor.test.ts (15개)

**파일 경로**: `src/lib/components/DomainEditor.test.ts`

도메인 생성/수정/삭제 모달 컴포넌트를 테스트합니다.

### Rendering (6개)

| 테스트명                                                              | 설명                    | 검증 내용                                            |
| --------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| should render modal with "새 도메인 추가" title when not in edit mode | 생성 모드 타이틀        | isEditMode=false 시 "새 도메인 추가" 표시            |
| should render modal with "도메인 수정" title when in edit mode        | 수정 모드 타이틀        | isEditMode=true 시 "도메인 수정" 표시                |
| should display required field labels                                  | 필수 필드 라벨 표시     | 도메인그룹, 도메인 분류명, 물리 데이터타입 라벨 존재 |
| should display optional field labels                                  | 선택 필드 라벨 표시     | 설명, 데이터 길이, 소수점자리수 라벨 존재            |
| should populate form with entry data in edit mode                     | 수정 모드 데이터 바인딩 | entry props 값이 폼에 표시                           |
| should show server error message when provided                        | 서버 에러 표시          | serverError props 값 표시                            |

### Form Validation (3개)

| 테스트명                                                      | 설명                       | 검증 내용                   |
| ------------------------------------------------------------- | -------------------------- | --------------------------- |
| should disable save button when required fields are empty     | 필수 필드 빈값 시 비활성화 | 저장 버튼 disabled 상태     |
| should enable save button when all required fields are filled | 필수 필드 입력 시 활성화   | 저장 버튼 enabled 상태      |
| should show error message for empty required field            | 필수 필드 에러 메시지      | 값 삭제 시 에러 메시지 표시 |

### Edit Mode Behavior (4개)

| 테스트명                                      | 설명                          | 검증 내용            |
| --------------------------------------------- | ----------------------------- | -------------------- |
| should disable domainGroup input in edit mode | 수정 모드 도메인그룹 비활성화 | domainGroup disabled |
| should show delete button in edit mode        | 수정 모드 삭제 버튼           | 삭제 버튼 표시       |
| should not show delete button in create mode  | 생성 모드 삭제 버튼 없음      | 삭제 버튼 미표시     |
| should show "수정" button text in edit mode   | 수정 모드 버튼 텍스트         | "수정" 텍스트 표시   |

### User Interactions (3개)

| 테스트명                                                 | 설명                | 검증 내용                    |
| -------------------------------------------------------- | ------------------- | ---------------------------- |
| should have cancel button that can be clicked            | 취소 버튼 클릭 가능 | 취소 버튼 존재 및 활성화     |
| should have close icon button that can be clicked        | 닫기 버튼 클릭 가능 | X 아이콘 버튼 존재 및 활성화 |
| should show confirm dialog when delete button is clicked | 삭제 확인 대화상자  | confirm 호출 확인            |

---

## 8. DomainFileManager.test.ts (8개)

**파일 경로**: `src/lib/components/DomainFileManager.test.ts`

파일 관리 모달 컴포넌트를 테스트합니다.

### Rendering (2개)

| 테스트명                        | 설명                 | 검증 내용                |
| ------------------------------- | -------------------- | ------------------------ |
| 모달이 열릴 때 파일 목록 렌더링 | 모달 열기 시 UI 표시 | "파일 관리" 텍스트 표시  |
| 파일 목록 표시                  | 파일 목록 API 호출   | `/api/domain/files` 호출 |

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

> **참고**: Svelte 5에서는 `component.$on()`이 더 이상 사용되지 않으므로, 이벤트 직접 테스트 대신 컴포넌트의 동작(API 호출, UI 표시 등)을 확인하는 방식으로 테스트를 작성했습니다.

---

## 실행 명령어

```bash
# 전체 도메인 테스트 실행
pnpm test domain

# 특정 API 테스트
pnpm test src/routes/api/domain/server.test.ts

# 컴포넌트 테스트
pnpm test src/lib/components/DomainEditor.test.ts
pnpm test src/lib/components/DomainFileManager.test.ts

# 감시 모드
pnpm test domain --watch
```

---

## 변경 이력

| 날짜       | 변경 내용                                            |
| ---------- | ---------------------------------------------------- |
| 2025-01-09 | 초기 문서 작성 (71개 테스트)                         |
| 2025-01-09 | DomainFileManager 컴포넌트 테스트 추가 (79개 테스트) |
