# 속성(Attribute) 주제영역 테스트 설명

이 문서는 속성(Attribute) 주제영역의 모든 테스트 케이스에 대한 상세 설명을 제공합니다.

## 테스트 현황 요약

| 테스트 파일                               | 테스트 수 | 상태 |
| ----------------------------------------- | --------- | ---- |
| `attribute/server.test.ts`                | 18개      | 완료 |
| `attribute/files/server.test.ts`          | 12개      | 완료 |
| `attribute/upload/server.test.ts`         | 5개       | 완료 |
| `attribute/download/server.test.ts`       | 6개       | 완료 |
| `attribute/filter-options/server.test.ts` | 9개       | 완료 |
| `AttributeEditor.test.ts`                 | 11개      | 완료 |
| `AttributeTable.test.ts`                  | 5개       | 완료 |
| `AttributeFileManager.test.ts`            | 4개       | 완료 |
| **합계**                                  | **70개**  |      |

---

## 1. attribute/server.test.ts (18개)

**파일 경로**: `src/routes/api/attribute/server.test.ts`

속성 CRUD API의 핵심 기능을 검증합니다.

### GET (6개)

| 테스트명                                            | 설명                         | 검증 내용                                  |
| --------------------------------------------------- | ---------------------------- | ------------------------------------------ |
| should return attribute data successfully           | 속성 데이터 조회 성공        | 200 응답, success=true, entries 배열 반환  |
| should return paginated data correctly              | 페이지네이션 정상 동작       | page/limit 파라미터 적용, hasNextPage 계산 |
| should return 400 for invalid pagination parameters | 잘못된 페이지네이션 파라미터 | page=0 또는 limit 범위 초과 시 400 에러    |
| should handle data loading error gracefully         | 데이터 로딩 오류 처리        | 파일 로드 실패 시 500 에러                 |
| should use specified filename parameter             | 파일명 파라미터 사용         | filename 쿼리 파라미터 적용                |
| should use default filename when not specified      | 기본 파일명 사용             | 파라미터 없을 때 attribute.json 사용       |

### POST (3개)

| 테스트명                                           | 설명                 | 검증 내용                                                        |
| -------------------------------------------------- | -------------------- | ---------------------------------------------------------------- |
| should create a new attribute entry successfully   | 새 속성 생성 성공    | 201 응답, UUID 생성, createdAt/updatedAt 설정                    |
| should return 400 when required fields are missing | 필수 필드 누락       | schemaName, entityName, attributeName, attributeType 누락 시 400 |
| should use specified filename parameter            | 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 및 저장 확인                         |

### PUT (4개)

| 테스트명                                     | 설명                 | 검증 내용                                |
| -------------------------------------------- | -------------------- | ---------------------------------------- |
| should update an existing entry successfully | 속성 수정 성공       | 200 응답, updatedAt 갱신 확인            |
| should return 400 when id is missing         | ID 누락              | id 파라미터 없이 요청 시 400 에러        |
| should return 404 when entry not found       | 존재하지 않는 항목   | 없는 id로 수정 시도 시 404 에러          |
| should use specified filename parameter      | 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 및 저장 확인 |

### DELETE (4개)

| 테스트명                                     | 설명                 | 검증 내용                                |
| -------------------------------------------- | -------------------- | ---------------------------------------- |
| should delete an existing entry successfully | 속성 삭제 성공       | 200 응답, 삭제 완료 메시지               |
| should return 400 when id is missing         | ID 누락              | id 파라미터 없이 요청 시 400 에러        |
| should return 404 when entry not found       | 존재하지 않는 항목   | 없는 id로 삭제 시도 시 404 에러          |
| should use specified filename parameter      | 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 및 저장 확인 |

---

## 2. attribute/files/server.test.ts (12개)

**파일 경로**: `src/routes/api/attribute/files/server.test.ts`

속성 파일 관리 API를 테스트합니다. 파일 목록 조회, 생성, 이름 변경, 삭제 기능을 검증합니다.

### GET (2개)

| 테스트명                             | 설명                | 검증 내용                     |
| ------------------------------------ | ------------------- | ----------------------------- |
| should return file list successfully | 파일 목록 조회 성공 | 200 응답, 파일 목록 배열 반환 |
| should return 500 on error           | 조회 오류 처리      | 파일 시스템 오류 시 500 에러  |

### POST (3개)

| 테스트명                                   | 설명              | 검증 내용                          |
| ------------------------------------------ | ----------------- | ---------------------------------- |
| should create a new file successfully      | 새 파일 생성 성공 | 201 응답, createAttributeFile 호출 |
| should return 400 when filename is missing | 파일명 누락       | filename 없이 요청 시 400 에러     |
| should return 500 when file creation fails | 파일 생성 실패    | 이미 존재하는 파일 등 오류 시 500  |

