# Critical 이슈 목록

이 문서는 즉시 수정해야 하는 Critical 레벨 이슈들을 정리합니다.

---

## ~~이슈 #C1: 파일 기반 저장소의 동시성 문제로 인한 데이터 손실 위험~~ ✅ 해결됨

> **해결일**: 2024-12-12
> **해결 방법**: 파일 락 메커니즘 구현
>
> - `src/lib/utils/file-lock.ts` 신규 생성
> - `acquireLock`, `withFileLock` 함수로 안전한 파일 접근 제공
> - 모든 save 함수에 `withFileLock` 적용
> - Stale 락 자동 감지 및 해제 (60초 타임아웃)
> - 메모리 내 락 + 파일 기반 락 이중 보호

**심각도**: Critical

**위치**:

- `src/lib/utils/file-lock.ts` - 파일 락 유틸리티
- `src/lib/utils/file-handler.ts` - 모든 save 함수
- `src/lib/utils/history-handler.ts` - saveHistoryData 함수

**문제 설명**:

파일 기반 저장소의 특성상 동시 수정 시 데이터 손실이 발생할 수 있습니다.

**현재 동작 방식:**

1. 파일 읽기 (`loadVocabularyData()`)
2. 메모리에서 데이터 수정
3. 파일 쓰기 (`saveVocabularyData()`)

**문제 시나리오:**

- 사용자 A가 파일을 읽음 (100개 엔트리)
- 사용자 B가 파일을 읽음 (100개 엔트리)
- 사용자 A가 엔트리 1개 추가 후 저장 (101개)
- 사용자 B가 엔트리 1개 추가 후 저장 (101개) ← **사용자 A의 변경사항 손실**

**영향 범위**:

- 모든 데이터 수정/삭제 작업 (Vocabulary, Domain, Term)
- 파일 업로드 작업
- 도메인 매핑 동기화 작업
- 용어 매핑 동기화 작업

**재현 방법**:

1. 두 개의 브라우저 탭에서 동시에 같은 단어를 수정
2. 두 탭에서 모두 저장
3. 한 탭의 변경사항이 손실됨

**예상 해결 방법**:

1. **파일 락 메커니즘 도입** (권장)
   - `fs-extra`의 `lockfile` 또는 `proper-lockfile` 사용
   - 파일 쓰기 전 락 획득, 완료 후 해제
2. **원자적 쓰기 패턴**
   - 임시 파일에 쓰기 → 검증 → 원본 파일로 교체
   - `writeFile()` → `rename()` 사용

3. **데이터베이스 마이그레이션** (장기)
   - SQLite 또는 다른 데이터베이스로 전환
   - 트랜잭션 지원

**우선순위**: 1

---

## ~~이슈 #C2: JSON 파싱 결과에 대한 런타임 타입 검증 없음~~ ✅ 해결됨

> **해결일**: 2024-12-12
> **해결 방법**: 타입 가드 유틸리티 모듈 생성 및 모든 load 함수에 적용
>
> - `src/lib/utils/type-guards.ts` 신규 생성
> - `isVocabularyData`, `isDomainData`, `isTermData` 등 타입 가드 함수 구현
> - `safeJsonParse` 헬퍼 함수로 안전한 JSON 파싱 제공
> - `TypeValidationError` 커스텀 에러 클래스 추가
> - `file-handler.ts`, `history-handler.ts`의 모든 load 함수에 적용

**심각도**: Critical

**위치**:

- `src/lib/utils/type-guards.ts` - 타입 가드 유틸리티
- `src/lib/utils/file-handler.ts` - `loadVocabularyData()`, `loadDomainData()`, `loadTermData()`, `loadForbiddenWordsData()`
- `src/lib/utils/history-handler.ts` - `loadHistoryData()`

**문제 설명**:

JSON 파싱 결과에 대해 타입 단언(`as`)만 사용하고 런타임 검증을 수행하지 않습니다. 손상된 JSON 파일이나 잘못된 형식의 데이터가 로드되면 런타임 에러가 발생할 수 있습니다.

**현재 코드:**

```typescript
// src/lib/utils/file-handler.ts:233
const data = JSON.parse(jsonString) as VocabularyData;

// src/routes/api/vocabulary/+server.ts:193
const newEntry: Partial<VocabularyEntry> = await request.json();
```

**문제 시나리오:**

1. JSON 파일이 손상되어 `entries`가 배열이 아닌 경우
2. 필수 필드가 누락된 엔트리가 포함된 경우
3. 타입이 맞지 않는 데이터가 포함된 경우 (예: `id`가 숫자)
4. → 런타임에서 `data.entries.filter()` 호출 시 크래시

