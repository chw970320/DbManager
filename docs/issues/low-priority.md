# Low Priority 이슈 목록

이 문서는 개선하면 좋은 Low Priority 레벨 이슈들을 정리합니다.

---

## ~~이슈 #L1: 프로덕션 코드에 console.log/warn/error 남아있음~~ ⚠️ 부분 해결

> **해결일**: 2024-12-12
> **해결 방법**: 로깅 유틸리티 생성
>
> - `src/lib/utils/logger.ts` 신규 생성
> - `LogLevel` enum으로 로그 레벨 관리
> - `createLogger()` 팩토리 함수
> - 환경별 조건부 로깅 지원
>
> **남은 작업**: 기존 console 호출을 logger로 교체

**심각도**: Low Priority

**위치**:

- `src/lib/utils/logger.ts` - 로깅 유틸리티
- 전체 코드베이스에 266개 이상의 console 호출
- `src/lib/utils/file-handler.ts` (35개)
- `src/lib/utils/history-handler.ts` (9개)
- `src/lib/utils/xlsx-parser.ts` (12개)
- `src/routes/api/**/+server.ts` (여러 파일)
- `src/lib/components/**/*.svelte` (여러 파일)

**문제 설명**:

프로덕션 코드에 `console.log`, `console.warn`, `console.error`가 남아있어 성능에 영향을 줄 수 있고, 디버깅 정보가 노출될 수 있습니다.

**현재 코드:**

```typescript
// src/lib/utils/file-handler.ts
console.error('단어집 데이터 로드 실패:', error);
console.warn('유효하지 않은 히스토리 로그 발견:', log);

// src/routes/api/vocabulary/+server.ts
console.error('단어집 관리 중 오류:', error);
console.warn('금지어 확인 중 오류 (계속 진행):', forbiddenError);

// src/lib/components/TermGenerator.svelte
console.error('Final conversion error:', err);
```

**영향 범위**:

- 프로덕션 성능 (미미하지만 누적)
- 디버깅 정보 노출
- 브라우저 콘솔 오염

**재현 방법**:

1. 브라우저 개발자 도구 콘솔 열기
2. 애플리케이션 사용
3. 많은 console 메시지 확인

**예상 해결 방법**:

1. **로깅 라이브러리 도입**

   ```typescript
   // src/lib/utils/logger.ts
   const isDevelopment = process.env.NODE_ENV === 'development';

   export const logger = {
   	log: (...args: unknown[]) => {
   		if (isDevelopment) console.log(...args);
   	},
   	warn: (...args: unknown[]) => {
   		if (isDevelopment) console.warn(...args);
   		// 프로덕션에서는 에러 추적 시스템으로 전송
   	},
   	error: (...args: unknown[]) => {
   		console.error(...args); // 에러는 항상 로깅
   		// 에러 추적 시스템으로 전송 (예: Sentry)
   	}
   };
   ```

2. **조건부 로깅**

   ```typescript
   if (process.env.NODE_ENV === 'development') {
   	console.log('Debug info:', data);
   }
   ```

3. **에러 추적 시스템 통합**
   - Sentry, LogRocket 등
   - 프로덕션 에러만 추적

**우선순위**: 4

---

## ~~이슈 #L2: window 객체에 any 타입 사용~~ ✅ 해결됨

> **해결일**: 2024-12-12
> **해결 방법**: Window 인터페이스 확장
>
> - `src/app.d.ts`에 Window 인터페이스 확장
> - `refreshHistoryLog`, `refreshDomainHistoryLog`, `refreshTermHistoryLog` 타입 선언
> - `window as any` 제거 가능

**심각도**: Low Priority

**위치**:

- `src/app.d.ts` - Window 타입 선언
- `src/routes/browse/+page.svelte:486-489`
- `src/routes/domain/browse/+page.svelte:416-419, 488-491`
- `src/routes/term/browse/+page.svelte` (유사한 패턴)

**문제 설명**:

히스토리 로그 새로고침을 위해 `window` 객체에 `any` 타입을 사용하여 타입 안정성이 저하됩니다.

**현재 코드:**

```typescript
// src/routes/domain/browse/+page.svelte:416-419
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof window !== 'undefined' && (window as any).refreshDomainHistoryLog) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(window as any).refreshDomainHistoryLog();
}
```

**영향 범위**:

- 타입 안정성
- 코드 품질

**재현 방법**:

1. browse 페이지 파일들 확인
2. `window as any` 사용 확인

**예상 해결 방법**:

