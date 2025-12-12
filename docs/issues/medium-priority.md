# Medium Priority 이슈 목록

이 문서는 계획적으로 수정할 Medium Priority 레벨 이슈들을 정리합니다.

---

## 이슈 #M1: file-handler.ts의 중복된 load/save 함수 패턴

**심각도**: Medium Priority

**위치**:

- `src/lib/utils/file-handler.ts:208-283` - `loadVocabularyData()`
- `src/lib/utils/file-handler.ts:574-619` - `loadDomainData()`
- `src/lib/utils/file-handler.ts:867-928` - `loadTermData()`
- `src/lib/utils/file-handler.ts:159-202` - `saveVocabularyData()`
- `src/lib/utils/file-handler.ts:624-664` - `saveDomainData()`
- `src/lib/utils/file-handler.ts:933-972` - `saveTermData()`

**문제 설명**:

`loadVocabularyData`, `loadDomainData`, `loadTermData` 함수들이 거의 동일한 패턴을 가지고 있어 코드 중복이 심각합니다. `save*Data` 함수들도 마찬가지입니다.

**현재 코드:**

```typescript
// loadVocabularyData (약 75줄)
export async function loadVocabularyData(filename: string = DEFAULT_VOCABULARY_FILE) {
	try {
		await ensureDataDirectory();
		const dataPath = getDataPath(filename, 'vocabulary');
		if (!existsSync(dataPath)) {
			return { entries: [], lastUpdated: ..., totalCount: 0 };
		}
		const jsonString = await readFile(dataPath, 'utf-8');
		// ... 검증 및 파싱
	} catch (error) { ... }
}

// loadDomainData (약 45줄) - 거의 동일한 패턴
export async function loadDomainData(filename: string = DEFAULT_DOMAIN_FILE) {
	try {
		await ensureDataDirectory();
		const dataPath = getDataPath(filename, 'domain');
		// ... 동일한 로직
	} catch (error) { ... }
}
```

**영향 범위**:

- 코드 유지보수성
- 버그 수정 시 여러 곳 수정 필요
- 새 엔티티 추가 시 중복 코드 증가

**재현 방법**:

1. `file-handler.ts` 파일 열기
2. `loadVocabularyData`, `loadDomainData`, `loadTermData` 비교
3. 거의 동일한 코드 패턴 확인

**예상 해결 방법**:

1. **제네릭 함수로 통합**

   ```typescript
   type DataType = 'vocabulary' | 'domain' | 'term';
   type DataMap = {
   	vocabulary: VocabularyData;
   	domain: DomainData;
   	term: TermData;
   };

   async function loadData<T extends DataType>(
   	type: T,
   	filename: string,
   	defaultFilename: string
   ): Promise<DataMap[T]> {
   	await ensureDataDirectory();
   	const dataPath = getDataPath(filename, type);

   	if (!existsSync(dataPath)) {
   		return createEmptyData(type) as DataMap[T];
   	}

   	const jsonString = await readFile(dataPath, 'utf-8');
   	if (!jsonString.trim()) {
   		return createEmptyData(type) as DataMap[T];
   	}

   	const data = JSON.parse(jsonString) as DataMap[T];
   	// 공통 검증 로직
   	validateDataStructure(data, type);
   	return data;
   }

   // 래퍼 함수로 기존 API 유지
   export async function loadVocabularyData(filename?: string) {
   	return loadData('vocabulary', filename || DEFAULT_VOCABULARY_FILE, DEFAULT_VOCABULARY_FILE);
   }
   ```

2. **공통 유틸리티 함수 추출**

   ```typescript
   async function loadJsonFile<T>(
   	path: string,
   	validator: (data: unknown) => data is T,
   	defaultValue: T
   ): Promise<T> {
   	if (!existsSync(path)) {
   		return defaultValue;
   	}
   	const jsonString = await readFile(path, 'utf-8');
   	if (!jsonString.trim()) {
   		return defaultValue;
   	}
   	const data = JSON.parse(jsonString);
   	if (!validator(data)) {
   		throw new Error('Invalid data format');
   	}
   	return data;
   }
   ```

**우선순위**: 3

---

## 이슈 #M2: file-handler.ts의 중복된 파일 관리 함수 패턴

**심각도**: Medium Priority

**위치**:

- `src/lib/utils/file-handler.ts:388-420` - `createVocabularyFile()`
- `src/lib/utils/file-handler.ts:768-796` - `createDomainFile()`
- `src/lib/utils/file-handler.ts:1076-1108` - `createTermFile()`
- `src/lib/utils/file-handler.ts:425-462` - `renameVocabularyFile()`
- `src/lib/utils/file-handler.ts:801-831` - `renameDomainFile()`
- `src/lib/utils/file-handler.ts:1113-1144` - `renameTermFile()`
- `src/lib/utils/file-handler.ts:467-497` - `deleteVocabularyFile()`
- `src/lib/utils/file-handler.ts:836-862` - `deleteDomainFile()`
- `src/lib/utils/file-handler.ts:1149-1175` - `deleteTermFile()`

**문제 설명**:

