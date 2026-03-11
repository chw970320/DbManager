# 변경 이력

## 2026-03-11

### 요약

- 파일 업로드 관리 모달의 대상 파일 select 기본값이 browse 페이지의 현재 선택 파일과 일치하도록 정렬되었습니다.
- 첫 번째 파일로 고정되던 기본 선택값을 공통 유틸리티 기반으로 정리해 잘못된 덮어쓰기 위험을 줄였습니다.
- 도메인 표준명 생성이 데이터타입 첫 글자 대신 관리형 매핑약어 기반으로 바뀌었습니다.
- 도메인 목록 우상단에 데이터타입 매핑 관리 팝업이 추가되었고, 매핑 변경 시 관련 용어/컬럼 참조도 함께 동기화됩니다.

### 상세 변경

1. 업로드 대상 파일 기본 선택 동기화

- 대상:
  - `src/lib/components/VocabularyFileManager.svelte`
  - `src/lib/components/DomainFileManager.svelte`
  - `src/lib/components/TermFileManager.svelte`
  - `src/lib/components/DatabaseFileManager.svelte`
  - `src/lib/components/EntityFileManager.svelte`
  - `src/lib/components/AttributeFileManager.svelte`
  - `src/lib/components/TableDefFileManager.svelte`
  - `src/lib/components/ColumnDefFileManager.svelte`
- 변경:
  - `currentFilename` prop을 받아 업로드 대상 select 기본값을 바깥 현재 파일과 맞춤
  - 파일 목록 재로딩 시에도 현재 파일 우선 선택 규칙을 유지

2. 공통 선택 로직 유틸리티 추가

- 대상:
  - `src/lib/utils/file-selection.ts`
  - `src/lib/utils/file-selection.test.ts`
- 변경:
  - 선호 파일, 현재 선택, 첫 번째 파일, fallback 순서를 공통 함수로 정리
  - 업로드 대상 파일 기본 선택 회귀를 유틸리티 테스트로 고정

3. Browse 페이지 FileManager 연결 정리

