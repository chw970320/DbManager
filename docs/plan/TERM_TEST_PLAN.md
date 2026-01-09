# 용어(Term) 주제영역 테스트 수행 계획

이 문서는 DbManager 프로젝트의 **용어(Term)** 주제영역에 대한 상세 테스트 수행 계획을 정의합니다.

## 1. 테스트 범위 요약

### 1.1 현재 진행 상황

| 구분 | 파일 | 테스트 수 | 상태 |
|-----|------|---------|------|
| 유틸리티 | - | 0 | 미완료 |
| API | - | 0 | 미완료 |
| 컴포넌트 | - | 0 | 미완료 |
| **합계** | | **0** | |

### 1.2 테스트 대상 전체 범위

#### API 엔드포인트 (10개)

| # | 경로 | 메서드 | 기능 | 우선순위 | 상태 |
|---|---|---|---|---|---|
| 1 | `/api/term` | GET/POST/PUT/DELETE | CRUD, 페이지네이션, 정렬, 필터 | 높음 | 미완료 |
| 2 | `/api/term/sync` | POST | 용어 매핑 동기화 | 높음 | 미완료 |
| 3 | `/api/term/recommend` | GET | 도메인 추천 | 중간 | 미완료 |
| 4 | `/api/generator` | POST | 용어 자동 생성 | 높음 | 미완료 |
| 5 | `/api/term/upload` | POST | XLSX 업로드 | 높음 | 미완료 |
| 6 | `/api/term/download` | GET | XLSX 다운로드 | 높음 | 미완료 |
| 7 | `/api/term/files` | GET/POST/PUT/DELETE | 파일 관리 | 높음 | 미완료 |
| 8 | `/api/term/filter-options` | GET | 필터 옵션 조회 | 중간 | 미완료 |
| 9 | `/api/term/validate` | POST | 용어 유효성 검증 | 높음 | 미완료 |
| 10 | `/api/term/validate-all` | POST | 전체 용어 일괄 검증 | 중간 | 미완료 |

#### 컴포넌트 (5개)

| # | 컴포넌트 | 기능 | 우선순위 | 상태 |
|---|---|---|---|---|
| 1 | `TermEditor.svelte` | 용어 생성/수정/삭제 모달 | 높음 | 미완료 |
| 2 | `TermTable.svelte` | 데이터 테이블 (정렬, 필터, 페이지네이션) | 중간 | 미완료 |
| 3 | `TermFileManager.svelte` | 파일 관리 모달 | 중간 | 미완료 |
| 4 | `TermGenerator.svelte` | 용어 자동 생성 UI | 높음 | 미완료 |
| 5 | `TermValidationPanel.svelte` | 용어 검증 결과 패널 | 높음 | 미완료 |

---

## 2. 단계별 수행 계획

### 2.1 Phase 1: 핵심 API 및 매핑 검증 (우선순위: 높음)

**목표**: 용어의 CRUD와 핵심 기능인 매핑 검증 로직 테스트

#### 2.1.1 /api/term CRUD API 테스트
**파일**: `src/routes/api/term/+server.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| POST - 용어 생성 (매핑 성공) | 단어집/도메인과 매핑 성공하는 용어 생성 |
| POST - 용어 생성 (매핑 실패) | 매핑에 실패하는 용어 생성 시 isMapped... 플래그가 false인지 확인 |
| POST - filename 파라미터 사용 | filename 쿼리 파라미터로 특정 파일에 저장 |
| GET - 목록 조회 | 페이지네이션, 정렬, 매핑 실패 필터 적용된 목록 반환 |
| GET - filename 파라미터 사용 | filename 쿼리 파라미터로 특정 파일에서 데이터 조회 |
| PUT - 용어 수정 | 용어 수정 후 매핑 상태가 재계산되는지 확인 |
| PUT - filename 파라미터 사용 | filename 쿼리 파라미터로 특정 파일에서 수정 |
| DELETE - 용어 삭제 | 특정 용어 삭제 |
| DELETE - filename 파라미터 사용 | filename 쿼리 파라미터로 특정 파일에서 삭제 |

#### 2.1.2 sync API 테스트
**파일**: `src/routes/api/term/sync/+server.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| 매핑 동기화 성공 | 단어집/도메인 변경 후 동기화 시 매핑 상태가 올바르게 업데이트되는지 확인 |
| 동기화 결과 카운트 | 업데이트된 항목 수가 정확히 반환되는지 확인 |
| filename 파라미터 사용 | filename 파라미터로 특정 파일에서 동기화 수행 |

