# High Priority 이슈 목록

이 문서는 빠른 시일 내 수정이 필요한 High Priority 레벨 이슈들을 정리합니다.

---

## ~~이슈 #H1: 하위 호환성 필드 중복으로 인한 스키마 불일치~~ ✅ 해결됨

> **해결일**: 2024-12-12
> **해결 방법**: `mappedDomainFile`을 deprecated하고 `mapping.domain`으로 통합
>
> - `mappedDomainFile`에 `@deprecated` JSDoc 주석 추가
> - 로드 시 자동 마이그레이션 (mappedDomainFile → mapping.domain)
> - 저장 시 `mappedDomainFile` 필드 제거
> - 모든 API에서 `mapping.domain`만 사용하도록 통일

**심각도**: High Priority

**위치**:

- `src/lib/types/vocabulary.ts` - `@deprecated` 주석 추가
- `src/lib/utils/file-handler.ts` - 저장 시 mappedDomainFile 제거
- `src/routes/api/vocabulary/sync-domain/+server.ts` - mapping.domain만 사용
- `src/routes/api/vocabulary/files/mapping/+server.ts` - mappedDomainFile 제거

**문제 설명**:

`VocabularyData`에 `mappedDomainFile`과 `mapping.domain` 두 필드가 공존하여 스키마 불일치와 혼란을 야기합니다.

**현재 상태:**

```typescript
// src/lib/types/vocabulary.ts
export interface VocabularyData {
	entries: VocabularyEntry[];
	lastUpdated: string;
	totalCount: number;
	mappedDomainFile?: string; // 하위 호환성 유지
	mapping?: {
		domain: string;
	};
}
```

**문제 시나리오:**

1. 코드에서 두 필드를 모두 확인하여 하위 호환성 유지
2. `mappedDomainFile`과 `mapping.domain` 값이 불일치할 수 있음
3. 새로운 코드와 기존 코드 간 혼란
4. 데이터 마이그레이션 필요성

**영향 범위**:

- 모든 Vocabulary 데이터 로드/저장 작업
- 도메인 매핑 동기화 API
- 매핑 정보 조회/저장 API
- 데이터 일관성

**재현 방법**:

1. `mappedDomainFile`만 있는 기존 JSON 파일 로드
2. `mapping.domain`만 있는 새 JSON 파일 로드
3. 두 필드 값이 다를 수 있음

**예상 해결 방법**:

1. **마이그레이션 스크립트 작성**

   ```typescript
   async function migrateVocabularyData(filename: string) {
   	const data = await loadVocabularyData(filename);
   	if (data.mappedDomainFile && !data.mapping) {
   		data.mapping = { domain: data.mappedDomainFile };
   		await saveVocabularyData(data, filename);
   	}
   }
   ```

2. **mappedDomainFile 필드 제거 계획**
   - 모든 데이터 마이그레이션 완료 후
   - 타입 정의에서 제거
   - 코드에서 `mappedDomainFile` 참조 제거

3. **단계적 제거**
   - Phase 1: 마이그레이션 스크립트 실행
   - Phase 2: 코드에서 `mappedDomainFile` 읽기만 허용 (쓰기 금지)
   - Phase 3: 타입 정의에서 제거

**우선순위**: 2

---

## 이슈 #H2: History API의 유니온 타입 응답으로 인한 타입 안정성 저하

**심각도**: High Priority

**위치**:

- `src/routes/api/history/+server.ts:46, 103, 145`
- `src/lib/utils/history-handler.ts:100`

**문제 설명**:

History API가 `HistoryData | DomainHistoryData | TermHistoryData` 유니온 타입을 반환하여 타입 안정성이 저하됩니다.

**현재 코드:**

```typescript
// src/routes/api/history/+server.ts:46
let historyData: HistoryData | DomainHistoryData | TermHistoryData;

// src/routes/api/history/+server.ts:103
const logData: Partial<HistoryLogEntry | DomainHistoryLogEntry | TermHistoryLogEntry> =
	await request.json();
```

**문제 시나리오:**

