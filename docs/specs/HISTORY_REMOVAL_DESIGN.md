# 히스토리 기능 삭제 설계서

## 1. 개요

### 1.1 목적

단어집(Vocabulary), 도메인(Domain), 용어(Term) 관리 시스템에서 **히스토리(변경 이력 추적) 기능을 삭제**하기 위한 설계 문서입니다.

### 1.2 삭제 사유

- 히스토리 기능이 실질적으로 활용되지 않음
- 불필요한 코드 및 데이터 저장 공간 차지
- 시스템 복잡도 감소를 통한 유지보수성 향상

### 1.3 영향 범위

| 영역              | 파일 수 | 작업 유형 |
| ----------------- | ------- | --------- |
| 정적 데이터 파일  | 3       | 삭제      |
| 컴포넌트          | 1       | 삭제      |
| API 라우트        | 1       | 삭제      |
| 유틸리티          | 1       | 삭제      |
| 타입 정의         | 4       | 수정      |
| 타입 가드         | 1       | 수정      |
| 바렐 익스포트     | 1       | 수정      |
| 페이지 컴포넌트   | 3       | 수정      |
| API 업로드 핸들러 | 3       | 수정      |
| 앱 타입 정의      | 1       | 수정      |
| 문서              | 1       | 수정      |

---

## 2. 삭제 대상 파일 목록

### 2.1 완전 삭제 대상 (6개 파일)

#### 정적 데이터 파일 (3개)

| 파일 경로                             | 설명                   |
| ------------------------------------- | ---------------------- |
| `static/data/vocabulary/history.json` | 단어집 히스토리 데이터 |
| `static/data/domain/history.json`     | 도메인 히스토리 데이터 |
| `static/data/term/history.json`       | 용어 히스토리 데이터   |

#### 소스 코드 파일 (3개)

| 파일 경로                              | 설명                      |
| -------------------------------------- | ------------------------- |
| `src/lib/components/HistoryLog.svelte` | 히스토리 로그 UI 컴포넌트 |
| `src/routes/api/history/+server.ts`    | 히스토리 API 엔드포인트   |
| `src/lib/utils/history-handler.ts`     | 히스토리 데이터 핸들러    |

---

## 3. 수정 대상 파일 목록

### 3.1 타입 정의 파일 (4개)

#### `src/lib/types/vocabulary.ts`

**삭제할 타입:**

```typescript
// 삭제 대상
export interface HistoryLogEntry {
	id: string;
	action: 'add' | 'update' | 'delete' | 'UPLOAD_MERGE';
	targetId: string;
	targetName: string;
	timestamp: string;
	filename?: string;
	details?: {
		before?: Record<string, unknown>;
		after?: Record<string, unknown>;
		fileName?: string;
		fileSize?: number;
		processedCount?: number;
		replaceMode?: boolean;
	};
}

export interface HistoryData {
	logs: HistoryLogEntry[];
	lastUpdated: string;
	totalCount: number;
}
```

#### `src/lib/types/domain.ts`

**삭제할 타입:**

```typescript
// 삭제 대상
export interface DomainHistoryLogEntry { ... }
export interface DomainHistoryData { ... }
```

#### `src/lib/types/term.ts`

**삭제할 타입:**

```typescript
// 삭제 대상
export interface TermHistoryLogEntry { ... }
export interface TermHistoryData { ... }
```

#### `src/lib/types/database-design.ts`

**삭제할 타입:**

```typescript
// 삭제 대상
export interface DatabaseHistoryLogEntry { ... }
export interface DatabaseHistoryData { ... }
export interface EntityHistoryLogEntry { ... }
export interface EntityHistoryData { ... }
export interface AttributeHistoryLogEntry { ... }
export interface AttributeHistoryData { ... }
export interface TableHistoryLogEntry { ... }
export interface TableHistoryData { ... }
export interface ColumnHistoryLogEntry { ... }
export interface ColumnHistoryData { ... }
```

---

### 3.2 타입 가드 파일

#### `src/lib/utils/type-guards.ts`

**삭제할 함수:**

```typescript
// 삭제 대상
export function isHistoryLogEntry(value: unknown): value is HistoryLogEntry;
export function isHistoryData(value: unknown): value is HistoryData;
export function isDomainHistoryLogEntry(value: unknown): value is DomainHistoryLogEntry;
export function isDomainHistoryData(value: unknown): value is DomainHistoryData;
export function isTermHistoryLogEntry(value: unknown): value is TermHistoryLogEntry;
export function isTermHistoryData(value: unknown): value is TermHistoryData;
```