파일 생성, 이름 변경, 삭제 함수들이 각 엔티티별로 거의 동일한 코드를 가지고 있습니다.

**현재 코드:**

```typescript
// createVocabularyFile (약 32줄)
export async function createVocabularyFile(filename: string): Promise<void> {
	if (!filename.endsWith('.json')) {
		throw new Error('파일명은 .json으로 끝나야 합니다.');
	}
	if (/[\\/:*?"<>|]/.test(filename)) {
		throw new Error('파일명에 사용할 수 없는 문자가 포함되어 있습니다.');
	}
	const filePath = getDataPath(filename, 'vocabulary');
	if (existsSync(filePath)) {
		throw new Error('이미 존재하는 파일명입니다.');
	}
	// ... 빈 데이터 생성 및 저장
}

// createDomainFile (약 28줄) - 거의 동일
export async function createDomainFile(filename: string): Promise<void> {
	// 동일한 검증 로직
	// 동일한 파일 생성 로직
}
```

**영향 범위**:

- 코드 중복 (약 300줄 이상)
- 유지보수 어려움
- 버그 수정 시 여러 곳 수정 필요

**재현 방법**:

1. `file-handler.ts`에서 `create*File`, `rename*File`, `delete*File` 함수들 비교
2. 거의 동일한 코드 패턴 확인

**예상 해결 방법**:

1. **제네릭 파일 관리 함수**

   ```typescript
   async function createDataFile<T extends DataType>(
   	type: T,
   	filename: string,
   	defaultFilename: string,
   	createEmptyData: () => DataMap[T]
   ): Promise<void> {
   	await ensureDataDirectory();
   	validateFilename(filename);
   	const filePath = getDataPath(filename, type);
   	if (existsSync(filePath)) {
   		throw new Error('이미 존재하는 파일명입니다.');
   	}
   	const emptyData = createEmptyData();
   	await writeFile(filePath, JSON.stringify(emptyData, null, 2), 'utf-8');
   }

   export async function createVocabularyFile(filename: string) {
   	return createDataFile('vocabulary', filename, DEFAULT_VOCABULARY_FILE, () => ({
   		entries: [],
   		lastUpdated: new Date().toISOString(),
   		totalCount: 0
   	}));
   }
   ```

2. **공통 검증 함수**

   ```typescript
   function validateFilename(filename: string): void {
   	if (!filename.endsWith('.json')) {
   		throw new Error('파일명은 .json으로 끝나야 합니다.');
   	}
   	if (/[\\/:*?"<>|]/.test(filename)) {
   		throw new Error('파일명에 사용할 수 없는 문자가 포함되어 있습니다.');
   	}
   }
   ```

**우선순위**: 3

---

## 이슈 #M3: Table 컴포넌트들의 중복 코드

**심각도**: Medium Priority

**위치**:

- `src/lib/components/VocabularyTable.svelte` (약 545줄)
- `src/lib/components/DomainTable.svelte` (약 524줄)
- `src/lib/components/TermTable.svelte` (약 522줄)

**문제 설명**:

세 개의 Table 컴포넌트가 거의 동일한 구조와 로직을 가지고 있습니다. 차이점은 컬럼 정의와 일부 렌더링 로직뿐입니다.

**현재 상태:**

```typescript
// VocabularyTable.svelte
const columns = [
	{ key: 'standardName', label: '표준단어명', sortable: true, ... },
	{ key: 'abbreviation', label: '영문약어', sortable: true, ... },
	// ...
];

// DomainTable.svelte
const columns = [
	{ key: 'domainGroup', label: '도메인그룹명', sortable: true, ... },
	{ key: 'domainCategory', label: '도메인분류명', sortable: true, ... },
	// ...
];

// 거의 동일한:
// - Props 인터페이스
// - 페이지네이션 로직
// - 정렬 로직
// - 행 클릭 핸들러
// - 테이블 렌더링 구조
```

**영향 범위**:

- 코드 중복 (약 1500줄 이상)
- 버그 수정 시 3곳 수정 필요
- 새 기능 추가 시 3곳 수정 필요

**재현 방법**:

1. 세 개의 Table 컴포넌트 파일 비교
2. 거의 동일한 코드 패턴 확인

**예상 해결 방법**:

1. **제네릭 Table 컴포넌트 생성**

   ```typescript
   // src/lib/components/DataTable.svelte
   <script lang="ts" generics="T extends Entry">
   	interface Props<T> {
   		entries?: T[];
   		columns: ColumnDefinition<T>[];
   		loading?: boolean;
   		// ... 기타 props
   		onentryclick?: (entry: T) => void;
   	}

   	// 공통 로직
   	function handleRowClick(entry: T, event: MouseEvent) { ... }
   	function getPageNumbers() { ... }
   </script>

   <!-- 공통 테이블 구조 -->
   ```

2. **컬럼 정의를 Props로 받기**

   ```typescript
   // VocabularyTable.svelte
   <script>
   	import DataTable from './DataTable.svelte';
   	import type { VocabularyEntry } from '$lib/types/vocabulary';

   	const columns = [
   		{ key: 'standardName', label: '표준단어명', ... },
   		// ...
   	];
   </script>

   <DataTable {entries} {columns} {...otherProps} />
   ```

