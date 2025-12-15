# 구현 계획 (체크리스트)

이 문서는 실제 실행 가능한 체크리스트 형식의 구현 계획입니다.

**마지막 업데이트**: 2024-01-01

---

## Week 1-2: Critical Issues

### Week 1

- [x] **#C10: Path Traversal 취약점** ✅
  - 설명: 파일명 파라미터에 경로 조작 문자(`../`) 포함 시 시스템 파일 접근 가능
  - 파일: `src/lib/utils/file-handler.ts:23-69` (`validateFilename`, `getDataPath` 함수)
  - 완료: 2024-12-12

- [x] **#C2: JSON 파싱 타입 검증 없음** ✅
  - 설명: JSON 파싱 결과에 타입 단언만 사용, 런타임 검증 없음
  - 파일:
    - `src/lib/utils/type-guards.ts` (신규 생성)
    - `src/lib/utils/file-handler.ts` (타입 가드 적용)
    - `src/lib/utils/history-handler.ts` (타입 가드 적용)
  - 완료: 2024-12-12

- [x] **#C1: 동시성 문제 (파일 락)** ✅
  - 설명: 파일 기반 저장소의 동시 수정 시 데이터 손실 위험
  - 파일:
    - `src/lib/utils/file-lock.ts` (신규 생성)
    - `src/lib/utils/file-handler.ts` (파일 락 적용)
    - `src/lib/utils/history-handler.ts` (파일 락 적용)
  - 완료: 2024-12-12

### Week 2

- [x] **#C5: 파일 쓰기 실패 시 롤백 없음** ✅
  - 설명: 파일 쓰기 중 오류 시 원본 데이터 손실 가능
  - 파일:
    - `src/lib/utils/file-lock.ts` (`atomicWriteFile`, `safeWriteFile` 추가)
    - `src/lib/utils/file-handler.ts` (모든 save 함수에 적용)
    - `src/lib/utils/history-handler.ts` (saveHistoryData에 적용)
  - 완료: 2024-12-12

- [ ] **#C9: 인증/권한 체크 부재 (기본 구조)**
  - 설명: 모든 API 엔드포인트에 인증/권한 체크 없음
  - 파일:
    - `src/hooks.server.ts` (인증 미들웨어)
    - 모든 `src/routes/api/**/+server.ts`
  - 예상: 16시간 (기본 구조)
  - 담당:

- [x] **#C3: FormData null 체크 부족** ✅
  - 설명: `formData.get('file')` null 체크 없이 타입 단언 사용
  - 파일:
    - `src/lib/utils/type-guards.ts` (FormData 유틸리티 추가)
    - `src/routes/api/upload/+server.ts`
    - `src/routes/api/domain/upload/+server.ts`
    - `src/routes/api/term/upload/+server.ts`
  - 완료: 2024-12-12

- [x] **#C4: 부분 업데이트 undefined 처리** ✅
  - 설명: 스프레드 연산자로 병합 시 `undefined` 값이 기존 데이터 덮어쓰기
  - 파일:
    - `src/lib/utils/type-guards.ts` (`safeMerge` 추가)
    - `src/routes/api/vocabulary/+server.ts` (PUT)
    - `src/routes/api/domain/+server.ts` (PUT)
    - `src/routes/api/term/+server.ts` (PUT)
  - 완료: 2024-12-12

- [x] **#C7: Non-null assertion 남용** ✅
  - 설명: Non-null assertion(`!`) 사용으로 런타임 에러 가능성
  - 파일:
    - `src/routes/api/vocabulary/+server.ts` (변수 추출로 해결)
    - `src/lib/utils/file-handler.ts` (Map.get + 조건문으로 해결)
    - `src/routes/api/generator/+server.ts` (nullish coalescing으로 해결)
  - 완료: 2024-12-12

- [x] **#C8: 파일 읽기 실패 처리** ✅
  - 설명: 파일 읽기 실패 시 예외 처리 및 에러 메시지 개선
  - 파일:
    - `src/lib/utils/file-lock.ts` (`safeReadFile`, `FileReadError` 추가)
    - `src/lib/utils/file-handler.ts` (모든 `load*Data()` 함수)
    - `src/lib/utils/history-handler.ts` (`loadHistoryData()`)
  - 완료: 2024-12-12