1. **타입 선언 추가**

   ```typescript
   // src/app.d.ts 또는 별도 파일
   interface Window {
   	refreshHistoryLog?: () => void;
   	refreshDomainHistoryLog?: () => void;
   	refreshTermHistoryLog?: () => void;
   }

   // 사용
   if (typeof window !== 'undefined' && window.refreshDomainHistoryLog) {
   	window.refreshDomainHistoryLog();
   }
   ```

2. **이벤트 기반 통신**

   ```typescript
   // HistoryLog 컴포넌트에서 이벤트 발생
   window.dispatchEvent(new CustomEvent('history-updated', { detail: { type: 'domain' } }));

   // 페이지에서 구독
   window.addEventListener('history-updated', (event) => {
   	if (event.detail.type === 'domain') {
   		// 히스토리 새로고침
   	}
   });
   ```

3. **Store 기반 통신**

   ```typescript
   // history-refresh-store.ts
   export const historyRefreshStore = writable({ vocabulary: 0, domain: 0, term: 0 });

   // 새로고침 필요 시
   historyRefreshStore.update((state) => ({ ...state, domain: state.domain + 1 }));

   // HistoryLog에서 구독
   historyRefreshStore.subscribe((state) => {
   	if (state.domain > 0) {
   		loadHistory();
   	}
   });
   ```

**우선순위**: 4

---

## 이슈 #L3: 테스트 코드 완전 부재

**심각도**: Low Priority

**위치**:

- 전체 프로젝트 (테스트 파일 없음)

**문제 설명**:

프로젝트에 단위 테스트, 통합 테스트, E2E 테스트가 전혀 없습니다.

**현재 상태:**

- 테스트 파일 없음 (`.test.ts`, `.spec.ts` 없음)
- 테스트 프레임워크 미설치
- CI/CD 테스트 단계 없음

**영향 범위**:

- 리팩토링 시 회귀 버그 위험
- 기능 변경 시 부작용 발견 어려움
- 코드 품질 보장 어려움

**재현 방법**:

1. 프로젝트 루트에서 테스트 파일 검색
2. 테스트 파일 없음 확인

**예상 해결 방법**:

1. **테스트 프레임워크 도입**

   ```json
   // package.json
   {
   	"devDependencies": {
   		"vitest": "^1.0.0",
   		"@testing-library/svelte": "^4.0.0",
   		"@testing-library/jest-dom": "^6.0.0"
   	},
   	"scripts": {
   		"test": "vitest",
   		"test:coverage": "vitest --coverage"
   	}
   }
   ```

2. **핵심 유틸리티 함수 테스트**

   ```typescript
   // src/lib/utils/__tests__/file-handler.test.ts
   import { describe, it, expect } from 'vitest';
   import { loadVocabularyData, saveVocabularyData } from '../file-handler';

   describe('file-handler', () => {
   	it('should load vocabulary data', async () => {
   		const data = await loadVocabularyData('vocabulary.json');
   		expect(data).toHaveProperty('entries');
   		expect(data).toHaveProperty('totalCount');
   	});

   	it('should save vocabulary data', async () => {
   		const testData = {
   			entries: [],
   			lastUpdated: new Date().toISOString(),
   			totalCount: 0
   		};
   		await saveVocabularyData(testData, 'test-vocabulary.json');
   		const loaded = await loadVocabularyData('test-vocabulary.json');
   		expect(loaded.totalCount).toBe(0);
   	});
   });
   ```

3. **API 엔드포인트 테스트**

   ```typescript
   // src/routes/api/__tests__/vocabulary.test.ts
   import { describe, it, expect } from 'vitest';
   import { GET } from '../vocabulary/+server';

   describe('Vocabulary API', () => {
   	it('should return vocabulary entries', async () => {
   		const request = new Request('http://localhost/api/vocabulary');
   		const response = await GET({ request, url: new URL(request.url) });
   		const data = await response.json();
   		expect(data.success).toBe(true);
   	});
   });
   ```

4. **컴포넌트 테스트**

   ```typescript
   // src/lib/components/__tests__/SearchBar.test.ts
   import { render, fireEvent } from '@testing-library/svelte';
   import SearchBar from '../SearchBar.svelte';

   describe('SearchBar', () => {
   	it('should emit search event on input', async () => {
   		const { component } = render(SearchBar);
   		const input = screen.getByPlaceholderText('단어를 검색하세요...');
   		await fireEvent.input(input, { target: { value: 'test' } });
   		// 이벤트 확인
   	});
   });
   ```

**우선순위**: 5