3. **컬럼별 커스텀 렌더러 지원**

   ```typescript
   interface ColumnDefinition<T> {
   	key: keyof T;
   	label: string;
   	sortable: boolean;
   	render?: (entry: T) => string | Snippet;
   }
   ```

**우선순위**: 2

---

## 이슈 #M4: FileManager 컴포넌트들의 중복 코드

**심각도**: Medium Priority

**위치**:

- `src/lib/components/VocabularyFileManager.svelte`
- `src/lib/components/DomainFileManager.svelte`
- `src/lib/components/TermFileManager.svelte`

**문제 설명**:

세 개의 FileManager 컴포넌트가 유사한 구조와 로직을 가지고 있습니다. 파일 목록 조회, 생성, 이름 변경, 삭제 기능이 거의 동일합니다.

**현재 상태:**

```typescript
// VocabularyFileManager.svelte
async function loadFiles() {
	const response = await fetch('/api/vocabulary/files');
	// ...
}

async function createFile() {
	await fetch('/api/vocabulary/files', { method: 'POST', ... });
	// ...
}

// DomainFileManager.svelte - 거의 동일한 패턴
async function loadFiles() {
	const response = await fetch('/api/domain/files');
	// ...
}
```

**영향 범위**:

- 코드 중복
- 유지보수 어려움
- 기능 추가 시 여러 곳 수정

**재현 방법**:

1. 세 개의 FileManager 컴포넌트 비교
2. 유사한 코드 패턴 확인

**예상 해결 방법**:

1. **제네릭 FileManager 컴포넌트**

   ```typescript
   // src/lib/components/DataFileManager.svelte
   <script lang="ts" generics="T extends 'vocabulary' | 'domain' | 'term'">
   	interface Props<T> {
   		isOpen: boolean;
   		type: T;
   		apiBase: string; // '/api/vocabulary', '/api/domain', etc.
   		defaultFilename: string;
   		onclose: () => void;
   		onchange: () => void;
   	}

   	async function loadFiles() {
   		const response = await fetch(`${apiBase}/files`);
   		// ...
   	}
   </script>
   ```

2. **API 엔드포인트를 Props로 받기**

   ```typescript
   // VocabularyFileManager.svelte
   <script>
   	import DataFileManager from './DataFileManager.svelte';
   </script>

   <DataFileManager
   	type="vocabulary"
   	apiBase="/api/vocabulary"
   	defaultFilename="vocabulary.json"
   	{isOpen}
   	onclose={() => dispatch('close')}
   	onchange={() => dispatch('change')}
   />
   ```

**우선순위**: 3

---

## 이슈 #M5: xlsx-parser.ts의 중복된 파싱 함수 패턴

**심각도**: Medium Priority

**위치**:

- `src/lib/utils/xlsx-parser.ts:14-151` - `parseXlsxToJson()`
- `src/lib/utils/xlsx-parser.ts:327-452` - `parseDomainXlsxToJson()`
- `src/lib/utils/xlsx-parser.ts:616-707` - `parseTermXlsxToJson()`
- `src/lib/utils/xlsx-parser.ts:179-318` - `exportJsonToXlsxBuffer()`
- `src/lib/utils/xlsx-parser.ts:459-614` - `exportDomainToXlsxBuffer()`
- `src/lib/utils/xlsx-parser.ts:714-833` - `exportTermToXlsxBuffer()`

**문제 설명**:

XLSX 파싱 및 생성 함수들이 유사한 패턴을 가지고 있습니다. 워크북 읽기, 시트 변환, 데이터 파싱 로직이 중복됩니다.

**현재 코드:**

```typescript
// parseXlsxToJson (약 137줄)
export function parseXlsxToJson(fileBuffer: Buffer, skipDuplicates: boolean = true) {
	const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
	const firstSheetName = workbook.SheetNames[0];
	const worksheet = workbook.Sheets[firstSheetName];
	const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
	// ... 데이터 파싱
}

// parseDomainXlsxToJson (약 125줄) - 거의 동일한 패턴
export function parseDomainXlsxToJson(fileBuffer: Buffer, skipDuplicates: boolean = true) {
	const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
	// ... 동일한 워크북 읽기 로직
}
```

**영향 범위**:

- 코드 중복 (약 400줄 이상)
- 유지보수 어려움
- 새 엔티티 추가 시 중복 코드 증가

**재현 방법**:

1. `xlsx-parser.ts`에서 파싱 함수들 비교
2. 유사한 코드 패턴 확인

**예상 해결 방법**:

1. **공통 파싱 유틸리티 함수**

   ```typescript
   function parseWorkbook(fileBuffer: Buffer): string[][] {
   	const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
   	const firstSheetName = workbook.SheetNames[0];
   	if (!firstSheetName) {
   		throw new Error('Excel 파일에 시트가 없습니다.');
   	}
   	const worksheet = workbook.Sheets[firstSheetName];
   	return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
   }

   export function parseXlsxToJson(fileBuffer: Buffer, skipDuplicates: boolean = true) {
   	const rawData = parseWorkbook(fileBuffer);
   	// VocabularyEntry 특화 파싱 로직만 남김
   }
   ```

