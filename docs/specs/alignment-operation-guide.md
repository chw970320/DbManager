# 정합화 운영 가이드 (8개 모델)

최종 수정: 2026-02-14

## 설계 결정
- 5개 정의서 개별 `/validate-all` API는 **신설하지 않음**.
  - 근거: 5개 정의서는 관계 검증 단위가 핵심이며, `GET /api/erd/relations`가 단일 기준을 제공함.
- `AutoFixSuggestion`은 용어계 중심으로 유지하고, 관계계에는 `changes/suggestions/owner/reason`을 우선 사용.
  - 확장 여부는 Phase 2에서 재검토.
- Sync 호출 패턴 표준은 `POST + apply`를 기준으로 통일.
  - 조회성 진단은 `GET`, 변경성 동기화는 `POST`.
  - `POST /api/alignment/sync` 내부 실행 순서:
    `vocabulary sync-domain -> term sync -> relations sync -> column sync-term -> validation/report`

## 업로드 후처리 옵션
- 공통 FormData: `postProcessMode`
  - `none`: 업로드만 수행
  - `validate-only`: 업로드 후 진단만 수행
  - `validate-sync`: 업로드 후 진단 + 동기화 수행
- 공통 컴포넌트: `src/lib/components/FileUpload.svelte`
- 공통 실행 유틸: `src/lib/utils/upload-postprocess.ts`

## 자동보정 영향도 표시 규칙
- 실행 전 반드시 `preview` 또는 `validate-only` 결과를 확인한다.
- 영향도 최소 표시 항목:
  - 후보 건수 (`tableCandidates`, `columnCandidates`, `totalCandidates`)
  - 실제 반영 건수 (`applied*Updates`)
  - 실패/미매칭 잔여 건수 (`termFailedCount`, `relationUnmatchedCount`)
- 표시 우선순위:
  - `error` > `auto-fixable` > `warning` > `info`

## 실행 이력 로그 스펙 (초안)
- 이벤트 키: `alignment.run`
- 필수 필드:
  - `executedAt`, `executor`, `mode(apply|preview)`, `api`, `files`
  - `summary.appliedRelationUpdates`, `summary.appliedColumnUpdates`
  - `summary.remainingTermFailed`, `summary.totalIssues`
- 저장 전략:
  - 1차: API 응답/운영 로그 수집
  - 2차: 영속 이력 저장소(파일 또는 DB) 확장

## 운영 기본 시나리오
1. 업로드 (`postProcessMode=validate-only`)
2. 진단 확인 (`/api/validation/report`, `/api/term/relationship-summary`)
3. 보정 미리보기 (`/api/erd/relations/sync`, `/api/column/sync-term`, `apply=false`)
4. 자동보정 실행 (`POST /api/alignment/sync`, `apply=true`)
5. 재검증 (`/api/validation/report`)
6. 확정 및 배포

## 회귀 검증 세트
- 고정 명령: `pnpm test:regression`
- 포함 테스트:
  - 핵심 API: alignment/report/sync 계열
  - 핵심 컴포넌트: relation/validation 패널 계열
- Fixture 3종:
  - `src/tests/fixtures/alignment/normal.json`
  - `src/tests/fixtures/alignment/partial-mismatch.json`
  - `src/tests/fixtures/alignment/critical-mismatch.json`
