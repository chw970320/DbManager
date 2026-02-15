# 정합화 릴리즈 체크리스트

최종 수정: 2026-02-14

## 사전 점검
- [ ] 대상 파일 백업 완료 (`vocabulary/domain/term/database/entity/attribute/table/column`)
- [ ] 운영자 공지 및 점검 윈도우 확정
- [ ] 회귀 테스트 수행: `pnpm test:regression`

## 배포 전 실행
- [ ] `pnpm check` 통과
- [ ] 핵심 API 스모크
  - [ ] `GET /api/validation/report`
  - [ ] `POST /api/alignment/sync` (`apply=false`)
  - [ ] `POST /api/alignment/sync` (`apply=true`)
- [ ] 업로드 파이프라인 스모크
  - [ ] `postProcessMode=validate-only`
  - [ ] `postProcessMode=validate-sync`

## 배포 후 검증
- [ ] ERD 패널 통합 정합성 요약 확인
- [ ] browse(단어집/도메인/정의서) 패널 정상 동작 확인
- [ ] 용어계 관계 진단 요약(`term/relationship-summary`) 확인
- [ ] 잔여 이슈(`totalIssues`) 기준 허용치 이내 확인

## 롤백 기준
- [ ] 동기화 후 `errorCount` 급증
- [ ] 주요 조회/저장 API 실패율 증가
- [ ] 핵심 화면(ERD, browse) 기능 장애

## 롤백 절차
1. 신규 업로드/동기화 중단
2. 백업 파일 복원
3. 서비스 재기동
4. `pnpm test:regression` 재확인
5. 장애 공지/원인 분석 공유
