# 도메인(Domain) 주제영역 테스트 수행 계획

이 문서는 DbManager 프로젝트의 **도메인(Domain)** 주제영역에 대한 상세 테스트 수행 계획을 정의합니다.

## 1. 테스트 범위 요약

### 1.1 현재 진행 상황

| 구분 | 파일 | 테스트 수 | 상태 |
|-----|------|---------|------|
| 유틸리티 | - | 0 | 미완료 |
| API | - | 0 | 미완료 |
| 컴포넌트 | - | 0 | 미완료 |
| **합계** | | **0** | |

### 1.2 테스트 대상 전체 범위

#### API 엔드포인트 (6개)

| # | 경로 | 메서드 | 기능 | 우선순위 | 상태 |
|---|---|---|---|---|---|
| 1 | `/api/domain` | GET/POST/PUT/DELETE | CRUD, 페이지네이션, 정렬, 필터 | 높음 | 미완료 |
| 2 | `/api/domain/validate` | POST | 도메인 유효성 검증 | 높음 | 미완료 |
| 3 | `/api/domain/upload` | POST | XLSX 업로드 | 높음 | 미완료 |
| 4 | `/api/domain/download` | GET | XLSX 다운로드 | 높음 | 미완료 |
| 5 | `/api/domain/files` | GET/POST/PUT/DELETE | 파일 관리 | 높음 | 미완료 |
| 6 | `/api/domain/filter-options` | GET | 필터 옵션 조회 | 중간 | 미완료 |

#### 컴포넌트 (3개)

| # | 컴포넌트 | 기능 | 우선순위 | 상태 |
|---|---|---|---|---|
| 1 | `DomainEditor.svelte` | 도메인 생성/수정/삭제 모달 | 높음 | 미완료 |
| 2 | `DomainTable.svelte` | 데이터 테이블 (정렬, 필터, 페이지네이션) | 중간 | 미완료 |
| 3 | `DomainFileManager.svelte` | 파일 관리 모달 | 중간 | 미완료 |

---

## 2. 단계별 수행 계획

### 2.1 Phase 1: 핵심 API 및 CRUD 검증 (우선순위: 높음)

**목표**: 데이터 무결성을 보장하는 핵심 API 및 CRUD 기능 테스트

#### 2.1.1 /api/domain CRUD API 테스트
**파일**: `src/routes/api/domain/+server.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| GET - 목록 조회 | 페이지네이션, 정렬, 검색 필터 적용된 목록 반환 |
| GET - filename 파라미터 사용 | filename 쿼리 파라미터로 특정 파일에서 데이터 조회 |
| POST - 도메인 생성 | 필수 필드 검증 및 성공적인 생성 확인 |
| POST - 중복 도메인 | 동일한 도메인 생성 시 409 에러 반환 |
| POST - filename 파라미터 사용 | filename 쿼리 파라미터로 특정 파일에 저장 |
| PUT - 도메인 수정 | 특정 도메인 정보 수정 |
| PUT - 존재하지 않는 ID | 존재하지 않는 ID 수정 시 404 에러 반환 |
| PUT - filename 파라미터 사용 | filename 쿼리 파라미터로 특정 파일에서 수정 |
| DELETE - 도메인 삭제 | 특정 도메인 삭제 |
| DELETE - filename 파라미터 사용 | filename 쿼리 파라미터로 특정 파일에서 삭제 |

#### 2.1.2 validate API 테스트
**파일**: `src/routes/api/domain/validate/+server.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| 유효성 검증 성공 | 유효한 도메인 정보 입력 시 success |
| 필수 필드 누락 | `domainGroup`, `domainCategory` 등 누락 시 400 에러 |
| 중복 `standardDomainName` | 이미 존재하는 `standardDomainName` 입력 시 에러 |
| filename 파라미터 사용 | filename 쿼리 파라미터로 특정 파일에서 검증 수행 |

### 2.2 Phase 2: 파일 관리 및 Import/Export (우선순위: 높음)

**목표**: 파일 관리 및 데이터 Import/Export 기능 테스트

#### 2.2.1 files API 테스트
**파일**: `src/routes/api/domain/files/+server.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| GET - 파일 목록 조회 | 모든 domain 파일 목록 반환 |
| POST - 새 파일 생성 | 새 domain.json 파일 생성 |
| PUT - 파일 이름 변경 | 기존 파일 이름 변경 |
| DELETE - 파일 삭제 | 파일 삭제 기능 확인 |

#### 2.2.2 upload/download API 테스트
**파일**: `src/routes/api/domain/upload/+server.test.ts`, `src/routes/api/domain/download/+server.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| POST - XLSX 업로드 성공 | 유효한 형식의 XLSX 파일 업로드 |
| POST - 잘못된 형식 업로드 | 필수 컬럼이 누락되거나 형식이 다른 XLSX 파일 업로드 시 에러 |
| GET - XLSX 다운로드 성공 | 현재 데이터가 XLSX 형식으로 정상 다운로드되는지 확인 |
| GET - 다운로드 시 필터/정렬 적용 | 필터링 및 정렬된 결과가 다운로드에 반영되는지 확인 |
| GET - filename 파라미터 사용 | filename 쿼리 파라미터로 특정 파일 다운로드 |

