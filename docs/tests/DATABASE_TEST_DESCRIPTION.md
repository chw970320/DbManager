# 데이터베이스(Database) 주제영역 테스트 설명

이 문서는 데이터베이스(Database) 주제영역의 테스트 케이스를 정리하고, 진행 상황을 추적하기 위한 문서입니다.  
현재는 `DATABASE_TEST_PLAN.md`를 기반으로 **계획 단계**를 먼저 정리한 상태이며, 실제 테스트 코드 구현이 진행되면 이 문서를 계속 업데이트합니다.

---

## 1. 테스트 현황 요약

| 테스트 파일                                 | 예상 테스트 수 | 현재 테스트 수 | 상태   |
| ------------------------------------------ | -------------- | -------------- | ------ |
| `database/+server.test.ts`                 | 9              | 20             | 완료   |
| `database/files/+server.test.ts`           | 4              | 12             | 완료   |
| `database/upload/+server.test.ts`          | 4              | 9              | 완료   |
| `database/download/+server.test.ts`        | 2              | 6              | 완료   |
| `database/filter-options/+server.test.ts`  | 3              | 8              | 완료   |
| `DatabaseEditor.test.ts`                   | 4              | 13             | 작성완료 (일부 수정 필요) |
| `DatabaseTable.test.ts`                    | 4              | 8              | 작성완료 |
| `DatabaseFileManager.test.ts`              | 3              | 5              | 작성완료 (환경 설정 필요) |
| **합계**                                   | **29**         | **81**         |        |

> **중요**: 데이터베이스 관련 모든 API/컴포넌트는 **현재 선택된 database 파일(`filename`)을 기준으로만** 동작해야 합니다.  
> - CRUD, 업로드/다운로드, 필터 옵션, 파일 관리 모두 동일한 원칙을 따릅니다.

---

## 2. API 테스트 설명

### 2.1 `/api/database` CRUD (`database/+server.test.ts`)

**파일 경로**: `src/routes/api/database/+server.ts`  
**테스트 파일**: `src/routes/api/database/+server.test.ts`

#### 2.1.1 GET - 목록 조회

- **목적**: 페이지네이션, 정렬, 검색 필터가 정상 동작하는지 확인
- **핵심 검증 항목**
  - `page`, `limit`, `sortBy`, `sortOrder`, `q`, `field` 파라미터 처리
  - 응답의 `pagination` 메타 정보 (totalCount, totalPages, currentPage 등)
  - `filename` 쿼리 파라미터로 선택된 파일만 읽어오는지 (`loadDatabaseData(filename)`) 확인

#### 2.1.2 GET - filename 파라미터 사용

- **목적**: `?filename=custom-database.json` 과 같이 특정 파일을 선택했을 때,  
  해당 파일만 기준으로 데이터가 조회되는지 확인
- **핵심 검증 항목**
  - `loadDatabaseData('custom-database.json')` 호출 여부
  - 기본값은 `database.json` 인지 확인

#### 2.1.3 POST - 데이터베이스 생성

- **목적**: 필수 필드 검증 및 정상 생성 흐름 검증
- **핵심 검증 항목**
  - 필수 필드 누락 시 400 에러
  - 정상 생성 시 `success=true`, 생성된 엔트리 ID/타임스탬프 확인
  - 선택된 파일 기준으로만 저장 (`saveDatabaseData(..., filename)`)

#### 2.1.4 POST - 중복 생성

- **목적**: 동일한 정의를 여러 번 생성했을 때 처리 정책 확인  
  (현재 계획: 중복 허용, 즉 에러 없이 추가)

#### 2.1.5 POST - filename 파라미터 사용

- **목적**: `body.filename` 또는 쿼리 파라미터로 지정된 파일에만 데이터가 저장되는지 확인

#### 2.1.6 PUT - 데이터베이스 수정

- **목적**: 특정 엔트리를 수정하고, 선택된 파일 기준으로만 반영되는지 확인

#### 2.1.7 PUT - filename 파라미터 사용

- **목적**: `filename` 이 다른 경우, 해당 파일에서만 수정이 일어나는지 검증

#### 2.1.8 DELETE - 데이터베이스 삭제

- **목적**: 특정 엔트리를 삭제하고, 삭제 결과/메시지/카운트 업데이트 확인

#### 2.1.9 DELETE - filename 파라미터 사용

- **목적**: `filename` 으로 지정된 파일에서만 삭제가 일어나는지 확인  
  (다른 파일의 데이터에는 영향을 주지 않아야 함)

---

### 2.2 `/api/database/files` (`database/files/+server.test.ts`)

**파일 경로**: `src/routes/api/database/files/+server.ts`  
**테스트 파일**: `src/routes/api/database/files/+server.test.ts`