---

## 이슈 #L4: Deprecated 함수가 아직 export됨

**심각도**: Low Priority

**위치**:

- `src/lib/utils/settings.ts:116-129` - `getShowSystemFiles()`, `setShowSystemFiles()`

**문제 설명**:

`@deprecated` 태그가 있지만 함수가 아직 export되어 있어 사용 가능합니다. 완전히 제거하거나 사용처를 찾아 마이그레이션해야 합니다.

**현재 코드:**

```typescript
/**
 * @deprecated 단어집과 도메인 설정이 분리되었습니다. getShowVocabularySystemFiles 또는 getShowDomainSystemFiles를 사용하세요.
 */
export async function getShowSystemFiles(): Promise<boolean> {
	const settings = await loadSettings();
	return settings.showVocabularySystemFiles ?? true;
}

/**
 * @deprecated 단어집과 도메인 설정이 분리되었습니다. setShowVocabularySystemFiles 또는 setShowDomainSystemFiles를 사용하세요.
 */
export async function setShowSystemFiles(value: boolean): Promise<void> {
	const settings = await loadSettings();
	settings.showVocabularySystemFiles = value;
	settings.showDomainSystemFiles = value;
	await saveSettings(settings);
}
```

**영향 범위**:

- 코드 일관성
- 혼란 가능성
- 유지보수 어려움

**재현 방법**:

1. `src/lib/utils/settings.ts` 파일 확인
2. Deprecated 함수 확인

**예상 해결 방법**:

1. **사용처 검색 및 마이그레이션**

   ```bash
   # 사용처 찾기
   grep -r "getShowSystemFiles\|setShowSystemFiles" src/
   ```

2. **마이그레이션 후 제거**

   ```typescript
   // 사용처를 새 함수로 변경
   // getShowSystemFiles() → getShowVocabularySystemFiles()
   // setShowSystemFiles(value) → setShowVocabularySystemFiles(value) + setShowDomainSystemFiles(value)

   // 마이그레이션 완료 후 함수 제거
   ```

3. **또는 에러 throw로 강제 마이그레이션**

   ```typescript
   export async function getShowSystemFiles(): Promise<boolean> {
   	throw new Error(
   		'getShowSystemFiles() is deprecated. Use getShowVocabularySystemFiles() or getShowDomainSystemFiles() instead.'
   	);
   }
   ```

**우선순위**: 5

---

## 이슈 #L5: TODO 주석이 구현되지 않음

**심각도**: Low Priority

**위치**:

- `src/routes/api/upload/+server.ts:96`

**문제 설명**:

TODO 주석이 있지만 구현되지 않았습니다. 파일별 히스토리 초기화 로직이 필요하다고 명시되어 있습니다.

**현재 코드:**

```typescript
// src/routes/api/upload/+server.ts:96
// TODO: 파일별 히스토리 초기화 로직이 필요할 수 있음. 현재는 전체 초기화만 구현되어 있음.
// 일단 파일별 초기화는 보류하고, 병합 모드 로그만 남김.
```

**영향 범위**:

- 기능 완성도
- 사용자 요구사항 미충족 가능성

**재현 방법**:

1. `src/routes/api/upload/+server.ts` 파일 확인
2. TODO 주석 확인

**예상 해결 방법**:

1. **구현 또는 이슈로 전환**

   ```typescript
   // TODO를 이슈로 전환하거나 구현
   // 파일별 히스토리 초기화 기능 구현
   async function clearHistoryForFile(filename: string) {
   	const historyData = await loadHistoryData(filename);
   	const filteredLogs = historyData.logs.filter((log) => log.filename !== filename);
   	await saveHistoryData({ ...historyData, logs: filteredLogs }, filename);
   }
   ```

2. **이슈 트래커에 등록**
   - GitHub Issues에 등록
   - 우선순위 결정

**우선순위**: 5

---

## 이슈 #L6: 함수/변수명이 불명확한 경우

**심각도**: Low Priority

**위치**:

- `src/lib/utils/duplicate-handler.ts:32` - `checkField` (내부 함수)
- `src/lib/utils/duplicate-handler.ts:86` - `checkAndAddDuplicate` (내부 함수)
- `src/routes/api/term/upload/+server.ts:51` - `checkTermMapping` (함수명이 모호)

**문제 설명**:

일부 함수/변수명이 불명확하여 코드 가독성이 떨어집니다.

**현재 코드:**

