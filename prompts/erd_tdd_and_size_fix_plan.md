# ERD TDD 준수 및 Mermaid 텍스트 크기 제한 해결 계획

## 현재 상황 분석

### 1. TDD 준수 여부

- ❌ **ERD 관련 테스트 파일이 전혀 없음**
  - `src/lib/components/ERDViewer.test.ts` 없음
  - `src/lib/utils/erd-generator.test.ts` 없음
  - `src/lib/utils/erd-mapper.test.ts` 없음
  - `src/lib/utils/erd-filter.test.ts` 없음
  - `src/routes/api/erd/generate/server.test.ts` 없음
  - `src/routes/api/erd/tables/server.test.ts` 없음
- ❌ **테스트 문서 없음**
  - `docs/tests/ERD_TEST_DESCRIPTION.md` 없음

### 2. Mermaid "Maximum text size in diagram exceeded" 에러

- **원인**: Mermaid는 다이어그램의 텍스트 크기에 제한이 있음 (약 50KB)
- **현재 문제점**:
  - 모든 노드와 엣지를 포함하여 생성
  - 노드 라벨이 길 수 있음
  - 엣지 라벨도 포함
  - 필드는 5개로 제한되어 있지만, 노드 수가 많으면 문제 발생

## 해결 계획

### Phase 1: TDD 준수 - 테스트 작성

#### 1.1 테스트 문서 작성

- [ ] `docs/tests/ERD_TEST_DESCRIPTION.md` 생성
  - ERD 기능 테스트 계획 작성
  - 각 유틸리티 함수별 테스트 케이스 정의
  - API 엔드포인트 테스트 케이스 정의
  - 컴포넌트 테스트 케이스 정의

#### 1.2 유틸리티 함수 테스트 작성

- [ ] `src/lib/utils/erd-mapper.test.ts`
  - `generateAllMappings` 테스트
  - `mapEntityInheritance` 테스트
  - `mapTableToEntity` 테스트
  - `mapColumnToDomain` 테스트
  - 엣지 케이스 테스트

- [ ] `src/lib/utils/erd-generator.test.ts`
  - `generateERDData` 테스트
  - `generateMermaidERD` 테스트
  - `sanitizeNodeName` 테스트
  - 텍스트 크기 제한 테스트

- [ ] `src/lib/utils/erd-filter.test.ts`
  - `filterMappingContext` 테스트
  - `filterERDDataByTableIds` 테스트
  - 필터링 엣지 케이스 테스트

#### 1.3 API 테스트 작성

- [ ] `src/routes/api/erd/generate/server.test.ts`
  - GET 요청 테스트
  - 필터 파라미터 테스트
  - 에러 처리 테스트

- [ ] `src/routes/api/erd/tables/server.test.ts`
  - GET 요청 테스트
  - 검색 쿼리 테스트
  - 정렬 테스트

#### 1.4 컴포넌트 테스트 작성

- [ ] `src/lib/components/ERDViewer.test.ts`
  - 렌더링 테스트
  - Mermaid 초기화 테스트
  - 에러 처리 테스트
  - 사용자 인터랙션 테스트

### Phase 2: Mermaid 텍스트 크기 제한 해결

#### 2.1 텍스트 크기 제한 감지 및 처리

- [ ] `generateMermaidERD` 함수에 텍스트 크기 체크 추가
  - 생성된 Mermaid 코드의 크기 측정
  - 제한 초과 시 경고 및 처리

#### 2.2 노드/엣지 수 제한 옵션 추가

- [ ] `ERDFilterOptions`에 최대 노드/엣지 수 옵션 추가
  ```typescript
  export interface ERDFilterOptions {
  	tableIds?: string[];
  	includeRelated?: boolean;
  	maxNodes?: number; // 최대 노드 수
  	maxEdges?: number; // 최대 엣지 수
  }
  ```

#### 2.3 라벨 길이 제한

- [ ] `sanitizeNodeName` 함수 개선
  - 최대 길이 제한 (예: 50자)
  - 긴 라벨은 축약 및 말줄임표 추가

#### 2.4 필드 수 추가 제한

- [ ] 현재 5개에서 3개로 더 줄이기
- [ ] 또는 사용자가 선택할 수 있도록 옵션 추가

#### 2.5 다이어그램 분할 옵션

- [ ] 큰 다이어그램을 여러 개로 분할하는 기능
  - 데이터베이스별로 분할
  - 스키마별로 분할
  - 테이블 그룹별로 분할

#### 2.6 사용자 경험 개선

- [ ] ERDViewer에 경고 메시지 표시
  - 다이어그램이 너무 큰 경우 경고
  - 필터링 제안
- [ ] 자동 필터링 제안
  - 노드 수가 많을 때 자동으로 제한 제안

### Phase 3: 구현 순서

1. **테스트 문서 작성** (`docs/tests/ERD_TEST_DESCRIPTION.md`)
2. **텍스트 크기 제한 해결** (우선순위 높음)
   - 텍스트 크기 체크 추가
   - 라벨 길이 제한
   - 노드/엣지 수 제한 옵션
3. **테스트 작성** (TDD 원칙 준수)
   - 유틸리티 함수 테스트
   - API 테스트
   - 컴포넌트 테스트
4. **다이어그램 분할 기능** (선택적, 향후 개선)

## 구체적인 수정 작업

### 작업 1: 텍스트 크기 제한 해결 (우선순위 1)

#### 1.1 `erd-generator.ts` 수정

- `generateMermaidERD` 함수에 텍스트 크기 체크 추가
- 제한 초과 시 경고 및 자동 축소

#### 1.2 `sanitizeNodeName` 함수 개선

- 최대 길이 제한 (50자)
- 긴 라벨 축약

#### 1.3 `ERDFilterOptions` 확장

- `maxNodes`, `maxEdges` 옵션 추가

### 작업 2: 테스트 문서 작성 (우선순위 2)

#### 2.1 `docs/tests/ERD_TEST_DESCRIPTION.md` 작성

- ERD 기능 전체 테스트 계획
- 각 함수별 테스트 케이스 정의

### 작업 3: 테스트 작성 (우선순위 3)

#### 3.1 유틸리티 함수 테스트

- `erd-generator.test.ts`
- `erd-mapper.test.ts`
- `erd-filter.test.ts`

#### 3.2 API 테스트

- `src/routes/api/erd/generate/server.test.ts`
- `src/routes/api/erd/tables/server.test.ts`

#### 3.3 컴포넌트 테스트

- `ERDViewer.test.ts`

## 예상 작업 시간

- Phase 1 (테스트 문서 및 작성): 4-6시간
- Phase 2 (텍스트 크기 제한 해결): 2-3시간
- Phase 3 (통합 및 검증): 1-2시간

**총 예상 시간**: 7-11시간

## 참고사항

- Mermaid의 텍스트 크기 제한은 약 50KB입니다.
- 대규모 데이터베이스의 경우 다이어그램 분할이 필수적일 수 있습니다.
- 테스트는 TDD 원칙에 따라 실패하는 테스트를 먼저 작성한 후 구현합니다.
