# 단어(Vocabulary) 주제영역 테스트 수행 계획

이 문서는 DbManager 프로젝트의 **단어(Vocabulary)** 주제영역에 대한 상세 테스트 수행 계획을 정의합니다.

## 1. 테스트 범위 요약

### 1.1 현재 진행 상황

| 구분 | 파일 | 테스트 수 | 상태 |
|-----|------|---------|------|
| 유틸리티 | `debounce.test.ts` | 8개 | 완료 |
| API | `vocabulary/+server.test.ts` | 18개 | 완료 |
| API | `vocabulary/validate/+server.test.ts` | 8개 | 완료 |
| API | `vocabulary/duplicates/+server.test.ts` | 4개 | 완료 |
| API | `vocabulary/files/+server.test.ts` | 12개 | 완료 |
| API | `vocabulary/files/mapping/+server.test.ts` | 10개 | 완료 |
| API | `vocabulary/sync-domain/+server.test.ts` | 9개 | 완료 |
| API | `vocabulary/download/+server.test.ts` | 8개 | 완료 |
| API | `vocabulary/filter-options/+server.test.ts` | 9개 | 완료 |
| API | `search/+server.test.ts` | 19개 | 완료 |
| 컴포넌트 | `VocabularyEditor.test.ts` | 18개 | 완료 |
| **합계** | | **117개** | |

### 1.2 테스트 대상 전체 범위

#### API 엔드포인트 (9개)

| # | 경로 | 메서드 | 기능 | 우선순위 | 상태 |
|---|------|--------|------|---------|------|
| 1 | `/api/vocabulary` | GET/POST/PUT/DELETE | CRUD, 페이지네이션, 정렬, 필터 | 높음 | 완료 |
| 2 | `/api/vocabulary/validate` | POST | 금칙어/이음동의어/중복 검증 | 높음 | 완료 |
| 3 | `/api/vocabulary/duplicates` | GET | 중복 단어 조회 | 높음 | 완료 |
| 4 | `/api/vocabulary/download` | GET | XLSX 다운로드 | 높음 | 완료 |
| 5 | `/api/vocabulary/files` | GET/POST/PUT/DELETE | 파일 관리 | 높음 | 완료 |
| 6 | `/api/vocabulary/files/mapping` | GET/PUT | 도메인 매핑 정보 | 중간 | 완료 |
| 7 | `/api/vocabulary/sync-domain` | POST | 도메인 동기화 | 높음 | 완료 |
| 8 | `/api/vocabulary/filter-options` | GET | 필터 옵션 조회 | 중간 | 완료 |
| 9 | `/api/search` | GET/POST | 통합 검색, 자동완성 | 높음 | 완료 |

#### 컴포넌트 (4개)

| # | 컴포넌트 | 기능 | 우선순위 | 상태 |
|---|---------|------|---------|------|
| 1 | `VocabularyEditor.svelte` | 단어 생성/수정/삭제 모달 | 높음 | 완료 |
| 2 | `VocabularyTable.svelte` | 데이터 테이블 (정렬, 필터, 페이지네이션) | 중간 | 미완료 |
| 3 | `VocabularyFileManager.svelte` | 파일 관리 모달 | 중간 | 미완료 |
| 4 | `SearchBar.svelte` | 검색 입력, 자동완성 | 중간 | 미완료 |

---

## 2. 단계별 수행 계획

### 2.1 Phase 1: 핵심 API 검증 로직 (우선순위: 높음)

**목표**: 데이터 무결성을 보장하는 검증 API 테스트

#### 2.1.1 validate API 테스트 ✅
**파일**: `src/routes/api/vocabulary/validate/+server.test.ts`

| 테스트 케이스 | 설명 |
|-------------|------|
| 금칙어 검증 성공 | 금칙어가 아닌 단어 입력 시 success |
| 금칙어 검증 실패 | 금칙어 입력 시 에러 반환 |
| 이음동의어 검증 | 이음동의어로 등록된 단어 입력 시 경고 |
| 영문약어 중복 검사 (신규) | 이미 존재하는 abbreviation 입력 시 에러 |
| 영문약어 중복 검사 (수정) | 자기 자신 제외하고 중복 검사 |
| 필수 파라미터 누락 | standardName/abbreviation 누락 시 400 |

#### 2.1.2 duplicates API 테스트 ✅
**파일**: `src/routes/api/vocabulary/duplicates/+server.test.ts`

| 테스트 케이스 | 설명 |
|-------------|------|
| 중복 단어 조회 성공 | 중복된 abbreviation 그룹 반환 |
| 중복 없음 | 중복이 없을 때 빈 배열 반환 |
| 파일명 지정 | 특정 파일에서만 중복 조회 |
| 에러 처리 | 데이터 로드 실패 시 500 에러 |

