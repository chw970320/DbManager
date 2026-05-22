# ERD (Entity Relationship Diagram) 주제영역 테스트 설명

이 문서는 ERD 주제영역의 현재 테스트 범위를 설명합니다. 2026-05-21 기준 ERD 이미지는 Mermaid가 아니라 서버 측 Graphviz 렌더링을 기준으로 검증합니다.

## 테스트 현황 요약

| 테스트 파일 | 주요 검증 | 상태 |
| --- | --- | --- |
| `src/routes/api/erd/render/server.test.ts` | Graphviz SVG/PNG 렌더 API, 파라미터 검증, 설치 오류 응답 | 완료 |
| `src/lib/utils/erd-graphviz-model.test.ts` | 테이블/컬럼 조인, 필터, FK 외부참조 포함/제외 | 완료 |
| `src/lib/utils/graphviz-dot.test.ts` | DOT/HTML label 생성, escape, 논리/물리 표시, 폰트 스택 | 완료 |
| `src/lib/server/graphviz-renderer.test.ts` | `dot -Tsvg/-Tpng` 호출, ENOENT/non-zero 오류 변환 | 완료 |
| `src/lib/components/ERDViewer.test.ts` | ERD 이미지 미리보기, 렌더러 기술명 비노출, 오류 표시 | 완료 |
| `src/routes/api/erd/generate/server.test.ts` | 기존 ERD JSON/관계 요약 API | 완료 |
| `src/routes/api/erd/tables/server.test.ts` | ERD 테이블 목록 조회/검색/정렬 | 완료 |
| `src/lib/utils/erd-generator.test.ts` | 기존 ERDData 노드/엣지 생성 | 완료 |
| `src/lib/utils/erd-mapper.test.ts` | 기존 관계 매핑 생성 | 완료 |
| `src/lib/utils/erd-filter.test.ts` | 기존 tableIds 기반 컨텍스트 필터 | 완료 |
| `src/lib/utils/database-design-xlsx-parser.test.ts` | BKSP 테이블 정의서 헤더 매핑 회귀 | 완료 |

---

## 1. Graphviz 렌더 API

**파일 경로**: `src/routes/api/erd/render/server.test.ts`

| 테스트명 | 설명 | 검증 내용 |
| --- | --- | --- |
| 기본 요청은 SVG 이미지를 반환한다 | 기본 `format=svg`, `mode=logical` 응답 | `image/svg+xml`, Graphviz renderer 호출 |
| `format=png`는 PNG content-type을 반환한다 | PNG 다운로드/미리보기 응답 | `image/png`, `dot -Tpng` 렌더링 |
| 잘못된 format은 400 JSON 오류를 반환한다 | 입력 검증 | `success=false`, 400 |
| 필터 query를 Graphviz 모델 빌더에 전달한다 | 주제영역/schema/검색/사업범위/외부참조 필터 | 모델 빌더 옵션 전달 |
| Graphviz 누락 오류는 설치 안내를 포함한다 | `dot` 미설치 진단 | 500 JSON, Graphviz 설치 안내 |

## 2. Graphviz ERD 모델

**파일 경로**: `src/lib/utils/erd-graphviz-model.test.ts`

- `TableEntry`와 `ColumnEntry`를 `schemaName + tableEnglishName`으로 조인합니다.
- 논리 표시는 테이블/컬럼 한글명을 우선하고, 물리 표시는 schema/table/column 영문명을 사용합니다.
- 주제영역, schema, 테이블명 검색, 사업범위여부 필터를 적용합니다.
- FK 외부참조 포함 옵션이 켜져 있으면 필터 밖 참조 테이블을 외부 노드로 포함합니다.
- FK 외부참조 제외 옵션이 꺼져 있으면 필터 밖 참조 관계를 제거합니다.

## 3. DOT 직렬화와 렌더러

**파일 경로**:

- `src/lib/utils/graphviz-dot.test.ts`
- `src/lib/server/graphviz-renderer.test.ts`

검증 범위:

- `digraph`와 HTML table label 생성.
- PK/FK/NN 배지 표시.
- XML 특수문자 escape.
- 서비스 기본 폰트 우선순위와 맞춘 `Pretendard Variable`, `Pretendard`, `Inter` 폰트 스택 사용.
- FK edge 생성.
- `dot -Tsvg`, `dot -Tpng` 인자 사용.
- `ENOENT` → Graphviz 설치 오류, non-zero exit → 렌더링 오류 변환.

## 4. ERDViewer 컴포넌트

**파일 경로**: `src/lib/components/ERDViewer.test.ts`

- ERD 미리보기 이미지를 렌더링합니다.
- 렌더러 기술명과 기존 코드 복사/다운로드 버튼은 노출하지 않습니다.
- SVG/PNG 다운로드 링크는 ERD 화면의 필터 패널에서 제공합니다.
- 이미지 로드 실패 시 한국어 오류 메시지를 표시합니다.

## 5. 기존 ERD 데이터/관계 API

`/api/erd/generate`, `/api/erd/tables`, `erd-generator`, `erd-mapper`, `erd-filter` 테스트는 관계 요약과 기존 매핑 데이터 생성을 계속 검증합니다. Graphviz 이미지 생성은 `/api/erd/render`가 담당합니다.

## 6. 테이블 정의서 업로드 회귀

**파일 경로**: `src/lib/utils/database-design-xlsx-parser.test.ts`

- `순번 | 물리DB명 | 테이블소유자 | 주제영역 | schema | 테이블 영문명 | 테이블한글명 | ...` 형식을 `TableEntry`로 매핑합니다.
- 기존 `번호 | 물리DB명 | ... | 스키마명 | 테이블영문명 | ...` 형식과 호환됩니다.

## 테스트 실행 방법

```bash
pnpm vitest run src/routes/api/erd/render/server.test.ts src/lib/utils/erd-graphviz-model.test.ts src/lib/utils/graphviz-dot.test.ts src/lib/server/graphviz-renderer.test.ts src/lib/components/ERDViewer.test.ts
```

전체 회귀는 `pnpm vitest run`, 타입/빌드 검증은 `pnpm check`, `pnpm lint`, `pnpm build`로 확인합니다.