```typescript
// duplicate-handler.ts:32
const checkField = (field: keyof VocabularyEntry) => {
	// 필드별 중복 검사
};

// term/upload/+server.ts:51
function checkTermMapping(...) {
	// 매핑 검증
}
```

**영향 범위**:

- 코드 가독성
- 유지보수 어려움

**재현 방법**:

1. 해당 파일들 확인
2. 함수명의 의미 파악 어려움

**예상 해결 방법**:

1. **더 명확한 함수명으로 변경**

   ```typescript
   // checkField → checkFieldDuplicates
   const checkFieldDuplicates = (field: keyof VocabularyEntry) => {
   	// ...
   };

   // checkTermMapping → validateTermMapping
   function validateTermMapping(...) {
   	// ...
   }

   // checkAndAddDuplicate → detectAndGroupDuplicates
   const detectAndGroupDuplicates = (field: keyof VocabularyEntry, entry: VocabularyEntry) => {
   	// ...
   };
   ```

2. **함수명 컨벤션 정립**
   - 검증: `validate*`, `check*`
   - 검색: `find*`, `search*`
   - 변환: `transform*`, `convert*`
   - 필터링: `filter*`

**우선순위**: 5

---

## 이슈 #L7: 주석 부족 (복잡한 로직)

**심각도**: Low Priority

**위치**:

- `src/lib/utils/duplicate-handler.ts:32-61` - `checkField` 함수 내부 로직
- `src/routes/api/term/upload/+server.ts:51-93` - `checkTermMapping` 함수
- `src/routes/api/generator/segment/+server.ts` - 동적 프로그래밍 로직
- `src/lib/utils/file-handler.ts:43-108` - `migrateDataFiles` 함수

**문제 설명**:

복잡한 로직에 대한 주석이 부족하여 코드 이해가 어렵습니다.

**현재 코드:**

```typescript
// duplicate-handler.ts:32-61
const checkField = (field: keyof VocabularyEntry) => {
	const fieldValues: Record<string, VocabularyEntry[]> = {};

	// 같은 값을 가진 항목들을 그룹화
	for (const entry of entries) {
		const value = (entry[field] as string).toLowerCase();
		if (!fieldValues[value]) {
			fieldValues[value] = [];
		}
		fieldValues[value].push(entry);
	}

	// 중복된 값(2개 이상의 항목)을 가진 그룹 처리
	for (const [_, entriesWithSameValue] of Object.entries(fieldValues)) {
		// ... 복잡한 로직
	}
};
```

**영향 범위**:

- 코드 가독성
- 신규 개발자 온보딩 어려움
- 유지보수 어려움

**재현 방법**:

1. 복잡한 로직이 있는 파일 확인
2. 주석 부족 확인

**예상 해결 방법**:

1. **JSDoc 주석 추가**

   ```typescript
   /**
    * 특정 필드에 대해 중복된 값을 가진 엔트리들을 검사하고,
    * 각 엔트리의 중복 정보를 업데이트합니다.
    *
    * @param field - 검사할 필드명 (standardName, abbreviation, englishName)
    * @internal
    */
   const checkField = (field: keyof VocabularyEntry) => {
   	// 1단계: 같은 값을 가진 항목들을 그룹화
   	const fieldValues: Record<string, VocabularyEntry[]> = {};
   	// ...
   };
   ```

2. **인라인 주석 추가**

   ```typescript
   // 용어명 매핑: 언더스코어로 분리해서 각 단어가 단어집의 standardName에 있는지 확인
   // 예: "사용자_이름" → ["사용자", "이름"] 각각이 vocabulary에 존재해야 함
   const termParts = termName
   	.split('_')
   	.map((p) => p.trim().toLowerCase())
   	.filter((p) => p.length > 0);
   ```

3. **알고리즘 설명 주석**

   ```typescript
   /**
    * 동적 프로그래밍을 사용한 용어 분할
    *
    * 알고리즘:
    * 1. dp[i]는 i번째 위치까지의 모든 가능한 분할 결과를 저장
    * 2. 각 위치에서 이전 결과에 현재 단어를 추가하여 새로운 조합 생성
    * 3. 최종적으로 dp[n]에 모든 가능한 분할 결과가 저장됨
    */
   ```

**우선순위**: 4

---

## 이슈 #L8: 성능 최적화 기회 (불필요한 반복문)

**심각도**: Low Priority

**위치**:

- `src/routes/api/term/upload/+server.ts:64-70, 77-87` - `checkTermMapping` 내부
- `src/routes/api/vocabulary/sync-domain/+server.ts` - 전체 엔트리 순회
- `src/routes/api/search/+server.ts:95-110` - 필터링 로직