**영향 범위**:

- 모든 데이터 로드 작업
- 모든 API 요청 파싱
- 파일 업로드 후 파싱

**재현 방법**:

1. `vocabulary.json` 파일을 수동으로 편집하여 `entries`를 문자열로 변경
2. 애플리케이션에서 데이터 조회 시도
3. `TypeError: data.entries.filter is not a function` 에러 발생

**예상 해결 방법**:

1. **타입 가드 함수 구현**

   ```typescript
   function isVocabularyData(obj: unknown): obj is VocabularyData {
   	return (
   		typeof obj === 'object' &&
   		obj !== null &&
   		'entries' in obj &&
   		Array.isArray(obj.entries) &&
   		'lastUpdated' in obj &&
   		typeof obj.lastUpdated === 'string'
   	);
   }

   const data = JSON.parse(jsonString);
   if (!isVocabularyData(data)) {
   	throw new Error('Invalid vocabulary data format');
   }
   ```

2. **JSON Schema 검증 라이브러리 도입**
   - `ajv` 또는 `zod` 사용
   - 스키마 정의 및 런타임 검증

**우선순위**: 1

---

## 이슈 #C3: FormData 파싱 시 null 체크 없이 타입 단언 사용

**심각도**: Critical

**위치**:

- `src/routes/api/upload/+server.ts:29`
- `src/routes/api/domain/upload/+server.ts:70`

**문제 설명**:

`formData.get('file')`의 결과가 `null`일 수 있지만, 타입 단언만 사용하여 런타임 에러가 발생할 수 있습니다.

**현재 코드:**

```typescript
// src/routes/api/upload/+server.ts:29
const file = formData.get('file') as File;
const filename = (formData.get('filename') as string) || 'vocabulary.json';

// 파일 존재 확인은 나중에 수행 (33번째 줄)
if (!file) {
	return json({ success: false, error: '...' }, { status: 400 });
}
```

**문제 시나리오:**

1. `formData.get('file')`이 `null`을 반환
2. `as File` 타입 단언으로 인해 TypeScript는 통과
3. `file.arrayBuffer()` 호출 시 런타임 에러 발생
4. → 실제로는 33번째 줄에서 체크하지만, 타입 안전성 부족

**영향 범위**:

- 파일 업로드 API (`/api/upload`, `/api/domain/upload`, `/api/term/upload`)

**재현 방법**:

1. `file` 필드 없이 FormData 전송
2. `file.arrayBuffer()` 호출 시 `TypeError` 발생

**예상 해결 방법**:

```typescript
const fileValue = formData.get('file');
if (!fileValue || !(fileValue instanceof File)) {
	return json({ success: false, error: '업로드할 파일이 없습니다.' }, { status: 400 });
}
const file = fileValue;
```

**우선순위**: 2

---

## 이슈 #C4: 부분 업데이트 시 undefined 값이 기존 데이터를 덮어쓸 수 있음

**심각도**: Critical

**위치**:

- `src/routes/api/vocabulary/+server.ts:348-353` (PUT)
- `src/routes/api/domain/+server.ts:319-323` (PUT)
- `src/routes/api/term/+server.ts` (PUT)

**문제 설명**:

스프레드 연산자로 병합할 때 `undefined` 값이 전달되면 기존 값이 `undefined`로 덮어써질 수 있습니다.

**현재 코드:**

```typescript
// src/routes/api/vocabulary/+server.ts:348-353
vocabularyData.entries[entryIndex] = {
	...vocabularyData.entries[entryIndex],
	...updatedEntry,
	isDomainCategoryMapped: updatedEntry.isDomainCategoryMapped ?? false,
	updatedAt: new Date().toISOString()
};
```

**문제 시나리오:**

1. 클라이언트에서 `{ id: 'xxx', standardName: undefined }` 전송
2. 스프레드 연산자로 병합 시 `standardName: undefined`가 기존 값을 덮어씀
3. 저장 시 `standardName`이 `undefined`로 저장됨
4. → 데이터 손실

**영향 범위**:

- 모든 데이터 수정 작업 (Vocabulary, Domain, Term)

**재현 방법**:

1. 프론트엔드에서 일부 필드를 `undefined`로 설정하여 PUT 요청
2. 기존 데이터의 해당 필드가 `undefined`로 덮어써짐

**예상 해결 방법**:

