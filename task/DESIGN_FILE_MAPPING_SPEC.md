# 5개 DB 설계 정의서 파일 매핑 기능 TO-DO

> 작성일: 2026-02-15  
> 상태: TODO 관리 문서  
> 기준: 기존 `DESIGN_FILE_MAPPING_SPEC.md` 초안 검토본

---

## 0. 목표/범위 확인

- [x] 목표 확정: 5개 정의서(`database`, `entity`, `attribute`, `table`, `column`)에 파일 매핑 기능 추가
- [x] 목표 확정: DesignRelationPanel 검증/보정 시 사용자 지정 파일 조합이 반영되도록 개선
- [x] 범위 포함: 5개 `files/mapping` API (GET/PUT)
- [x] 범위 포함: 5개 FileManager 매핑 UI
- [x] 범위 포함: DesignRelationPanel 매핑 파라미터 전달
- [x] 범위 제외: `mapping-registry.ts` 구조 변경
- [x] 범위 제외: `data-registry.ts` 구조 변경

---

## 1. 사전 정합성 체크

- [x] `DEFAULT_MAPPING_RELATIONS` 기준 매핑 대상 검토 완료
- [x] FileManager별 매핑 셀렉터 대상 확정
- [x] PUT 필수 필드(타입별) 검증 규칙 확정
- [x] 듀얼 라이트 정책 확정: 파일 저장 우선 + 레지스트리 best-effort

---

## 2. API 구현 TO-DO (우선순위 높음)

### 2.1 공통 구현 항목

- [x] 공통 GET 흐름 구현
  - [x] `filename` 해석 (기본값 `{type}.json`)
  - [x] `loadData(type, filename)` 로드
  - [x] `data.mapping` 기반 `fileMappingOverride` 구성
  - [x] `resolveRelatedFilenames(type, filename, fileMappingOverride)` 호출
  - [x] `mapping` 응답 반환
- [x] 공통 PUT 흐름 구현
  - [x] body에서 `filename`, `mapping` 추출/검증
  - [x] 파일 저장(`loadData` -> `mapping` 갱신 -> `saveData`)
  - [x] 레지스트리 듀얼 라이트(`getMappingsFor`/`updateMapping`/`addMapping`)
  - [x] 레지스트리 실패 시 warning 로그만 남기고 성공 응답 유지
- [x] 공통 에러 포맷 통일 (400/500)

### 2.2 라우트별 구현

- [x] `src/routes/api/database/files/mapping/+server.ts`
  - [x] GET: `entity`, `table` 반환
  - [x] PUT 필수 필드: `entity`, `table`
- [x] `src/routes/api/entity/files/mapping/+server.ts`
  - [x] GET: `database`, `attribute` 반환
  - [x] PUT 필수 필드: `database`, `attribute`
- [x] `src/routes/api/attribute/files/mapping/+server.ts`
  - [x] GET: `entity`, `column` 반환
  - [x] PUT 필수 필드: `entity`, `column`
- [x] `src/routes/api/table/files/mapping/+server.ts`
  - [x] GET: `database`, `column`, `entity` 반환
  - [x] PUT 필수 필드: `database`, `column`, `entity`
- [x] `src/routes/api/column/files/mapping/+server.ts`
  - [x] GET: `table`, `term`, `domain` 반환
  - [x] PUT 필수 필드: `table`, `term`, `domain`

### 2.3 API 완료 기준

- [x] 5개 API 모두 GET/PUT 동작 확인
- [x] `GET -> PUT -> GET` 왕복 시 매핑 값 보존 확인
- [x] 레지스트리 실패 유도 시 파일 저장은 성공하는지 확인

---

## 3. FileManager UI 구현 TO-DO (우선순위 중간)

### 3.1 공통 UI 항목

- [x] 파일 매핑 섹션 추가 (files 탭 상단)
- [x] 매핑 대상 파일 목록 상태 추가
- [x] 매핑 로드/저장 상태 추가 (`isMappingLoading`, `currentMappingFiles`)
- [x] 함수 추가
  - [x] `load[TargetType]Files()`
  - [x] `loadMappingInfo(filename)`
  - [x] `saveMappingInfo()`
