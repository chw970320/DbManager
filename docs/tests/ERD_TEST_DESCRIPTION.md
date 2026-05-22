# ERD (Entity Relationship Diagram) 주제영역 테스트 설명

이 문서는 ERD 주제영역의 현재 테스트 범위를 설명합니다. 2026-05-21 기준 ERD 이미지는 Mermaid가 아니라 서버 측 Graphviz 렌더링을 기준으로 검증합니다.

## 테스트 현황 요약

| 테스트 파일                                         | 주요 검증                                                                                                  | 상태 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---- |
| `src/lib/utils/erd-file-context.test.ts`            | 컬럼 정의서 기준 공통 파일 매핑 해석, mapped tableFile 우선순위                                            | 완료 |
| `src/routes/erd/page-source.test.ts`                | 좌측 sidebar/본문 제어 영역 배치 계약, 주제영역/스키마 selectbox, 테이블 선택 접힘/검색, 수동 생성 UI 제거 | 완료 |
| `src/routes/api/erd/render/server.test.ts`          | Graphviz SVG/PNG 렌더 API, 파라미터 검증, 설치 오류 응답, columnFile 매핑 해석                             | 완료 |
| `src/lib/utils/erd-graphviz-model.test.ts`          | 테이블/컬럼 조인, 필터, 명시 FK 관계/축약, FK marker/warning, PK 순번 비관계 처리, FK 외부참조 포함/제외    | 완료 |
| `src/lib/utils/graphviz-dot.test.ts`                | DOT/HTML label 생성, 논리/물리 명칭 분리, excel2image 방향 PK/FK/NN 열, 사업범위 색상, 외부참조 점선, 폰트 스택 | 완료 |
| `src/lib/server/graphviz-renderer.test.ts`          | `dot -Tsvg/-Tpng` 호출, ENOENT/non-zero 오류 변환                                                          | 완료 |
| `src/lib/components/ERDViewer.test.ts`              | ERD 이미지 미리보기, 렌더러 기술명 비노출, 구조적 엣지 수 대신 이미지 관계 수 표시, 오류 표시              | 완료 |
| `src/routes/api/erd/generate/server.test.ts`        | 기존 ERD JSON/관계 요약 API, render와 같은 필터 계약, columnFile 매핑 해석                                 | 완료 |
| `src/routes/api/erd/tables/server.test.ts`          | ERD 테이블 목록 조회/검색/정렬, columnFile 기반 mapped tableFile 조회                                      | 완료 |
| `src/lib/utils/erd-generator.test.ts`               | 기존 ERDData 노드/엣지 생성, Graphviz 기준 관계 metadata 분리, render 경로와 외부참조 metadata 일치         | 완료 |
| `src/lib/utils/erd-mapper.test.ts`                  | 기존 관계 매핑 생성, `schema.table.column`/`table.column` FK 파싱, FK marker 비관계 처리                    | 완료 |
| `src/lib/utils/erd-filter.test.ts`                  | tableIds/정의서 조건 및 FK 외부참조 포함 여부 기반 컨텍스트 필터, 3-part/2-part FK와 one-part 비추론 계약   | 완료 |
| `src/lib/utils/database-design-xlsx-parser.test.ts` | BKSP 테이블 정의서 헤더 매핑 회귀                                                                          | 완료 |

---

## 1. Graphviz 렌더 API

**파일 경로**: `src/routes/api/erd/render/server.test.ts`