```typescript
// undefined 값 제거 후 병합
const cleanUpdates = Object.fromEntries(
	Object.entries(updatedEntry).filter(([_, value]) => value !== undefined)
);

vocabularyData.entries[entryIndex] = {
	...vocabularyData.entries[entryIndex],
	...cleanUpdates,
	updatedAt: new Date().toISOString()
};
```

**우선순위**: 2

---

## ~~이슈 #C5: 파일 쓰기 실패 시 롤백 메커니즘 없음~~ ✅ 해결됨

> **해결일**: 2024-12-12
> **해결 방법**: 원자적 쓰기 패턴 구현
>
> - `atomicWriteFile` 함수 추가: 임시 파일 → 검증 → rename
> - `safeWriteFile` 함수: 파일 락 + 원자적 쓰기 통합
> - 쓰기 실패 시 자동 백업 복원
> - 모든 save 함수에 적용

**심각도**: Critical

**위치**:

- `src/lib/utils/file-lock.ts` - `atomicWriteFile`, `safeWriteFile` 함수
- `src/lib/utils/file-handler.ts` - 모든 save 함수
- `src/lib/utils/history-handler.ts` - saveHistoryData 함수

**문제 설명**:

파일 쓰기 중 오류가 발생하면 원본 데이터가 손실될 수 있습니다. 원자성 보장이 어렵습니다.

**현재 코드:**

```typescript
// src/lib/utils/file-handler.ts:194-195
const jsonString = JSON.stringify(finalData, null, 2);
await writeFile(getDataPath(filename, 'vocabulary'), jsonString, 'utf-8');
```

**문제 시나리오:**

1. 파일 쓰기 중 디스크 공간 부족
2. 파일 쓰기 중 권한 오류
3. 파일 쓰기 중 네트워크 오류 (원격 파일 시스템)
4. → 원본 파일이 손상되거나 부분적으로만 쓰여짐
5. → 데이터 손실

**영향 범위**:

- 모든 데이터 저장 작업
- 파일 업로드 작업
- 매핑 동기화 작업

**재현 방법**:

1. 디스크 공간을 거의 다 사용
2. 대용량 데이터 저장 시도
3. 파일 쓰기 실패로 인한 데이터 손실

**예상 해결 방법**:

1. **원자적 쓰기 패턴** (권장)

   ```typescript
   const tempPath = `${dataPath}.tmp`;
   await writeFile(tempPath, jsonString, 'utf-8');
   await rename(tempPath, dataPath);
   ```

2. **백업 후 쓰기**

   ```typescript
   await createBackup(filename);
   await writeFile(dataPath, jsonString, 'utf-8');
   ```

3. **트랜잭션 로그**
   - 변경사항을 로그에 기록
   - 실패 시 롤백

**우선순위**: 1

---

## 이슈 #C6: 참조 무결성 검증 없이 엔트리 삭제 가능

**심각도**: Critical

**위치**:

- `src/routes/api/vocabulary/+server.ts:382-429` (DELETE)
- `src/routes/api/domain/+server.ts:340-373` (DELETE)
- `src/routes/api/term/+server.ts` (DELETE)

**문제 설명**:

다른 엔트리에서 참조하는 경우에도 삭제가 가능합니다. 예를 들어, `TermEntry`가 `VocabularyEntry`를 참조하는데 해당 단어를 삭제하면 참조 무결성이 깨집니다.

**현재 코드:**

```typescript
// src/routes/api/vocabulary/+server.ts:400
vocabularyData.entries = vocabularyData.entries.filter((e) => e.id !== id);
```

**문제 시나리오:**

1. `TermEntry`가 `termName: "사용자"`로 `VocabularyEntry`를 참조
2. 해당 `VocabularyEntry` 삭제
3. `TermEntry`의 매핑 상태가 깨짐
4. → 데이터 무결성 손상

**영향 범위**:

- Vocabulary 삭제 시 Term 참조 무결성
- Domain 삭제 시 Vocabulary/Term 참조 무결성

**재현 방법**:

1. Term 엔트리가 Vocabulary를 참조하는 상태
2. 해당 Vocabulary 엔트리 삭제
3. Term의 매핑 상태가 깨짐

**예상 해결 방법**:

```typescript
// 삭제 전 참조 확인
const termData = await loadTermData();
const hasReferences = termData.entries.some(
	(term) =>
		term.termName === entryToDelete.standardName || term.columnName === entryToDelete.abbreviation
);

if (hasReferences) {
	return json(
		{
			success: false,
			error: '다른 엔트리에서 참조 중인 단어는 삭제할 수 없습니다.',
			message: 'Referenced entry cannot be deleted'
		},
		{ status: 409 }
	);
}
```