**문제 설명**:

일부 로직에서 불필요한 반복문이나 비효율적인 알고리즘이 사용됩니다.

**현재 코드:**

```typescript
// term/upload/+server.ts:64-70
const isMappedTerm =
	termParts.length > 0 &&
	termParts.every((part) => {
		// vocabularyMap 전체를 순회 (O(n*m))
		for (const [key, value] of vocabularyMap.entries()) {
			if (key === part || value.standardName.toLowerCase() === part) {
				return true;
			}
		}
		return false;
	});
```

**영향 범위**:

- 성능 (특히 대용량 데이터)
- 응답 시간

**재현 방법**:

1. 대용량 데이터로 테스트
2. 성능 프로파일링

**예상 해결 방법**:

1. **Map 조회로 최적화**

   ```typescript
   // vocabularyMap을 더 효율적으로 구성
   const vocabularyMap = new Map<string, boolean>();
   vocabularyData.entries.forEach((vocabEntry) => {
   	vocabularyMap.set(vocabEntry.standardName.toLowerCase(), true);
   	vocabularyMap.set(vocabEntry.abbreviation.toLowerCase(), true);
   });

   // O(1) 조회
   const isMappedTerm = termParts.every((part) => vocabularyMap.has(part));
   ```

2. **불필요한 반복 제거**

   ```typescript
   // 여러 번 순회하는 대신 한 번에 처리
   const processedEntries = entries.map((entry) => {
   	// 모든 검증을 한 번에 수행
   	return {
   		...entry,
   		isMappedTerm: checkTermMapping(...),
   		isMappedColumn: checkColumnMapping(...),
   		isMappedDomain: checkDomainMapping(...)
   	};
   });
   ```

3. **조기 종료 최적화**

   ```typescript
   // 조건을 만족하면 즉시 반환
   if (termParts.length === 0) return false;
   for (const part of termParts) {
   	if (!vocabularyMap.has(part)) {
   		return false; // 조기 종료
   	}
   }
   return true;
   ```

**우선순위**: 4

---

## 이슈 #L9: 사용되지 않는 변수/파라미터

**심각도**: Low Priority

**위치**:

- `src/lib/components/DomainFileManager.svelte:168, 203` - `_err` (사용되지 않음)
- `src/lib/components/TermFileManager.svelte` - 유사한 패턴
- `src/lib/components/VocabularyFileManager.svelte` - 유사한 패턴

**문제 설명**:

에러 처리에서 에러 변수를 `_err`로 명명하여 사용하지 않습니다. ESLint 규칙으로 무시하고 있지만, 실제로 에러 정보를 활용할 수 있습니다.

**현재 코드:**

```typescript
// DomainFileManager.svelte:168
} catch (_err) {
	error = '서버 오류가 발생했습니다.';
}

// DomainFileManager.svelte:203
} catch (_err) {
	error = '서버 오류가 발생했습니다.';
}
```

**영향 범위**:

- 디버깅 어려움
- 에러 정보 손실

**재현 방법**:

1. FileManager 컴포넌트들 확인
2. `_err` 사용 확인

**예상 해결 방법**:

1. **에러 정보 활용**

   ```typescript
   } catch (err) {
   	console.error('파일 삭제 오류:', err);
   	error = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
   }
   ```

2. **에러 타입별 처리**

   ```typescript
   } catch (err) {
   	if (err instanceof TypeError) {
   		error = '네트워크 오류가 발생했습니다.';
   	} else if (err instanceof Error) {
   		error = err.message;
   	} else {
   		error = '알 수 없는 오류가 발생했습니다.';
   	}
   }
   ```

**우선순위**: 5

---

## 이슈 #L10: xlsx-parser.ts의 any 타입 사용

**심각도**: Low Priority

**위치**:

- `src/lib/utils/xlsx-parser.ts:182-183, 462-463`

**문제 설명**:

XLSX 워크시트 타입을 `Record<string, any>`로 정의하여 타입 안정성이 저하됩니다.

**현재 코드:**

```typescript
// xlsx-parser.ts:182-183
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const worksheet: Record<string, any> = {};
```

**영향 범위**:

- 타입 안정성
- 코드 품질

**재현 방법**:

1. `xlsx-parser.ts` 파일 확인
2. `any` 타입 사용 확인

**예상 해결 방법**:

1. **XLSX 타입 정의 사용**

   ```typescript
   import type { WorkSheet } from 'xlsx';

   const worksheet: WorkSheet = {};
   // 또는
   const worksheet = workbook.Sheets[firstSheetName] as WorkSheet;
   ```

