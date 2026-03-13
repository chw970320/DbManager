# 변경 이력

## 2026-03-13

### 요약

- 파일 관리 팝업의 공통 파일 매핑 설정이 `파일 목록`에서 분리되어 별도 `파일 매핑` 탭으로 이동했습니다.
- 도메인 포함 8종 파일 관리 화면 모두 같은 3탭 구조(`파일 목록 / 파일 매핑 / 파일 업로드`)를 사용합니다.

### 상세 변경

1. 파일 매핑 탭 분리

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
  - 기존 `파일 목록` 탭 안에 있던 매핑 설정을 별도 `파일 매핑` 탭으로 이동
  - 파일 생성/삭제 작업과 파일 연결 작업을 시각적으로 분리해 역할이 섞이지 않도록 정리
  - Vocabulary/Term의 저장 후 동기화 액션도 새 `파일 매핑` 탭에서 실행하도록 유지

2. 테스트/문서 동기화

- 대상:
  - `src/lib/components/DatabaseFileManager.test.ts`
  - `src/lib/components/DomainFileManager.test.ts`
  - `src/lib/components/AttributeFileManager.test.ts`
  - `src/lib/components/EntityFileManager.test.ts`
  - `src/lib/components/TableDefFileManager.test.ts`
  - `src/lib/components/ColumnDefFileManager.test.ts`
  - `docs/USER_GUIDE.md`
- 변경:
  - FileManager 테스트를 `파일 매핑` 탭 클릭 기준으로 갱신
  - 사용자 가이드에 파일 관리 팝업의 3탭 구조를 반영

## 2026-03-13

### 요약

- 도메인 browse 화면의 데이터타입 매핑 관리 진입점이 메인 카드에서 좌측 독립 플로팅 패널로 이동했습니다.
- `도메인 파일` 카드 안에 포함하지 않고 별도 sticky 카드로 분리해 전역 규칙 성격을 더 분명하게 표시합니다.

### 상세 변경

1. 도메인 전역 규칙 진입점 재배치

- 대상:
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/domain/browse/page.test.ts`
  - `docs/tests/DOMAIN_TEST_DESCRIPTION.md`
- 변경:
  - 전역 데이터타입 매핑 관리 버튼과 설명을 메인 본문 카드에서 좌측 독립 sidebar 패널로 이동
  - `도메인 파일` 선택 카드와 분리된 별도 sticky 카드로 렌더링되도록 `BrowsePageLayout`의 plain sidebar surface를 추가
  - browse 페이지 테스트와 도메인 테스트 문서에 독립 플로팅 패널 배치 기준 반영

## 2026-03-13

### 요약

- 파일 관리 팝업의 공통 파일 매핑 설정이 `표준 용어`와 `DB 설계` 그룹으로 나뉘어 표시됩니다.
- 8종 화면 어디서 열어도 같은 분류 기준으로 매핑 대상을 빠르게 찾을 수 있습니다.

### 상세 변경

1. 파일 매핑 UI 카테고리화

- 대상:
  - `src/lib/components/DbDesignFileMappingFields.svelte`
  - `src/lib/utils/db-design-file-mapping.ts`
- 변경:
  - 공통 파일 매핑 필드를 `표준 용어`, `DB 설계` 두 섹션으로 그룹화
  - 각 섹션에 설명, 항목 수, 카드형 셀렉트 스타일을 추가해 연결 범위를 즉시 파악할 수 있도록 정리
  - 현재 열어 둔 파일 유형을 제외한 나머지 매핑 항목만 그룹별로 표시

2. 테스트/문서 동기화

- 대상:
  - `src/lib/components/DbDesignFileMappingFields.test.ts`
  - `src/lib/components/DatabaseFileManager.test.ts`
  - `docs/USER_GUIDE.md`
- 변경:
  - 공통 매핑 필드의 그룹 렌더링과 실제 파일 관리 팝업 노출 여부를 테스트로 고정
  - 사용자 가이드에 파일 관리 팝업의 새 분류 기준을 반영

## 2026-03-13

### 요약

- 2단계 프로젝트 메뉴 구조에 맞춰 각 화면 상단에 breadcrumb가 추가되었습니다.
- breadcrumb의 상위 항목을 클릭하면 같은 그룹의 다른 메뉴로 바로 이동할 수 있습니다.

### 상세 변경

1. 공용 navigation/breadcrumb 구조 정리

- 대상:
  - `src/lib/utils/navigation.ts`
  - `src/routes/+layout.svelte`
  - `src/lib/components/Breadcrumb.svelte`
  - `src/lib/components/BrowsePageLayout.svelte`
- 변경:
  - 상단 2단계 메뉴 정의를 공용 navigation 유틸로 이동
  - 현재 경로 기준 breadcrumb 파생 로직 추가
  - `lv1` breadcrumb는 동료 `lv1` 그룹 목록, `lv2` breadcrumb는 현재 그룹의 동료 `lv2` 메뉴 목록을 각각 여는 UI로 정리
  - 상위 breadcrumb를 셀렉트박스 느낌보다 버튼형 칩 스타일로 조정해 구분자와 시각 충돌 완화

2. 프로젝트 메뉴 화면 breadcrumb 적용

- 대상:
  - `src/routes/browse/+page.svelte`
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/term/browse/+page.svelte`
  - `src/routes/database/browse/+page.svelte`
  - `src/routes/entity/browse/+page.svelte`
  - `src/routes/attribute/browse/+page.svelte`
  - `src/routes/table/browse/+page.svelte`
  - `src/routes/column/browse/+page.svelte`
  - `src/routes/erd/+page.svelte`
  - `src/routes/data-source/browse/+page.svelte`
  - `src/routes/quality-rule/browse/+page.svelte`
  - `src/routes/profiling/browse/+page.svelte`
  - `src/routes/snapshot/browse/+page.svelte`
