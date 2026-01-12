# TDD (Test-Driven Development) 가이드

이 문서는 DbManager 프로젝트에서 TDD 방식으로 개발하는 방법을 상세히 설명합니다.

## 목차

1. [TDD란?](#tdd란)
2. [TDD 사이클](#tdd-사이클)
3. [테스트 작성 규칙](#테스트-작성-규칙)
4. [테스트 파일 구조](#테스트-파일-구조)
5. [API 테스트 작성 가이드](#api-테스트-작성-가이드)
6. [컴포넌트 테스트 작성 가이드](#컴포넌트-테스트-작성-가이드)
7. [유틸리티 테스트 작성 가이드](#유틸리티-테스트-작성-가이드)
8. [테스트 문서 관리](#테스트-문서-관리)
9. [모범 사례](#모범-사례)
10. [문제 해결](#문제-해결)

---

## TDD란?

**TDD (Test-Driven Development)**는 테스트 주도 개발 방법론으로, 다음과 같은 순서로 개발을 진행합니다:

1. **테스트 작성** (Red): 실패하는 테스트를 먼저 작성
2. **구현** (Green): 테스트를 통과하는 최소한의 코드 작성
3. **리팩토링** (Refactor): 코드를 개선하면서 테스트가 계속 통과하는지 확인

### TDD의 장점

- **명확한 요구사항**: 테스트가 요구사항을 명확히 정의
- **안전한 리팩토링**: 테스트가 회귀 버그를 방지
- **설계 개선**: 테스트 가능한 코드는 좋은 설계를 유도
- **문서화**: 테스트가 코드의 사용 예시 역할

---

## TDD 사이클

### 1. Red 단계: 실패하는 테스트 작성

먼저 원하는 기능을 테스트하는 코드를 작성합니다. 이 시점에서는 아직 구현이 없으므로 테스트는 실패합니다.

```typescript
// 예: 새로운 API 엔드포인트 테스트
describe('POST /api/term/validate', () => {
	it('should validate term successfully', async () => {
		const requestEvent = createMockRequestEvent({
			body: { termName: '사용자_이름', columnName: 'USER_NAME' }
		});

		const response = await POST(requestEvent);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
	});
});
```

### 2. Green 단계: 테스트 통과하는 코드 작성

테스트를 통과하는 최소한의 코드만 작성합니다.

```typescript
// 최소한의 구현
export async function POST({ request }: RequestEvent) {
	const body = await request.json();
	return json({ success: true, data: { isValid: true } }, { status: 200 });
}
```

### 3. Refactor 단계: 코드 개선

테스트가 계속 통과하는지 확인하면서 코드를 개선합니다.

```typescript
// 개선된 구현
export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();

		// 유효성 검증 로직
		const isValid = await validateTerm(body);

		return json({ success: true, data: { isValid } }, { status: 200 });
	} catch (error) {
		return json({ success: false, error: 'Validation failed' }, { status: 400 });
	}
}
```

---

## 테스트 작성 규칙

### 네이밍 컨벤션

- **테스트 파일**: `{원본파일명}.test.ts` 또는 `server.test.ts` (API의 경우)
  - ⚠️ **중요**: SvelteKit에서는 `+` 접두어가 있는 파일은 라우트 파일로 인식되므로, 테스트 파일에는 `+` 접두어를 사용할 수 없습니다. API 테스트 파일은 반드시 `server.test.ts` 형식을 사용해야 합니다.
- **테스트 그룹**: `describe('기능명', () => {})`
- **테스트 케이스**: `it('should {기대하는 동작}', () => {})`

### 테스트 구조

모든 테스트는 다음 구조를 따릅니다:

```typescript
describe('기능명', () => {
	beforeEach(() => {
		// 각 테스트 전에 실행되는 설정
		vi.clearAllMocks();
	});

	describe('하위 기능', () => {
		it('should {기대하는 동작}', async () => {
			// Given: 테스트 데이터 준비
			// When: 테스트 대상 실행
			// Then: 결과 검증
		});
	});
});
```

### Given-When-Then 패턴

테스트는 명확하게 세 부분으로 나눕니다:

```typescript
it('should return data successfully', async () => {
	// Given: 테스트 데이터 및 Mock 설정
	const mockData = { entries: [] };
	vi.mocked(loadData).mockResolvedValue(mockData);

	// When: 테스트 대상 실행
	const response = await GET(requestEvent);
	const result = await response.json();

	// Then: 결과 검증
	expect(response.status).toBe(200);
	expect(result.success).toBe(true);
	expect(result.data.entries).toEqual(mockData.entries);
});
```

---

## 테스트 파일 구조

### API 테스트 파일 위치

```
src/routes/api/
├── vocabulary/
│   ├── +server.ts
│   ├── server.test.ts           # CRUD API 테스트
│   ├── files/
│   │   ├── +server.ts
│   │   └── server.test.ts       # 파일 관리 API 테스트
│   └── upload/
│       ├── +server.ts
│       └── server.test.ts       # 업로드 API 테스트
```

### 컴포넌트 테스트 파일 위치

```
src/lib/components/
├── VocabularyEditor.svelte
├── VocabularyEditor.test.ts     # 컴포넌트 테스트
├── VocabularyTable.svelte
└── VocabularyTable.test.ts
```

### 유틸리티 테스트 파일 위치

```
src/lib/utils/
├── validation.ts
├── validation.test.ts            # 유틸리티 테스트
├── cache.ts
└── cache.test.ts
```

---

## API 테스트 작성 가이드

### 기본 구조

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

// Mock 모듈
vi.mock('$lib/utils/file-handler.js', () => ({
	loadData: vi.fn(),
	saveData: vi.fn(),
	listFiles: vi.fn()
}));

// Mock import
import { loadData, saveData } from '$lib/utils/file-handler.js';

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/endpoint');

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	const request = {
		json: vi.fn().mockResolvedValue(options.body || {}),
		method: 'POST'
	} as unknown as Request;

	return {
		url,
		request,
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/endpoint' },
		cookies: {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			has: vi.fn(),
			serialize: vi.fn()
		},
		getClientAddress: vi.fn(() => '127.0.0.1'),
		isDataRequest: false,
		isSubRequest: false
	} as RequestEvent;
}

describe('API: /api/endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET', () => {
		it('should return data successfully', async () => {
			// Given
			const mockData = { entries: [], lastUpdated: '2024-01-01' };
			vi.mocked(loadData).mockResolvedValue(mockData);

			// When
			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);
			const result = await response.json();

			// Then
			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.entries).toEqual(mockData.entries);
		});
	});

	describe('POST', () => {
		it('should create entry successfully', async () => {
			// Given
			const newEntry = { name: 'Test' };
			vi.mocked(loadData).mockResolvedValue({ entries: [] });
			vi.mocked(saveData).mockResolvedValue(undefined);

			// When
			const requestEvent = createMockRequestEvent({ body: newEntry });
			const response = await POST(requestEvent);
			const result = await response.json();

			// Then
			expect(response.status).toBe(201);
			expect(result.success).toBe(true);
			expect(saveData).toHaveBeenCalled();
		});
	});
});
```

### 주요 테스트 케이스

#### 성공 케이스

```typescript
it('should return data successfully', async () => {
	// 성공적인 응답 테스트
});
```

#### 에러 케이스

```typescript
it('should return 400 for invalid parameters', async () => {
	// 잘못된 파라미터에 대한 에러 응답 테스트
});

it('should return 404 for not found', async () => {
	// 존재하지 않는 리소스에 대한 에러 응답 테스트
});

it('should return 500 for server error', async () => {
	// 서버 에러 처리 테스트
	vi.mocked(loadData).mockRejectedValue(new Error('File read error'));
});
```

#### 엣지 케이스

```typescript
it('should handle empty data', async () => {
	// 빈 데이터 처리 테스트
});

it('should handle pagination correctly', async () => {
	// 페이지네이션 테스트
});
```

---

## 컴포넌트 테스트 작성 가이드

### 기본 구조

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Component from './Component.svelte';

// Mock 전역 함수
const mockFetch = vi.fn();
global.fetch = mockFetch;

global.alert = vi.fn();
global.confirm = vi.fn(() => true);

// Mock crypto
Object.defineProperty(global, 'crypto', {
	value: {
		randomUUID: vi.fn(() => 'test-uuid-1234')
	}
});

describe('Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default fetch mock
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true, data: [] })
		});
	});

	it('should render correctly', () => {
		// Given
		const props = {
			/* ... */
		};

		// When
		render(Component, { props });

		// Then
		expect(screen.getByText('Expected Text')).toBeInTheDocument();
	});

	it('should handle user interaction', async () => {
		// Given
		render(Component, { props });

		// When
		const button = screen.getByRole('button', { name: 'Click Me' });
		await fireEvent.click(button);

		// Then
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalled();
		});
	});
});
```

### 주요 테스트 케이스

#### 렌더링 테스트

```typescript
it('should render all required elements', () => {
	render(Component, { props });

	expect(screen.getByLabelText('Input Label')).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
});
```

#### 사용자 인터랙션 테스트

```typescript
it('should update state on input change', async () => {
	render(Component, { props });

	const input = screen.getByLabelText('Input Label');
	await fireEvent.input(input, { target: { value: 'New Value' } });

	expect(input).toHaveValue('New Value');
});
```

#### 이벤트 발생 테스트

```typescript
it('should dispatch event on submit', async () => {
	const { component } = render(Component, { props });
	const handleEvent = vi.fn();
	component.$on('submit', handleEvent);

	const submitButton = screen.getByRole('button', { name: 'Submit' });
	await fireEvent.click(submitButton);

	expect(handleEvent).toHaveBeenCalled();
});
```

---

## 유틸리티 테스트 작성 가이드

### 기본 구조

```typescript
import { describe, it, expect } from 'vitest';
import { utilityFunction } from './utility';

describe('utilityFunction', () => {
	it('should return expected result for valid input', () => {
		// Given
		const input = 'valid input';

		// When
		const result = utilityFunction(input);

		// Then
		expect(result).toBe('expected result');
	});

	it('should handle edge cases', () => {
		// 엣지 케이스 테스트
		expect(utilityFunction('')).toBe('');
		expect(utilityFunction(null)).toBe(null);
	});
});
```

### 주요 테스트 케이스

#### 정상 케이스

```typescript
it('should process valid input correctly', () => {
	expect(utilityFunction('input')).toBe('output');
});
```

#### 엣지 케이스

```typescript
it('should handle empty string', () => {
	expect(utilityFunction('')).toBe('');
});

it('should handle null/undefined', () => {
	expect(utilityFunction(null)).toBe(null);
	expect(utilityFunction(undefined)).toBe(undefined);
});
```

#### 에러 케이스

```typescript
it('should throw error for invalid input', () => {
	expect(() => utilityFunction('invalid')).toThrow('Error message');
});
```

---

## 테스트 문서 관리

### 주제영역별 테스트 문서

각 주제영역의 테스트는 `docs/tests/{주제영역}_TEST_DESCRIPTION.md` 파일에 정리됩니다.

#### 문서 구조

```markdown
# {주제영역} 주제영역 테스트 설명

## 테스트 현황 요약

| 테스트 파일         | 테스트 수 | 상태 |
| ------------------- | --------- | ---- |
| `server.test.ts`    | 18개      | 완료 |
| `Component.test.ts` | 12개      | 완료 |
| **합계**            | **30개**  |      |

## 1. API 테스트 설명

### 1.1 GET 엔드포인트

| 테스트명                        | 설명             | 검증 내용              |
| ------------------------------- | ---------------- | ---------------------- |
| should return data successfully | 데이터 조회 성공 | 200 응답, success=true |
```

### 테스트 작성 시 문서 업데이트

1. **테스트 계획 추가**: 새로운 테스트를 작성하기 전에 문서에 테스트 케이스 추가
2. **테스트 작성**: 실제 테스트 코드 작성
3. **완료 표시**: 테스트가 통과하면 문서에 "완료" 표시

---

## 모범 사례

### 1. 독립적인 테스트

각 테스트는 독립적으로 실행 가능해야 합니다. 다른 테스트의 결과에 의존하지 않아야 합니다.

```typescript
// ✅ 좋은 예
beforeEach(() => {
	vi.clearAllMocks();
	// 각 테스트마다 초기 상태로 리셋
});

// ❌ 나쁜 예
it('test 1', () => {
	// 전역 상태 변경
});

it('test 2', () => {
	// test 1의 결과에 의존
});
```

### 2. 명확한 테스트 이름

테스트 이름은 무엇을 테스트하는지 명확하게 표현해야 합니다.

```typescript
// ✅ 좋은 예
it('should return 400 when required field is missing', () => {});

// ❌ 나쁜 예
it('test 1', () => {});
it('should work', () => {});
```

### 3. Mock 사용

외부 의존성은 Mock으로 대체하여 테스트를 격리합니다.

```typescript
// ✅ 좋은 예
vi.mock('$lib/utils/file-handler.js', () => ({
	loadData: vi.fn()
}));

// ❌ 나쁜 예
// 실제 파일 시스템에 접근하는 테스트
```

### 4. 테스트 데이터 준비

테스트 데이터는 명확하고 재현 가능해야 합니다.

```typescript
// ✅ 좋은 예
const mockEntry = {
	id: 'test-id',
	name: 'Test Name',
	createdAt: '2024-01-01T00:00:00.000Z'
};

// ❌ 나쁜 예
const mockEntry = {
	// 불완전한 데이터
	name: 'Test'
};
```

### 5. 하나의 개념만 테스트

각 테스트는 하나의 개념만 검증해야 합니다.

```typescript
// ✅ 좋은 예
it('should return 200 for valid request', () => {});
it('should return 400 for invalid request', () => {});

// ❌ 나쁜 예
it('should handle all cases', () => {
	// 여러 케이스를 한 테스트에 포함
});
```

---

## 문제 해결

### 일반적인 문제

#### 1. Mock이 작동하지 않음

```typescript
// 문제: Mock이 적용되지 않음
// 해결: vi.mock을 파일 상단에 배치
vi.mock('$lib/utils/file-handler.js', () => ({
	loadData: vi.fn()
}));
```

#### 2. 비동기 테스트 실패

```typescript
// 문제: 비동기 작업이 완료되기 전에 테스트 종료
// 해결: await와 waitFor 사용
it('should handle async operation', async () => {
	await fireEvent.click(button);
	await waitFor(() => {
		expect(mockFetch).toHaveBeenCalled();
	});
});
```

#### 3. 전역 함수 Mock 실패

```typescript
// 문제: 전역 함수 Mock이 작동하지 않음
// 해결: beforeEach에서 Mock 설정
beforeEach(() => {
	global.fetch = vi.fn();
	global.alert = vi.fn();
});
```

---

## 참고 자료

- [Vitest 공식 문서](https://vitest.dev/)
- [Testing Library Svelte 문서](https://testing-library.com/docs/svelte-testing-library/intro/)
- [TDD Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**마지막 업데이트**: 2026-01-08