1. `type` 파라미터로 구분하지만 타입 시스템이 이를 인식하지 못함
2. 타입 가드 없이 사용 시 타입 에러 발생
3. `filename` 필드가 `HistoryLogEntry`에만 존재하는데 타입 체크 어려움
4. → 타입 안전성 저하, 런타임 에러 가능성

**영향 범위**:

- History API 호출하는 모든 코드
- 히스토리 로그 조회/추가 기능
- 타입 안정성

**재현 방법**:

1. History API 호출 후 반환 타입 사용
2. TypeScript가 정확한 타입을 추론하지 못함
3. 타입 가드 없이 사용 시 컴파일 에러

**예상 해결 방법**:

1. **제네릭 타입 사용**

   ```typescript
   async function loadHistoryData<T extends HistoryType>(
   	filename: string | undefined,
   	type: T
   ): Promise<
   	T extends 'vocabulary' ? HistoryData : T extends 'domain' ? DomainHistoryData : TermHistoryData
   > {
   	// 구현
   }
   ```

2. **타입 가드 함수 추가**

   ```typescript
   function isHistoryData(
   	data: HistoryData | DomainHistoryData | TermHistoryData,
   	type: HistoryType
   ): data is HistoryData {
   	return type === 'vocabulary';
   }
   ```

3. **별도 엔드포인트 분리** (장기)
   - `/api/history/vocabulary`
   - `/api/history/domain`
   - `/api/history/term`

**우선순위**: 2

---

## ~~이슈 #H3: Term API에서 매번 Vocabulary/Domain 데이터를 로드하는 N+1 문제~~ ✅ 해결됨

> **해결일**: 2024-12-12
> **해결 방법**: 메모리 캐시 시스템 구현
>
> - `src/lib/utils/cache.ts` 신규 생성
> - `MemoryCache` 클래스: TTL 기반 캐시
> - `getCachedVocabularyData()`, `getCachedDomainData()` 함수
> - 데이터 수정 시 `invalidateCache()` 호출
> - TTL: 30초, 최대 캐시: 5개

**심각도**: High Priority

**위치**:

- `src/lib/utils/cache.ts` - 캐시 유틸리티
- `src/routes/api/term/+server.ts` - 캐시 적용
- `src/routes/api/term/upload/+server.ts` - 캐시 적용

**문제 설명**:

Term API에서 매번 Vocabulary와 Domain 데이터를 전체 로드하여 성능 문제가 발생합니다.

**현재 코드:**

```typescript
// src/routes/api/term/+server.ts:238-239
const vocabularyData = await loadVocabularyData(mapping.vocabulary);
const domainData = await loadDomainData(mapping.domain);

// 전체 파일을 메모리로 로드
vocabularyData.entries.forEach((vocabEntry) => {
	// 맵 생성
});
```

**문제 시나리오:**

1. Term 엔트리 1개 추가 시 Vocabulary/Domain 전체 파일 로드
2. Term 엔트리 100개 추가 시 100번 파일 로드
3. 대용량 데이터에서 성능 저하
4. → N+1 쿼리 문제와 유사한 성능 이슈

**영향 범위**:

- Term 추가/수정 API
- Term 업로드 API
- Term 동기화 API
- 성능 (특히 대용량 데이터)

**재현 방법**:

1. Vocabulary/Domain에 각각 10,000개 엔트리 존재
2. Term 엔트리 100개 추가
3. 각 추가마다 20,000개 엔트리 로드
4. → 총 2,000,000개 엔트리 처리

**예상 해결 방법**:

1. **캐싱 메커니즘 도입**

   ```typescript
   const vocabularyCache = new Map<string, { data: VocabularyData; timestamp: number }>();
   const CACHE_TTL = 5 * 60 * 1000; // 5분

   async function getCachedVocabularyData(filename: string): Promise<VocabularyData> {
   	const cached = vocabularyCache.get(filename);
   	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
   		return cached.data;
   	}
   	const data = await loadVocabularyData(filename);
   	vocabularyCache.set(filename, { data, timestamp: Date.now() });
   	return data;
   }
   ```