- 변경:
  - browse/ERD 화면에서 현재 메뉴 그룹과 현재 페이지를 breadcrumb로 표시
  - `lv1`/`lv2` breadcrumb 각각에서 맞는 수준의 메뉴로 이동 가능하도록 연결

3. 테스트/문서 동기화

- 대상:
  - `src/lib/utils/navigation.test.ts`
  - `src/routes/data-source/browse/page.test.ts`
  - `docs/tests/COMMON_UTILS_TEST_DESCRIPTION.md`
  - `docs/tests/DATA_SOURCE_TEST_DESCRIPTION.md`
  - `docs/USER_GUIDE.md`
  - `docs/FRONTEND_UI_UX_GUIDE.md`
- 변경:
  - breadcrumb 파생 유틸리티와 `lv1`/`lv2` 레벨별 메뉴 이동 UI를 테스트로 고정
  - 사용자 가이드와 프론트엔드 가이드에 새 breadcrumb 이동 패턴 반영

## 2026-03-13

### 요약

- 검증 스크립트를 `lint`, `lint:all`, `format:check`, `validate`로 분리해 기본 게이트를 현실화했습니다.
- 최근 기능 추가 이후 어긋난 회귀 테스트와 ESLint 오류 패턴을 함께 정리했습니다.

### 상세 변경

1. 검증 스크립트 정리

- 대상:
  - `package.json`
  - `README.md`
  - `docs/CONVENTIONS.md`
- 변경:
  - `lint`를 `eslint . --quiet`로 변경해 경고 백로그와 분리된 오류 게이트로 재정의
  - `lint:all`, `format:check`, `validate` 스크립트 추가
  - 저장소 문서에 검증 명령 사용 기준 반영

2. 회귀 테스트/ESLint 오류 정리