| 테스트명                                                         | 설명                                        | 검증 내용                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 기본 요청은 SVG 이미지를 반환한다                                | 기본 `format=svg`, `mode=logical` 응답      | `image/svg+xml`, Graphviz renderer 호출                                                               |
| `format=png`는 PNG content-type을 반환한다                       | PNG 다운로드/미리보기 응답                  | `image/png`, `dot -Tpng` 렌더링                                                                       |
| 잘못된 format은 400 JSON 오류를 반환한다                         | 입력 검증                                   | `success=false`, 400                                                                                  |
| 필터 query를 Graphviz 모델 빌더에 전달한다                       | 주제영역/스키마/검색/사업범위/외부참조 필터 | 모델 빌더 옵션 전달                                                                                   |
| Graphviz 누락 오류는 설치 안내를 포함한다                        | `dot` 미설치 진단                           | 500 JSON, Graphviz 설치 안내                                                                          |
| columnFile만 전달되어도 매핑된 정의서 파일로 컨텍스트를 로드한다 | 컬럼 정의서 선택 기준 API 호출              | `resolveDbDesignFileMappingBundle('column', columnFile)`, mapped table/database/entity/attribute 사용 |

## 2. Graphviz ERD 모델

**파일 경로**: `src/lib/utils/erd-graphviz-model.test.ts`

- `TableEntry`와 `ColumnEntry`를 `schemaName + tableEnglishName`으로 조인합니다.
- 논리 표시는 테이블/컬럼 한글명을 우선하고, 물리 표시는 schema/table/column 영문명을 사용합니다.
- 주제영역, 스키마, 테이블명 검색, 사업범위여부 필터를 적용합니다.
- FK 외부참조 포함 옵션이 켜져 있으면 필터 밖 참조 테이블을 외부 노드로 포함합니다.
- FK 외부참조 제외 옵션이 꺼져 있으면 필터 밖 참조 관계를 제거합니다.
- `schema.table.column`과 같은 명시 FK와 같은 스키마 `table.column` 축약형만 관계를 만들고, `Y`/`YES`는 FK badge만 유지합니다.
- `PK01`처럼 PK 순번이 FK 칸에 들어온 값은 FK marker/warning/관계로 보지 않습니다.
- 컬럼명만 있는 1-part FK 문자열은 관계를 추론하지 않고 warning으로 남깁니다.
- 같은 source/target 테이블 사이의 복수 FK는 하나의 관계로 축약합니다.

## 3. DOT 직렬화와 렌더러

**파일 경로**:

- `src/lib/utils/graphviz-dot.test.ts`
- `src/lib/server/graphviz-renderer.test.ts`

검증 범위:

- `digraph`와 HTML table label 생성.
- PK/FK/NN을 독립된 좁은 열로 표시하고, 컬럼명/타입/길이/소수점 정보를 분리 표시합니다.
- 사업범위 `#4A90E2`, 사업범위 외 `#9B9B9B`, 외부참조 회색/점선 스타일을 직렬화합니다.
- XML 특수문자 escape.
- 논리 모드 label에는 한글 테이블/컬럼명만, 물리 모드 label에는 `schema.table`과 컬럼 영문명만 직렬화.
- 서비스 기본 폰트 우선순위와 맞춘 `Pretendard Variable`, `Pretendard`, `Inter` 폰트 스택 사용.
- FK edge 생성.
- `dot -Tsvg`, `dot -Tpng` 인자 사용.
- `ENOENT` → Graphviz 설치 오류, non-zero exit → 렌더링 오류 변환.

## 4. ERDViewer 컴포넌트

**파일 경로**: `src/lib/components/ERDViewer.test.ts`

- ERD 미리보기 이미지를 렌더링합니다.
- 렌더러 기술명과 기존 코드 복사/다운로드 버튼은 노출하지 않습니다.
- `/api/erd/generate`의 구조적 `totalEdges` 대신 이미지 관계 기준 `totalRelationships`를 표시합니다.
- SVG/PNG 다운로드 링크는 ERD 화면의 필터 패널에서 제공합니다.
- 이미지 로드 실패 시 한국어 오류 메시지를 표시합니다.

## 5. 기존 ERD 데이터/관계 API

`/api/erd/generate`, `/api/erd/tables`, `erd-generator`, `erd-mapper`, `erd-filter` 테스트는 관계 요약과 기존 매핑 데이터 생성을 계속 검증합니다. Graphviz 이미지 생성은 `/api/erd/render`가 담당합니다.

