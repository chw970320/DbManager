# 5개 정의서 관계 동기화 충돌 정책

최종 수정: 2026-02-14

## 목적
- `GET/POST /api/erd/relations/sync`(관계 동기화)와 `GET/POST /api/column/sync-term`(컬럼-용어-도메인 동기화)를 함께 운영할 때 필드 충돌을 방지한다.
- `단어집/도메인/용어 + 5개 정의서` 총 8개 모델의 필드 소유권과 키 규칙을 고정한다.

## 필드 소유권 (Source of Truth)

### 0) 8개 모델 소유권 매트릭스
| 모델 | 기준 입력(수동/업로드) | 동기화로 보정되는 필드 | 보정 API |
|------|------------------------|------------------------|---------|
| `VocabularyEntry` | `standardName`, `abbreviation`, `domainCategory` | `domainGroup`, `isDomainCategoryMapped` | `/api/vocabulary/sync-domain` |
| `DomainEntry` | `standardDomainName`, `domainCategory`, `domainGroup`, `physicalDataType`, `dataLength`, `decimalPlaces` | - | - |
| `TermEntry` | `termName`, `columnName`, `domainName` | `isMappedTerm`, `isMappedColumn`, `isMappedDomain`, `unmappedTermParts`, `unmappedColumnParts` | `/api/term/sync` |
| `DatabaseEntry` | `logicalDbName`, `physicalDbName` | - | - |
| `EntityEntry` | `schemaName`, `entityName`, `tableKoreanName`, `logicalDbName` | - | - |
| `AttributeEntry` | `schemaName`, `entityName`, `attributeName` 등 | - | - |
| `TableEntry` | `schemaName`, `tableEnglishName`, `tableKoreanName`, `physicalDbName` | `relatedEntityName` | `/api/erd/relations/sync` |
| `ColumnEntry` | 기본 메타(`columnEnglishName`, `isPK`, `nullable` 등) | `schemaName`, `tableEnglishName`, `relatedEntityName`, `columnKoreanName`, `domainName`, `dataType`, `dataLength`, `dataDecimalLength` | `/api/erd/relations/sync`, `/api/column/sync-term` |

### 1) 관계 동기화 (`/api/erd/relations/sync`) 소유 필드
- `TableEntry.relatedEntityName`
- `ColumnEntry.schemaName`
- `ColumnEntry.tableEnglishName`
- `ColumnEntry.relatedEntityName`

### 2) 컬럼-용어-도메인 동기화 (`/api/column/sync-term`) 소유 필드
- `ColumnEntry.columnKoreanName`
- `ColumnEntry.domainName`
- `ColumnEntry.dataType`
- `ColumnEntry.dataLength`
- `ColumnEntry.dataDecimalLength`

### 3) 비중복 원칙
- 두 API는 기본적으로 서로 다른 필드를 갱신한다.
- 동일 엔트리(`ColumnEntry`)를 동시에 갱신해도, 필드 충돌은 설계상 발생하지 않는다.

### 4) 수동 편집과의 충돌 규칙
- 수동 편집은 즉시 저장되며, 이후 동기화 실행 시 `해당 API 소유 필드`만 재보정된다.
- `수동 편집 > 동기화` 우선순위가 아니라, `마지막 실행 주체`가 소유 필드에 대해 최종값을 결정한다.
- 소유하지 않은 필드는 동기화가 변경하지 않는다.
- 운영 기본값은 `vocabulary sync-domain -> term sync -> relations sync -> column sync-term` 순서다.

## 파일 매핑 우선순위
- 표준 우선순위는 아래 3단계다.
1. `registry.json` (명시 매핑)
2. 파일 내부 `mapping` 필드 (`fileMappingOverride`)
3. 타입별 기본 파일명 (`DEFAULT_FILENAMES`)
- 구현 기준: `src/lib/registry/mapping-registry.ts`의 `resolveRelatedFilenames()`

## DELETE 참조 검사 범위
- 엔트리 삭제 시 참조 경고 수집은 8개 타입 전체를 대상으로 한다.
- 공통 API: `checkEntryReferences(type, entry, filename?)`
- 기본 동작: 삭제는 허용하고 `warnings`를 반환한다. (`force=true`면 경고 수집 생략)
- 적용 엔드포인트:
1. `/api/vocabulary`, `/api/domain`, `/api/term`
2. `/api/database`, `/api/entity`, `/api/attribute`, `/api/table`, `/api/column`

## 권장 실행 순서
1. `POST /api/alignment/sync` (`apply=true`)
2. `GET /api/erd/relations` 또는 ERD/Browse 패널에서 정합성 재확인