2. **커스텀 타입 정의**

   ```typescript
   interface XlsxCell {
   	v?: string | number;
   	t?: string;
   	s?: unknown;
   }

   interface XlsxWorksheet {
   	[key: string]: XlsxCell;
   	'!ref'?: string;
   	'!cols'?: unknown[];
   }

   const worksheet: XlsxWorksheet = {};
   ```

**우선순위**: 4

---

## 이슈 #L11: 불필요한 데이터 변환 (중간 객체 생성)

**심각도**: Low Priority

**위치**:

- `src/routes/api/vocabulary/+server.ts:70-85` - `entriesWithDuplicateInfo` 생성
- `src/routes/api/search/+server.ts:85-94` - `entriesWithDuplicateInfo` 생성
- `src/routes/api/vocabulary/download/+server.ts:55-70` - 유사한 패턴

**문제 설명**:

중간 객체를 생성하여 메모리 사용량이 증가하고 성능이 저하될 수 있습니다.

**현재 코드:**

```typescript
// vocabulary/+server.ts:70-85
const entriesWithDuplicateInfo = vocabularyData.entries.map((entry) => ({
	...entry,
	duplicateInfo: duplicateDetails.get(entry.id) || {
		standardName: false,
		abbreviation: false,
		englishName: false
	}
}));
```

**영향 범위**:

- 메모리 사용량
- 성능 (대용량 데이터)

**재현 방법**:

1. 대용량 데이터로 테스트
2. 메모리 프로파일링

**예상 해결 방법**:

1. **지연 계산 (Lazy Evaluation)**

   ```typescript
   // entriesWithDuplicateInfo를 미리 생성하지 않고 필요할 때만 계산
   function getEntryWithDuplicateInfo(entry: VocabularyEntry) {
   	return {
   		...entry,
   		duplicateInfo: duplicateDetails.get(entry.id) || defaultDuplicateInfo
   	};
   }

   // 필터링 시에만 변환
   const filtered = vocabularyData.entries.filter(/* 조건 */).map(getEntryWithDuplicateInfo);
   ```

2. **원본 데이터에 직접 추가 (선택적)**

   ```typescript
   // duplicateInfo를 원본 엔트리에 추가 (불변성 유지)
   const enrichedEntries = vocabularyData.entries.map((entry) => {
   	if (!entry.duplicateInfo) {
   		entry.duplicateInfo = duplicateDetails.get(entry.id) || defaultDuplicateInfo;
   	}
   	return entry;
   });
   ```

**우선순위**: 5

---

## 이슈 #L12: 주석이 영어와 한국어 혼용

**심각도**: Low Priority

**위치**:

- 전체 코드베이스

**문제 설명**:

주석이 영어와 한국어가 혼용되어 일관성이 부족합니다.

**현재 상태:**

```typescript
// 한국어 주석
/**
 * 데이터 파일 경로 가져오기
 * @param filename - 파일명
 */

// 영어 주석
/**
 * Load vocabulary data from JSON file
 * @param filename - File name to load
 */
```

**영향 범위**:

- 코드 일관성
- 가독성

**재현 방법**:

1. 코드베이스 전체에서 주석 확인
2. 언어 혼용 확인

**예상 해결 방법**:

1. **한국어로 통일** (권장 - 프로젝트가 한국어 중심)

   ```typescript
   /**
    * 단어집 데이터를 JSON 파일에서 로드합니다.
    * @param filename - 로드할 파일명 (기본값: vocabulary.json)
    * @returns 로드된 VocabularyData 객체
    * @throws 파일이 존재하지 않거나 형식이 잘못된 경우 에러 발생
    */
   ```

2. **또는 영어로 통일**

   ```typescript
   /**
    * Loads vocabulary data from a JSON file.
    * @param filename - Name of the file to load (default: vocabulary.json)
    * @returns Loaded VocabularyData object
    * @throws Error if file doesn't exist or has invalid format
    */
   ```

3. **코드 스타일 가이드 작성**
   - 주석 언어 규칙 명시
   - ESLint 규칙 추가 고려

**우선순위**: 5

---

## 이슈 #L13: 함수 매개변수 검증 주석 부족

**심각도**: Low Priority

**위치**:

- `src/lib/utils/file-handler.ts` - 여러 함수
- `src/lib/utils/xlsx-parser.ts` - 여러 함수
- `src/routes/api/**/+server.ts` - API 함수들