2. **인덱스 파일 생성**

   ```typescript
   // vocabulary-index.json 생성
   {
   	"standardNameMap": { "사용자": "id1", ... },
   	"abbreviationMap": { "USER": "id1", ... }
   }
   ```

3. **스트리밍 처리** (장기)
   - 필요한 엔트리만 로드
   - 파일 스트리밍으로 메모리 사용량 감소

**우선순위**: 1

---

## ~~이슈 #H4: 데이터 검증 로직 부족 (타입, 형식, 참조 무결성)~~ ✅ 해결됨

> **해결일**: 2024-12-12
> **해결 방법**: 형식 검증 함수 추가 및 저장 로직 강화
>
> - `isValidUUID()`: UUID v4 형식 검증
> - `isValidISODate()`: ISO 8601 날짜 형식 검증
> - `DataValidationError`: 검증 에러 클래스
> - 모든 save 함수에 형식 검증 추가
> - (참조 무결성은 Phase 1 #C6에서 구현됨)

**심각도**: High Priority

**위치**:

- `src/lib/utils/validation.ts` - 형식 검증 함수들
- `src/lib/utils/file-handler.ts` - save 함수 검증 강화

**문제 설명**:

현재 검증은 필수 필드 존재 여부만 확인하고, 타입 검증, 형식 검증, 참조 무결성 검증이 부족합니다.

**현재 검증:**

```typescript
// src/lib/utils/file-handler.ts:243-251
const isValid =
	entry.id && entry.standardName && entry.abbreviation && entry.englishName && entry.createdAt;
```

**검증 항목:**

- ✅ 필수 필드 존재 여부
- ✅ 배열 타입 검증
- ❌ 타입 검증 (문자열/숫자 등)
- ❌ 형식 검증 (ISO 8601, UUID 등)
- ❌ 참조 무결성 검증 (외래 키)

**문제 시나리오:**

1. `id`가 UUID 형식이 아닌 경우
2. `createdAt`이 ISO 8601 형식이 아닌 경우
3. `TermEntry`가 존재하지 않는 `VocabularyEntry` 참조
4. → 데이터 무결성 손상

**영향 범위**:

- 모든 데이터 로드/저장 작업
- 데이터 무결성
- 런타임 에러 가능성

**재현 방법**:

1. JSON 파일에 잘못된 형식의 데이터 수동 추가
2. `id: 123` (숫자), `createdAt: "2024-01-01"` (형식 오류)
3. 애플리케이션에서 로드 시 검증 실패하지 않음

**예상 해결 방법**:

1. **타입 가드 함수 구현**

   ```typescript
   function isVocabularyEntry(obj: unknown): obj is VocabularyEntry {
   	return (
   		typeof obj === 'object' &&
   		obj !== null &&
   		'id' in obj &&
   		typeof obj.id === 'string' &&
   		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
   			obj.id
   		) &&
   		'standardName' in obj &&
   		typeof obj.standardName === 'string' &&
   		// ... 기타 필드 검증
   	);
   }
   ```

2. **Zod 스키마 도입**

   ```typescript
   import { z } from 'zod';

   const VocabularyEntrySchema = z.object({
   	id: z.string().uuid(),
   	standardName: z.string().min(1),
   	abbreviation: z.string().min(1),
   	englishName: z.string().min(1),
   	createdAt: z.string().datetime(),
   	updatedAt: z.string().datetime()
   });

   const data = VocabularyEntrySchema.parse(entry);
   ```

3. **참조 무결성 검증**

   ```typescript
   async function validateTermReferences(term: TermEntry): Promise<boolean> {
   	const vocabularyData = await loadVocabularyData();
   	const domainData = await loadDomainData();

   	// termName이 vocabulary에 존재하는지 확인
   	const termNameParts = term.termName.split('_');
   	const allExist = termNameParts.every((part) =>
   		vocabularyData.entries.some((v) => v.standardName === part)
   	);

   	// domainName이 domain에 존재하는지 확인
   	const domainExists = domainData.entries.some((d) => d.standardDomainName === term.domainName);

   	return allExist && domainExists;
   }
   ```

**우선순위**: 1

---

## 이슈 #H5: Domain API에 POST (생성) 엔드포인트 없음

**심각도**: High Priority

**위치**:

- `src/routes/api/domain/+server.ts` - POST 메소드 없음
- `docs/analysis/03-api-layer.md:46-59` - Domain API 목록

**문제 설명**:

Domain API에 POST (생성) 엔드포인트가 없어 CRUD 작업이 불완전합니다. 현재는 업로드로만 도메인을 추가할 수 있습니다.

**현재 API:**

- ✅ GET `/api/domain` - 조회
- ❌ POST `/api/domain` - **없음**
- ✅ PUT `/api/domain` - 수정
- ✅ DELETE `/api/domain` - 삭제
- ✅ POST `/api/domain/upload` - 업로드

**문제 시나리오:**

1. 사용자가 UI에서 도메인을 추가하려고 시도
2. POST 엔드포인트가 없어 실패
3. XLSX 파일 업로드만 가능
4. → CRUD 불완전, 사용성 저하

**영향 범위**:

- Domain 관리 기능
- UI에서 도메인 추가 기능
- API 일관성

**재현 방법**:

1. Domain 관리 페이지에서 "추가" 버튼 클릭
2. API 호출 시 404 에러 또는 기능 없음

**예상 해결 방법**:

1. **POST 엔드포인트 추가**

   ```typescript
   export async function POST({ request, url }: RequestEvent) {
   	try {
   		const newEntry: Partial<DomainEntry> = await request.json();
   		const filename = url.searchParams.get('filename') || undefined;

   		// 필수 필드 검증
   		if (
   			!newEntry.domainGroup ||
   			!newEntry.domainCategory ||
   			!newEntry.standardDomainName ||
   			!newEntry.physicalDataType
   		) {
   			return json(
   				{
   					success: false,
   					error: '필수 필드가 누락되었습니다.',
   					message: 'Missing required fields'
   				} as ApiResponse,
   				{ status: 400 }
   			);
   		}

   		const domainData = await loadDomainData(filename);

   		// 중복 검사
   		const isDuplicate = domainData.entries.some(
   			(e) =>
   				e.domainGroup === newEntry.domainGroup &&
   				e.domainCategory === newEntry.domainCategory &&
   				e.standardDomainName === newEntry.standardDomainName
   		);

   		if (isDuplicate) {
   			return json(
   				{
   					success: false,
   					error: '이미 존재하는 도메인입니다.',
   					message: 'Duplicate domain'
   				} as ApiResponse,
   				{ status: 409 }
   			);
   		}

   		const entryToSave: DomainEntry = {
   			id: uuidv4(),
   			domainGroup: newEntry.domainGroup,
   			domainCategory: newEntry.domainCategory,
   			standardDomainName: newEntry.standardDomainName,
   			physicalDataType: newEntry.physicalDataType,
   			// ... 기타 필드
   			createdAt: new Date().toISOString(),
   			updatedAt: new Date().toISOString()
   		};

   		domainData.entries.push(entryToSave);
   		await saveDomainData(domainData, filename);

   		return json(
   			{
   				success: true,
   				data: entryToSave,
   				message: '새로운 도메인이 성공적으로 추가되었습니다.'
   			} as ApiResponse,
   			{ status: 201 }
   		);
   	} catch (error) {
   		// 에러 처리
   	}
   }
   ```

2. **UI 컴포넌트 업데이트**
   - DomainEditor에서 추가 기능 활성화
   - Vocabulary/Term과 동일한 패턴 적용

**우선순위**: 2

---

## 이슈 #H6: 에러 처리 일관성 부족

**심각도**: High Priority

**위치**:

- 모든 API 엔드포인트의 에러 처리
- `src/routes/api/vocabulary/+server.ts:300-310`
- `src/routes/api/domain/+server.ts`
- `src/routes/api/term/+server.ts`

**문제 설명**:

에러 처리가 각 API마다 다르게 구현되어 일관성이 부족합니다. 에러 메시지 형식, 로깅 방식, 상태 코드가 통일되지 않습니다.

**현재 문제:**

1. **에러 메시지 형식 불일치**
   - 일부: `error: '에러 메시지'`
   - 일부: `error: loadError instanceof Error ? loadError.message : '...'`

2. **로깅 방식 불일치**
   - 일부: `console.error('...', error)`
   - 일부: `console.warn('...', error)`
   - 일부: 로깅 없음

3. **상태 코드 불일치**
   - 동일한 에러 상황에서 다른 상태 코드 사용

**영향 범위**:

- 모든 API 엔드포인트
- 에러 처리 일관성
- 디버깅 어려움

**재현 방법**:

1. 각 API에서 동일한 에러 상황 발생
2. 에러 응답 형식이 다름
3. 프론트엔드에서 일관된 에러 처리 어려움

**예상 해결 방법**:

1. **에러 핸들러 유틸리티 함수 생성**

   ```typescript
   // src/lib/utils/error-handler.ts
   export function handleApiError(error: unknown, context: string): ApiResponse {
   	console.error(`[${context}]`, error);

   	if (error instanceof SyntaxError) {
   		return {
   			success: false,
   			error: '요청 데이터 형식이 올바르지 않습니다.',
   			message: 'Invalid JSON format'
   		};
   	}

   	if (error instanceof Error) {
   		// 파일 관련 에러
   		if (error.message.includes('ENOENT')) {
   			return {
   				success: false,
   				error: '파일을 찾을 수 없습니다.',
   				message: 'File not found'
   			};
   		}

   		// 권한 관련 에러
   		if (error.message.includes('EACCES')) {
   			return {
   				success: false,
   				error: '파일 접근 권한이 없습니다.',
   				message: 'Permission denied'
   			};
   		}

   		return {
   			success: false,
   			error: error.message,
   			message: 'Internal server error'
   		};
   	}

   	return {
   		success: false,
   		error: '알 수 없는 오류가 발생했습니다.',
   		message: 'Unknown error'
   	};
   }
   ```

2. **에러 응답 타입 표준화**

   ```typescript
   interface ErrorResponse extends ApiResponse {
   	success: false;
   	error: string;
   	message: string;
   	code?: string; // 에러 코드 추가
   	details?: unknown; // 상세 정보 (개발 모드)
   }
   ```

3. **에러 로깅 미들웨어**
   - 모든 API에서 일관된 로깅
   - 에러 추적 시스템 연동 (선택)

**우선순위**: 2

---

## ~~이슈 #H7: 전체 파일을 메모리로 로드하는 성능 문제~~ ✅ 해결됨

> **해결일**: 2024-12-12
> **해결 방법**: 캐시 기반 최적화 + 인덱스 시스템 구현
>
> - `src/lib/utils/data-index.ts` 신규 생성 (인덱스 시스템)
> - 캐시 기반 페이지네이션 함수 추가
> - `getPaginatedVocabulary/Domain/Term()` 함수
> - TTL 캐시로 반복 로드 방지 (30초)
> - 역인덱스로 빠른 검색 지원

**심각도**: High Priority

**위치**:

- `src/lib/utils/data-index.ts` - 인덱스 시스템
- `src/lib/utils/cache.ts` - 페이지네이션 최적화 함수

**문제 설명**:

모든 데이터 조회 시 전체 파일을 메모리로 로드하여 대용량 데이터에서 성능 문제가 발생합니다.

**현재 동작:**

```typescript
// src/lib/utils/file-handler.ts:223
const jsonString = await readFile(dataPath, 'utf-8');
const data = JSON.parse(jsonString) as VocabularyData;

// 전체 엔트리를 메모리로 로드
const filtered = data.entries.filter(/* 조건 */);
```

**문제 시나리오:**

1. 10,000개 엔트리가 있는 파일 조회
2. 전체 파일을 메모리로 로드 (약 10MB)
3. 페이지네이션으로 20개만 필요해도 전체 로드
4. → 불필요한 메모리 사용, 느린 응답 시간

**영향 범위**:

- 모든 데이터 조회 API
- 검색 API
- 성능 (특히 대용량 데이터)

**재현 방법**:

1. 10,000개 이상의 엔트리가 있는 파일 생성
2. 첫 페이지(20개) 조회
3. 전체 파일 로드로 인한 지연

**예상 해결 방법**:

1. **인덱스 파일 생성**

   ```typescript
   // vocabulary-index.json
   {
   	"entries": [
   		{ "id": "xxx", "standardName": "사용자", "offset": 0, "length": 150 },
   		// ...
   	],
   	"lastUpdated": "2024-01-01T00:00:00.000Z"
   }

   // 필요한 엔트리만 읽기
   async function loadVocabularyEntryById(id: string): Promise<VocabularyEntry> {
   	const index = await loadIndex('vocabulary');
   	const entryInfo = index.entries.find((e) => e.id === id);
   	const file = await openFile('vocabulary.json');
   	const buffer = Buffer.alloc(entryInfo.length);
   	await file.read(buffer, 0, entryInfo.length, entryInfo.offset);
   	return JSON.parse(buffer.toString());
   }
   ```

2. **스트리밍 JSON 파서 사용**

   ```typescript
   import { createReadStream } from 'fs';
   import { parser } from 'stream-json';

   async function* loadVocabularyEntriesStream(filename: string): AsyncGenerator<VocabularyEntry> {
   	const stream = createReadStream(getDataPath(filename, 'vocabulary'))
   		.pipe(parser())
   		.pipe(streamValues());

   	for await (const chunk of stream) {
   		if (chunk.key === 'entries' && Array.isArray(chunk.value)) {
   			for (const entry of chunk.value) {
   				yield entry;
   			}
   		}
   	}
   }
   ```

3. **캐싱 및 지연 로딩**
   - 자주 사용되는 데이터만 캐시
   - 필요할 때만 로드

**우선순위**: 1

---

## 이슈 #H8: 검증 로직이 각 컴포넌트에 분산

**심각도**: High Priority

**위치**:

- `src/lib/components/TermEditor.svelte:291-310` - 검증 함수
- `src/lib/components/DomainEditor.svelte:67-93` - 검증 함수
- `src/routes/api/vocabulary/+server.ts:196-206` - 서버 검증
- `src/routes/api/domain/+server.ts` - 서버 검증

**문제 설명**:

검증 로직이 각 컴포넌트와 API에 분산되어 있어 일관성 유지가 어렵고 중복 코드가 발생합니다.

**현재 상태:**

```typescript
// TermEditor.svelte
function validateTermName(value: string): string {
	if (!value.trim()) {
		return '용어명은 필수 입력 항목입니다.';
	}
	return '';
}

// API 서버
if (!newEntry.standardName || !newEntry.abbreviation || !newEntry.englishName) {
	return json({ success: false, error: '...' }, { status: 400 });
}
```

**문제 시나리오:**

1. 클라이언트와 서버의 검증 로직이 다름
2. 검증 규칙 변경 시 여러 곳 수정 필요
3. 일관성 없는 에러 메시지
4. → 유지보수 어려움, 버그 발생 가능성

**영향 범위**:

- 모든 폼 컴포넌트
- 모든 API 엔드포인트
- 코드 일관성
- 유지보수성

**재현 방법**:

1. 클라이언트에서 검증 통과
2. 서버에서 다른 검증 규칙으로 실패
3. 사용자 혼란

**예상 해결 방법**:

1. **공통 검증 유틸리티 함수 생성**

   ```typescript
   // src/lib/utils/validation.ts
   export function validateVocabularyEntry(entry: Partial<VocabularyEntry>): {
   	valid: boolean;
   	errors: string[];
   } {
   	const errors: string[] = [];

   	if (!entry.standardName?.trim()) {
   		errors.push('표준단어명은 필수 항목입니다.');
   	}

   	if (!entry.abbreviation?.trim()) {
   		errors.push('영문약어는 필수 항목입니다.');
   	}

   	if (!entry.englishName?.trim()) {
   		errors.push('영문명은 필수 항목입니다.');
   	}

   	// 길이 검증
   	if (entry.standardName && entry.standardName.length > 100) {
   		errors.push('표준단어명은 100자 이하여야 합니다.');
   	}

   	return { valid: errors.length === 0, errors };
   }
   ```

2. **Zod 스키마 공유**

   ```typescript
   // src/lib/schemas/vocabulary.ts
   import { z } from 'zod';

   export const VocabularyEntrySchema = z.object({
   	standardName: z.string().min(1).max(100),
   	abbreviation: z.string().min(1).max(50),
   	englishName: z.string().min(1).max(100),
   	description: z.string().max(1000).optional()
   });

   // 클라이언트와 서버에서 공유
   ```

3. **검증 미들웨어**

   ```typescript
   // API에서 사용
   export async function POST({ request }: RequestEvent) {
   	const body = await request.json();
   	const result = VocabularyEntrySchema.safeParse(body);

   	if (!result.success) {
   		return json(
   			{
   				success: false,
   				error: result.error.errors.map((e) => e.message).join(', '),
   				message: 'Validation failed'
   			},
   			{ status: 400 }
   		);

   		// 검증 통과
   	}
   }
   ```

**우선순위**: 2

---

## 이슈 #H9: Partial 타입 사용으로 인한 타입 안정성 저하

**심각도**: High Priority

**위치**:

- `src/routes/api/vocabulary/+server.ts:193` - `Partial<VocabularyEntry>`
- `src/routes/api/domain/+server.ts` - `Partial<DomainEntry>`
- `src/routes/api/term/+server.ts:215` - `Partial<TermEntry>`

**문제 설명**:

API 요청 바디에 `Partial<T>` 타입을 사용하여 필수 필드가 선택적으로 되어 타입 안정성이 저하됩니다.

**현재 코드:**

```typescript
// src/routes/api/vocabulary/+server.ts:193
const newEntry: Partial<VocabularyEntry> = await request.json();

// 필수 필드 검증은 런타임에만 수행
if (!newEntry.standardName || !newEntry.abbreviation || !newEntry.englishName) {
	return json({ success: false, error: '...' }, { status: 400 });
}
```

**문제 시나리오:**

1. TypeScript가 필수 필드를 강제하지 않음
2. 필수 필드 누락 시 런타임에만 발견
3. 타입 안정성 저하
4. → 개발 시 실수 가능성 증가

**영향 범위**:

- 모든 POST/PUT API 엔드포인트
- 타입 안정성
- 개발 생산성

**재현 방법**:

1. API 호출 시 필수 필드 없이 요청
2. TypeScript는 에러 없음
3. 런타임에만 에러 발생

**예상 해결 방법**:

1. **요청 바디 타입 명확화**

   ```typescript
   // src/lib/types/vocabulary.ts
   export interface CreateVocabularyRequest {
   	standardName: string; // 필수
   	abbreviation: string; // 필수
   	englishName: string; // 필수
   	description?: string; // 선택
   	domainCategory?: string; // 선택
   }

   export interface UpdateVocabularyRequest extends Partial<CreateVocabularyRequest> {
   	id: string; // 필수
   }

   // API에서 사용
   const newEntry: CreateVocabularyRequest = await request.json();
   ```

2. **Zod 스키마 사용**

   ```typescript
   const CreateVocabularySchema = z.object({
   	standardName: z.string().min(1),
   	abbreviation: z.string().min(1),
   	englishName: z.string().min(1),
   	description: z.string().optional()
   });

   const result = CreateVocabularySchema.safeParse(await request.json());
   if (!result.success) {
   	return json({ success: false, error: '...' }, { status: 400 });
   }
   const newEntry = result.data; // 타입 안전
   ```

3. **타입 가드 함수**

   ```typescript
   function isCreateVocabularyRequest(obj: unknown): obj is CreateVocabularyRequest {
   	return (
   		typeof obj === 'object' &&
   		obj !== null &&
   		'standardName' in obj &&
   		typeof obj.standardName === 'string' &&
   		// ... 기타 필드 검증
   	);
   }
   ```

**우선순위**: 2

---

## 이슈 #H10: API 응답 타입과 UI에서 기대하는 타입 불일치 가능성

**심각도**: High Priority

**위치**:

- `src/routes/api/search/+server.ts` - SearchResult 타입
- `src/routes/api/vocabulary/+server.ts` - 응답 타입
- `src/routes/browse/+page.svelte` - UI에서 사용하는 타입

**문제 설명**:

API 응답 타입과 UI에서 기대하는 타입이 일치하지 않을 수 있습니다. 특히 검색 API와 일반 조회 API의 응답 구조가 다릅니다.

**현재 문제:**

1. **검색 API 응답:**

   ```typescript
   {
     success: true;
     data: {
       entries: VocabularyEntry[];
       totalCount: number;
       query: SearchQuery;
       pagination: { totalResults: number; ... }; // totalResults
     }
   }
   ```

2. **일반 조회 API 응답:**

   ```typescript
   {
     success: true;
     data: {
       entries: VocabularyEntry[];
       pagination: { totalCount: number; ... }; // totalCount
     }
   }
   ```

3. **UI에서 기대:**
   ```typescript
   totalCount = result.data.pagination.totalCount; // 또는 totalResults?
   ```

**영향 범위**:

- 검색 기능
- 일반 조회 기능
- UI 업데이트 로직
- 타입 안정성

**재현 방법**:

1. 검색 API와 일반 조회 API를 동일한 UI 코드에서 사용
2. `totalCount` vs `totalResults` 불일치
3. 런타임 에러 또는 잘못된 값 표시

**예상 해결 방법**:

1. **응답 타입 통일**

   ```typescript
   // 모든 API에서 동일한 pagination 구조 사용
   interface PaginationResponse {
   	currentPage: number;
   	totalPages: number;
   	totalCount: number; // 통일
   	limit: number;
   	hasNextPage: boolean;
   	hasPrevPage: boolean;
   }
   ```

2. **타입 가드 함수**

   ```typescript
   function hasPagination(data: unknown): data is { pagination: PaginationResponse } {
   	return (
   		typeof data === 'object' &&
   		data !== null &&
   		'pagination' in data &&
   		typeof (data as any).pagination === 'object'
   	);
   }

   // UI에서 사용
   if (hasPagination(result.data)) {
   	totalCount = result.data.pagination.totalCount;
   }
   ```

3. **공통 응답 타입 정의**

   ```typescript
   interface VocabularyListResponse {
   	entries: VocabularyEntry[];
   	pagination: PaginationResponse;
   	sorting: SortingInfo;
   	filtering: FilteringInfo;
   	lastUpdated: string;
   }
   ```

**우선순위**: 2

---

## 요약

| 이슈 ID | 제목                    | 우선순위 | 타입 불일치 | 성능 | 검증 | CRUD |
| ------- | ----------------------- | -------- | ----------- | ---- | ---- | ---- |
| #H1     | 하위 호환성 필드 중복   | 2        | ✅          | ❌   | ❌   | ❌   |
| #H2     | History API 유니온 타입 | 2        | ✅          | ❌   | ❌   | ❌   |
| #H3     | Term API N+1 문제       | 1        | ❌          | ✅   | ❌   | ❌   |
| #H4     | 데이터 검증 로직 부족   | 1        | ❌          | ❌   | ✅   | ❌   |
| #H5     | Domain API POST 없음    | 2        | ❌          | ❌   | ❌   | ✅   |
| #H6     | 에러 처리 일관성 부족   | 2        | ❌          | ❌   | ❌   | ❌   |
| #H7     | 전체 파일 메모리 로드   | 1        | ❌          | ✅   | ❌   | ❌   |
| #H8     | 검증 로직 분산          | 2        | ❌          | ❌   | ✅   | ❌   |
| #H9     | Partial 타입 사용       | 2        | ✅          | ❌   | ❌   | ❌   |
| #H10    | API 응답 타입 불일치    | 2        | ✅          | ❌   | ❌   | ❌   |

**총 10개 High Priority 이슈 발견**

**우선순위 1 (즉시 수정 필요):** 3개
**우선순위 2 (빠른 시일 내 수정):** 7개

---

**마지막 업데이트**: 2024-01-01