## 통합 동기화 API
- 엔드포인트: `POST /api/alignment/sync`
- 실행 순서 고정:
1. `POST /api/vocabulary/sync-domain`
2. `POST /api/term/sync`
3. `POST /api/erd/relations/sync`
4. `POST /api/column/sync-term`
5. `GET /api/validation/report`
- 공통 파라미터:
1. `apply` (`true|false`, 기본 `true`)
2. 파일 지정(`termFilename`, `domainFilename`, `databaseFile`, `entityFile`, `attributeFile`, `tableFile`, `columnFile`, `columnFilename`)
- 주요 응답:
1. `data.steps.relation|column|validation`에 단계별 결과 원본 포함
2. `data.summary`에 `appliedVocabularyUpdates`, `appliedTermUpdates`, `appliedRelationUpdates`, `appliedColumnUpdates`, `remainingTermFailed`, `relationUnmatchedCount`, `totalIssues` 제공

## 관계키 표준화 규칙
- 공통 규칙: `trim -> lowercase`
- 관계 검증/동기화 키(`design-relation-*`): `"-"` 값은 빈값으로 취급
- 복합키: 정규화된 파트를 `|`로 결합, 한 파트라도 빈값이면 키 미생성
- 용어 파트 비교: `_` 기준 분해 후 각 토큰을 `trim/lowercase` 처리
- 구현 기준: `src/lib/utils/mapping-key.ts`

## 검증 응답 표준
- `/api/term/validate`, `/api/term/validate-all`, `/api/vocabulary/validate`, `/api/domain/validate`는 공통으로 `data.errors[]`와 `data.errorCount`를 반환한다.
- `errors[]` 항목은 `type`, `code`, `message`, `field`를 사용하며 우선순위 정렬된 상태로 반환한다.
- 실패 시 최우선 오류 메시지는 최상위 `error`에도 함께 노출한다.
- `/api/column/sync-term`는 매핑 실패 사유를 `data.issues[]`로 함께 반환한다.
  - 코드: `COLUMN_NAME_EMPTY`, `TERM_NOT_FOUND`, `TERM_DOMAIN_EMPTY`, `DOMAIN_NOT_FOUND`

## 통합 진단 리포트
- 엔드포인트: `GET /api/validation/report`
- 목적: `term validate-all` + `erd relations` 결과를 하나의 이슈 리스트로 결합
- 주요 응답:
1. `data.files`: 사용된 `term/database/entity/attribute/table/column` 파일
2. `data.summary`: `error/auto-fixable/warning/info` 건수 + 용어/관계 실패 집계
3. `data.issues[]`: 공통 이슈 포맷 (`source`, `level`, `code`, `message`, `entryId`, `label`, `priority`)
- 레벨 규칙:
1. relation 이슈: `severity`를 그대로 사용 (`error`/`warning`)
2. term 이슈: 기본 `error`, 자동보정 action이 있으면 `auto-fixable`
3. 정렬: `error -> auto-fixable -> warning -> info -> priority`

## 임시 운영 가이드 (P0)
- 목적: 관계계(5개 정의서)와 용어계(단어집/도메인/용어)를 한 번의 표준 절차로 맞춘다.
- 실행 절차:
1. `POST /api/erd/relations/sync` with `{"apply": false}` (미리보기)
2. `POST /api/erd/relations/sync` with `{"apply": true}` (적용)
3. `POST /api/column/sync-term` with `{"apply": false}` (미리보기)
4. `POST /api/column/sync-term` with `{"apply": true}` (적용)
5. `GET /api/term/validate-all` (용어계 재검증)
6. `GET /api/erd/relations` (관계계 재검증)
- 참고:
  - `POST /api/term/sync`, `POST /api/vocabulary/sync-domain`도 동일하게 `apply=true/false`를 지원한다.
  - `apply=false`는 저장하지 않고 `changes`만 반환한다.

## 운영 규칙
- UI/운영에서는 관계 동기화 완료 후 컬럼 동기화를 실행하는 것을 기본 절차로 한다.
- 대량 변경 시 `apply=false` 미리보기 결과(후보 건수/변경 필드)를 먼저 검토한다.
- 동기화 실행 직후에는 최신 파일로 재조회하여 후속 저장 충돌(낙관적 갱신 충돌)을 방지한다.

## 예외 및 주의사항
- 사용자 수동 편집으로 `schemaName`, `tableEnglishName`, `relatedEntityName`를 변경한 경우 관계 동기화가 이를 다시 보정할 수 있다.
- 도메인 사전 변경 직후에는 반드시 `column/sync-term`를 재실행해 물리 타입(`dataType/length/decimal`) 일관성을 맞춘다.