2. **컬럼 매핑을 설정으로 분리**

   ```typescript
   interface ColumnMapping {
   	standardName: number;
   	abbreviation: number;
   	englishName: number;
   	// ...
   }

   function parseRowToEntry<T>(
   	row: string[],
   	mapping: ColumnMapping,
   	validator: (entry: Partial<T>) => T | null
   ): T | null {
   	const rawEntry = {
   		standardName: row[mapping.standardName]?.trim() || ''
   		// ...
   	};
   	return validator(rawEntry);
   }
   ```

**우선순위**: 3

---

## 이슈 #M6: 네이밍 컨벤션 불일치 (Store 파일명)

**심각도**: Medium Priority

**위치**:

- `src/lib/stores/vocabularyStore.ts` - 카멜케이스
- `src/lib/stores/domain-store.ts` - 케밥케이스
- `src/lib/stores/term-store.ts` - 케밥케이스
- `src/lib/stores/settings-store.ts` - 케밥케이스

**문제 설명**:

Store 파일명의 네이밍 컨벤션이 일관되지 않습니다. `vocabularyStore.ts`는 카멜케이스를 사용하지만, 나머지는 케밥케이스를 사용합니다.

**현재 상태:**

```
src/lib/stores/
├── vocabularyStore.ts      ← 카멜케이스
├── domain-store.ts          ← 케밥케이스
├── term-store.ts            ← 케밥케이스
└── settings-store.ts       ← 케밥케이스
```

**영향 범위**:

- 코드 일관성
- 개발자 혼란
- 파일 검색 어려움

**재현 방법**:

1. `src/lib/stores/` 디렉토리 확인
2. 파일명 네이밍 불일치 확인

**예상 해결 방법**:

1. **모든 파일을 케밥케이스로 통일** (권장)

   ```bash
   # vocabularyStore.ts → vocabulary-store.ts
   mv src/lib/stores/vocabularyStore.ts src/lib/stores/vocabulary-store.ts
   ```

2. **또는 모든 파일을 카멜케이스로 통일**

   ```bash
   # domain-store.ts → domainStore.ts
   mv src/lib/stores/domain-store.ts src/lib/stores/domainStore.ts
   ```

3. **import 경로 업데이트**

   ```typescript
   // 모든 파일에서 import 경로 수정
   import { vocabularyStore } from '$lib/stores/vocabulary-store';
   ```

**우선순위**: 4

---

## 이슈 #M7: browse 페이지들의 중복된 상태 관리 패턴

**심각도**: Medium Priority

**위치**:

- `src/routes/browse/+page.svelte` (약 1166줄)
- `src/routes/domain/browse/+page.svelte` (약 890줄)
- `src/routes/term/browse/+page.svelte` (약 944줄)

**문제 설명**:

세 개의 browse 페이지가 거의 동일한 상태 관리 패턴을 가지고 있습니다. 검색, 정렬, 페이지네이션, 파일 관리 로직이 중복됩니다.

**현재 상태:**

```typescript
// browse/+page.svelte
let entries = $state<VocabularyEntry[]>([]);
let loading = $state(false);
let searchQuery = $state('');
let currentPage = $state(1);
let totalPages = $state(1);
let pageSize = $state(20);
let sortColumn = $state('standardName');
let sortDirection = $state<'asc' | 'desc'>('asc');

async function loadVocabularyData() {
	loading = true;
	const params = new URLSearchParams({ ... });
	const response = await fetch(`/api/vocabulary?${params}`);
	// ...
}

// domain/browse/+page.svelte - 거의 동일한 패턴
let entries = $state<DomainEntry[]>([]);
let loading = $state(false);
// ... 동일한 상태 변수들
async function loadDomainData() {
	// 거의 동일한 로직
}
```

**영향 범위**:

- 코드 중복 (약 2000줄 이상)
- 버그 수정 시 3곳 수정 필요
- 기능 추가 시 3곳 수정 필요

**재현 방법**:

1. 세 개의 browse 페이지 파일 비교
2. 거의 동일한 상태 관리 패턴 확인

**예상 해결 방법**:

1. **공통 Composable 함수 생성**

   ```typescript
   // src/lib/composables/useDataTable.ts
   export function useDataTable<T extends Entry>(
   	apiEndpoint: string,
   	defaultSortColumn: string
   ) {
   	let entries = $state<T[]>([]);
   	let loading = $state(false);
   	let searchQuery = $state('');
   	let currentPage = $state(1);
   	// ... 기타 상태

   	async function loadData() {
   		loading = true;
   		const params = new URLSearchParams({ ... });
   		const response = await fetch(`${apiEndpoint}?${params}`);
   		// ...
   	}

   	return {
   		entries,
   		loading,
   		searchQuery,
   		loadData,
   		// ... 기타 함수들
   	};
   }

   // browse/+page.svelte
   <script>
   	const table = useDataTable<VocabularyEntry>('/api/vocabulary', 'standardName');
   </script>
   ```