- `src/lib/utils/erd-file-context.test.ts`는 ERD API가 `columnFile`만 받아도 공통 파일 매핑으로 `tableFile`과 관련 정의서 파일을 해석하는 계약을 검증합니다.
- `src/routes/api/erd/generate/server.test.ts`는 `subjectArea`, `schema`, `q`, `scopeFlag`, `includeExternalReferences`, `tableIds` 필터가 Graphviz 렌더 API와 같은 형태로 ERDData 생성에 전달되는지 검증합니다.
- `src/lib/utils/erd-generator.test.ts`는 ERDData의 구조적 `totalEdges`와 Graphviz 이미지 기준 `totalRelationships` metadata가 분리되고, 외부참조 포함/제외/미해결 FK metadata가 render 모델과 같은 기준으로 계산되는지 검증합니다.
- `src/lib/utils/erd-filter.test.ts`는 주제영역 등으로 선택된 테이블의 FK가 필터 밖 테이블을 참조할 때 `includeExternalReferences` 값에 따라 외부 테이블/컬럼을 포함하거나 제외하는 JSON ERD 컨텍스트 계약과 같은 스키마 `table.column` 축약형을 검증합니다.
- `src/routes/api/erd/tables/server.test.ts`는 `columnFile` 기준으로 mapped tableFile을 로드하고, 응답에 주제영역/사업범위 정보를 포함하는지 검증합니다.

## 6. ERD sidebar/본문 UI 계약

**파일 경로**: `src/routes/erd/page-source.test.ts`

- ERD 화면이 `BrowsePageLayout`과 `sidebarSurface="plain"`을 사용합니다.
- 컬럼 정의서 파일 선택과 매핑 기준은 `ColumnDefFileManager`와 좌측 sidebar 카드로 제공됩니다.
- 조회 조건, 테이블 다중 선택, 이미지 다운로드는 본문 상단의 `ERD 메인 제어 영역` 안에 제공됩니다.
- 주제영역/스키마 필터는 본문 조회 조건에서 input이 아닌 selectbox이며 `전체` 옵션 없이 첫 유효 옵션을 기본값으로 사용합니다.
- 테이블 선택은 최초 로드 시 조건 결과 전체가 선택되고 기본 상태는 접혀 있으며, 펼친 뒤 테이블명 검색과 다중 선택을 수정할 수 있는지 검증합니다.
- 기존 상단 Graphviz 필터 패널, 수동 `ERD 생성` 버튼, 데이터베이스/테이블 정의서 직접 선택 UI가 남지 않았는지 검증합니다.

## 7. 테이블 정의서 업로드 회귀

**파일 경로**: `src/lib/utils/database-design-xlsx-parser.test.ts`

- `순번 | 물리DB명 | 테이블소유자 | 주제영역 | schema | 테이블 영문명 | 테이블한글명 | ...` 형식을 `TableEntry`로 매핑합니다.
- 기존 `번호 | 물리DB명 | ... | 스키마명 | 테이블영문명 | ...` 형식과 호환됩니다.

## 테스트 실행 방법

```bash
pnpm vitest run src/lib/utils/erd-file-context.test.ts src/routes/api/erd/tables/server.test.ts src/routes/api/erd/render/server.test.ts src/routes/api/erd/generate/server.test.ts src/routes/erd/page-source.test.ts src/lib/utils/erd-graphviz-model.test.ts src/lib/utils/graphviz-dot.test.ts src/lib/utils/erd-filter.test.ts src/lib/utils/erd-mapper.test.ts src/lib/utils/erd-generator.test.ts src/lib/server/graphviz-renderer.test.ts src/lib/components/ERDViewer.test.ts
```

전체 회귀는 `pnpm vitest run`, 타입/빌드 검증은 `pnpm check`, `pnpm lint`, `pnpm build`로 확인합니다.
