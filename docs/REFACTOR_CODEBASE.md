---

## 분석 결과 및 아키텍처 제안

### 1. 현재 구조의 문제점

전체 코드를 분석한 결과, **3가지 핵심 문제**가 확인됩니다.

#### 문제 1: 코드 중복 (Code Duplication)

| 패턴 | 중복 위치 | 중복도 |
|---|---|---|
| `load/save/merge/list/create/rename/delete` | `file-handler.ts` (vocabulary, domain, term) + `database-design-handler.ts` (database, entity, attribute, table, column) | **8 x 7 = 56개** 거의 동일한 함수 |
| `validateFilename + getDataPath` | `file-handler.ts` + `database-design-handler.ts` 에 동일한 함수 2벌 | 완전 중복 |
| `ensureDataDirectory` / `ensureDbDesignDirectories` | 별도 함수이지만 동일 패턴 | 완전 중복 |
| 개별 Store | `vocabulary-store.ts`, `domain-store.ts`, `term-store.ts` + `database-design-store.ts` (5개) | 구조 동일, 각각 분리됨 |

#### 문제 2: 매핑 정보의 분산

현재 매핑 관계가 **여러 곳에 분산 저장**되어 있습니다:

```
vocabulary.json → mapping: { domain: "domain.json" }
term.json       → mapping: { vocabulary: "vocabulary.json", domain: "domain.json" }
database/entity/attribute/table/column.json → 매핑 정보 없음 (하드코딩)
```

- **용어 ↔ 단어집/도메인** 매핑은 `term.json`의 `mapping` 필드에 저장
- **컬럼 ↔ 용어** 매핑은 `sync-term` API에서 런타임에 수행 (파일명 하드코딩)
- **ERD 매핑**은 `erd-mapper.ts`에서 런타임에 계산 (영속화 안 됨)
- 5개 정의서 간 매핑 관계를 추가하려면 **각 파일에 mapping 필드를 추가**해야 하는데, 관계가 늘어날수록 관리가 기하급수적으로 복잡해짐

#### 문제 3: 캐시/인덱스의 부분적 지원

- `cache.ts`: vocabulary, domain, term만 캐시 지원 (database~column은 미지원)
- `data-index.ts`: vocabulary, domain, term만 인덱스 생성 함수 존재
- 5개 정의서가 추가되었지만 캐시/인덱스 인프라가 확장되지 않음

---

### 2. 제안 아키텍처: **통합 데이터 레지스트리 (Unified Data Registry)**

핵심 아이디어: **8개 데이터 타입을 단일 제네릭 시스템으로 통합**하고, **파일 간 매핑 관계를 별도 레지스트리 파일로 중앙 관리**합니다.

#### 2-1. 새 디렉토리 구조

```
src/lib/
├── types/
│   ├── base.ts                    # [신규] 공통 기본 타입
│   ├── vocabulary.ts              # [유지] vocabulary 전용 타입
│   ├── domain.ts                  # [유지] domain 전용 타입
│   ├── term.ts                    # [유지] term 전용 타입
│   ├── database-design.ts         # [유지] 5개 정의서 타입
│   ├── registry.ts                # [신규] 매핑 레지스트리 타입
│   └── erd-mapping.ts             # [유지] ERD 매핑 타입
│
├── registry/                      # [신규] 통합 레지스트리 레이어
│   ├── data-registry.ts           # 제네릭 CRUD 핸들러 (load/save/merge/list/create/rename/delete)
│   ├── mapping-registry.ts        # 파일 간 매핑 관계 관리
│   ├── cache-registry.ts          # 통합 캐시 관리
│   └── index-registry.ts          # 통합 인덱스 관리
│
├── stores/
│   ├── unified-store.ts           # [신규] 8개 타입 통합 스토어 팩토리
│   └── settings-store.ts          # [유지]
│
├── utils/
│   ├── file-handler.ts            # [축소] → data-registry로 위임
│   ├── database-design-handler.ts # [축소] → data-registry로 위임
│   ├── file-operations.ts         # [유지] 저수준 파일 IO
│   ├── cache.ts                   # [축소] → cache-registry로 위임
│   ├── data-index.ts              # [축소] → index-registry로 위임
│   ├── validation.ts              # [유지] 검증 로직
│   └── ...기타 유틸
```

#### 2-2. 핵심 타입 설계