2. **공통 페이지 컴포넌트 추출**

   ```typescript
   // src/lib/components/DataBrowsePage.svelte
   <script lang="ts" generics="T extends Entry">
   	interface Props<T> {
   		apiEndpoint: string;
   		tableComponent: Component;
   		editorComponent: Component;
   		fileManagerComponent: Component;
   		// ...
   	}
   </script>
   ```

**우선순위**: 2

---

## 이슈 #M8: TermEditor의 이중 역할 (Vocabulary + Term)

**심각도**: Medium Priority

**위치**:

- `src/lib/components/TermEditor.svelte` (약 668줄)

**문제 설명**:

`TermEditor` 컴포넌트가 Vocabulary와 Term 두 가지 용도로 사용되어 복잡도가 높습니다. 조건부 로직이 많아 유지보수가 어렵습니다.

**현재 상태:**

```typescript
// TermEditor.svelte
interface Props {
	entry?: Partial<VocabularyEntry | TermEntry>; // 유니온 타입
	isEditMode?: boolean;
	serverError?: string;
}

// Vocabulary 모드와 Term 모드를 구분하는 조건부 로직
if (isVocabularyMode) {
	// Vocabulary 관련 로직
} else {
	// Term 관련 로직
}
```

**영향 범위**:

- 컴포넌트 복잡도 증가
- 버그 발생 가능성
- 테스트 어려움

**재현 방법**:

1. `TermEditor.svelte` 파일 확인
2. Vocabulary와 Term 모드 구분 로직 확인

**예상 해결 방법**:

1. **별도 컴포넌트로 분리**

   ```typescript
   // VocabularyEditor.svelte
   <script lang="ts">
   	interface Props {
   		entry?: Partial<VocabularyEntry>;
   		isEditMode?: boolean;
   		serverError?: string;
   	}
   	// Vocabulary 전용 로직
   </script>

   // TermEditor.svelte (기존 이름 유지)
   <script lang="ts">
   	interface Props {
   		entry?: Partial<TermEntry>;
   		isEditMode?: boolean;
   		serverError?: string;
   	}
   	// Term 전용 로직
   </script>
   ```

2. **공통 베이스 컴포넌트 추출**

   ```typescript
   // BaseEditor.svelte
   <script lang="ts" generics="T extends Entry">
   	interface Props<T> {
   		entry?: Partial<T>;
   		isEditMode?: boolean;
   		serverError?: string;
   		validateEntry: (entry: Partial<T>) => ValidationResult;
   		onSave: (entry: T) => Promise<void>;
   	}
   </script>

   // VocabularyEditor.svelte
   <script>
   	import BaseEditor from './BaseEditor.svelte';
   	import type { VocabularyEntry } from '$lib/types/vocabulary';
   </script>

   <BaseEditor
   	{entry}
   	{isEditMode}
   	validateEntry={validateVocabularyEntry}
   	onSave={handleSaveVocabulary}
   />
   ```

**우선순위**: 2

---

## 이슈 #M9: file-handler.ts 파일이 너무 큼 (1176줄)

**심각도**: Medium Priority

**위치**:

- `src/lib/utils/file-handler.ts` (1176줄)

**문제 설명**:

`file-handler.ts` 파일이 1176줄로 너무 커서 가독성과 유지보수성이 떨어집니다.

**현재 구조:**

```typescript
// file-handler.ts (1176줄)
-ensureDataDirectory() -
	getDataPath() -
	migrateDataFiles() -
	saveVocabularyData() -
	loadVocabularyData() -
	mergeVocabularyData() -
	createVocabularyFile() -
	renameVocabularyFile() -
	deleteVocabularyFile() -
	listVocabularyFiles() -
	createVocabularyBackup() -
	loadForbiddenWordsData() -
	saveForbiddenWordsData() -
	loadDomainData() -
	saveDomainData() -
	mergeDomainData() -
	createDomainFile() -
	renameDomainFile() -
	deleteDomainFile() -
	listDomainFiles() -
	createDomainBackup() -
	loadTermData() -
	saveTermData() -
	mergeTermData() -
	createTermFile() -
	renameTermFile() -
	deleteTermFile() -
	listTermFiles() -
	createTermBackup();
```

**영향 범위**:

- 파일 가독성
- 코드 탐색 어려움
- 병합 충돌 가능성 증가
- 유지보수 어려움

**재현 방법**:

1. `file-handler.ts` 파일 열기
2. 파일 크기 확인 (1176줄)

**예상 해결 방법**:

1. **엔티티별 파일로 분리**

   ```
   src/lib/utils/file-handler/
   ├── index.ts                    # 공통 함수 export
   ├── common.ts                   # 공통 유틸리티 (ensureDataDirectory, getDataPath)
   ├── vocabulary-handler.ts       # Vocabulary 관련 함수
   ├── domain-handler.ts           # Domain 관련 함수
   ├── term-handler.ts             # Term 관련 함수
   └── forbidden-words-handler.ts  # ForbiddenWords 관련 함수
   ```