**삭제할 import:**

```typescript
// 삭제 대상
import type { HistoryData, HistoryLogEntry } from '$lib/types/vocabulary';
import type { DomainHistoryData, DomainHistoryLogEntry } from '$lib/types/domain';
import type { TermHistoryData, TermHistoryLogEntry } from '$lib/types/term';
```

---

### 3.3 바렐 익스포트 파일

#### `src/lib/index.ts`

**삭제할 export:**

```typescript
// 삭제 대상
export type { DatabaseHistoryLogEntry } from './types/database-design';
export type { EntityHistoryLogEntry } from './types/database-design';
export type { AttributeHistoryLogEntry } from './types/database-design';
export type { TableHistoryLogEntry } from './types/database-design';
export type { ColumnHistoryLogEntry } from './types/database-design';
```

---

### 3.4 페이지 컴포넌트 (3개)

#### `src/routes/browse/+page.svelte`

**삭제할 코드:**

```svelte
<!-- import 삭제 -->
import HistoryLog from '$lib/components/HistoryLog.svelte';

<!-- 컴포넌트 사용 삭제 -->
<HistoryLog type="vocabulary" />

<!-- window 함수 호출 삭제 -->
if (typeof window !== 'undefined' && (window as any).refreshHistoryLog) {
    (window as any).refreshHistoryLog();
}
```

#### `src/routes/domain/browse/+page.svelte`

**삭제할 코드:**

```svelte
<!-- import 삭제 -->
import HistoryLog from '$lib/components/HistoryLog.svelte';

<!-- 컴포넌트 사용 삭제 -->
<HistoryLog type="domain" />

<!-- window 함수 호출 삭제 -->
if (typeof window !== 'undefined' && (window as any).refreshDomainHistoryLog) {
    (window as any).refreshDomainHistoryLog();
}
```

#### `src/routes/term/browse/+page.svelte`

**삭제할 코드:**

```svelte
<!-- import 삭제 -->
import HistoryLog from '$lib/components/HistoryLog.svelte';

<!-- 컴포넌트 사용 삭제 -->
<HistoryLog type="term" />

<!-- window 함수 호출 삭제 -->
if (typeof window !== 'undefined' && (window as any).refreshTermHistoryLog) {
    (window as any).refreshTermHistoryLog();
}
```

---

### 3.5 API 업로드 핸들러 (3개)

#### `src/routes/api/upload/+server.ts` (Vocabulary)

**삭제할 코드:**

```typescript
// import 삭제
import { addHistoryLog } from '$lib/utils/history-handler.js';

// 함수 호출 삭제
await addHistoryLog({
	id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 11)}`,
	action: 'UPLOAD_MERGE',
	targetId: 'vocabulary_file',
	targetName: `${file.name} (${processedCount}개 단어)`,
	timestamp: new Date().toISOString(),
	filename: targetFilename,
	details: {
		fileName: file.name,
		fileSize: file.size,
		processedCount: processedCount,
		replaceMode: replaceExisting
	}
});
```

#### `src/routes/api/domain/upload/+server.ts`

**삭제할 코드:**

```typescript
// import 삭제
import { addHistoryLog } from '$lib/utils/history-handler.js';

// 함수 호출 삭제 (약 15줄)
await addHistoryLog(
    {
        id: `upload_${Date.now()}_...`,
        action: 'UPLOAD_MERGE',
        ...
    },
    'domain'
);
```

#### `src/routes/api/term/upload/+server.ts`

**삭제할 코드:**

```typescript
// import 삭제
import { addHistoryLog } from '$lib/utils/history-handler.js';

// 함수 호출 삭제 (약 15줄)
await addHistoryLog(
    {
        id: `upload_${Date.now()}_...`,
        action: 'UPLOAD_MERGE',
        ...
    },
    'term'
);
```

---

### 3.6 앱 타입 정의

#### `src/app.d.ts`

**삭제할 타입:**

```typescript
// 삭제 대상
interface Window {
	refreshHistoryLog?: () => void;
	refreshDomainHistoryLog?: () => void;
	refreshTermHistoryLog?: () => void;
}
```

---

### 3.7 문서

#### `docs/PROJECT_DEEP_ANALYSIS.md`

**삭제할 섹션:** (333~346행)

```markdown
### 4. 히스토리 추적 시스템