- 대상:
  - `src/lib/components/DesignRelationPanel.test.ts`
  - `src/lib/components/Icon.svelte`
  - `src/lib/components/QualityRuleEditor.svelte`
  - `src/lib/components/Skeleton.svelte`
  - `src/lib/utils/debounce.ts`
  - `src/routes/browse/+page.svelte`
  - `src/routes/attribute/browse/+page.svelte`
  - `src/routes/column/browse/+page.svelte`
  - `src/routes/database/browse/+page.svelte`
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/entity/browse/+page.svelte`
  - `src/routes/profiling/browse/+page.svelte`
  - `src/routes/snapshot/browse/+page.svelte`
  - `src/routes/table/browse/+page.svelte`
  - `src/routes/term/browse/+page.svelte`
  - `vitest-setup.ts`
- 변경:
  - `DesignRelationPanel` 테스트를 현재 UI 문구 기준으로 수정
  - Svelte `{#each}` key 누락, `any` 사용, `no-unsafe-finally`, 불필요한 escape, 불필요한 가변 선언 등 실제 ESLint 오류 패턴 정리
  - 도메인 browse 페이지의 보조 landmark 마크업을 정리해 접근성 경고 제거

## 2026-03-13

### 요약

- 8종 설계 파일 번들을 통째로 저장/복원하는 `스냅샷` 메뉴가 추가되었습니다.
- 복원 시 공통 파일 매핑 번들도 함께 다시 적용되어 browse/ERD 흐름과 정합성이 유지됩니다.

### 상세 변경

1. 스냅샷 타입/저장소/API 추가

- 대상:
  - `src/lib/types/design-snapshot.ts`
  - `src/lib/registry/design-snapshot-registry.ts`
  - `src/routes/api/design-snapshots/+server.ts`
  - `src/routes/api/design-snapshots/restore/+server.ts`
  - `static/data/settings/design-snapshots.json`
- 변경:
  - 8종 파일 번들의 현재 JSON 상태를 스냅샷으로 저장하는 설정 모델과 레지스트리 추가
  - 스냅샷 생성 시 런타임 `mapping` 필드를 제거한 정규화 payload 저장
  - 스냅샷 복원 시 각 파일 데이터 저장과 공통 파일 매핑 번들 재적용, 캐시 무효화 수행

2. 스냅샷 화면/메뉴 추가

- 대상:
  - `src/routes/snapshot/browse/+page.svelte`
  - `src/routes/+layout.svelte`
- 변경:
  - 상단 네비게이션에 `스냅샷` 메뉴 추가
  - 번들 선택, 스냅샷 생성, 검색, 복원, 삭제 흐름을 한 화면에서 제공
  - 최근 복원 시각과 번들 요약 카드 표시

3. 테스트/문서 동기화

- 대상:
  - `src/lib/registry/design-snapshot-registry.test.ts`
  - `src/routes/api/design-snapshots/server.test.ts`
  - `src/routes/api/design-snapshots/restore/server.test.ts`
  - `src/routes/snapshot/browse/page.test.ts`
  - `src/lib/utils/test-data-reset.test.ts`
  - `src/lib/utils/test-data-reset.js`
  - `docs/tests/SNAPSHOT_TEST_DESCRIPTION.md`
  - `docs/tests/COMMON_UTILS_TEST_DESCRIPTION.md`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/USER_GUIDE.md`
  - `README.md`
- 변경:
  - 스냅샷 저장소, API, browse 화면 흐름을 테스트로 고정
  - 테스트 데이터 초기화 시 `design-snapshots.json`도 빈 기준 상태로 재생성하도록 보강
  - 사용자 문서와 API/모델 문서에 새 메뉴 및 복원 흐름 반영

## 2026-03-13

### 요약

- 컬럼 editor에 `표준 추천` 패널이 추가되었습니다.
- 저장 전에 term/domain 기준 추천값과 경고를 즉시 보고, 필요한 필드만 바로 적용할 수 있습니다.

### 상세 변경

1. 컬럼 표준 추천 타입/유틸리티/API 추가

- 대상:
  - `src/lib/types/column-standard-recommendation.ts`
  - `src/lib/utils/column-standard-recommendation.ts`
  - `src/routes/api/column/recommend-standard/+server.ts`
- 변경:
  - `columnEnglishName` 기준 단건 표준 추천 모델 추가
  - term/domain 매핑 결과를 `matchedTerm`, `matchedDomain`, `recommendedValues`, `changes`, `issues`로 구조화
  - 컬럼 파일 매핑을 따라 연결된 term/domain 파일을 해석하는 preview API 추가

2. 컬럼 editor 사전예방형 UX 추가

- 대상:
  - `src/lib/components/ColumnDefEditor.svelte`
- 변경:
  - 입력 중 `컬럼영문명` 기준 자동 추천 조회
  - 상태 배지, 연결된 용어/도메인 요약, 경고, 필드별 추천값 표시
  - `추천값 전체 적용` 및 필드별 `적용` 버튼 추가

3. 테스트/문서 동기화

- 대상:
  - `src/lib/utils/column-standard-recommendation.test.ts`
  - `src/routes/api/column/recommend-standard/server.test.ts`
  - `src/lib/components/ColumnDefEditor.test.ts`
  - `docs/tests/COLUMN_TEST_DESCRIPTION.md`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/USER_GUIDE.md`
  - `README.md`
- 변경:
  - 추천 계산 로직, preview API, editor 적용 버튼을 테스트로 고정
  - 사용자 문서와 API/런타임 모델 문서에 컬럼 표준 추천 흐름 반영

## 2026-03-12

### 요약

- 도메인/용어 editor에 `변경 영향도` 미리보기가 추가되었습니다.
- 저장 또는 삭제 전에 downstream 참조 수와 컬럼 표준화 파급을 즉시 확인할 수 있습니다.

### 상세 변경

1. 영향도 preview 타입/유틸리티/API 추가

- 대상:
  - `src/lib/types/change-impact.ts`
  - `src/lib/utils/change-impact-preview.ts`
  - `src/routes/api/domain/impact-preview/+server.ts`
  - `src/routes/api/term/impact-preview/+server.ts`
- 변경:
  - 용어 저장 전 컬럼 연결 수, 끊기는 연결, 새 연결 후보, 도메인 존재 여부 계산 추가
  - 도메인 저장/삭제 전 단어/용어/컬럼 참조 수와 삭제 영향 계산 추가
  - 기존 `checkEntryReferences`와 파일 매핑 해석을 재사용하는 preview API 추가

2. 도메인/용어 editor 영향도 패널 추가

- 대상:
  - `src/lib/components/DomainEditor.svelte`
  - `src/lib/components/TermEditor.svelte`
- 변경:
  - 용어 editor에서 입력값 변경 시 영향도 자동 재계산
  - 도메인 editor에서 현재 참조 수와 즉시 파급 여부 표시
  - 도메인 삭제 확인창에 참조 건수 요약 포함

3. 테스트/문서 동기화

- 대상:
  - `src/lib/utils/change-impact-preview.test.ts`
  - `src/routes/api/domain/impact-preview/server.test.ts`
  - `src/routes/api/term/impact-preview/server.test.ts`
  - `src/lib/components/DomainEditor.test.ts`
  - `src/lib/components/TermEditor.test.ts`
  - `docs/tests/DOMAIN_TEST_DESCRIPTION.md`
  - `docs/tests/TERM_TEST_DESCRIPTION.md`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/USER_GUIDE.md`
  - `README.md`
- 변경:
  - 영향도 계산 로직, preview API, editor 표시/삭제 안내 문구를 테스트로 고정
  - 사용자 문서와 저장 모델 문서에 영향도 미리보기 동작과 응답 필드 반영

## 2026-03-12

### 요약

- 프로파일링 결과에 즉시 적용되는 `품질 규칙` 메뉴와 API가 추가되었습니다.
- PostgreSQL 프로파일링 실행 결과에 규칙 평가 요약과 위반 목록이 함께 표시됩니다.

### 상세 변경

1. 품질 규칙 타입/저장소/평가 엔진 추가

- 대상:
  - `src/lib/types/data-quality-rule.ts`
  - `src/lib/registry/data-quality-rule-registry.ts`
  - `src/lib/utils/data-quality-rule-evaluator.ts`
  - `static/data/settings/quality-rules.json`
- 변경:
  - `static/data/settings/quality-rules.json`에 품질 규칙을 저장하는 레지스트리 추가
  - table 범위 `rowCount`, column 범위 `null/distinct/length` 메트릭 규칙 타입 추가
  - 와일드카드 패턴 기반 타깃 매칭과 `gte/lte/eq` 비교를 수행하는 평가 유틸리티 추가

2. 품질 규칙 API/화면 및 프로파일링 연동 추가

- 대상:
  - `src/routes/api/quality-rules/+server.ts`
  - `src/routes/quality-rule/browse/+page.svelte`
  - `src/lib/components/QualityRuleEditor.svelte`
  - `src/routes/api/data-sources/profile/run/+server.ts`
  - `src/routes/profiling/browse/+page.svelte`
  - `src/routes/+layout.svelte`
- 변경:
  - 품질 규칙 목록 조회, 생성, 수정, 삭제 API 추가
  - 상단 네비게이션에 `품질 규칙` 메뉴 추가
  - 화면에서 규칙 등록/수정/삭제와 요약 조회 제공
  - 프로파일링 실행 시 저장된 활성 규칙을 즉시 평가하고 결과 화면에 요약/위반 목록 표시

3. 테스트/문서 동기화

- 대상:
  - `src/lib/utils/data-quality-rule-evaluator.test.ts`
  - `src/routes/api/quality-rules/server.test.ts`
  - `src/routes/quality-rule/browse/page.test.ts`
  - `src/routes/api/data-sources/profile/run/server.test.ts`
  - `src/routes/profiling/browse/page.test.ts`
  - `docs/tests/QUALITY_RULE_TEST_DESCRIPTION.md`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/USER_GUIDE.md`
  - `README.md`
- 변경:
  - 규칙 평가 유틸리티, CRUD API, browse 화면, 프로파일링 연동 흐름을 테스트로 고정
  - 저장소 문서와 사용자 가이드에 새 메뉴, 저장 모델, 응답 필드 반영

## 2026-03-12

### 요약

- 저장된 PostgreSQL 데이터 소스를 재사용하는 `프로파일링` 메뉴와 API가 추가되었습니다.
- 사용자 테이블 목록 조회와 컬럼 단위 실데이터 프로파일링을 즉시 실행할 수 있습니다.

### 상세 변경

1. PostgreSQL 프로파일링 타입/유틸리티 추가

- 대상:
  - `src/lib/types/data-profiling.ts`
  - `src/lib/utils/data-source-profiling.ts`
  - `src/lib/utils/data-source-connection.ts`
- 변경:
  - 프로파일링 대상/결과 타입 추가
  - 저장된 PostgreSQL 연결을 재사용해 사용자 스키마/테이블을 조회하는 유틸리티 추가
  - 단일 테이블에 대해 `rowCount`, `nullCount/nullRatio`, `distinctCount/distinctRatio`, `minLength/maxLength`를 계산하는 로직 추가

2. 프로파일링 API/화면 추가

- 대상:
  - `src/routes/api/data-sources/profile/targets/+server.ts`
  - `src/routes/api/data-sources/profile/run/+server.ts`
  - `src/routes/profiling/browse/+page.svelte`
  - `src/routes/+layout.svelte`
  - `src/lib/components/Icon.svelte`
- 변경:
  - 저장된 데이터 소스 ID 기반 프로파일링 대상 조회 API 추가
  - 선택한 스키마/테이블 기준 프로파일링 실행 API 추가
  - 상단 네비게이션에 `프로파일링` 메뉴 추가
  - 화면에서 데이터 소스 선택, 스키마/테이블 필터링, 결과 확인 흐름 제공

3. 테스트/문서 동기화

- 대상:
  - `src/routes/api/data-sources/profile/targets/server.test.ts`
  - `src/routes/api/data-sources/profile/run/server.test.ts`
  - `src/routes/profiling/browse/page.test.ts`
  - `docs/tests/DATA_PROFILING_TEST_DESCRIPTION.md`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/USER_GUIDE.md`
  - `README.md`
- 변경:
  - 프로파일링 대상 조회/실행 API와 browse 화면 흐름을 테스트로 고정
  - 저장소 문서와 사용자 가이드에 새 메뉴 및 프로파일링 모델을 반영

## 2026-03-12

### 요약

- 내부 관리자용 PostgreSQL 데이터 소스 관리 기능이 추가되었습니다.
- 저장 가능한 연결 정의와 저장 전/저장 후 연결 테스트 흐름이 새 메뉴로 분리되었습니다.

### 상세 변경

1. PostgreSQL 데이터 소스 저장소/연결 테스트 추가

- 대상:
  - `src/lib/types/data-source.ts`
  - `src/lib/registry/data-source-registry.ts`
  - `src/lib/utils/data-source-connection.ts`
  - `static/data/settings/data-sources.json`(런타임 생성)
- 변경:
  - `static/data/settings/data-sources.json`에 PostgreSQL 연결 정의를 저장하는 레지스트리 추가
  - 요약 응답에서는 비밀번호 원문을 숨기고 `hasPassword`만 노출
  - 수정 시 비밀번호를 비워두면 기존 저장값을 유지
  - `pg` 기반 연결 테스트 유틸리티 추가

2. 데이터 소스 API/화면 추가

- 대상:
  - `src/routes/api/data-sources/+server.ts`
  - `src/routes/api/data-sources/test/+server.ts`
  - `src/lib/components/DataSourceEditor.svelte`
  - `src/routes/data-source/browse/+page.svelte`
  - `src/routes/+layout.svelte`
- 변경:
  - 데이터 소스 목록 조회, 생성, 수정, 삭제 API 추가
  - 저장된 연결 ID 기반 테스트와 저장 전 직접 테스트 API 추가
  - 편집 중 비밀번호를 비워둔 상태에서도 저장된 비밀번호를 재사용해 직접 테스트 가능
  - 상단 네비게이션에 `데이터 소스` 메뉴 추가

3. 테스트/문서 동기화

- 대상:
  - `src/lib/registry/data-source-registry.test.ts`
  - `src/routes/api/data-sources/server.test.ts`
  - `src/routes/api/data-sources/test/server.test.ts`
  - `src/routes/data-source/browse/page.test.ts`
  - `docs/tests/DATA_SOURCE_TEST_DESCRIPTION.md`
  - `docs/specs/api-reference.md`
  - `docs/specs/data-model.md`
  - `docs/USER_GUIDE.md`
  - `README.md`
- 변경:
  - PostgreSQL 데이터 소스 CRUD, 연결 테스트, 편집기 흐름을 테스트로 고정
  - 저장소 문서와 사용자 가이드에 새 메뉴와 API/저장 모델 반영

## 2026-03-12

### 요약

- 도메인 browse 화면에서 데이터타입 매핑 버튼이 현재 파일 기준 액션 줄에서 분리되었습니다.
- 데이터타입 매핑은 "전체 파일 공통 규칙" 영역으로 이동해 전역 설정임을 명확히 표시합니다.

### 상세 변경

1. 도메인 browse 전역 규칙 배치 정리

- 대상:
  - `src/routes/domain/browse/+page.svelte`
  - `src/lib/components/DomainDataTypeMappingModal.svelte`
  - `src/routes/domain/browse/page.test.ts`
  - `src/lib/components/DomainDataTypeMappingModal.test.ts`
  - `docs/tests/DOMAIN_TEST_DESCRIPTION.md`
- 변경:
  - `새 도메인 추가`, `유효성 검사`, `XLSX 다운로드`, `새로고침`만 현재 파일 작업 그룹에 남기고 데이터타입 매핑 버튼은 별도 섹션으로 이동
  - 전역 규칙 섹션과 매핑 모달 설명에 "현재 선택 파일과 무관하게 모든 도메인 파일에 공통 적용"된다는 범위를 명시
  - browse 페이지 테스트로 파일 작업 그룹과 전역 규칙 섹션의 분리를 고정

## 2026-03-12

### 요약

- 테스트용 전체 데이터 초기화 스크립트가 추가되었습니다.
- 단어집/도메인/용어집/5개 정의서 JSON과 8종 공통 파일 매핑, 매핑 레지스트리를 기본 상태로 되돌릴 수 있습니다.

### 상세 변경

1. 테스트 데이터 초기화 스크립트 추가

- 대상:
  - `src/lib/utils/test-data-reset.js`
  - `scripts/reset-test-data.mjs`
  - `package.json`
  - `README.md`
- 변경:
  - 8개 데이터 디렉터리의 `.json` 파일을 모두 정리한 뒤 시스템 기본 파일만 빈 데이터로 재생성
  - `static/data/registry.json`을 기본 매핑 관계 기준으로 재생성
  - `static/data/settings/shared-file-mappings.json`을 기본 8종 파일 번들로 재생성
  - `static/data/settings/domain-data-type-mappings.json` 같은 비대상 설정 파일은 유지

2. 회귀 테스트 보강

- 대상:
  - `src/lib/utils/test-data-reset.test.ts`
  - `docs/tests/COMMON_UTILS_TEST_DESCRIPTION.md`
- 변경:
  - 사용자 JSON 삭제, 기본 파일 재생성, 레지스트리 초기화, 공통 파일 매핑 초기화, 비대상 설정 유지 동작을 임시 디렉터리 기반으로 검증

## 2026-03-12

### 요약

- 단어집/도메인/용어/DB/엔터티/속성/테이블/컬럼 8종 파일 매핑 정본이 `static/data/settings/shared-file-mappings.json`으로 분리되었습니다.
- 어느 파일 관리 화면에서 저장하더라도 같은 8종 연결 상태가 공유되며, DB 연관 상태 상세/정렬 화면도 동일한 파일 조합을 사용합니다.

### 상세 변경

1. 8종 공통 파일 매핑 번들 도입

- 대상:
  - `src/lib/registry/shared-file-mapping-registry.ts`
  - `src/lib/utils/db-design-file-mapping.ts`
  - `src/lib/registry/db-design-file-mapping.ts`
  - `src/lib/types/shared-file-mapping.ts`
  - `src/lib/types/base.ts`
  - `src/lib/types/vocabulary.ts`
  - `src/lib/types/domain.ts`
  - `src/lib/types/term.ts`
  - `src/lib/types/database-design.ts`
  - `src/lib/registry/data-registry.ts`
- 변경:
  - `static/data/settings/shared-file-mappings.json`에 8종 파일 조합 전체를 저장하는 공통 번들 레지스트리 추가
  - `loadData(...)`가 공통 매핑 파일을 기준으로 `mapping`을 런타임 주입하고, 개별 데이터 JSON 저장 시에는 `mapping`을 정본으로 남기지 않도록 정리
  - 레거시 부분 매핑만 남아 있어도 기존 `mapping` 필드, 직접 관계 레지스트리, 기본 파일명을 조합해 전체 8종 번들을 복원하도록 정리
  - 파일 이름 변경/삭제 시 공통 매핑 파일도 함께 동기화되도록 정리

2. 파일 매핑 API/화면 통합

- 대상:
  - `src/routes/api/vocabulary/files/mapping/+server.ts`
  - `src/routes/api/domain/files/mapping/+server.ts`
  - `src/routes/api/term/files/mapping/+server.ts`
  - `src/routes/api/database/files/mapping/+server.ts`
  - `src/routes/api/entity/files/mapping/+server.ts`
  - `src/routes/api/attribute/files/mapping/+server.ts`
  - `src/routes/api/table/files/mapping/+server.ts`
  - `src/routes/api/column/files/mapping/+server.ts`
  - `src/lib/components/DbDesignFileMappingFields.svelte`
  - `src/lib/components/VocabularyFileManager.svelte`
  - `src/lib/components/DomainFileManager.svelte`
  - `src/lib/components/TermFileManager.svelte`
  - `src/lib/components/DatabaseFileManager.svelte`
  - `src/lib/components/EntityFileManager.svelte`
  - `src/lib/components/AttributeFileManager.svelte`
  - `src/lib/components/TableDefFileManager.svelte`
  - `src/lib/components/ColumnDefFileManager.svelte`
- 변경:
  - 각 `/files/mapping` GET API가 화면 고유 일부 관계가 아니라 공통 8종 연결 상태를 반환하도록 정리
  - 각 `/files/mapping` PUT API가 저장 시 `shared-file-mappings.json`을 정본으로 갱신하고, 직접 레지스트리 관계는 파생 정보로 best-effort 동기화
  - 8개 파일 관리 모달 어디서든 나머지 7개 파일을 모두 선택 가능하도록 UI 통일

3. DB 연관 상태/정렬 화면 매핑 컨텍스트 확장

- 대상:
  - `src/lib/components/DesignRelationPanel.svelte`
  - `src/routes/database/browse/+page.svelte`
  - `src/routes/entity/browse/+page.svelte`
  - `src/routes/attribute/browse/+page.svelte`
  - `src/routes/table/browse/+page.svelte`
  - `src/routes/column/browse/+page.svelte`
- 변경:
  - DB 5개 browse 화면이 `vocabulary/domain/term`까지 포함한 동일한 8종 파일 번들을 연관 상태 패널에 전달
  - 연관 상태 상세 및 정렬 동기화 호출이 같은 파일 조합을 공유하도록 정리

4. 회귀 테스트 보강

- 대상:
  - `src/lib/registry/db-design-file-mapping.test.ts`
  - `src/routes/api/vocabulary/files/mapping/server.test.ts`
  - `src/routes/api/domain/files/mapping/server.test.ts`
  - `src/routes/api/term/files/mapping/server.test.ts`
  - `src/routes/api/database/files/mapping/server.test.ts`
  - `src/routes/api/entity/files/mapping/server.test.ts`
  - `src/routes/api/attribute/files/mapping/server.test.ts`
  - `src/routes/api/table/files/mapping/server.test.ts`
  - `src/routes/api/column/files/mapping/server.test.ts`
  - `src/lib/components/VocabularyFileManager.test.ts`
  - `src/lib/components/DomainFileManager.test.ts`
  - `src/lib/components/TermFileManager.test.ts`
  - `src/lib/components/DatabaseFileManager.test.ts`
  - `src/lib/components/EntityFileManager.test.ts`
  - `src/lib/components/AttributeFileManager.test.ts`
  - `src/lib/components/TableDefFileManager.test.ts`
  - `src/lib/components/ColumnDefFileManager.test.ts`
- 변경:
  - 레거시 부분 매핑만 존재해도 8종 공통 번들을 해석할 수 있는지 검증
  - 각 파일 매핑 API가 공통 번들을 반환/저장하는지 검증
  - 8개 파일 관리 화면이 동일한 매핑 UI와 저장 흐름을 사용하는지 검증

## 2026-03-12

### 요약

- 도메인/용어 browse 페이지가 탭 이동 후에도 마지막으로 선택한 파일을 유지하도록 복원 로직이 정리되었습니다.
- 저장된 선택 파일이 목록에 남아 있으면 첫 번째 파일(`bksp.json` 등)로 덮어쓰지 않도록 공통 선택 규칙을 다시 적용했습니다.

### 상세 변경

1. 도메인/용어 현재 파일 복원 정리

- 대상:
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/term/browse/+page.svelte`
- 변경:
  - 페이지 초기 `selectedFilename`을 각 스토어의 현재 값으로 시작
  - 마운트 시 파일 목록과 저장된 선택 파일을 reconcile 한 뒤에만 폴백
  - 스토어 구독을 추가해 재진입 시 마지막 선택 파일이 유지되도록 정리

2. 파일 선택 복원 회귀 테스트 보강

- 대상:
  - `src/lib/utils/file-selection.test.ts`
  - `docs/tests/COMMON_UTILS_TEST_DESCRIPTION.md`
- 변경:
  - 저장된 선택 파일이 있을 때 `bksp.json`보다 우선 복원되는 케이스 추가
  - 저장된 파일이 사라졌을 때 현재 목록 기준으로 폴백하는 케이스 추가

## 2026-03-12

### 요약

- 내부에서 더 이상 쓰지 않는 스토어 하위 호환 래퍼를 제거하고 `unified-store`로 정리했습니다.
- `VocabularyData.mappedDomainFile` 호환 필드를 제거하고 단어집 매핑은 `mapping.domain`만 사용하도록 정리했습니다.
- 미사용 단일 정렬 테이블 타입/헬퍼와 구 시스템 파일 설정 래퍼를 제거했습니다.

### 상세 변경

1. 스토어 호환 래퍼 제거

- 대상:
  - `src/lib/stores/database-design-store.ts`
  - `src/lib/stores/domain-store.ts`
  - `src/lib/stores/term-store.ts`
  - `src/lib/stores/vocabulary-store.ts`
  - 관련 browse 페이지 / FileManager / TermEditor
- 변경:
  - 내부 import를 `src/lib/stores/unified-store.ts` 기준으로 교체
  - 단어집-도메인 선택 동기화는 `vocabularyDataStore`, `domainDataStore` 분리 사용으로 정리

2. 단어집 레거시 매핑 필드 제거

- 대상:
  - `src/lib/types/vocabulary.ts`
  - `src/lib/utils/type-guards.ts`
  - `src/routes/api/vocabulary/files/mapping/+server.ts`
  - `src/routes/api/vocabulary/sync-domain/+server.ts`
  - `docs/specs/data-model.md`
- 변경:
  - `VocabularyData.mappedDomainFile` 정의 제거
  - 저장/동기화 로직과 문서를 `mapping.domain` 기준으로 정리

3. 미사용 호환 유틸리티 제거

- 대상:
  - `src/lib/utils/settings.ts`
  - `src/lib/components/VocabularyTable.svelte`
  - `src/lib/components/DomainTable.svelte`
  - `src/lib/components/TermTable.svelte`
  - `src/lib/composables/use-data-table.ts`
  - `src/lib/types/table.ts`
- 변경:
  - 더 이상 호출되지 않는 `getShowSystemFiles`, `setShowSystemFiles` 제거
  - 현재 browse 흐름에서 사용되지 않는 단일 정렬 props/type/helper 제거

## 2026-03-11

### 요약

- 파일 업로드 관리 모달의 대상 파일 select 기본값이 browse 페이지의 현재 선택 파일과 일치하도록 정렬되었습니다.
- 첫 번째 파일로 고정되던 기본 선택값을 공통 유틸리티 기반으로 정리해 잘못된 덮어쓰기 위험을 줄였습니다.
- 도메인 표준명 생성이 데이터타입 첫 글자 대신 관리형 매핑약어 기반으로 바뀌었습니다.
- 도메인 목록 우상단에 데이터타입 매핑 관리 팝업이 추가되었고, 매핑 변경 시 관련 용어/컬럼 참조도 함께 동기화됩니다.
- 저장소 작업 규칙에 커밋 메시지 한글 재확인과 feature branch의 `main` 병합 준비 절차가 추가되었습니다.
- 저장소 기본 작업 브랜치가 `main`으로 정리되었고, 예외 브랜치 정리용 스크립트가 추가되었습니다.

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

6. 저장소 작업 가이드 보강

- 대상:
  - `AGENTS.md`
  - `docs/CONVENTIONS.md`
  - `README.md`
- 변경:
  - 커밋 직전 한글 메시지 규칙 재확인 절차 추가
  - 기능 브랜치 작업 종료 전 최신 `main` 반영, 충돌 해결, 검증 재실행으로 병합 가능 상태를 확보하도록 명시

7. 기본 브랜치 운영 방식 및 브랜치 정리 스크립트 추가

- 대상:
  - `AGENTS.md`
  - `docs/CONVENTIONS.md`
  - `README.md`
  - `package.json`
  - `scripts/finalize-branch.ps1`
- 변경:
  - 기본 작업 브랜치를 `main`으로 명시하고, 자동화 도구가 임의로 기능 브랜치를 만들지 않도록 규칙화
  - 예외적으로 사용한 브랜치를 `main` 기준 반영, 검증, fast-forward 병합, 로컬/원격 삭제까지 정리하는 PowerShell 스크립트 추가

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