#### 2.1.3 validate API 테스트
**파일**: `src/routes/api/term/validate/+server.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| 용어 유효성 검증 성공 | 유효한 용어 입력 시 success |
| 필수 필드 누락 | termName/columnName/domainName 누락 시 400 에러 |
| filename 파라미터 사용 | filename 쿼리 파라미터로 특정 파일에서 검증 수행 |

### 2.2 Phase 2: 용어 자동 생성 및 파일 관리 (우선순위: 높음)

**목표**: 용어 생성 생산성 기능 및 파일 관리 기능 테스트

#### 2.2.1 generator API 테스트
**파일**: `src/routes/api/generator/+server.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| 용어 조합 생성 성공 | 한국어 입력 시 가능한 영문 컬럼명 조합 반환 |
| 단어집에 없는 단어 | 단어집에 없는 단어 포함 시 빈 배열 또는 에러 반환 |
| 한 단어 입력 | 단일 단어 입력 시 조합 생성 |
| filename 파라미터 사용 | filename 파라미터로 특정 단어집 파일 사용 |

#### 2.2.2 files API 테스트
**파일**: `src/routes/api/term/files/+server.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| GET - 파일 목록 조회 | 모든 term 파일 목록 반환 |
| POST - 새 파일 생성 | 새 term.json 파일 생성 |
| PUT - 파일 이름 변경 | 기존 파일 이름 변경 |
| DELETE - 파일 삭제 | 파일 삭제 기능 확인 |

### 2.3 Phase 3: UI 컴포넌트 테스트 (우선순위: 중간)

**목표**: 용어 관리의 핵심 UI 컴포넌트 기능 테스트

#### 2.3.1 TermGenerator 컴포넌트 테스트
**파일**: `src/lib/components/TermGenerator.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| 용어 생성 요청 | 한국어 용어 입력 후 '생성' 버튼 클릭 시 API 호출 |
| 결과 목록 렌더링 | API 응답에 따라 추천 조합 목록이 렌더링되는지 확인 |
| 조합 선택 | 특정 조합 선택 시 'select' 이벤트 발생 |

#### 2.3.2 TermEditor 및 TermTable 컴포넌트 테스트
**파일**: `src/lib/components/TermEditor.test.ts`, `src/lib/components/TermTable.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| Editor - 매핑 상태 표시 | isMapped... 플래그에 따라 아이콘이 올바르게 표시되는지 확인 |
| Table - 매핑 실패 필터 | '매핑실패' 필터 클릭 시 필터링 기능 동작 확인 |
| Table - 행별 매핑 상태 | 테이블의 각 행에 매핑 상태 아이콘이 올바르게 표시되는지 확인 |

---

## 3. 테스트 우선순위 및 일정

### 3.1 우선순위 기준

| 우선순위 | 기준 | 대상 |
|---|---|---|
| **높음** | 데이터 무결성, 핵심 매핑/생성 기능 | `/api/term`, `/api/term/sync`, `/api/generator` |
| **중간** | 사용자 경험, 보조 기능 | `/api/term/upload`, `/api/term/recommend`, 모든 컴포넌트 |
| **낮음** | UI 세부사항 | 스타일링, 애니메이션 |

### 3.2 예상 테스트 케이스 수

| Phase | 대상 | 예상 테스트 수 |
|---|---|---|
| Phase 1 | `/api/term` CRUD, sync API | 23개 |
| Phase 2 | generator, files API 등 | 18개 |
| Phase 3 | Generator, Editor, Table 컴포넌트 | 20개 |
| **합계** | | **약 61개** |

---

## 4. 테스트 작성 가이드라인

### 4.1 API 테스트 패턴

```typescript
// Mock 설정
vi.mock('$lib/utils/file-handler.js', () => ({
  loadTermData: vi.fn(),
  saveTermData: vi.fn(),
  loadVocabularyData: vi.fn(), // Term 테스트는 Vocabulary/Domain 의존성 있음
  loadDomainData: vi.fn()
}));

// 테스트 구조
describe('/api/term', () => {
  // ...
});
```

### 4.2 컴포넌트 테스트 패턴

```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';

describe('TermGenerator', () => {
  it('should call api on generate click', async () => {
    // ...
  });
});
```

### 4.3 Mock 데이터 관리

```typescript
// src/tests/mocks/term.ts
export const createMockTermEntry = (isMapped: boolean): TermEntry => ({
  // ...
  isMappedTerm: isMapped,
  isMappedColumn: isMapped,
  isMappedDomain: isMapped,
});
```

---

## 5. 실행 명령어

```bash
# 전체 테스트 실행
pnpm test

# 특정 파일 테스트
pnpm test src/routes/api/term/+server.test.ts

# 패턴 매칭 테스트
pnpm test term

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

용어(Term) 주제영역 테스트 완료 후, 동일한 패턴으로 다음 주제영역 테스트를 진행합니다:

1.  **단어(Vocabulary)**
2.  **도메인(Domain)**
3.  **데이터베이스(Database)** 등