**우선순위**: 3

---

## 이슈 #C7: Non-null Assertion 사용으로 인한 런타임 에러 가능성

**심각도**: Critical

**위치**:

- `src/routes/api/vocabulary/+server.ts:217, 239` - `newEntry.standardName!.toLowerCase()`
- `src/lib/utils/file-handler.ts:307` - `mergedMap.get(compositeKey)!`
- `src/routes/api/generator/+server.ts:24, 29` - `koToEnMap.get(koKey)!`

**문제 설명**:

Non-null assertion (`!`)을 사용하여 타입 체크를 우회하지만, 실제로는 `null` 또는 `undefined`일 수 있어 런타임 에러가 발생할 수 있습니다.

**현재 코드:**

```typescript
// src/routes/api/vocabulary/+server.ts:217
entry.keyword.toLowerCase() === newEntry.standardName!.toLowerCase();

// src/lib/utils/file-handler.ts:307
const existingEntry = mergedMap.get(compositeKey)!;
```

**문제 시나리오:**

1. `newEntry.standardName`이 `undefined`인데 `!`로 우회
2. `toLowerCase()` 호출 시 `TypeError: Cannot read property 'toLowerCase' of undefined`
3. → 런타임 크래시

**영향 범위**:

- 단어 추가 시 금지어 검사
- 데이터 병합 작업
- 용어 변환 작업

**재현 방법**:

1. 필수 필드 검증을 우회하여 `standardName: undefined` 전송
2. 금지어 검사 시 런타임 에러 발생

**예상 해결 방법**:

```typescript
// Non-null assertion 제거 및 명시적 체크
if (!newEntry.standardName) {
	return json({ success: false, error: '...' }, { status: 400 });
}
const standardNameLower = newEntry.standardName.toLowerCase();

// 또는 optional chaining 사용
entry.keyword.toLowerCase() === newEntry.standardName?.toLowerCase();
```

**우선순위**: 2

---

## 이슈 #C8: 파일 읽기 실패 시 에러 처리로 인한 API 완전 작동 불가

**심각도**: Critical

**위치**:

- `src/lib/utils/file-handler.ts:208-283` - `loadVocabularyData()`
- `src/lib/utils/file-handler.ts` - 모든 `load*Data()` 함수

**문제 설명**:

파일 읽기 실패 시 예외를 throw하지만, 일부 경우에 빈 데이터를 반환하여 API가 정상 작동하지 않을 수 있습니다.

**현재 코드:**

```typescript
// src/lib/utils/file-handler.ts:215-221
if (!existsSync(dataPath)) {
	return {
		entries: [],
		lastUpdated: new Date().toISOString(),
		totalCount: 0
	};
}
```

**문제 시나리오:**

1. 파일이 존재하지만 읽기 권한 없음
2. 파일이 손상되어 JSON 파싱 실패
3. → 예외 발생하여 API 완전 작동 불가
4. 또는 빈 데이터 반환으로 데이터 손실로 오인

**영향 범위**:

- 모든 데이터 조회 API
- 파일이 손상된 경우 전체 시스템 작동 불가

**재현 방법**:

1. `vocabulary.json` 파일의 읽기 권한 제거
2. API 호출 시 500 에러 발생
3. 또는 JSON 형식이 손상된 경우 파싱 에러

**예상 해결 방법**:

```typescript
try {
	const jsonString = await readFile(dataPath, 'utf-8');
	// ... 파싱 및 검증
} catch (error) {
	if (error.code === 'EACCES') {
		throw new Error('파일 읽기 권한이 없습니다.');
	}
	if (error instanceof SyntaxError) {
		throw new Error('JSON 파일 형식이 손상되었습니다. 백업 파일을 확인하세요.');
	}
	throw error;
}
```

**우선순위**: 2

---

## 이슈 #C9: 인증/권한 체크 완전 부재

**심각도**: Critical

**위치**:

- 모든 API 엔드포인트 (`src/routes/api/**/+server.ts`)

**문제 설명**:

모든 API 엔드포인트에 인증 및 권한 체크가 없습니다. 누구나 데이터를 조회, 수정, 삭제할 수 있습니다.

**현재 상태:**

- 모든 API가 공개적으로 접근 가능
- 인증 미들웨어 없음
- 권한 체크 로직 없음

**영향 범위**:

- 모든 API 엔드포인트
- 데이터 보안 위험
- 무단 수정/삭제 가능