##### `types/base.ts` - 공통 기본 타입

```typescript
/** 모든 데이터 타입의 8가지 식별자 */
export type DataType = 'vocabulary' | 'domain' | 'term' 
  | 'database' | 'entity' | 'attribute' | 'table' | 'column';

/** 모든 엔트리의 공통 기본 인터페이스 */
export interface BaseEntry {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

/** 모든 Data 컨테이너의 공통 기본 인터페이스 */
export interface BaseData<T extends BaseEntry> {
  entries: T[];
  lastUpdated: string;
  totalCount: number;
}

/** DataType → Entry 타입 매핑 */
export type EntryTypeMap = {
  vocabulary: VocabularyEntry;
  domain: DomainEntry;
  term: TermEntry;
  database: DatabaseEntry;
  entity: EntityEntry;
  attribute: AttributeEntry;
  table: TableEntry;
  column: ColumnEntry;
};

/** DataType → Data 타입 매핑 */
export type DataTypeMap = {
  vocabulary: VocabularyData;
  domain: DomainData;
  term: TermData;
  database: DatabaseData;
  entity: EntityData;
  attribute: AttributeData;
  table: TableData;
  column: ColumnData;
};
```

##### `types/registry.ts` - 매핑 레지스트리 타입

```typescript
/** 매핑 관계 방향 */
export type MappingDirection = 'source' | 'target' | 'bidirectional';

/** 매핑 관계 정의 */
export interface MappingRelation {
  id: string;
  sourceType: DataType;
  sourceFilename: string;
  targetType: DataType;
  targetFilename: string;
  /** 매핑 키 필드 (예: 'logicalDbName', 'columnName') */
  mappingKey: string;
  /** 관계 유형 */
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
  /** 설명 */
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

/** 매핑 레지스트리 파일 구조 */
export interface MappingRegistryData {
  version: '1.0';
  relations: MappingRelation[];
  lastUpdated: string;
}
```

이 레지스트리는 `static/data/registry.json`에 저장됩니다:

```json
{
  "version": "1.0",
  "relations": [
    {
      "id": "vocab-domain-001",
      "sourceType": "vocabulary",
      "sourceFilename": "vocabulary.json",
      "targetType": "domain",
      "targetFilename": "domain.json",
      "mappingKey": "domainCategory",
      "cardinality": "N:1",
      "description": "단어집 → 도메인 분류 매핑"
    },
    {
      "id": "term-vocab-001",
      "sourceType": "term",
      "sourceFilename": "term.json",
      "targetType": "vocabulary",
      "targetFilename": "vocabulary.json",
      "mappingKey": "termName_parts→standardName",
      "cardinality": "N:N"
    },
    {
      "id": "term-domain-001",
      "sourceType": "term",
      "sourceFilename": "term.json",
      "targetType": "domain",
      "targetFilename": "domain.json",
      "mappingKey": "domainName→standardDomainName",
      "cardinality": "N:1"
    },
    {
      "id": "db-entity-001",
      "sourceType": "database",
      "sourceFilename": "database.json",
      "targetType": "entity",
      "targetFilename": "entity.json",
      "mappingKey": "logicalDbName",
      "cardinality": "1:N"
    },
    {
      "id": "column-term-001",
      "sourceType": "column",
      "sourceFilename": "column.json",
      "targetType": "term",
      "targetFilename": "term.json",
      "mappingKey": "columnEnglishName→columnName",
      "cardinality": "N:1"
    }
  ],
  "lastUpdated": "..."
}
```

#### 2-3. 통합 데이터 레지스트리 (`registry/data-registry.ts`)

**56개의 중복 함수를 7개의 제네릭 함수로 통합합니다:**