- [x] 라이프사이클 처리
  - [x] `onMount` 시 목록+매핑 로드
  - [x] 선택 파일 변경 시 매핑 재로드
  - [x] 파일 생성/삭제/이름변경 후 목록 갱신

### 3.2 컴포넌트별 구현

- [x] `src/lib/components/DatabaseFileManager.svelte`
  - [x] 셀렉터: `entity`, `table`
- [x] `src/lib/components/EntityFileManager.svelte`
  - [x] 셀렉터: `database`, `attribute`
- [x] `src/lib/components/AttributeFileManager.svelte`
  - [x] 셀렉터: `entity`, `column`
- [x] `src/lib/components/TableDefFileManager.svelte`
  - [x] 셀렉터: `database`, `column`, `entity`
- [x] `src/lib/components/ColumnDefFileManager.svelte`
  - [x] 셀렉터: `table`, `term`, `domain`

### 3.3 UI 완료 기준

- [x] UI에서 매핑 선택 후 저장 가능
- [x] 저장 성공 시 실제 파일 `mapping` 필드 반영 확인
- [x] 파일 전환 시 매핑 값이 올바르게 따라오는지 확인

---

## 4. DesignRelationPanel 연동 TO-DO (우선순위 중간~낮음)

- [x] `src/lib/components/DesignRelationPanel.svelte` props 확장
  - [x] `fileMapping?: Partial<Record<DefinitionType, string>>` 추가
- [x] `buildFileParams()` 확장
  - [x] 현재 파일 파라미터 유지
  - [x] 전달된 `fileMapping`의 다른 타입 파일 파라미터 추가
- [x] 5개 FileManager에서 DesignRelationPanel에 `fileMapping` 전달
- [x] 기존 동작 호환성 확인 (`fileMapping` 미전달 시 현재 로직 유지)

### 4.1 완료 기준

- [x] 사용자 정의 파일명이 `/api/erd/relations`, `/api/erd/relations/sync`, `/api/validation/report` 호출에 반영
- [x] 패널 정합성 요약이 실제 매핑 파일 조합 기준으로 계산됨

---

## 5. 데이터 스키마 반영 TO-DO

- [x] 5개 정의서 JSON 최상위에 `mapping` 필드 저장 가능 상태 확인
- [x] 기존 파일(`mapping` 없음)과 호환되도록 optional 처리
- [x] 타입 전략 결정
  - [x] 현행처럼 런타임 동적 필드 사용
  - [x] 또는 각 `*Data` 타입에 optional `mapping` 추가

---

## 6. 테스트 TO-DO

### 6.1 API 테스트

- [x] GET 기본 파일명 동작
- [x] GET 사용자 파일명 동작
- [x] PUT 정상 저장 (파일 + 레지스트리)
- [x] PUT `filename` 누락 시 400
- [x] PUT `mapping` 누락/필수필드 누락 시 400
- [x] 레지스트리 실패 시 파일 저장 성공 + warning 로그
- [x] `GET -> PUT -> GET` 회귀 테스트

### 6.2 UI 테스트

- [x] 매핑 셀렉터 렌더링/옵션 로딩
- [x] 매핑 저장 API 호출
- [x] 파일 전환 시 매핑 재로딩
- [x] 파일 생성 후 셀렉터 옵션 갱신

### 6.3 DesignRelationPanel 통합 테스트

- [x] `fileMapping` 미전달 시 기존 동작 유지
- [x] `fileMapping` 전달 시 전체 파일 파라미터 포함
- [x] 매핑 변경 후 재조회/요약 갱신

---

## 7. 구현 순서 체크리스트

- [x] Phase 1: API 5개 라우트 구현
- [x] Phase 2: FileManager 5개 UI 매핑 섹션 구현
- [x] Phase 3: DesignRelationPanel 연동
- [x] Phase 4: 테스트 보강 및 회귀 확인
- [x] Phase 5: 문서/운영 가이드 업데이트

---

## 8. 최종 완료 정의 (Definition of Done)

- [x] 5개 `files/mapping` API 배포 가능 상태
- [x] 5개 FileManager에서 매핑 설정/저장 가능
- [x] DesignRelationPanel이 매핑된 파일 조합으로 정합성/보정 실행
- [x] 자동 테스트 통과 + 수동 시나리오 검증 완료
- [x] 기존 기본 파일명 흐름 회귀 없음