**재현 방법**:

1. 브라우저 개발자 도구에서 직접 API 호출
2. 인증 없이 모든 작업 수행 가능

**예상 해결 방법**:

1. **인증 미들웨어 도입**
   - JWT 토큰 기반 인증
   - SvelteKit hooks에서 인증 체크

2. **권한 체크**
   - 역할 기반 접근 제어 (RBAC)
   - 읽기/쓰기 권한 분리

3. **최소한의 보안 조치**
   - API 키 기반 인증
   - Rate limiting

**우선순위**: 1

---

## ~~이슈 #C10: 파일 경로 조작 공격 가능성 (Path Traversal)~~ ✅ 해결됨

> **해결일**: 2024-12-12
> **해결 방법**: `validateFilename()` 함수 추가 및 `getDataPath()` 함수에 경로 검증 로직 강화
>
> - 상위 디렉토리 접근(`..`) 차단
> - Null byte injection 차단
> - 절대 경로 차단
> - `basename()` 및 `resolve()`를 사용한 경로 정규화
> - 최종 경로가 base 디렉토리 내에 있는지 검증

**심각도**: Critical

**위치**:

- `src/lib/utils/file-handler.ts:23-69` - `validateFilename()`, `getDataPath()`
- 모든 파일명을 받는 API 엔드포인트

**문제 설명**:

파일명 파라미터에 `../` 같은 경로 조작 문자가 포함되면 시스템 파일에 접근할 수 있습니다.

**현재 코드:**

```typescript
// src/lib/utils/file-handler.ts
function getDataPath(filename: string, type: 'vocabulary' | 'domain' | 'term'): string {
	return join(DATA_DIR, type, filename);
}
```

**문제 시나리오:**

1. API 요청: `GET /api/vocabulary?filename=../../../../etc/passwd`
2. `getDataPath('../../../../etc/passwd', 'vocabulary')` 호출
3. 시스템 파일 접근 가능
4. → 보안 취약점

**영향 범위**:

- 모든 파일명을 파라미터로 받는 API
- 파일 읽기/쓰기 작업

**재현 방법**:

1. `filename=../../../../etc/passwd` 파라미터로 API 호출
2. 시스템 파일 접근 시도

**예상 해결 방법**:

```typescript
function getDataPath(filename: string, type: 'vocabulary' | 'domain' | 'term'): string {
	// 경로 조작 방지
	if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
		throw new Error('Invalid filename: path traversal detected');
	}

	// 파일명 검증
	if (!filename.endsWith('.json')) {
		throw new Error('Invalid filename: must end with .json');
	}

	// 정규화된 경로 사용
	const normalizedPath = join(DATA_DIR, type, filename);
	const resolvedPath = resolve(normalizedPath);
	const basePath = resolve(DATA_DIR, type);

	// 경로가 basePath 밖으로 나가는지 확인
	if (!resolvedPath.startsWith(basePath)) {
		throw new Error('Invalid filename: path traversal detected');
	}

	return resolvedPath;
}
```

**우선순위**: 1

---

## 요약

| 이슈 ID | 제목                         | 우선순위 | 데이터 손실 | 보안 | 런타임 크래시 |
| ------- | ---------------------------- | -------- | ----------- | ---- | ------------- |
| #C1     | 동시성 문제                  | 1        | ✅          | ❌   | ❌            |
| #C2     | JSON 파싱 타입 검증 없음     | 1        | ❌          | ❌   | ✅            |
| #C3     | FormData null 체크 부족      | 2        | ❌          | ❌   | ✅            |
| #C4     | 부분 업데이트 undefined 처리 | 2        | ✅          | ❌   | ❌            |
| #C5     | 파일 쓰기 실패 시 롤백 없음  | 1        | ✅          | ❌   | ❌            |
| #C6     | 참조 무결성 검증 없음        | 3        | ✅          | ❌   | ❌            |
| #C7     | Non-null assertion 남용      | 2        | ❌          | ❌   | ✅            |
| #C8     | 파일 읽기 실패 처리          | 2        | ✅          | ❌   | ✅            |
| #C9     | 인증/권한 체크 부재          | 1        | ❌          | ✅   | ❌            |
| #C10    | Path Traversal 취약점        | 1        | ❌          | ✅   | ❌            |

**총 10개 Critical 이슈 발견**

**우선순위 1 (즉시 수정 필요):** 5개
**우선순위 2 (빠른 시일 내 수정):** 4개
**우선순위 3 (수정 권장):** 1개

---

**마지막 업데이트**: 2024-01-01