```typescript
import type { DataType, BaseEntry, BaseData, EntryTypeMap, DataTypeMap } from '$lib/types/base';

/** 타입별 설정 정보 */
interface DataTypeConfig<T extends DataType> {
  defaultFilename: string;
  createDefault: () => DataTypeMap[T];
  validate: (entry: EntryTypeMap[T]) => boolean;
  getMergeKey: (entry: EntryTypeMap[T]) => string;
}

const TYPE_CONFIGS: { [K in DataType]: DataTypeConfig<K> } = {
  vocabulary: {
    defaultFilename: 'vocabulary.json',
    createDefault: () => ({ entries: [], lastUpdated: new Date().toISOString(), totalCount: 0, mapping: { domain: 'domain.json' } }),
    validate: (e) => !!(e.id && e.standardName && e.abbreviation && e.englishName && e.createdAt),
    getMergeKey: (e) => `${e.standardName.toLowerCase()}|${e.abbreviation.toLowerCase()}|${e.englishName.toLowerCase()}`
  },
  // ... 나머지 7개 타입 설정
};

// 제네릭 CRUD 함수
export async function loadData<T extends DataType>(type: T, filename?: string): Promise<DataTypeMap[T]>;
export async function saveData<T extends DataType>(type: T, data: DataTypeMap[T], filename?: string): Promise<void>;
export async function mergeData<T extends DataType>(type: T, entries: EntryTypeMap[T][], replace?: boolean, filename?: string): Promise<DataTypeMap[T]>;
export async function listFiles(type: DataType): Promise<string[]>;
export async function createFile(type: DataType, filename: string): Promise<void>;
export async function renameFile(type: DataType, old: string, new_: string): Promise<void>;
export async function deleteFile(type: DataType, filename: string): Promise<void>;
```

#### 2-4. 매핑 레지스트리 (`registry/mapping-registry.ts`)

```typescript
/** 현재 각 파일에 분산된 mapping 필드 → 중앙 레지스트리로 통합 */

// 특정 파일의 관련 매핑 조회
export async function getMappingsFor(type: DataType, filename: string): Promise<MappingRelation[]>;

// 두 타입 간 매핑 관계 조회
export async function getMappingBetween(sourceType: DataType, targetType: DataType): Promise<MappingRelation[]>;

// 매핑 추가/수정/삭제
export async function addMapping(relation: Omit<MappingRelation, 'id' | 'createdAt'>): Promise<MappingRelation>;
export async function updateMapping(id: string, updates: Partial<MappingRelation>): Promise<void>;
export async function removeMapping(id: string): Promise<void>;

// 파일명 변경 시 매핑 자동 동기화
export async function syncMappingsOnRename(type: DataType, oldFilename: string, newFilename: string): Promise<void>;

// 파일 삭제 시 매핑 자동 정리
export async function cleanMappingsOnDelete(type: DataType, filename: string): Promise<void>;

// 매핑 기반으로 참조 무결성 확인 (기존 checkVocabularyReferences, checkDomainReferences 대체)
export async function checkReferences(type: DataType, entryId: string, filename: string): Promise<ReferenceCheckResult>;

// 매핑 기반으로 관련 데이터 로드
export async function getRelatedData(type: DataType, filename: string): Promise<Map<DataType, { filename: string; data: BaseData<BaseEntry> }>>;
```

#### 2-5. 통합 캐시/인덱스

```typescript
// cache-registry.ts
// 모든 8개 타입에 대해 동일한 캐시 인프라 제공
export function getCachedData<T extends DataType>(type: T, filename: string): Promise<DataTypeMap[T]>;
export function invalidateCache(type: DataType, filename?: string): void;

// index-registry.ts
// 타입별 searchFields 설정으로 자동 인덱스 생성
export function buildIndex(type: DataType, entries: BaseEntry[], searchFields: string[]): Promise<void>;
```

#### 2-6. 통합 스토어

```typescript
// stores/unified-store.ts
import { writable } from 'svelte/store';
import type { DataType } from '$lib/types/base';

type StoreState = { selectedFilename: string };

function createDataStore(type: DataType, defaultFilename: string) {
  return writable<StoreState>({ selectedFilename: defaultFilename });
}

export const dataStores = {
  vocabulary: createDataStore('vocabulary', 'vocabulary.json'),
  domain: createDataStore('domain', 'domain.json'),
  term: createDataStore('term', 'term.json'),
  database: createDataStore('database', 'database.json'),
  entity: createDataStore('entity', 'entity.json'),
  attribute: createDataStore('attribute', 'attribute.json'),
  table: createDataStore('table', 'table.json'),
  column: createDataStore('column', 'column.json'),
} as const;
```

---

### 3. 현재 → 새 구조 마이그레이션 방향

**원칙: 점진적 마이그레이션 (Strangler Fig Pattern)** - 기존 코드를 바로 삭제하지 않고, 새 레이어를 추가한 후 기존 코드를 점진적으로 위임시킵니다.

#### Phase 1: 기반 구축 (breaking change 없음)

