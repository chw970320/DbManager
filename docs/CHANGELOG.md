# 변경 이력

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