2. **기능별 파일로 분리**

   ```
   src/lib/utils/file-handler/
   ├── index.ts
   ├── path-utils.ts               # 경로 관련
   ├── load-utils.ts               # 로드 함수들
   ├── save-utils.ts               # 저장 함수들
   ├── file-operations.ts          # 파일 생성/삭제/이름변경
   └── migration.ts                # 마이그레이션
   ```

3. **기존 import 경로 유지**

   ```typescript
   // src/lib/utils/file-handler/index.ts
   export * from './vocabulary-handler';
   export * from './domain-handler';
   export * from './term-handler';
   export * from './forbidden-words-handler';
   export * from './common';
   ```

**우선순위**: 2

---

## 이슈 #M10: Table 컴포넌트의 Props Drilling

**심각도**: Medium Priority

**위치**:

- `src/lib/components/VocabularyTable.svelte:19-34`
- `src/lib/components/DomainTable.svelte:19-49`
- `src/lib/components/TermTable.svelte`

**문제 설명**:

Table 컴포넌트에 너무 많은 props가 전달되어 Props Drilling 문제가 발생합니다.

**현재 Props:**

```typescript
interface Props {
	entries?: Entry[];
	loading?: boolean;
	searchQuery?: string;
	totalCount?: number;
	currentPage?: number;
	totalPages?: number;
	pageSize?: number;
	sortColumn?: string;
	sortDirection?: 'asc' | 'desc';
	searchField?: string;
	_selectedFilename?: string;
	onsort: (detail: SortEvent) => void;
	onpagechange: (detail: PageChangeEvent) => void;
	onentryclick?: (detail: EntryClickEvent) => void;
}
```

**영향 범위**:

- Props 관리 복잡도
- 컴포넌트 사용 어려움
- 타입 안정성 저하 가능성

**재현 방법**:

1. Table 컴포넌트 사용 예시 확인
2. 많은 props 전달 확인

**예상 해결 방법**:

1. **Props 객체로 그룹화**

   ```typescript
   interface TableProps<T> {
   	data: {
   		entries?: T[];
   		totalCount?: number;
   		currentPage?: number;
   		totalPages?: number;
   		pageSize?: number;
   	};
   	sorting: {
   		column?: string;
   		direction?: 'asc' | 'desc';
   		onsort: (detail: SortEvent) => void;
   	};
   	pagination: {
   		onpagechange: (detail: PageChangeEvent) => void;
   	};
   	search?: {
   		query?: string;
   		field?: string;
   	};
   	loading?: boolean;
   	onentryclick?: (detail: EntryClickEvent) => void;
   }
   ```

2. **Context API 사용**

   ```typescript
   // TableContext.svelte
   <script lang="ts" context="module">
   	const tableContext = createContext<TableContext>();
   </script>

   // Table.svelte
   <script>
   	const context = getContext(tableContext);
   	// context에서 필요한 값들 가져오기
   </script>
   ```

3. **Store 사용**

   ```typescript
   // table-store.ts
   export const tableStore = writable({
   	entries: [],
   	loading: false,
   	currentPage: 1
   	// ...
   });
   ```

**우선순위**: 3

---

## 이슈 #M11: 불필요한 데이터 변환 및 매핑 로직 중복

**심각도**: Medium Priority

**위치**:

- `src/lib/utils/file-handler.ts:254-265` - `mappedDomainFile` ↔ `mapping.domain` 변환
- `src/routes/api/vocabulary/sync-domain/+server.ts:20-24` - 매핑 정보 로드
- `src/routes/api/vocabulary/files/mapping/+server.ts:20, 59, 75-78` - 매핑 정보 처리
- `src/lib/components/TermFileManager.svelte:143` - 매핑 정보 사용

**문제 설명**:

`mappedDomainFile`과 `mapping.domain` 간 변환 로직이 여러 곳에 중복되어 있습니다.

**현재 코드:**

```typescript
// file-handler.ts:254-265
let mapping = data.mapping;
if (!mapping && data.mappedDomainFile) {
	mapping = { domain: data.mappedDomainFile };
} else if (!mapping) {
	mapping = { domain: 'domain.json' };
}

// sync-domain/+server.ts:20-24
const mapping = vocabularyData.mapping || {
	domain: vocabularyData.mappedDomainFile || 'domain.json'
};

// files/mapping/+server.ts:20
domain: vocabularyData.mappedDomainFile || 'domain.json';
```

**영향 범위**:

- 코드 중복
- 일관성 문제 가능성
- 유지보수 어려움

**재현 방법**:

1. `mappedDomainFile`과 `mapping.domain` 사용하는 곳 검색
2. 중복된 변환 로직 확인

**예상 해결 방법**:

1. **공통 유틸리티 함수 생성**

   ```typescript
   // src/lib/utils/mapping-utils.ts
   export function getDomainMapping(data: VocabularyData | DomainData): string {
   	if (data.mapping?.domain) {
   		return data.mapping.domain;
   	}
   	if ('mappedDomainFile' in data && data.mappedDomainFile) {
   		return data.mappedDomainFile;
   	}
   	return 'domain.json';
   }

   export function normalizeMapping(data: VocabularyData): VocabularyData {
   	const domainFile = getDomainMapping(data);
   	return {
   		...data,
   		mapping: { domain: domainFile },
   		mappedDomainFile: domainFile // 하위 호환성
   	};
   }
   ```

2. **모든 곳에서 공통 함수 사용**

   ```typescript
   import { getDomainMapping } from '$lib/utils/mapping-utils';

   const domainFile = getDomainMapping(vocabularyData);
   ```

**우선순위**: 3

---

## 이슈 #M12: 각 페이지의 동일한 데이터 로드 패턴 중복

**심각도**: Medium Priority

**위치**:

- `src/routes/browse/+page.svelte:185-238` - `loadVocabularyData()`
- `src/routes/domain/browse/+page.svelte:127-162` - `loadDomainData()`
- `src/routes/term/browse/+page.svelte:129-164` - `loadTermData()`

**문제 설명**:

세 개의 browse 페이지가 거의 동일한 데이터 로드 패턴을 가지고 있습니다. URLSearchParams 생성, fetch 호출, 응답 파싱 로직이 중복됩니다.

**현재 코드:**

```typescript
// browse/+page.svelte
async function loadVocabularyData() {
	loading = true;
	try {
		const params = new URLSearchParams({
			page: currentPage.toString(),
			limit: pageSize.toString(),
			sortBy: sortColumn,
			sortOrder: sortDirection,
			filename: selectedFilename
		});
		const response = await fetch(`/api/vocabulary?${params}`);
		const result: ApiResponse = await response.json();
		// ... 응답 처리
	} catch (error) {
		// ...
	} finally {
		loading = false;
	}
}

// domain/browse/+page.svelte - 거의 동일
async function loadDomainData() {
	loading = true;
	// 동일한 패턴
}
```

**영향 범위**:

- 코드 중복
- 버그 수정 시 여러 곳 수정 필요
- API 변경 시 여러 곳 수정 필요

**예상 해결 방법**:

1. **공통 데이터 로드 함수**

   ```typescript
   // src/lib/utils/api-client.ts
   export async function loadData<T>(
   	endpoint: string,
   	params: Record<string, string | number | boolean>
   ): Promise<ApiResponse<T>> {
   	const searchParams = new URLSearchParams();
   	Object.entries(params).forEach(([key, value]) => {
   		searchParams.set(key, String(value));
   	});
   	const response = await fetch(`${endpoint}?${searchParams}`);
   	return response.json();
   }

   // 사용
   async function loadVocabularyData() {
   	loading = true;
   	try {
   		const result = await loadData<VocabularyData>('/api/vocabulary', {
   			page: currentPage,
   			limit: pageSize,
   			sortBy: sortColumn,
   			sortOrder: sortDirection,
   			filename: selectedFilename
   		});
   		// ...
   	} finally {
   		loading = false;
   	}
   }
   ```

2. **React Query 스타일의 Hook**

   ```typescript
   // src/lib/hooks/useDataLoader.ts
   export function useDataLoader<T>(endpoint: string, params: LoadParams) {
   	let data = $state<T[]>([]);
   	let loading = $state(false);
   	let error = $state<string | null>(null);

   	async function load() {
   		loading = true;
   		try {
   			const result = await loadData<T>(endpoint, params);
   			if (result.success) {
   				data = result.data.entries;
   			}
   		} catch (e) {
   			error = e.message;
   		} finally {
   			loading = false;
   		}
   	}

   	return { data, loading, error, load };
   }
   ```

**우선순위**: 3

---

## 이슈 #M13: xlsx-parser.ts 파일이 너무 큼

**심각도**: Medium Priority

**위치**:

- `src/lib/utils/xlsx-parser.ts` (약 833줄)

**문제 설명**:

`xlsx-parser.ts` 파일이 833줄로 커서 가독성과 유지보수성이 떨어집니다.

**현재 구조:**

```typescript
// xlsx-parser.ts (833줄)
-parseXlsxToJson() - // Vocabulary 파싱
	exportJsonToXlsxBuffer() - // Vocabulary 생성
	parseDomainXlsxToJson() - // Domain 파싱
	exportDomainToXlsxBuffer() - // Domain 생성
	parseTermXlsxToJson() - // Term 파싱
	exportTermToXlsxBuffer(); // Term 생성
```

**영향 범위**:

- 파일 가독성
- 코드 탐색 어려움
- 유지보수 어려움

**재현 방법**:

1. `xlsx-parser.ts` 파일 열기
2. 파일 크기 확인 (833줄)

**예상 해결 방법**:

1. **엔티티별 파일로 분리**

   ```
   src/lib/utils/xlsx-parser/
   ├── index.ts                  # 공통 함수 export
   ├── vocabulary-parser.ts      # Vocabulary 파싱/생성
   ├── domain-parser.ts          # Domain 파싱/생성
   └── term-parser.ts            # Term 파싱/생성
   ```