#### 주요 테스트 케이스

- GET - 파일 목록 조회  
  - 모든 database 정의 파일 목록 반환 (`listDatabaseFiles()` 등)
- POST - 새 파일 생성  
  - 새 `*.json` 파일 생성, 중복 파일명 처리
- PUT - 파일 이름 변경  
  - 기존 파일 이름 변경 성공/실패 케이스
- DELETE - 파일 삭제  
  - 삭제 성공, 존재하지 않는 파일 삭제 시 처리 등

> **특징**: 파일 관리 API는 "전체 파일 목록"을 다루지만,  
> 실제 CRUD/검증/업로드/다운로드는 항상 **선택된 filename 기준**으로 동작해야 합니다.

---

### 2.3 `/api/database/upload` (`database/upload/+server.test.ts`)

**파일 경로**: `src/routes/api/database/upload/+server.ts`  
**테스트 파일**: `src/routes/api/database/upload/+server.test.ts`

- POST - XLSX 업로드 성공  
  - 올바른 Content-Type (`multipart/form-data`)  
  - 필수 컬럼(정의서 스펙 기준) 존재 여부  
  - 업로드 대상 파일(`filename`)만 기준으로 병합/교체
- POST - 잘못된 형식 업로드  
  - 필수 컬럼 누락/잘못된 데이터 → 400 또는 422 에러 메시지 확인

---

### 2.4 `/api/database/download` (`database/download/+server.test.ts`)

**파일 경로**: `src/routes/api/database/download/+server.ts`  
**테스트 파일**: `src/routes/api/database/download/+server.test.ts`

- GET - XLSX 다운로드 성공  
  - Content-Type, Content-Disposition 헤더 확인  
  - 선택된 파일의 데이터만 포함되는지 검증
- GET - filename 파라미터 사용  
  - `?filename=custom-database.json` 으로 특정 파일만 다운로드

---

### 2.5 `/api/database/filter-options` (`database/filter-options/+server.test.ts`)

**파일 경로**: `src/routes/api/database/filter-options/+server.ts`  
**테스트 파일**: `src/routes/api/database/filter-options/+server.test.ts`

- GET - 필터 옵션 조회 성공  
  - 각 필터 가능한 컬럼(예: DBMS 유형, 스키마명 등)의 고유값 목록 반환
- GET - filename 파라미터 사용  
  - 선택된 파일 기준으로만 필터 옵션이 계산되는지 확인
- GET - 빈 데이터 처리  
  - entries가 비어 있는 경우 빈 배열 반환

---

## 3. 컴포넌트 테스트 설명

### 3.1 `DatabaseEditor.svelte` (`DatabaseEditor.test.ts`)

**파일 경로**: `src/lib/components/DatabaseEditor.svelte`  
**테스트 파일**: `src/lib/components/DatabaseEditor.test.ts`

- 생성/수정 모드 렌더링  
  - props에 entry가 없으면 "새 데이터베이스 추가" 모드  
  - entry가 있으면 "데이터베이스 수정" 모드
- 필수 필드 유효성 검사  
  - 필수 필드 미입력 시 에러 메시지 및 저장 버튼 비활성화
- 저장/수정 이벤트  
  - 저장 버튼 클릭 시 `save` 이벤트 발생 + payload 구조 확인
- 삭제 이벤트  
  - 삭제 버튼 클릭 → confirm 처리 → `delete` 이벤트 발생

> **중요**:  
> - Editor가 호출하는 `/api/database` 및 `/api/database/validate` 요청에  
>   항상 **현재 선택된 database 파일의 filename** 이 포함되어야 합니다.

---

### 3.2 `DatabaseTable.svelte` (`DatabaseTable.test.ts`)

**파일 경로**: `src/lib/components/DatabaseTable.svelte`  
**테스트 파일**: `src/lib/components/DatabaseTable.test.ts`

- 데이터 렌더링  
  - `entries` props에 따른 행/컬럼 렌더링 확인
- 정렬/필터 기능  
  - 헤더 클릭 및 필터 UI 조작 시, 상위로 적절한 이벤트(예: `sortchange`, `filterchange`) 발생
- 페이지네이션  
  - 페이지 변경 UI 조작 시 `pagechange` 이벤트 발생
- 행 클릭  
  - 행 클릭 시 `entryclick` 이벤트 발생 및 전달 데이터 구조 확인

---

### 3.3 `DatabaseFileManager.svelte` (`DatabaseFileManager.test.ts`)

**파일 경로**: `src/lib/components/DatabaseFileManager.svelte`  
**테스트 파일**: `src/lib/components/DatabaseFileManager.test.ts`

- 파일 목록 렌더링  
  - API에서 받아온 파일 목록 표시