### 2.2 Phase 2: 파일 관리 API (우선순위: 높음)

**목표**: 단어집 파일 관리 기능 테스트

#### 2.2.1 files API 테스트 ✅
**파일**: `src/routes/api/vocabulary/files/+server.test.ts`

| 테스트 케이스 | 설명 |
|-------------|------|
| GET - 파일 목록 조회 | 모든 vocabulary 파일 목록 반환 |
| POST - 새 파일 생성 | 새 vocabulary.json 파일 생성 |
| POST - 중복 파일명 | 이미 존재하는 파일명으로 생성 시 500 |
| PUT - 파일 이름 변경 | 기존 파일 이름 변경 |
| DELETE - 파일 삭제 | 파일 삭제 |
| 에러 처리 | 각 메서드별 에러 처리 |

#### 2.2.2 files/mapping API 테스트 ✅
**파일**: `src/routes/api/vocabulary/files/mapping/+server.test.ts`

| 테스트 케이스 | 설명 |
|-------------|------|
| GET - 매핑 정보 조회 | 파일별 도메인 매핑 정보 반환 |
| GET - 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 |
| GET - 기본 파일명 사용 | 파라미터 없을 때 vocabulary.json 사용 |
| GET - 기본 매핑값 반환 | mapping 없을 때 domain.json 기본값 |
| PUT - 매핑 정보 저장 | 도메인 파일 매핑 업데이트 |
| PUT - 필수 파라미터 검증 | filename, mapping, mapping.domain 검증 |
| 에러 처리 | 각 메서드별 에러 처리 |

### 2.3 Phase 3: 도메인 동기화 및 검색 (우선순위: 높음)

**목표**: 데이터 연동 및 검색 기능 테스트

#### 2.3.1 sync-domain API 테스트 ✅
**파일**: `src/routes/api/vocabulary/sync-domain/+server.test.ts`

| 테스트 케이스 | 설명 |
|-------------|------|
| 동기화 성공 | 도메인 데이터와 단어 데이터 동기화 |
| 업데이트 카운트 | 변경된 항목 수 정확히 반환 |
| 파일명 파라미터 사용 | vocabularyFilename, domainFilename 적용 |
| 매핑 정보 사용 | domainFilename 없을 때 mapping.domain 사용 |
| domainCategory 없는 항목 처리 | domainCategory 없으면 unmatched로 처리 |
| 에러 처리 | 각 단계별 에러 처리 |

#### 2.3.2 search API 테스트 ✅
**파일**: `src/routes/api/search/+server.test.ts`

| 테스트 케이스 | 설명 |
|-------------|------|
| GET - 부분 일치 검색 | query로 부분 일치 검색 |
| GET - 정확 일치 검색 | exact=true로 정확 일치 검색 |
| GET - 검색 결과 정렬 | 정확 일치 > 시작 일치 > 포함 순 |
| GET - 빈 쿼리 | query 없을 때 400 |
| GET - 이음동의어 검색 | field=all일 때 synonyms도 검색 |
| GET - 특정 필드 검색 | field 파라미터로 특정 필드만 검색 |
| GET - 페이지네이션 | page, limit 파라미터 적용 |
| POST - 자동완성 제안 | 검색어 기반 자동완성 |
| POST - 이음동의어 제안 | synonyms에서도 제안 반환 |
| POST - 제안 개수 제한 | limit 파라미터에 따른 제한 |
| 에러 처리 | 각 메서드별 에러 처리 |

### 2.4 Phase 4: 다운로드 및 필터 (우선순위: 중간)

**목표**: 데이터 내보내기 및 필터링 기능 테스트

#### 2.4.1 download API 테스트 ✅
**파일**: `src/routes/api/vocabulary/download/+server.test.ts`

| 테스트 케이스 | 설명 |
|-------------|------|
| XLSX 다운로드 성공 | 파일 다운로드 응답 확인 |
| 정렬 적용 | sortBy, sortOrder 적용 확인 |
| 필터 적용 | filter 파라미터 적용 확인 |
| Content-Type | application/vnd.openxmlformats 확인 |
| 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 |
| 에러 처리 | 각 단계별 에러 처리 |

#### 2.4.2 filter-options API 테스트 ✅
**파일**: `src/routes/api/vocabulary/filter-options/+server.test.ts`

