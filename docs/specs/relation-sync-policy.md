# 5개 정의서 관계 동기화 충돌 정책

최종 수정: 2026-02-14

## 목적
- `GET/POST /api/erd/relations/sync`(관계 동기화)와 `GET/POST /api/column/sync-term`(컬럼-용어-도메인 동기화)를 함께 운영할 때 필드 충돌을 방지한다.

## 필드 소유권 (Source of Truth)

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

## 권장 실행 순서
1. `POST /api/erd/relations/sync` (`apply=true`)
2. `POST /api/column/sync-term`
3. `GET /api/erd/relations` 또는 ERD/Browse 패널에서 정합성 재확인

## 운영 규칙
- UI/운영에서는 관계 동기화 완료 후 컬럼 동기화를 실행하는 것을 기본 절차로 한다.
- 대량 변경 시 `apply=false` 미리보기 결과(후보 건수/변경 필드)를 먼저 검토한다.
- 동기화 실행 직후에는 최신 파일로 재조회하여 후속 저장 충돌(낙관적 갱신 충돌)을 방지한다.

## 예외 및 주의사항
- 사용자 수동 편집으로 `schemaName`, `tableEnglishName`, `relatedEntityName`를 변경한 경우 관계 동기화가 이를 다시 보정할 수 있다.
- 도메인 사전 변경 직후에는 반드시 `column/sync-term`를 재실행해 물리 타입(`dataType/length/decimal`) 일관성을 맞춘다.