### PUT (4개)

| 테스트명                                      | 설명             | 검증 내용                          |
| --------------------------------------------- | ---------------- | ---------------------------------- |
| should rename file successfully               | 파일명 변경 성공 | 200 응답, renameAttributeFile 호출 |
| should return 400 when oldFilename is missing | 기존 파일명 누락 | oldFilename 없이 요청 시 400 에러  |
| should return 400 when newFilename is missing | 새 파일명 누락   | newFilename 없이 요청 시 400 에러  |
| should return 500 when rename fails           | 파일명 변경 실패 | 파일 없음 등 오류 시 500           |

### DELETE (3개)

| 테스트명                                   | 설명           | 검증 내용                          |
| ------------------------------------------ | -------------- | ---------------------------------- |
| should delete file successfully            | 파일 삭제 성공 | 200 응답, deleteAttributeFile 호출 |
| should return 400 when filename is missing | 파일명 누락    | filename 없이 요청 시 400 에러     |
| should return 500 when delete fails        | 파일 삭제 실패 | 삭제 권한 없음 등 오류 시 500      |

---

## 3. attribute/upload/server.test.ts (5개)

**파일 경로**: `src/routes/api/attribute/upload/server.test.ts`

속성 데이터를 XLSX 파일로 업로드하는 API를 테스트합니다.

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

## 4. attribute/download/server.test.ts (6개)

**파일 경로**: `src/routes/api/attribute/download/server.test.ts`

속성 데이터를 XLSX 파일로 다운로드하는 API를 테스트합니다.

| 테스트명                                       | 설명                    | 검증 내용                                   |
| ---------------------------------------------- | ----------------------- | ------------------------------------------- |
| should download XLSX file successfully         | XLSX 파일 다운로드 성공 | Content-Type, Content-Disposition 헤더 확인 |
| should apply sortBy and sortOrder correctly    | 정렬 파라미터 적용      | sortBy/sortOrder 파라미터 적용 확인         |
| should apply filter correctly                  | 필터 파라미터 적용      | 검색 쿼리 파라미터 적용 확인                |
| should return 500 on data load error           | 데이터 로드 오류 처리   | loadAttributeData 실패 시 500 에러          |
| should use specified filename parameter        | 파일명 파라미터 사용    | filename 쿼리 파라미터 적용                 |
| should use default filename when not specified | 기본 파일명 사용        | 파라미터 없을 때 attribute.json 사용        |

---

## 5. attribute/filter-options/server.test.ts (9개)

**파일 경로**: `src/routes/api/attribute/filter-options/server.test.ts`

필터 옵션 조회 API를 테스트합니다. 각 필터 가능한 컬럼의 고유값을 반환합니다.

| 테스트명                                               | 설명                    | 검증 내용                            |
| ------------------------------------------------------ | ----------------------- | ------------------------------------ |
| should return filter options successfully              | 필터 옵션 조회 성공     | 200 응답, 각 컬럼별 고유값 배열 반환 |
| should return unique values for each filterable column | 각 컬럼별 고유값 반환   | 중복 제거된 값들 반환                |
| should include "(빈값)" option for nullable fields     | Nullable 필드 빈값 옵션 | nullable 필드에 "(빈값)" 옵션 포함   |
| should use specified filename parameter                | 파일명 파라미터 사용    | filename 쿼리 파라미터 적용          |
| should use default filename when not specified         | 기본 파일명 사용        | 파라미터 없을 때 attribute.json 사용 |
| should return 500 on data load error                   | 데이터 로드 오류 처리   | loadAttributeData 실패 시 500 에러   |
| should sort filter options alphabetically              | 필터 옵션 정렬          | 가나다순 정렬 확인                   |
| should handle empty entries array                      | 빈 entries 배열 처리    | entries가 비어있을 때 빈 배열 반환   |

---

## 6. AttributeEditor.test.ts (11개)

**파일 경로**: `src/lib/components/AttributeEditor.test.ts`

속성 생성/수정 모달 컴포넌트를 테스트합니다.

### Rendering (5개)

| 테스트명                                                              | 설명                    | 검증 내용                                      |
| --------------------------------------------------------------------- | ----------------------- | ---------------------------------------------- |
| should render modal with "새 속성 정의서" title when not in edit mode | 생성 모드 타이틀        | isEditMode=false 시 "새 속성 정의서" 표시      |
| should render modal with "속성 정의서 수정" title when in edit mode   | 수정 모드 타이틀        | isEditMode=true 시 "속성 정의서 수정" 표시     |
| should display required field labels                                  | 필수 필드 라벨 표시     | 스키마명, 엔터티명, 속성명, 속성유형 라벨 존재 |
| should populate form with entry data in edit mode                     | 수정 모드 데이터 바인딩 | entry props 값이 폼에 표시                     |
| should show server error message when provided                        | 서버 에러 표시          | serverError props 값 표시                      |

