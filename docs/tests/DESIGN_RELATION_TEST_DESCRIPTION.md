# 5개 정의서 관계 테스트 명세

최종 수정: 2026-02-14

## 개요
- 대상: `database/entity/attribute/table/column` 5개 정의서 연관관계
- 검증 축:
  - 관계 정합성 진단 (`/api/erd/relations`)
  - 관계 자동보정 (`/api/erd/relations/sync`)
  - 보정 전/후 결과 시각화(UI)

## 테스트 파일 목록

| 파일 경로 | 성격 | 핵심 검증 |
| --- | --- | --- |
| `src/lib/utils/design-relation-validator.test.ts` | 단위 | 관계별 `matched/unmatched/error/warning` 집계 정확성 |
| `src/lib/utils/design-relation-sync.test.ts` | 단위 | Entity->Table, Table->Column 보정 후보 생성 및 모호성 처리 |
| `src/routes/api/erd/relations/server.test.ts` | API 단위 | 관계 진단 API 성공/파라미터/오류 처리 |
| `src/routes/api/erd/relations/sync/server.test.ts` | API 단위 | 관계 동기화 preview/apply 동작 및 저장 호출 |
| `src/lib/components/DesignRelationPanel.test.ts` | UI 단위 | 패널 렌더링, 자동보정 실행, 영향 건수/정합성 변화 표시 |
| `src/routes/api/erd/relations/integration.test.ts` | 통합(Fixture) | 실제 파일 fixture 기반 보정 전후 미매칭 감소 및 파일 반영 확인 |

## 통합 시나리오 (`integration.test.ts`)
1. 임시 `DATA_PATH`에 5개 정의서 fixture 파일 생성
2. `/api/erd/relations` 호출로 초기 미매칭 확인
3. `/api/erd/relations/sync` (`apply=true`) 호출로 자동보정 실행
4. `/api/erd/relations` 재호출로 미매칭 감소 확인
5. `table.json`, `column.json` 실제 필드 변경값 확인

## 실행 명령

```bash
pnpm vitest run src/routes/api/erd/relations/integration.test.ts \
  src/routes/api/erd/relations/server.test.ts \
  src/routes/api/erd/relations/sync/server.test.ts \
  src/lib/utils/design-relation-sync.test.ts \
  src/lib/utils/design-relation-validator.test.ts \
  src/lib/components/DesignRelationPanel.test.ts
```