2. **기능별 파일로 분리**

   ```
   src/lib/utils/xlsx-parser/
   ├── index.ts
   ├── parser.ts                 # 파싱 공통 로직
   ├── exporter.ts               # 생성 공통 로직
   ├── vocabulary.ts             # Vocabulary 특화
   ├── domain.ts                 # Domain 특화
   └── term.ts                   # Term 특화
   ```

**우선순위**: 3

---

## 이슈 #M14: 상태 관리 패턴의 일관성 부족

**심각도**: Medium Priority

**위치**:

- `src/routes/browse/+page.svelte` - Store + 로컬 상태 혼용
- `src/routes/domain/browse/+page.svelte` - Store + 로컬 상태 혼용
- `src/routes/term/browse/+page.svelte` - Store + 로컬 상태 혼용

**문제 설명**:

각 페이지에서 Store와 로컬 상태(`$state`)를 혼용하여 상태 관리 패턴이 일관되지 않습니다.

**현재 상태:**

```typescript
// browse/+page.svelte
import { vocabularyStore } from '$lib/stores/vocabularyStore'; // Store 사용
let entries = $state<VocabularyEntry[]>([]); // 로컬 상태
let loading = $state(false); // 로컬 상태
let selectedFilename = $state('vocabulary.json'); // 로컬 상태

// vocabularyStore도 selectedFilename을 관리
vocabularyStore.subscribe((value) => {
	selectedFilename = value.selectedFilename; // 중복 관리
});
```

**영향 범위**:

- 상태 관리 복잡도
- 상태 동기화 문제 가능성
- 개발자 혼란

**재현 방법**:

1. 각 browse 페이지의 상태 관리 방식 확인
2. Store와 로컬 상태 혼용 확인

**예상 해결 방법**:

1. **Store로 통일**

   ```typescript
   // vocabulary-store.ts 확장
   export const vocabularyStore = writable({
   	selectedFilename: 'vocabulary.json',
   	entries: [] as VocabularyEntry[],
   	loading: false,
   	currentPage: 1,
   	totalPages: 1
   	// ...
   });
   ```

2. **로컬 상태로 통일**

   ```typescript
   // Store는 파일명만 관리
   // 나머지는 모두 로컬 상태
   let entries = $state<VocabularyEntry[]>([]);
   let loading = $state(false);
   // ...
   ```

3. **커스텀 Store 생성**

   ```typescript
   // src/lib/stores/data-table-store.ts
   export function createDataTableStore<T>(initialData: T[]) {
   	const { subscribe, set, update } = writable({
   		entries: initialData,
   		loading: false,
   		currentPage: 1
   		// ...
   	});

   	return {
   		subscribe,
   		loadData: async (endpoint: string) => {
   			update((state) => ({ ...state, loading: true }));
   			// ...
   		}
   	};
   }
   ```

**우선순위**: 3

---

## 요약

| 이슈 ID | 제목                           | 우선순위 | 중복 코드 | 리팩토링 | 파일 크기 | 네이밍 |
| ------- | ------------------------------ | -------- | --------- | -------- | --------- | ------ |
| #M1     | file-handler.ts load/save 중복 | 3        | ✅        | ❌       | ❌        | ❌     |
| #M2     | file-handler.ts 파일 관리 중복 | 3        | ✅        | ❌       | ❌        | ❌     |
| #M3     | Table 컴포넌트 중복            | 2        | ✅        | ✅       | ❌        | ❌     |
| #M4     | FileManager 컴포넌트 중복      | 3        | ✅        | ✅       | ❌        | ❌     |
| #M5     | xlsx-parser.ts 파싱 함수 중복  | 3        | ✅        | ❌       | ❌        | ❌     |
| #M6     | Store 파일명 네이밍 불일치     | 4        | ❌        | ❌       | ❌        | ✅     |
| #M7     | browse 페이지 상태 관리 중복   | 2        | ✅        | ❌       | ❌        | ❌     |
| #M8     | TermEditor 이중 역할           | 2        | ❌        | ✅       | ❌        | ❌     |
| #M9     | file-handler.ts 파일 크기      | 2        | ❌        | ❌       | ✅        | ❌     |
| #M10    | Table 컴포넌트 Props Drilling  | 3        | ❌        | ✅       | ❌        | ❌     |
| #M11    | 불필요한 데이터 변환 중복      | 3        | ✅        | ❌       | ❌        | ❌     |
| #M12    | 페이지 데이터 로드 패턴 중복   | 3        | ✅        | ❌       | ❌        | ❌     |
| #M13    | xlsx-parser.ts 파일 크기       | 3        | ❌        | ❌       | ✅        | ❌     |
| #M14    | 상태 관리 패턴 일관성 부족     | 3        | ❌        | ❌       | ❌        | ❌     |

**총 14개 Medium Priority 이슈 발견**

**우선순위 2 (빠른 시일 내 수정):** 4개
**우선순위 3 (계획적 수정):** 9개
**우선순위 4 (여유 있을 때 수정):** 1개

---

**마지막 업데이트**: 2024-01-01