**특징**:

- 모든 변경사항 히스토리 로그 기록
- 파일별 히스토리 관리 (Vocabulary만)
- 변경 전/후 데이터 저장

**비즈니스 의미**:

- 감사 추적 (Audit Trail)
- 변경 이력 추적
- 롤백 가능성
```

**추가 수정:** 433행 "히스토리로 변경 이력 관리" 문구 삭제

---

## 4. 작업 순서

### Phase 1: 의존성 제거 (API/페이지 수정)

1. `src/routes/browse/+page.svelte` - HistoryLog 컴포넌트 및 관련 코드 제거
2. `src/routes/domain/browse/+page.svelte` - HistoryLog 컴포넌트 및 관련 코드 제거
3. `src/routes/term/browse/+page.svelte` - HistoryLog 컴포넌트 및 관련 코드 제거
4. `src/routes/api/upload/+server.ts` - addHistoryLog 호출 제거
5. `src/routes/api/domain/upload/+server.ts` - addHistoryLog 호출 제거
6. `src/routes/api/term/upload/+server.ts` - addHistoryLog 호출 제거

### Phase 2: 코어 파일 삭제

1. `src/lib/components/HistoryLog.svelte` 삭제
2. `src/routes/api/history/+server.ts` 삭제
3. `src/lib/utils/history-handler.ts` 삭제

### Phase 3: 타입 정의 정리

1. `src/lib/types/vocabulary.ts` - HistoryLogEntry, HistoryData 타입 제거
2. `src/lib/types/domain.ts` - DomainHistoryLogEntry, DomainHistoryData 타입 제거
3. `src/lib/types/term.ts` - TermHistoryLogEntry, TermHistoryData 타입 제거
4. `src/lib/types/database-design.ts` - 모든 HistoryLogEntry, HistoryData 타입 제거
5. `src/lib/utils/type-guards.ts` - 히스토리 관련 타입 가드 함수 제거
6. `src/lib/index.ts` - 히스토리 관련 export 제거
7. `src/app.d.ts` - refreshHistoryLog 타입 제거

### Phase 4: 정적 파일 및 문서 정리

1. `static/data/vocabulary/history.json` 삭제
2. `static/data/domain/history.json` 삭제
3. `static/data/term/history.json` 삭제
4. `docs/PROJECT_DEEP_ANALYSIS.md` - 히스토리 관련 섹션 제거

### Phase 5: 검증

1. `pnpm run check` - TypeScript 타입 검사
2. `pnpm run build` - 빌드 검증
3. `pnpm run dev` - 개발 서버 실행 및 기능 테스트

---

## 5. 롤백 계획

### 5.1 Git 기반 롤백

- 작업 전 별도 브랜치 생성: `git checkout -b feature/remove-history`
- 문제 발생 시 main 브랜치로 복귀

### 5.2 데이터 백업

- 삭제 전 history.json 파일들 백업
  ```bash
  cp static/data/vocabulary/history.json static/data/vocabulary/history.json.bak
  cp static/data/domain/history.json static/data/domain/history.json.bak
  cp static/data/term/history.json static/data/term/history.json.bak
  ```

---

## 6. 체크리스트

### 삭제 전 확인

- [ ] 히스토리 데이터 백업 완료
- [ ] 히스토리 기능을 참조하는 다른 기능 없음 확인
- [ ] 개발 브랜치 생성

### 삭제 후 확인

- [ ] TypeScript 타입 오류 없음 (`pnpm run check`)
- [ ] 빌드 성공 (`pnpm run build`)
- [ ] 단어집 페이지 정상 동작
- [ ] 도메인 페이지 정상 동작
- [ ] 용어 페이지 정상 동작
- [ ] 파일 업로드 기능 정상 동작
- [ ] 데이터 추가/수정/삭제 기능 정상 동작

---

## 7. 예상 효과

### 7.1 코드 감소

- **삭제 파일**: 6개
- **수정 파일**: 14개
- **삭제 코드 라인**: 약 800~1000줄

### 7.2 기능적 변화

- 변경 이력 UI (플로팅 히스토리 패널) 제거
- 변경 이력 API 제거
- 파일 업로드 시 히스토리 기록 제거

### 7.3 데이터 저장 공간

- history.json 파일 3개 삭제로 저장 공간 확보

---

**작성일**: 2026-01-08
**작성자**: Claude Code
