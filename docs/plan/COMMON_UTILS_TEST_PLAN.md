# 공통 유틸리티(Common Utils) 테스트 수행 계획

이 문서는 DbManager 프로젝트의 `src/lib/utils` 디렉토리에 위치한 공통 유틸리티 함수들에 대한 상세 테스트 수행 계획을 정의합니다.

## 1. 테스트 범위 요약

### 1.1 대상 유틸리티 파일

- `file-handler.ts`: JSON 파일 읽기/쓰기, 경로 관리 등 파일 시스템 관련 로직
- `database-design-handler.ts`: 데이터베이스 설계 관련 파일 핸들러
- `validation.ts`: 데이터 모델 유효성 검증 로직
- `cache.ts`: 메모리 내 캐싱 처리
- `xlsx-parser.ts`: XLSX 파일 파싱 로직
- `debounce.ts`: 디바운스 기능 (일부 완료)
- `file-filter.ts`: 파일 목록 필터링 로직

### 1.2 현재 진행 상황

| 구분 | 파일 | 테스트 수 | 상태 |
| --- | --- | --- | --- |
| 유틸리티 | `debounce.test.ts` | 8개 | 완료 |
| **합계** | | **8개** | |

---

## 2. 단계별 수행 계획

### 2.1 Phase 1: 파일 및 데이터 핸들러 (우선순위: 높음)

**목표**: 데이터의 입출력을 담당하는 핵심 파일 핸들러 기능의 안정성 확보

#### 2.1.1 file-handler.ts 테스트
**파일**: `src/lib/utils/file-handler.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| `loadJsonFile` | 정상적인 JSON 파일 읽기 |
| `loadJsonFile` - 파일 없음 | 존재하지 않는 파일 읽기 시 에러 처리 |
| `atomicWriteFile` | 파일 쓰기 성공 및 내용 검증 |
| `getDirectoryFiles` | 특정 디렉토리의 파일 목록 조회 |
| `validateFilename` | 유효하지 않은 파일명(e.g., `../../`)에 대한 경로 조작 방지 검증 |

#### 2.1.2 database-design-handler.ts 테스트
**파일**: `src/lib/utils/database-design-handler.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| `loadDatabaseData` | 데이터베이스 데이터 로딩 테스트 |
| `saveDatabaseData` | 데이터베이스 데이터 저장 테스트 |
| `loadEntityData` 등 | 다른 모든 설계 데이터 타입에 대한 load/save 함수 테스트 |

### 2.2 Phase 2: 파서 및 유효성 검증 (우선순위: 높음)

**목표**: 데이터 파싱 및 유효성 검증 로직의 정확성 확보

#### 2.2.1 xlsx-parser.ts 테스트
**파일**: `src/lib/utils/xlsx-parser.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| `parseXLSX` | 유효한 XLSX 파일 파싱 및 JSON 변환 |
| `parseXLSX` - 빈 파일 | 내용이 없는 XLSX 파일 처리 |
| `parseXLSX` - 헤더 없음 | 헤더가 없는 XLSX 파일 처리 |

#### 2.2.2 validation.ts 테스트
**파일**: `src/lib/utils/validation.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| `validateVocabularyEntry` | 유효/유효하지 않은 단어 엔트리 검증 |
| `validateDomainEntry` | 유효/유효하지 않은 도메인 엔트리 검증 |
| `validateTermEntry` | 유효/유효하지 않은 용어 엔트리 검증 |

### 2.3 Phase 3: 캐시 및 기타 유틸리티 (우선순위: 중간)

**목표**: 성능 및 UI 관련 유틸리티 기능 테스트

#### 2.3.1 cache.ts 테스트
**파일**: `src/lib/utils/cache.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| `setCache` / `getCache` | 캐시 설정 및 조회 |
| 캐시 만료 | 설정된 TTL 이후 캐시가 만료되는지 확인 |
| `invalidateCache` | 특정 캐시 무효화 |
| `invalidateCache` - all | 전체 캐시 무효화 |

#### 2.3.2 file-filter.ts 테스트
**파일**: `src/lib/utils/file-filter.test.ts`

| 테스트 케이스 | 설명 |
|---|---|
| 시스템 파일 필터링 | `showSystemFiles` 플래그에 따라 시스템 파일(e.g., `domain.json`)이 필터링되는지 확인 |
| 일반 파일 필터링 | 일반 파일은 필터링되지 않는지 확인 |

---

## 3. 테스트 우선순위 및 일정

### 3.1 우선순위 기준

| 우선순위 | 기준 | 대상 |
|---|---|---|
| **높음** | 데이터 I/O, 무결성 | `file-handler`, `database-design-handler`, `validation`, `xlsx-parser` |
| **중간** | 성능, UI 로직 | `cache`, `file-filter` |
| **낮음** | - | - |

### 3.2 예상 테스트 케이스 수

| Phase | 대상 | 예상 테스트 수 |
|---|---|---|
| Phase 1 | `file-handler`, `database-design-handler` | 20개 |
| Phase 2 | `xlsx-parser`, `validation` | 15개 |
| Phase 3 | `cache`, `file-filter` | 10개 |
| **합계** | | **약 45개** |

---
## 4. 테스트 작성 가이드라인

단위 테스트는 의존성을 최소화하고 순수 함수 중심으로 작성합니다. 파일 시스템 접근과 같이 외부 의존성이 필요한 경우 `vi.mock`을 사용하여 모의 처리합니다.

```typescript
import { vi } from 'vitest';
import { loadJsonFile } from './file-handler';
import fs from 'fs/promises';

// fs 모듈 모의 처리
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
  unlink: vi.fn()
}));

describe('loadJsonFile', () => {
  it('should parse valid JSON', async () => {
    // Arrange
    const mockData = { key: 'value' };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData));

    // Act
    const data = await loadJsonFile('dummy.json');

    // Assert
    expect(data).toEqual(mockData);
  });
});
```
---

## 5. 실행 명령어

```bash
# 전체 유틸리티 테스트 실행
pnpm test src/lib/utils

# 특정 파일 테스트
pnpm test src/lib/utils/file-handler.test.ts
```