| 작업 | 설명 |
|---|---|
| `types/base.ts` 생성 | `BaseEntry`, `BaseData`, `DataType`, 타입 매핑 등 공통 타입 정의 |
| `types/registry.ts` 생성 | `MappingRelation`, `MappingRegistryData` 타입 정의 |
| `registry/data-registry.ts` 생성 | 8개 타입의 제네릭 CRUD 구현 (내부적으로 기존 file-handler / database-design-handler 호출) |
| `registry/mapping-registry.ts` 생성 | `static/data/registry.json` 기반 중앙 매핑 관리 |
| `registry/cache-registry.ts` 생성 | 기존 `cache.ts`를 8개 타입으로 확장 |

#### Phase 2: 기존 코드 위임 (backward compatible)

| 작업 | 설명 |
|---|---|
| `file-handler.ts` 리팩토링 | 기존 `load/save/merge` 함수 → `data-registry`로 위임 (API 시그니처 유지) |
| `database-design-handler.ts` 리팩토링 | 동일하게 `data-registry`로 위임 |
| `cache.ts` 리팩토링 | `cache-registry`로 위임 |
| 기존 store 파일들 | `unified-store`에서 import하도록 변경 |
| `term.json`의 `mapping` 필드 | 읽을 때 `registry.json`으로 마이그레이션 |
| `vocabulary.json`의 `mapping` 필드 | 읽을 때 `registry.json`으로 마이그레이션 |

#### Phase 3: API/컴포넌트 전환

| 작업 | 설명 |
|---|---|
| `sync-term`, `validate`, `validate-all` API | `mapping-registry`에서 관련 파일을 자동 조회하도록 변경 |
| `checkVocabularyReferences`, `checkDomainReferences` | `mapping-registry.checkReferences()`로 대체 |
| 파일 관리 컴포넌트 (FileManager) | 파일 생성/삭제/이름변경 시 레지스트리 자동 동기화 |
| ERD 생성기 | `mapping-registry`에서 매핑 관계를 직접 읽어 사용 |

#### Phase 4: 정리

| 작업 | 설명 |
|---|---|
| `file-handler.ts` 56개 개별 함수 삭제 | `data-registry`만 남김 |
| `database-design-handler.ts` 삭제 | `data-registry`에 통합 |
| 개별 store 파일 5개 삭제 | `unified-store`만 남김 |
| `VocabularyData.mapping`, `TermData.mapping` 필드 | deprecated → 제거 |

---

### 4. 핵심 이점

| 항목 | 현재 | 제안 후 |
|---|---|---|
| CRUD 함수 수 | **56개** (8타입 x 7함수) | **7개** (제네릭) |
| 매핑 관계 정의 위치 | 각 JSON 파일 분산 + 코드 하드코딩 | **registry.json** 한 곳 |
| 새 매핑 관계 추가 | 코드 수정 필요 | **JSON 설정만 추가** |
| 캐시 지원 타입 | 3개 (vocabulary, domain, term) | **8개** (전체) |
| 참조 무결성 검사 | vocabulary, domain만 | **전체 8개 타입** 자동 |
| 파일 이름변경/삭제 시 매핑 동기화 | 수동 | **자동** |
| 새 정의서 타입 추가 시 | handler 파일에 ~150줄 복사 필요 | **config 1개 추가** |

---

### 5. 매핑 관계 전체 다이어그램

```
         [단어집 Vocabulary]
            ↑ termName parts
            |  N:N
         [용어집 Term] ←──── N:1 ──→ [도메인 Domain]
            ↑ columnName                    ↑ domainCategory
            | N:1                           | N:1
    [컬럼정의서 Column] ──→ [단어집]     [단어집]
            ↑ schemaName+tableEnglishName
            | 1:N
    [테이블정의서 Table]
            ↑ physicalDbName
            | 1:N
    [DB정의서 Database]
            | logicalDbName
            ↓ 1:N
    [엔터티정의서 Entity] ←──── 논리-물리 ──→ [테이블]
            | schemaName+entityName
            ↓ 1:N
    [속성정의서 Attribute] ←── 논리-물리 ──→ [컬럼]
```

이 관계가 모두 `registry.json`에 선언적으로 정의되어, 수정/삭제/검증/파일업로드 시 **어떤 관련 파일을 함께 확인해야 하는지를 자동으로 결정**할 수 있습니다.