| 테스트 케이스 | 설명 |
|-------------|------|
| 필터 옵션 조회 | 컬럼별 고유값 반환 |
| nullable 필드 처리 | "(빈값)" 옵션 포함 |
| boolean 값 변환 | isFormalWord를 Y/N으로 변환 |
| 정렬 확인 | 필터 옵션 가나다순 정렬 |
| 빈 entries 처리 | entries가 비어있을 때 처리 |
| 파일명 파라미터 사용 | filename 쿼리 파라미터 적용 |
| 에러 처리 | 데이터 로드 실패 시 처리 |

### 2.5 Phase 5: 컴포넌트 테스트 확장 (우선순위: 중간)

**목표**: 사용자 인터랙션 테스트 보강

#### 2.5.1 VocabularyTable 컴포넌트 테스트
**파일**: `src/lib/components/VocabularyTable.test.ts`

| 테스트 케이스 | 설명 |
|-------------|------|
| 데이터 렌더링 | entries props에 따른 행 렌더링 |
| 다중 정렬 | 정렬 아이콘 클릭 시 3단계 순환 |
| 컬럼 필터 | 필터 드롭다운 선택 시 이벤트 발생 |
| 페이지네이션 | 페이지 변경 시 이벤트 발생 |
| 행 클릭 | 행 클릭 시 entryclick 이벤트 |

#### 2.5.2 VocabularyFileManager 컴포넌트 테스트
**파일**: `src/lib/components/VocabularyFileManager.test.ts`

| 테스트 케이스 | 설명 |
|-------------|------|
| 파일 목록 표시 | 파일 목록 렌더링 |
| 파일 선택 | 파일 선택 시 이벤트 발생 |
| 새 파일 생성 | 생성 버튼 클릭 시 입력 폼 표시 |
| 파일 삭제 | 삭제 확인 대화상자 표시 |

#### 2.5.3 SearchBar 컴포넌트 테스트
**파일**: `src/lib/components/SearchBar.test.ts`

| 테스트 케이스 | 설명 |
|-------------|------|
| 검색어 입력 | 입력 시 debounce 적용 |
| 검색 실행 | Enter 키 또는 버튼 클릭 시 onsearch |
| 검색 초기화 | 초기화 버튼 클릭 시 onreset |

---

## 3. 테스트 우선순위 및 일정

### 3.1 우선순위 기준

| 우선순위 | 기준 | 대상 |
|---------|------|------|
| **높음** | 데이터 무결성, 핵심 기능 | validate, duplicates, files, sync-domain, search |
| **중간** | 사용자 경험, 보조 기능 | download, filter-options, Table/FileManager 컴포넌트 |
| **낮음** | UI 세부사항 | 스타일링, 애니메이션 |

### 3.2 예상 테스트 케이스 수

| Phase | 대상 | 예상 테스트 수 |
|-------|------|--------------|
| Phase 1 | validate, duplicates | 12개 |
| Phase 2 | files, files/mapping | 10개 |
| Phase 3 | sync-domain, search | 12개 |
| Phase 4 | download, filter-options | 8개 |
| Phase 5 | Table, FileManager, SearchBar | 15개 |
| **합계** | | **약 57개** |

**기존 완료분 포함 총계**: 40 + 57 = **약 97개**

---

## 4. 테스트 작성 가이드라인

### 4.1 API 테스트 패턴

```typescript
// Mock 설정
vi.mock('$lib/utils/file-handler.js', () => ({
  loadVocabularyData: vi.fn(),
  saveVocabularyData: vi.fn()
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
// Svelte 5 호환 설정 필요
// vitest.config.ts에 resolve.conditions: ['browser'] 설정

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
// src/tests/mocks/vocabulary.ts
export const createMockVocabularyEntry = (): VocabularyEntry => ({
  id: 'entry-1',
  standardName: '사용자',
  abbreviation: 'USER',
  englishName: 'User',
  // ...
});

export const createMockVocabularyData = (): VocabularyData => ({
  entries: [createMockVocabularyEntry()],
  lastUpdated: '2024-01-01T00:00:00.000Z',
  totalCount: 1
});
```

---

## 5. 실행 명령어

```bash
# 전체 테스트 실행
pnpm test

# 특정 파일 테스트
pnpm test src/routes/api/vocabulary/validate/+server.test.ts

# 패턴 매칭 테스트
pnpm test vocabulary

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

단어(Vocabulary) 주제영역 테스트 완료 후, 동일한 패턴으로 다음 주제영역 테스트를 진행합니다:

1. **도메인(Domain)** - `/api/domain/*`, `DomainEditor.svelte` 등
2. **용어(Term)** - `/api/term/*`, `TermEditor.svelte` 등
3. **데이터베이스(Database)** - `/api/database-design/*`, 관련 컴포넌트