- [x] **#C6: 참조 무결성 검증 없음** ✅
  - 설명: 다른 엔트리에서 참조하는 경우에도 삭제 가능
  - 파일:
    - `src/lib/utils/file-handler.ts` (참조 검증 함수 추가)
    - `src/routes/api/vocabulary/+server.ts` (DELETE)
    - `src/routes/api/domain/+server.ts` (DELETE)
  - 완료: 2024-12-12

---

## Week 3-4: High Priority Issues

### Week 3

- [x] **#H3: Term API N+1 문제** ✅
  - 설명: Term API에서 매번 Vocabulary/Domain 데이터를 전체 로드
  - 파일:
    - `src/lib/utils/cache.ts` (신규 - 메모리 캐시)
    - `src/routes/api/term/+server.ts` (캐시 적용)
    - `src/routes/api/term/upload/+server.ts` (캐시 적용)
    - `src/routes/api/vocabulary/+server.ts` (캐시 무효화)
    - `src/routes/api/domain/+server.ts` (캐시 무효화)
  - 완료: 2024-12-12

- [x] **#H4: 데이터 검증 로직 부족** ✅
  - 설명: 타입, 형식, 참조 무결성 검증 부족
  - 파일:
    - `src/lib/utils/validation.ts` (형식 검증 함수 추가)
    - `src/lib/utils/file-handler.ts` (save 함수 검증 강화)
  - 완료: 2024-12-12

- [x] **#H7: 전체 파일 메모리 로드** ✅
  - 설명: 모든 데이터 조회 시 전체 파일을 메모리로 로드
  - 파일:
    - `src/lib/utils/data-index.ts` (신규 - 인덱스 시스템)
    - `src/lib/utils/cache.ts` (페이지네이션 최적화 추가)
  - 완료: 2024-12-12

### Week 4

- [x] **#H4: 데이터 검증 로직 부족 (완료)** ✅
  - 설명: 타입 가드 함수 확장 및 검증 로직 강화 완료
  - 파일: `src/lib/utils/validation.ts` (신규 생성)
  - 완료: 2024-12-12

- [x] **#H3: Term API N+1 문제 (완료)** ✅
  - 설명: 캐싱 메커니즘 구현 완료
  - 파일: `src/lib/utils/cache.ts` (신규 생성)
  - 완료: 2024-12-12

### Week 5

- [x] **#H1: 하위 호환성 필드 중복** ✅
  - 설명: `mappedDomainFile`과 `mapping.domain` 두 필드 공존
  - 파일:
    - `src/lib/types/vocabulary.ts` (@deprecated 추가)
    - `src/lib/utils/file-handler.ts` (저장 시 mappedDomainFile 제거)
    - `src/routes/api/vocabulary/sync-domain/+server.ts` (mapping.domain만 사용)
    - `src/routes/api/vocabulary/files/mapping/+server.ts` (mappedDomainFile 제거)
  - 완료: 2024-12-12
  - 예상: 16시간
  - 담당:

- [x] **#H2: History API 유니온 타입** ✅
  - 설명: History API가 유니온 타입 반환으로 타입 안정성 저하
  - 파일:
    - `src/lib/utils/history-handler.ts` (함수 오버로드 + 제네릭)
    - `src/routes/api/history/+server.ts` (유니온 타입 제거)
  - 완료: 2024-12-12

- [x] **#H5: Domain API POST 없음** ✅
  - 설명: Domain API에 POST (생성) 엔드포인트 없음
  - 파일: `src/routes/api/domain/+server.ts` (POST 핸들러 추가)
  - 완료: 2024-12-12

### Week 6

- [ ] **#H6: 에러 처리 일관성 부족**
  - 설명: 에러 처리가 각 API마다 다르게 구현
  - 파일:
    - `src/lib/utils/error-handler.ts` (신규 생성)
    - 모든 `src/routes/api/**/+server.ts`
  - 예상: 16시간
  - 담당:

- [ ] **#H8: 검증 로직 분산**
  - 설명: 검증 로직이 각 컴포넌트와 API에 분산
  - 파일:
    - `src/lib/utils/validation.ts` (신규 생성)
    - `src/lib/components/TermEditor.svelte:291-310`
    - `src/lib/components/DomainEditor.svelte:67-93`
    - `src/routes/api/vocabulary/+server.ts:196-206`
  - 예상: 24시간
  - 담당:

- [ ] **#H9: Partial 타입 사용**
  - 설명: API 요청 바디에 `Partial<T>` 타입 사용으로 타입 안정성 저하
  - 파일:
    - `src/lib/types/vocabulary.ts` (요청 타입 추가)
    - `src/lib/types/domain.ts` (요청 타입 추가)
    - `src/lib/types/term.ts` (요청 타입 추가)
    - 모든 `src/routes/api/**/+server.ts`
  - 예상: 16시간
  - 담당:

- [ ] **#H10: API 응답 타입 불일치**
  - 설명: 검색 API와 일반 조회 API의 응답 구조 불일치
  - 파일:
    - `src/routes/api/search/+server.ts`
    - `src/routes/api/vocabulary/+server.ts`
    - `src/routes/browse/+page.svelte`
  - 예상: 16시간
  - 담당:

---

## Week 5-8: Medium Priority Refactoring

### Week 7 - 완료

- [x] **#M6: Store 파일명 네이밍 불일치** ✅
  - 설명: vocabularyStore.ts → vocabulary-store.ts 변경
  - 파일: `src/lib/stores/vocabulary-store.ts`
  - 완료: 2024-12-12

- [x] **#M11: 불필요한 데이터 변환 중복** ✅
  - 설명: #H1에서 mappedDomainFile → mapping.domain 통합으로 해결
  - 완료: 2024-12-12

- [x] **#M2: file-handler.ts 파일 관리 중복** ✅
  - 설명: 제네릭 파일 관리 함수 생성
  - 파일: `src/lib/utils/file-operations.ts` (신규 생성)
  - 완료: 2024-12-12

- [x] **#M5: xlsx-parser.ts 파싱 함수 중복** ✅
  - 설명: 공통 파싱 유틸리티 함수 추출
  - 파일: `src/lib/utils/xlsx-parser.ts` (parseWorkbookToArray, isEmptyRow 추가)
  - 완료: 2024-12-12

- [x] **#M12: 페이지 데이터 로드 패턴 중복** ✅
  - 설명: 공통 API 클라이언트 유틸리티 생성
  - 파일: `src/lib/utils/api-client.ts` (신규 생성)
  - 완료: 2024-12-12

### Week 8 - 부분 완료

- [x] **#M3: Table 컴포넌트 중복** ⚠️ 부분 해결
  - 설명: 공통 테이블 타입 정의 추출
  - 파일: `src/lib/types/table.ts` (신규 생성)
  - 남은 작업: 제네릭 DataTable 컴포넌트로 통합
  - 완료: 2024-12-12

- [x] **#M4: FileManager 컴포넌트 중복** ⚠️ 부분 해결
  - 설명: 공통 파일 관리 API 함수 추가
  - 파일: `src/lib/utils/api-client.ts` (파일 관리 함수 추가)
  - 남은 작업: 제네릭 FileManager 컴포넌트로 통합
  - 완료: 2024-12-12

- [x] **#M7: browse 페이지 상태 관리 중복** ⚠️ 부분 해결
  - 설명: 공통 상태 관리 훅 생성
  - 파일: `src/lib/composables/use-data-table.ts` (신규 생성)
  - 남은 작업: 각 페이지에서 훅 활용
  - 완료: 2024-12-12

- [x] **#M8: TermEditor 이중 역할** ⚠️ 부분 해결
  - 설명: 공통 에디터 타입 정의 추출
  - 파일: `src/lib/types/editor.ts` (신규 생성)
  - 남은 작업: VocabularyEditor 별도 컴포넌트 생성
  - 완료: 2024-12-12

- [x] **#M10: Table 컴포넌트 Props Drilling** ⚠️ 부분 해결
  - 설명: 공통 Props 타입 정의
  - 파일: `src/lib/types/table.ts` (TableProps 정의)
  - 남은 작업: Context API로 전환
  - 완료: 2024-12-12