- 대상:
  - `src/routes/browse/+page.svelte`
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/term/browse/+page.svelte`
  - `src/routes/database/browse/+page.svelte`
  - `src/routes/entity/browse/+page.svelte`
  - `src/routes/attribute/browse/+page.svelte`
  - `src/routes/table/browse/+page.svelte`
  - `src/routes/column/browse/+page.svelte`
- 변경:
  - 각 browse 페이지가 현재 선택 파일명을 FileManager 모달에 명시적으로 전달
  - 업로드 탭 기본 선택과 좌측/상단 현재 파일 표시가 동일 기준으로 동작

4. 도메인 데이터타입 매핑 관리 추가

- 대상:
  - `src/lib/utils/domain-name.ts`
  - `src/lib/registry/domain-data-type-mapping-registry.ts`
  - `src/routes/api/domain/type-mappings/+server.ts`
  - `src/lib/components/DomainDataTypeMappingModal.svelte`
  - `src/routes/domain/browse/+page.svelte`
  - `src/lib/components/DomainEditor.svelte`
  - `static/data/settings/domain-data-type-mappings.json`
- 변경:
  - 도메인명 생성 규칙을 `도메인분류명 + 데이터타입 매핑약어 + 데이터길이 + 데이터소수점길이`로 변경
  - 기본 데이터타입 약어 매핑 세트를 설정 파일로 분리
  - 도메인 목록 우상단에서 매핑 목록 조회/등록/수정/삭제 가능한 팝업 추가
  - 매핑 변경 후 도메인명 재계산과 함께 용어/컬럼의 `domainName` 참조 자동 동기화

5. 도메인 검증/업로드/샘플 데이터 동기화

- 대상:
  - `src/routes/api/domain/+server.ts`
  - `src/routes/api/domain/validate/+server.ts`
  - `src/routes/api/domain/validate-all/+server.ts`
  - `src/routes/api/domain/upload/+server.ts`
  - `static/data/domain/*.json`
  - `static/data/term/*.json`
- 변경:
  - 도메인 생성/검증/일괄검사/XLSX 업로드가 공통 데이터타입 매핑 기준으로 표준 도메인명을 생성
  - 샘플 도메인/용어 데이터도 새 생성 규칙에 맞춰 정리

## 2026-02-16

### 요약

- 프론트엔드 디자인 시스템 정비 및 공통 컴포넌트 기반으로 UI가 표준화되었습니다.
- 네이티브 `alert/confirm` 의존도를 제거하고 전역 `Toast/ConfirmDialog` 패턴으로 통합했습니다.
- 프론트엔드 검증(`pnpm check`, `pnpm vitest run`)이 모두 통과했습니다.

### 상세 변경

1. 디자인 시스템/토큰 정비

- 대상: `tailwind.config.js`, `src/app.css`
- 변경:
  - 시맨틱 색상 토큰(`brand`, `surface`, `content`, `border`, `status`) 확장
  - 버튼/배지/입력 등 공통 클래스 정리

2. 공통 컴포넌트 추가 및 페이지 재사용 구조 강화

- 신규 컴포넌트:
  - `src/lib/components/Icon.svelte`
  - `src/lib/components/Toast.svelte`
  - `src/lib/components/ConfirmDialog.svelte`
  - `src/lib/components/ValidationPanelShell.svelte`
  - `src/lib/components/FormField.svelte`
  - `src/lib/components/EmptyState.svelte`
  - `src/lib/components/Skeleton.svelte`
  - `src/lib/components/Breadcrumb.svelte`
  - `src/lib/components/BrowsePageLayout.svelte`
  - `src/lib/components/ActionBar.svelte`

3. 사용자 상호작용 패턴 표준화

- 대상:
  - `src/lib/stores/toast-store.ts`
  - `src/lib/stores/confirm-store.ts`
  - 다수 Editor/FileManager/ERD/Term 화면
- 변경:
  - `showConfirm(...)` 기반 삭제/파괴 작업 확인 패턴 적용
  - `addToast(...)` 기반 성공/실패 피드백 통일
  - `src/routes/+layout.svelte`에서 `Toast`, `ConfirmDialog` 전역 마운트

4. 검증/테스트 정합성 보강

- 대상:
  - `src/lib/components/Breadcrumb.svelte`
  - `src/lib/components/VocabularyEditor.test.ts`
  - `src/lib/components/DomainEditor.test.ts`
  - `src/lib/components/EntityEditor.test.ts`
  - `src/lib/components/ERDViewer.test.ts`
- 변경:
  - Svelte 문법 오류(`{@const}` 배치) 수정
  - Confirm/Toast 스토어 기반 테스트로 전환

## 2026-02-13

### 요약

- 매핑/참조 로직이 `mapping-registry` 중심으로 통합되었습니다.
- 다중 파일 매핑 해석이 레지스트리 우선 구조로 정리되었습니다.
- 일부 API가 `file-handler` 기반에서 `data-registry`/`cache-registry` 기반으로 전환되었습니다.

### 상세 변경

1. 매핑 해석 3단계 폴백 도입

- 대상: `src/lib/registry/mapping-registry.ts`
- 신규 함수: `resolveRelatedFilenames`, `getKnownRelatedTypes`
- 우선순위:
  - 1순위: `registry.json` 매핑
  - 2순위: 각 파일의 `mapping` 필드
  - 3순위: `DEFAULT_FILENAMES`

2. 엔트리 레벨 참조 검사 통합

- 대상: `src/lib/registry/mapping-registry.ts`
- 신규 함수: `checkEntryReferences(type, entry, filename?)`
- 적용:
  - `vocabulary` 삭제 시 `term` 참조 검사
  - `domain` 삭제 시 `vocabulary`, `term` 참조 검사
- 기존 함수:
  - `checkVocabularyReferences` / `checkDomainReferences`는 deprecated 처리

3. 매핑 API 듀얼 라이트 적용

- 대상:
  - `src/routes/api/term/files/mapping/+server.ts`
  - `src/routes/api/vocabulary/files/mapping/+server.ts`
- 동작:
  - 파일 내 `mapping` 필드 저장 (하위 호환)
  - 레지스트리 매핑 CRUD 반영 (best-effort)
  - 레지스트리 갱신 실패 시 파일 저장은 유지

4. 동기화/검증 API의 레지스트리 기반 전환

- 대상:
  - `src/routes/api/term/sync/+server.ts`
  - `src/routes/api/term/validate/+server.ts`
  - `src/routes/api/term/validate-all/+server.ts`
  - `src/routes/api/vocabulary/sync-domain/+server.ts`
  - `src/routes/api/column/sync-term/+server.ts`
- 변경:
  - `loadData` / `saveData` 사용
  - 관련 파일명은 `resolveRelatedFilenames`로 해석

5. ERD 생성 API 파일 탐색 전환

- 대상: `src/routes/api/erd/generate/+server.ts`
- 변경:
  - 타입별 파일 탐색을 `listFiles(type)`로 일원화
  - 단어집 캐시 접근을 `getCachedData`로 통합

### 호환성 메모

- 기존 파일 포맷(`mapping` 필드)은 유지됩니다.
- `VocabularyData.mappedDomainFile`은 deprecated이며 제거 방향입니다.