- 새 파일 생성 / 이름 변경 / 삭제  
  - 각 버튼 액션이 올바른 API 호출 및 상위 컴포넌트 이벤트로 이어지는지 확인
- 선택된 파일 상태 반영  
  - 현재 선택된 database 파일 강조 표시 및 변경 시 이벤트 발생

---

## 4. 테스트 구현 완료 현황

### 4.1 API 테스트 (55개 테스트, 모두 통과)

✅ **`database/+server.test.ts`** (20개 테스트)
- GET: 목록 조회, 페이지네이션, 검색 필터, 정렬, filename 파라미터, 에러 처리
- POST: 데이터베이스 생성, filename 파라미터, 필수 필드 검증, 빈 파일 처리
- PUT: 데이터베이스 수정, filename 파라미터, ID 누락, 존재하지 않는 엔트리, 필수 필드 검증
- DELETE: 데이터베이스 삭제, filename 파라미터, ID 누락, 존재하지 않는 엔트리

✅ **`database/files/+server.test.ts`** (12개 테스트)
- GET: 파일 목록 조회, 파일 시스템 오류 처리
- POST: 새 파일 생성, 파일명 누락, 파일 생성 실패
- PUT: 파일 이름 변경, 파일명 누락, 파일 이름 변경 실패
- DELETE: 파일 삭제, 파일명 누락, 파일 삭제 실패

✅ **`database/upload/+server.test.ts`** (9개 테스트)
- GET: 업로드 정보 조회, filename 파라미터
- POST: XLSX 파일 업로드 성공, filename 파라미터, 잘못된 Content-Type, 파일 검증 실패, Excel 파싱 실패, 빈 데이터, replace 모드

✅ **`database/download/+server.test.ts`** (6개 테스트)
- GET: XLSX 파일 다운로드 성공, filename 파라미터, 기본 파일명 사용, 검색 필터 적용, 정렬 적용, 데이터 로드 실패 처리

✅ **`database/filter-options/+server.test.ts`** (8개 테스트)
- GET: 필터 옵션 조회 성공, 고유값만 반환, filename 파라미터, 기본 파일명 사용, 데이터 로드 실패 처리, 필터 옵션 정렬 확인, 빈 entries 배열 처리, Nullable 필드에 빈값 옵션 포함

### 4.2 컴포넌트 테스트 (26개 테스트, 일부 수정 필요)

✅ **`DatabaseEditor.test.ts`** (13개 테스트)
- Rendering: 생성 모드 제목, 수정 모드 제목, 필수 필드 라벨, 엔트리 데이터로 폼 채우기, 서버 에러 메시지
- Form Validation: 필수 필드 비활성화, 필수 필드 활성화, 필수 필드 누락 에러
- Events: save 이벤트, delete 이벤트, cancel 이벤트
- Edit Mode: 삭제 버튼 표시/미표시

⚠️ **`DatabaseTable.test.ts`** (8개 테스트)
- Rendering: entries 렌더링, 빈 배열 처리, 로딩 상태
- Sorting: 컬럼 헤더 클릭
- Pagination: 페이지 변경
- Row Click: entryclick 이벤트 (일부 수정 필요)
- Filtering: 필터 옵션 UI, 필터 적용

⚠️ **`DatabaseFileManager.test.ts`** (5개 테스트)
- Rendering: 모달 열기, 파일 목록 표시
- File Operations: 새 파일 생성, 파일 이름 변경, 파일 삭제
- Selected File: 선택된 파일 강조, change 이벤트
- Upload Tab: 업로드 탭 표시

> **참고**: 컴포넌트 테스트는 작성되었으나, 일부는 실제 컴포넌트 구조에 맞게 수정이 필요합니다. 특히 DatabaseFileManager는 `$app/environment` import 문제로 테스트 환경 설정이 필요합니다.

### 4.3 핵심 검증 사항

✅ **선택된 파일 기준 동작 확인**
- 모든 API 테스트에서 `filename` 파라미터를 통한 선택된 파일 기준 동작을 검증
- `loadDatabaseData(filename)`, `saveDatabaseData(data, filename)` 호출 확인
- 다른 파일의 데이터에 영향을 주지 않음을 확인

## 5. 다음 작업 계획

1. ✅ API 테스트 코드 작성 완료 (55개 테스트 모두 통과)
2. ✅ 컴포넌트 테스트 코드 작성 완료 (26개 테스트 작성, 일부 수정 필요)
3. ⚠️ 컴포넌트 테스트 수정 (DatabaseEditor 제목 텍스트, DatabaseFileManager 환경 설정)
4. ✅ `DATABASE_TEST_DESCRIPTION.md` 업데이트 완료