### 2.3 Phase 3: UI 컴포넌트 테스트 (우선순위: 중간)

**목표**: 사용자 인터랙션과 관련된 주요 UI 컴포넌트 기능 테스트

#### 2.3.1 DomainEditor 컴포넌트 테스트
**파일**: `src/lib/components/DomainEditor.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| 생성 모드 렌더링 | 새 도메인 추가 시 폼이 정상적으로 렌더링되는지 확인 |
| 수정 모드 렌더링 | 기존 도메인 데이터가 폼에 올바르게 바인딩되는지 확인 |
| 필수 필드 유효성 검사 | 필수 필드 미입력 시 에러 메시지 표시 및 저장 버튼 비활성화 |
| 저장/수정 이벤트 | 저장/수정 버튼 클릭 시 'save' 이벤트가 올바른 데이터와 함께 발생하는지 확인 |
| 삭제 이벤트 | 삭제 버튼 클릭 후 확인(confirm) 시 'delete' 이벤트 발생 |

#### 2.3.2 DomainTable 컴포넌트 테스트
**파일**: `src/lib/components/DomainTable.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| 데이터 렌더링 | `entries` props에 따른 행 렌더링 |
| 정렬 기능 | 컬럼 헤더 클릭 시 `sort` 이벤트 발생 |
| 필터 기능 | 컬럼 필터 적용 시 `filter` 이벤트 발생 |
| 페이지네이션 | 페이지 변경 시 `pagechange` 이벤트 발생 |
| 행 클릭 | 행 클릭 시 `entryclick` 이벤트 발생 |

---

## 3. 테스트 우선순위 및 일정

### 3.1 우선순위 기준

| 우선순위 | 기준 | 대상 |
|---|---|---|
| **높음** | 데이터 무결성, 핵심 CRUD 기능 | `/api/domain`, `/api/domain/validate`, `/api/domain/files`, `/api/domain/upload` |
| **중간** | 사용자 경험, 보조 기능 | `/api/domain/download`, `/api/domain/filter-options`, Table/Editor/FileManager 컴포넌트 |
| **낮음** | UI 세부사항 | 스타일링, 애니메이션 |

### 3.2 예상 테스트 케이스 수

| Phase | 대상 | 예상 테스트 수 |
|---|---|---|
| Phase 1 | `/api/domain`, `/api/domain/validate` | 19개 |
| Phase 2 | files, upload/download API | 13개 |
| Phase 3 | Editor, Table 컴포넌트 등 | 18개 |
| **합계** | | **약 50개** |

---

## 4. 테스트 작성 가이드라인

### 4.1 API 테스트 패턴

```typescript
// Mock 설정
vi.mock('$lib/utils/file-handler.js', () => ({
  loadDomainData: vi.fn(),
  saveDomainData: vi.fn()
}));

// RequestEvent Mock 헬퍼
function createMockRequestEvent(options: {
  method?: string;
  body?: unknown;
  searchParams?: Record<string, string>;
}): RequestEvent {
  // ... 구현
}

// 테스트 구조
describe('API Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock 데이터 설정
  });

  describe('GET', () => {
    it('should return data successfully', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### 4.2 컴포넌트 테스트 패턴

```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';

describe('ComponentName', () => {
  beforeEach(() => {
    // fetch mock 등 설정
  });

  it('should render correctly', async () => {
    render(ComponentName, { props: { /* ... */ } });
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
```

### 4.3 Mock 데이터 관리

```typescript
// src/tests/mocks/domain.ts
export const createMockDomainEntry = (): DomainEntry => ({
  // ...
});

export const createMockDomainData = (): DomainData => ({
  // ...
});
```

---

## 5. 실행 명령어

```bash
# 전체 테스트 실행
pnpm test

# 특정 파일 테스트
pnpm test src/routes/api/domain/+server.test.ts

# 패턴 매칭 테스트
pnpm test domain

# 감시 모드
pnpm test --watch

# UI 모드
pnpm test:ui

# 커버리지 리포트
pnpm test --coverage
```

---

## 6. 다음 단계

이 계획에 따라 **Phase 1**부터 순차적으로 테스트를 작성하고, 각 Phase 완료 시 이 문서의 상태를 업데이트합니다.

### 다른 주제영역 테스트 계획

도메인(Domain) 주제영역 테스트 완료 후, 동일한 패턴으로 다음 주제영역 테스트를 진행합니다:

1.  **단어(Vocabulary)**
2.  **용어(Term)**
3.  **데이터베이스(Database)** 등