**문제 설명**:

함수 매개변수에 대한 상세한 설명과 제약조건이 JSDoc에 명시되지 않은 경우가 많습니다.

**현재 코드:**

```typescript
/**
 * 데이터 파일 경로 가져오기
 * @param filename - 파일명
 * @param type - 데이터 타입
 */
function getDataPath(filename: string, type: 'vocabulary' | 'domain' | 'term'): string {
	// ...
}
```

**영향 범위**:

- API 문서 자동 생성 어려움
- 개발자 혼란

**재현 방법**:

1. 함수 JSDoc 확인
2. 매개변수 설명 부족 확인

**예상 해결 방법**:

1. **상세한 JSDoc 추가**

   ```typescript
   /**
    * 데이터 파일의 전체 경로를 반환합니다.
    *
    * @param filename - 파일명 (예: 'vocabulary.json')
    *   - 반드시 .json 확장자를 가져야 함
    *   - 경로 구분자(/, \) 포함 시 자동 제거됨
    * @param type - 데이터 타입
    *   - 'vocabulary': vocabulary 디렉토리
    *   - 'domain': domain 디렉토리
    *   - 'term': term 디렉토리
    *   - 'forbidden' | 'history': vocabulary 디렉토리 (하위 호환성)
    * @returns 파일의 전체 경로 (예: 'static/data/vocabulary/vocabulary.json')
    * @throws 파일명에 유효하지 않은 문자가 포함된 경우 에러 발생하지 않음 (내부에서 처리)
    */
   function getDataPath(
   	filename: string,
   	type: 'vocabulary' | 'domain' | 'term' | 'forbidden' | 'history' = 'vocabulary'
   ): string {
   	// ...
   }
   ```

2. **@example 추가**

   ````typescript
   /**
    * @example
    * ```typescript
    * const path = getDataPath('vocabulary.json', 'vocabulary');
    * // Returns: 'static/data/vocabulary/vocabulary.json'
    * ```
    */
   ````

**우선순위**: 5

---

## 이슈 #L14: 성능 최적화 기회 (배열 메서드 체이닝)

**심각도**: Low Priority

**위치**:

- `src/routes/api/vocabulary/+server.ts:70-111` - 여러 filter/map 체이닝
- `src/routes/api/search/+server.ts:95-110` - 필터링 로직
- `src/routes/api/domain/+server.ts:93-120` - 필터링 로직

**문제 설명**:

여러 배열 메서드를 체이닝하여 여러 번 순회하는 경우가 있습니다. 한 번의 순회로 처리할 수 있습니다.

**현재 코드:**

```typescript
// vocabulary/+server.ts
const entriesWithDuplicateInfo = vocabularyData.entries.map((entry) => ({
	...entry,
	duplicateInfo: duplicateDetails.get(entry.id) || defaultDuplicateInfo
}));

let filteredEntries = entriesWithDuplicateInfo.filter((entry) => {
	// 필터링 조건
});

filteredEntries = filteredEntries.filter((entry) => {
	// 추가 필터링
});
```

**영향 범위**:

- 성능 (대용량 데이터)
- 메모리 사용량

**재현 방법**:

1. 대용량 데이터로 테스트
2. 성능 프로파일링

**예상 해결 방법**:

1. **단일 순회로 통합**

   ```typescript
   // 여러 필터를 한 번에 적용
   const filteredEntries = vocabularyData.entries
   	.map((entry) => ({
   		...entry,
   		duplicateInfo: duplicateDetails.get(entry.id) || defaultDuplicateInfo
   	}))
   	.filter((entry) => {
   		// 모든 필터 조건을 한 번에 체크
   		return (
   			checkDuplicateFilter(entry) && checkUnmappedDomainFilter(entry) && checkSearchFilter(entry)
   		);
   	});
   ```

2. **조건 함수 분리**

   ```typescript
   function matchesAllFilters(entry: VocabularyEntry): boolean {
   	return (
   		matchesDuplicateFilter(entry) &&
   		matchesUnmappedDomainFilter(entry) &&
   		matchesSearchFilter(entry)
   	);
   }

   const filteredEntries = entriesWithDuplicateInfo.filter(matchesAllFilters);
   ```

**우선순위**: 5

---

## 이슈 #L15: 하드코딩된 매직 넘버/문자열

**심각도**: Low Priority

**위치**:

- `src/lib/components/SearchBar.svelte` - 디바운스 시간 (300ms)
- `src/lib/components/TermGenerator.svelte:108-111` - setTimeout 시간 (2000ms)
- `src/lib/components/DomainFileManager.svelte:290-292` - 메시지 표시 시간 (3000ms)
- `src/routes/api/**/+server.ts` - 페이지네이션 기본값들

**문제 설명**:

매직 넘버와 문자열이 하드코딩되어 있어 유지보수가 어렵습니다.

**현재 코드:**

```typescript
// SearchBar.svelte
const debouncedSearch = debounce(handleSearch, 300); // 300ms

// TermGenerator.svelte:108-111
setTimeout(() => {
	copiedResults.delete(text);
	copiedResults = new Set(copiedResults);
}, 2000); // 2초

// DomainFileManager.svelte:290-292
const timer = setTimeout(() => {
	successMessage = '';
}, 3000); // 3초
```

**영향 범위**:

- 유지보수 어려움
- 일관성 부족

**재현 방법**:

1. 코드베이스에서 숫자 리터럴 검색
2. 하드코딩된 값 확인

**예상 해결 방법**:

1. **상수 파일 생성**

   ```typescript
   // src/lib/constants/timing.ts
   export const TIMING = {
   	DEBOUNCE_SEARCH: 300, // 검색 디바운스 시간 (ms)
   	COPY_FEEDBACK: 2000, // 복사 피드백 표시 시간 (ms)
   	MESSAGE_DISPLAY: 3000, // 메시지 표시 시간 (ms)
   	FILE_REFRESH_DELAY: 300 // 파일 목록 새로고침 지연 (ms)
   } as const;

   // 사용
   const debouncedSearch = debounce(handleSearch, TIMING.DEBOUNCE_SEARCH);
   ```

2. **설정으로 관리**

   ```typescript
   // src/lib/constants/defaults.ts
   export const DEFAULTS = {
   	PAGINATION: {
   		PAGE_SIZE: 20,
   		MAX_PAGE_SIZE: 1000,
   		MIN_PAGE_SIZE: 1
   	},
   	SEARCH: {
   		MIN_QUERY_LENGTH: 1,
   		MAX_QUERY_LENGTH: 100
   	}
   } as const;
   ```

**우선순위**: 5

---

## 요약

| 이슈 ID | 제목                             | 우선순위 | 주석 | 네이밍 | 테스트 | 성능 | 코드 품질 |
| ------- | -------------------------------- | -------- | ---- | ------ | ------ | ---- | --------- |
| #L1     | console.log 프로덕션 코드에 남음 | 4        | ❌   | ❌     | ❌     | ✅   | ✅        |
| #L2     | window 객체 any 타입 사용        | 4        | ❌   | ❌     | ❌     | ❌   | ✅        |
| #L3     | 테스트 코드 완전 부재            | 5        | ❌   | ❌     | ✅     | ❌   | ✅        |
| #L4     | Deprecated 함수 아직 export      | 5        | ❌   | ❌     | ❌     | ❌   | ✅        |
| #L5     | TODO 주석 미구현                 | 5        | ✅   | ❌     | ❌     | ❌   | ❌        |
| #L6     | 함수/변수명 불명확               | 5        | ❌   | ✅     | ❌     | ❌   | ✅        |
| #L7     | 주석 부족 (복잡한 로직)          | 4        | ✅   | ❌     | ❌     | ❌   | ✅        |
| #L8     | 성능 최적화 기회                 | 4        | ❌   | ❌     | ❌     | ✅   | ❌        |
| #L9     | 사용되지 않는 변수               | 5        | ❌   | ❌     | ❌     | ❌   | ✅        |
| #L10    | xlsx-parser.ts any 타입          | 4        | ❌   | ❌     | ❌     | ❌   | ✅        |
| #L11    | 불필요한 데이터 변환             | 5        | ❌   | ❌     | ❌     | ✅   | ❌        |
| #L12    | 주석 언어 혼용                   | 5        | ✅   | ❌     | ❌     | ❌   | ✅        |
| #L13    | 함수 매개변수 주석 부족          | 5        | ✅   | ❌     | ❌     | ❌   | ✅        |
| #L14    | 배열 메서드 체이닝 최적화        | 5        | ❌   | ❌     | ❌     | ✅   | ❌        |
| #L15    | 하드코딩된 매직 넘버             | 5        | ❌   | ❌     | ❌     | ❌   | ✅        |

**총 15개 Low Priority 이슈 발견**

**우선순위 4 (여유 있을 때 수정):** 5개
**우선순위 5 (선택적 개선):** 10개

---

**마지막 업데이트**: 2024-01-01