### Form Validation (2개)

| 테스트명                                                                    | 설명                          | 검증 내용                   |
| --------------------------------------------------------------------------- | ----------------------------- | --------------------------- |
| should show error message when form is submitted with empty required fields | 필수 필드 빈값 시 에러 메시지 | 값 삭제 시 에러 메시지 표시 |
| should not show error when all required fields are filled                   | 필수 필드 입력 시 에러 없음   | 에러 메시지가 없어야 함     |

### Edit Mode Behavior (2개)

| 테스트명                                     | 설명                       | 검증 내용                            |
| -------------------------------------------- | -------------------------- | ------------------------------------ |
| should show delete button in edit mode       | 수정 모드 삭제 버튼 표시   | isEditMode=true 시 삭제 버튼 표시    |
| should not show delete button in create mode | 생성 모드 삭제 버튼 미표시 | isEditMode=false 시 삭제 버튼 미표시 |

### User Interactions (2개)

| 테스트명                                          | 설명                | 검증 내용                    |
| ------------------------------------------------- | ------------------- | ---------------------------- |
| should have cancel button that can be clicked     | 취소 버튼 클릭 가능 | 취소 버튼 존재 및 활성화     |
| should have close icon button that can be clicked | 닫기 버튼 클릭 가능 | X 아이콘 버튼 존재 및 활성화 |

---

## 7. AttributeTable.test.ts (5개)

**파일 경로**: `src/lib/components/AttributeTable.test.ts`

데이터 테이블 컴포넌트를 테스트합니다.

### Rendering (2개)

| 테스트명                        | 설명             | 검증 내용                      |
| ------------------------------- | ---------------- | ------------------------------ |
| should render entries correctly | 속성 목록 렌더링 | entries props에 따른 행 렌더링 |
| should display loading state    | 로딩 상태 표시   | loading props에 따른 로딩 표시 |

### Sorting (1개)

| 테스트명                                                | 설명             | 검증 내용                     |
| ------------------------------------------------------- | ---------------- | ----------------------------- |
| should trigger sort event when column header is clicked | 정렬 이벤트 발생 | 컬럼 헤더 클릭 시 sort 이벤트 |

### Pagination (1개)

| 테스트명                         | 설명               | 검증 내용                        |
| -------------------------------- | ------------------ | -------------------------------- |
| should trigger page change event | 페이지 변경 이벤트 | 페이지 변경 시 pagechange 이벤트 |

### Row Click (1개)

| 테스트명                                            | 설명           | 검증 내용                    |
| --------------------------------------------------- | -------------- | ---------------------------- |
| should trigger entryclick event when row is clicked | 행 클릭 이벤트 | 행 클릭 시 entryclick 이벤트 |

---

## 8. AttributeFileManager.test.ts (4개)

**파일 경로**: `src/lib/components/AttributeFileManager.test.ts`

파일 관리 모달 컴포넌트를 테스트합니다.

### Rendering (2개)

| 테스트명                        | 설명                 | 검증 내용                   |
| ------------------------------- | -------------------- | --------------------------- |
| 모달이 열릴 때 파일 목록 렌더링 | 모달 열기 시 UI 표시 | "파일 관리" 텍스트 표시     |
| 파일 목록 표시                  | 파일 목록 API 호출   | `/api/attribute/files` 호출 |

### File Operations (1개)

| 테스트명               | 설명           | 검증 내용              |
| ---------------------- | -------------- | ---------------------- |
| 새 파일 생성 버튼 표시 | 생성 버튼 존재 | 새 파일 생성 버튼 표시 |

### Selected File (1개)

| 테스트명              | 설명                | 검증 내용             |
| --------------------- | ------------------- | --------------------- |
| 선택된 파일 강조 표시 | 선택된 파일 UI 강조 | 선택된 파일 강조 표시 |

---

## 실행 명령어

```bash
# 전체 속성 테스트 실행
pnpm test attribute

# 특정 API 테스트
pnpm test src/routes/api/attribute/server.test.ts

# 컴포넌트 테스트
pnpm test src/lib/components/AttributeEditor.test.ts
pnpm test src/lib/components/AttributeTable.test.ts
pnpm test src/lib/components/AttributeFileManager.test.ts

# 감시 모드
pnpm test attribute --watch
```

---

## 변경 이력

| 날짜       | 변경 내용                    |
| ---------- | ---------------------------- |
| 2025-01-09 | 초기 문서 작성 (70개 테스트) |