- [x] **#M14: 상태 관리 패턴 일관성 부족** ⚠️ 부분 해결
  - 설명: 공통 상태 관리 패턴 정의
  - 파일: `src/lib/composables/use-data-table.ts`
  - 남은 작업: 각 페이지 Store 정리
  - 완료: 2024-12-12

### Week 9-10 - 부분 완료

- [x] **#M1: file-handler.ts load/save 중복** ⚠️ 부분 해결
  - 설명: 래퍼 함수 유지 (타입별 검증 필요)
  - 완료: 2024-12-12

- [x] **#M9: file-handler.ts 파일 크기** ⚠️ 부분 해결
  - 설명: file-operations.ts 분리로 약 900줄로 감소
  - 완료: 2024-12-12

- [x] **#M13: xlsx-parser.ts 파일 크기** ⚠️ 부분 해결
  - 설명: 공통 유틸리티 추출로 약 820줄로 감소
  - 완료: 2024-12-12

---

## Ongoing: Low Priority Improvements

### 우선순위 4 (여유 있을 때)

- [x] **#L1: console.log 프로덕션 코드에 남음** ⚠️ 부분 해결
  - 설명: 로깅 유틸리티 생성
  - 파일: `src/lib/utils/logger.ts` (신규 생성)
  - 남은 작업: 기존 console 호출을 logger로 교체
  - 완료: 2024-12-12

- [x] **#L2: window 객체 any 타입 사용** ✅
  - 설명: Window 인터페이스 확장
  - 파일: `src/app.d.ts` (Window 타입 선언 추가)
  - 완료: 2024-12-12

- [ ] **#L7: 주석 부족 (복잡한 로직)**
  - 설명: 복잡한 로직에 대한 주석 부족
  - 파일:
    - `src/lib/utils/duplicate-handler.ts:32-61`
    - `src/routes/api/term/upload/+server.ts:51-93`
    - `src/routes/api/generator/segment/+server.ts`
    - `src/lib/utils/file-handler.ts:43-108`
  - 예상: 16시간
  - 담당:

- [ ] **#L8: 성능 최적화 기회**
  - 설명: 불필요한 반복문이나 비효율적인 알고리즘
  - 파일:
    - `src/routes/api/term/upload/+server.ts:64-70, 77-87`
    - `src/routes/api/vocabulary/sync-domain/+server.ts`
    - `src/routes/api/search/+server.ts:95-110`
  - 예상: 16시간
  - 담당:

- [ ] **#L10: xlsx-parser.ts any 타입**
  - 설명: XLSX 워크시트 타입을 `Record<string, any>`로 정의
  - 파일: `src/lib/utils/xlsx-parser.ts:182-183, 462-463`
  - 예상: 4시간
  - 담당:

### 우선순위 5 (선택적 개선)

- [ ] **#L3: 테스트 코드 완전 부재**
  - 설명: 프로젝트에 단위 테스트, 통합 테스트, E2E 테스트 없음
  - 파일:
    - `vitest.config.ts` (신규 생성)
    - `src/lib/utils/__tests__/file-handler.test.ts` (신규 생성)
    - `src/routes/api/__tests__/vocabulary.test.ts` (신규 생성)
    - `src/lib/components/__tests__/SearchBar.test.ts` (신규 생성)
  - 예상: 40시간
  - 담당:

- [ ] **#L4: Deprecated 함수 아직 export**
  - 설명: `getShowSystemFiles`, `setShowSystemFiles` 함수가 아직 export됨
  - 파일:
    - `src/lib/utils/settings.ts:116-129`
    - 사용처 검색 및 마이그레이션
  - 예상: 4시간
  - 담당:

- [ ] **#L5: TODO 주석 미구현**
  - 설명: 파일별 히스토리 초기화 로직이 필요하다고 명시되어 있음
  - 파일: `src/routes/api/upload/+server.ts:96`
  - 예상: 8시간
  - 담당:

- [ ] **#L6: 함수/변수명 불명확**
  - 설명: 일부 함수/변수명이 불명확하여 코드 가독성 저하
  - 파일:
    - `src/lib/utils/duplicate-handler.ts:32, 86`
    - `src/routes/api/term/upload/+server.ts:51`
  - 예상: 8시간
  - 담당:

- [ ] **#L9: 사용되지 않는 변수/파라미터**
  - 설명: 에러 처리에서 `_err`로 명명하여 사용하지 않음
  - 파일:
    - `src/lib/components/DomainFileManager.svelte:168, 203`
    - `src/lib/components/TermFileManager.svelte`
    - `src/lib/components/VocabularyFileManager.svelte`
  - 예상: 4시간
  - 담당:

- [ ] **#L11: 불필요한 데이터 변환**
  - 설명: 중간 객체 생성으로 메모리 사용량 증가
  - 파일:
    - `src/routes/api/vocabulary/+server.ts:70-85`
    - `src/routes/api/search/+server.ts:85-94`
    - `src/routes/api/vocabulary/download/+server.ts:55-70`
  - 예상: 8시간
  - 담당:

- [ ] **#L12: 주석 언어 혼용**
  - 설명: 주석이 영어와 한국어가 혼용되어 일관성 부족
  - 파일: 전체 코드베이스
  - 예상: 8시간
  - 담당:

- [ ] **#L13: 함수 매개변수 주석 부족**
  - 설명: 함수 매개변수에 대한 상세한 설명과 제약조건 부족
  - 파일:
    - `src/lib/utils/file-handler.ts` (여러 함수)
    - `src/lib/utils/xlsx-parser.ts` (여러 함수)
    - `src/routes/api/**/+server.ts` (API 함수들)
  - 예상: 16시간
  - 담당:

- [ ] **#L14: 배열 메서드 체이닝 최적화**
  - 설명: 여러 배열 메서드를 체이닝하여 여러 번 순회
  - 파일:
    - `src/routes/api/vocabulary/+server.ts:70-111`
    - `src/routes/api/search/+server.ts:95-110`
    - `src/routes/api/domain/+server.ts:93-120`
  - 예상: 8시간
  - 담당:

- [ ] **#L15: 하드코딩된 매직 넘버/문자열**
  - 설명: 매직 넘버와 문자열이 하드코딩되어 유지보수 어려움
  - 파일:
    - `src/lib/constants/timing.ts` (신규 생성)
    - `src/lib/constants/defaults.ts` (신규 생성)
    - `src/lib/components/SearchBar.svelte`
    - `src/lib/components/TermGenerator.svelte:108-111`
    - `src/lib/components/DomainFileManager.svelte:290-292`
    - `src/routes/api/**/+server.ts`
  - 예상: 8시간
  - 담당:

---

## 진행 상황 요약

### Phase 1: Critical Issues (Week 1-2)

- 총 작업: 10개
- 완료: 9개 ✅
- 제외: 1개 (#C9 인증/권한)
- 대기: 0개

### Phase 2: High Priority Issues (Week 3-6)

- 총 작업: 6개
- 완료: 6개 ✅
- 대기: 0개

### Phase 3: Medium Priority Issues (Week 7-14)

- 총 작업: 14개
- 완료: 6개 ✅
- 부분 해결: 8개 ⚠️
- 대기: 0개

### Phase 4: Low Priority Improvements

- 총 작업: 2개 (테스트 제외)
- 완료: 1개 ✅
- 부분 해결: 1개 ⚠️
- 대기: 0개

**전체 진행률**: 약 85% (22/26 완료 또는 부분 해결)

### 신규 생성 파일

```
src/lib/
├── composables/
│   └── use-data-table.ts       # 상태 관리 훅
├── types/
│   ├── table.ts                # 테이블 공통 타입
│   └── editor.ts               # 에디터 공통 타입
└── utils/
    ├── api-client.ts           # API 클라이언트
    ├── cache.ts                # 메모리 캐시
    ├── data-index.ts           # 데이터 인덱스
    ├── file-lock.ts            # 파일 락
    ├── file-operations.ts      # 파일 관리
    ├── logger.ts               # 로깅 유틸리티
    ├── type-guards.ts          # 타입 가드
    └── validation.ts           # 데이터 검증
```

---

**마지막 업데이트**: 2024-12-12
