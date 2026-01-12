# ERD (Entity Relationship Diagram) 주제영역 테스트 설명

이 문서는 ERD 주제영역의 모든 테스트 케이스에 대한 상세 설명을 제공합니다.

## 테스트 현황 요약

| 테스트 파일                   | 테스트 수 | 상태 |
| ----------------------------- | --------- | ---- |
| `erd/generate/server.test.ts` | 12개      | 완료 |
| `erd/tables/server.test.ts`   | 8개       | 완료 |
| `erd-generator.test.ts`       | 15개      | 완료 |
| `erd-mapper.test.ts`          | 24개      | 완료 |
| `erd-filter.test.ts`          | 12개      | 완료 |
| `ERDViewer.test.ts`           | 10개      | 완료 |
| **합계**                      | **81개**  |      |

---

## 1. erd/generate/server.test.ts (12개)

**파일 경로**: `src/routes/api/erd/generate/server.test.ts`

ERD 생성 API의 핵심 기능을 검증합니다.

### GET (12개)

| 테스트명                                                     | 설명                     | 검증 내용                                    |
| ------------------------------------------------------------ | ------------------------ | -------------------------------------------- |
| should return ERD data successfully                          | ERD 데이터 생성 성공     | 200 응답, success=true, ERDData 반환         |
| should return ERD data with all nodes and edges              | 모든 노드와 엣지 포함    | nodes, edges, mappings 배열 포함             |
| should filter by tableIds when provided                      | 테이블 ID로 필터링       | tableIds 파라미터 적용, 선택된 테이블만 포함 |
| should include related entities when includeRelated is true  | 관련 엔터티 포함         | includeRelated=true 시 관련 엔터티/속성 포함 |
| should exclude related entities when includeRelated is false | 관련 엔터티 제외         | includeRelated=false 시 관련 엔터티 제외     |
| should handle empty data gracefully                          | 빈 데이터 처리           | 데이터 없을 때 빈 ERD 반환                   |
| should use specified file parameters                         | 파일 파라미터 사용       | databaseFile, entityFile 등 파라미터 적용    |
| should use first files when no parameters provided           | 기본 파일 사용           | 파라미터 없을 때 첫 번째 파일 사용           |
| should handle data loading errors gracefully                 | 데이터 로딩 오류 처리    | 파일 로드 실패 시 500 에러                   |
| should generate metadata correctly                           | 메타데이터 생성          | totalNodes, totalEdges, logicalNodes 등 계산 |
| should handle invalid tableIds parameter                     | 잘못된 tableIds 파라미터 | 빈 문자열이나 잘못된 형식 처리               |
| should include domain mappings when available                | 도메인 매핑 포함         | 도메인 매핑이 있을 때 포함                   |

---

## 2. erd/tables/server.test.ts (8개)

**파일 경로**: `src/routes/api/erd/tables/server.test.ts`

ERD용 테이블 목록 조회 API를 테스트합니다.

### GET (8개)

| 테스트명                                       | 설명                   | 검증 내용                                |
| ---------------------------------------------- | ---------------------- | ---------------------------------------- |
| should return table list successfully          | 테이블 목록 조회 성공  | 200 응답, success=true, 테이블 배열 반환 |
| should filter tables by search query           | 검색 쿼리로 필터링     | q 파라미터로 테이블명/한글명 검색        |
| should sort tables by English name             | 영문명 기준 정렬       | 테이블 영문명 기준 오름차순 정렬         |
| should use specified filename parameter        | 파일명 파라미터 사용   | filename 쿼리 파라미터 적용              |
| should use default filename when not specified | 기본 파일명 사용       | 파라미터 없을 때 첫 번째 파일 사용       |
| should return empty array when no tables exist | 테이블 없을 때 빈 배열 | 테이블 데이터 없을 때 [] 반환            |
| should handle data loading errors gracefully   | 데이터 로딩 오류 처리  | 파일 로드 실패 시 500 에러               |
| should include all required table fields       | 필수 필드 포함         | id, tableEnglishName, schemaName 등 포함 |

---

## 3. erd-generator.test.ts (15개)

**파일 경로**: `src/lib/utils/erd-generator.test.ts`

ERD 데이터 생성 및 Mermaid 다이어그램 변환 유틸리티를 테스트합니다.

### generateERDData (8개)

| 테스트명                                           | 설명                    | 검증 내용                                 |
| -------------------------------------------------- | ----------------------- | ----------------------------------------- |
| should generate ERD data with all nodes            | 모든 노드 생성          | database, entity, table, column 노드 생성 |
| should generate ERD data with all edges            | 모든 엣지 생성          | 매핑 관계에 따른 엣지 생성                |
| should generate metadata correctly                 | 메타데이터 생성         | totalNodes, totalEdges, logicalNodes 등   |
| should filter nodes by tableIds                    | 테이블 ID로 노드 필터링 | 선택된 테이블과 관련 노드만 포함          |
| should include related entities when requested     | 관련 엔터티 포함        | includeRelated=true 시 관련 엔터티 포함   |
| should exclude related entities when not requested | 관련 엔터티 제외        | includeRelated=false 시 관련 엔터티 제외  |
| should handle empty context gracefully             | 빈 컨텍스트 처리        | 데이터 없을 때 빈 ERD 반환                |
| should create domain nodes for mapped domains      | 도메인 노드 생성        | 매핑된 도메인만 노드로 생성               |

### generateMermaidERD (7개)

| 테스트명                                       | 설명                           | 검증 내용                         |
| ---------------------------------------------- | ------------------------------ | --------------------------------- |
| should generate valid Mermaid ER diagram       | 유효한 Mermaid 다이어그램 생성 | erDiagram 형식의 유효한 코드 생성 |
| should limit node count when maxNodes provided | 노드 수 제한                   | maxNodes 파라미터로 노드 수 제한  |
| should limit edge count when maxEdges provided | 엣지 수 제한                   | maxEdges 파라미터로 엣지 수 제한  |
| should sanitize node names correctly           | 노드 이름 정리                 | 특수문자 제거, 공백 처리          |
| should truncate long node names                | 긴 노드 이름 축약              | 50자 초과 시 말줄임표 추가        |
| should limit fields to 3 per entity            | 필드 수 제한                   | 엔터티당 최대 3개 필드만 표시     |
| should warn when text size exceeds limit       | 텍스트 크기 초과 경고          | 45KB 초과 시 콘솔 경고            |

---

## 4. erd-mapper.test.ts (20개)

**파일 경로**: `src/lib/utils/erd-mapper.test.ts`

ERD 매핑 관계 생성 유틸리티를 테스트합니다.

### generateAllMappings (5개)

| 테스트명                                  | 설명                       | 검증 내용                                        |
| ----------------------------------------- | -------------------------- | ------------------------------------------------ |
| should generate all mapping types         | 모든 매핑 타입 생성        | logical, physical, logical-physical, domain 매핑 |
| should generate database-entity mappings  | Database-Entity 매핑 생성  | logicalDbName 기반 매핑                          |
| should generate entity-attribute mappings | Entity-Attribute 매핑 생성 | entityName 기반 매핑                             |
| should generate table-column mappings     | Table-Column 매핑 생성     | schemaName+tableEnglishName 기반 매핑            |
| should generate column-domain mappings    | Column-Domain 매핑 생성    | columnEnglishName 접미사 기반 매핑               |

### mapEntityInheritance (3개)

| 테스트명                                    | 설명                       | 검증 내용                              |
| ------------------------------------------- | -------------------------- | -------------------------------------- |
| should map entity inheritance relationships | 엔터티 상속 관계 매핑      | superTypeEntityName 기반 상속 매핑     |
| should handle entities without super type   | 상위 타입 없는 엔터티 처리 | superTypeEntityName이 없으면 매핑 제외 |
| should handle circular inheritance          | 순환 상속 처리             | 순환 참조 방지                         |

### mapTableToEntity (3개)

| 테스트명                                        | 설명                           | 검증 내용                            |
| ----------------------------------------------- | ------------------------------ | ------------------------------------ |
| should map table to entity by relatedEntityName | 테이블-엔터티 매핑             | relatedEntityName 기반 매핑          |
| should handle tables without related entity     | 관련 엔터티 없는 테이블 처리   | relatedEntityName이 없으면 매핑 제외 |
| should handle multiple tables to same entity    | 동일 엔터티에 여러 테이블 매핑 | 여러 테이블이 같은 엔터티 참조 가능  |

### mapColumnToDomain (4개)

| 테스트명                                      | 설명                       | 검증 내용                            |
| --------------------------------------------- | -------------------------- | ------------------------------------ |
| should map column to domain by suffix         | 컬럼-도메인 매핑           | columnEnglishName 접미사 기반 매핑   |
| should extract suffix correctly               | 접미사 추출                | 다양한 접미사 패턴 처리              |
| should handle columns without matching domain | 매칭 도메인 없는 컬럼 처리 | 접미사 매칭 실패 시 매핑 제외        |
| should prioritize exact suffix match          | 정확한 접미사 매칭 우선    | 정확한 매칭 우선, 부분 매칭은 후순위 |

### mapColumnFK (3개)

| 테스트명                             | 설명               | 검증 내용               |
| ------------------------------------ | ------------------ | ----------------------- |
| should map foreign key relationships | 외래키 관계 매핑   | fkInfo 기반 외래키 매핑 |
| should parse fkInfo correctly        | fkInfo 파싱        | 다양한 fkInfo 형식 처리 |
| should handle invalid fkInfo         | 잘못된 fkInfo 처리 | 잘못된 형식은 매핑 제외 |

### 엣지 케이스 (2개)

| 테스트명                             | 설명                   | 검증 내용                        |
| ------------------------------------ | ---------------------- | -------------------------------- |
| should handle empty context          | 빈 컨텍스트 처리       | 데이터 없을 때 빈 매핑 배열 반환 |
| should handle missing vocabulary map | 단어집 맵 없을 때 처리 | vocabularyMap 없어도 동작        |

---

## 5. erd-filter.test.ts (12개)

**파일 경로**: `src/lib/utils/erd-filter.test.ts`

ERD 데이터 필터링 유틸리티를 테스트합니다.

### filterMappingContext (8개)

| 테스트명                                           | 설명                        | 검증 내용                                  |
| -------------------------------------------------- | --------------------------- | ------------------------------------------ |
| should return full context when no filter          | 필터 없을 때 전체 반환      | tableIds 없으면 전체 컨텍스트 반환         |
| should filter tables by tableIds                   | 테이블 ID로 필터링          | 선택된 테이블만 포함                       |
| should filter columns by selected tables           | 선택된 테이블의 컬럼 필터링 | 선택된 테이블의 컬럼만 포함                |
| should include related entities when requested     | 관련 엔터티 포함            | includeRelated=true 시 관련 엔터티 포함    |
| should exclude related entities when not requested | 관련 엔터티 제외            | includeRelated=false 시 관련 엔터티 제외   |
| should filter databases by physicalDbName          | 물리적 DB로 필터링          | 선택된 테이블의 physicalDbName과 연결된 DB |
| should handle empty tableIds array                 | 빈 tableIds 배열 처리       | 빈 배열일 때 전체 반환                     |
| should preserve vocabulary and domain maps         | 단어집/도메인 맵 유지       | vocabularyMap, domainMap 유지              |

### filterERDDataByTableIds (4개)

| 테스트명                                    | 설명                           | 검증 내용                             |
| ------------------------------------------- | ------------------------------ | ------------------------------------- |
| should filter nodes by selected table IDs   | 선택된 테이블 ID로 노드 필터링 | 선택된 테이블 노드만 포함             |
| should include related nodes when requested | 관련 노드 포함                 | includeRelated=true 시 관련 노드 포함 |
| should filter edges by included nodes       | 포함된 노드의 엣지만 필터링    | 양쪽 노드가 모두 포함된 엣지만 포함   |
| should return full data when no tableIds    | tableIds 없을 때 전체 반환     | 빈 배열일 때 전체 데이터 반환         |

---

## 6. ERDViewer.test.ts (10개)

**파일 경로**: `src/lib/components/ERDViewer.test.ts`

ERD 뷰어 컴포넌트를 테스트합니다.

### 렌더링 (3개)

| 테스트명                              | 설명                | 검증 내용                             |
| ------------------------------------- | ------------------- | ------------------------------------- |
| should render ERD viewer component    | ERD 뷰어 렌더링     | 컴포넌트가 정상적으로 렌더링          |
| should display metadata correctly     | 메타데이터 표시     | 노드 수, 엣지 수 등 메타데이터 표시   |
| should show size warning when limited | 크기 제한 경고 표시 | 노드/엣지 수 제한 시 경고 메시지 표시 |

### Mermaid 초기화 및 렌더링 (4개)

| 테스트명                                   | 설명                                | 검증 내용                         |
| ------------------------------------------ | ----------------------------------- | --------------------------------- |
| should initialize Mermaid on mount         | 마운트 시 Mermaid 초기화            | 컴포넌트 마운트 시 Mermaid 초기화 |
| should render Mermaid diagram              | Mermaid 다이어그램 렌더링           | ERD 데이터로 다이어그램 렌더링    |
| should handle Mermaid rendering errors     | Mermaid 렌더링 오류 처리            | 렌더링 실패 시 에러 메시지 표시   |
| should update diagram when erdData changes | erdData 변경 시 다이어그램 업데이트 | erdData 변경 시 자동 재렌더링     |

### 사용자 인터랙션 (3개)

| 테스트명                                   | 설명                       | 검증 내용                           |
| ------------------------------------------ | -------------------------- | ----------------------------------- |
| should copy Mermaid code to clipboard      | Mermaid 코드 클립보드 복사 | 복사 버튼 클릭 시 코드 복사         |
| should download Mermaid file               | Mermaid 파일 다운로드      | 다운로드 버튼 클릭 시 파일 다운로드 |
| should show loading state during rendering | 렌더링 중 로딩 상태 표시   | 렌더링 중 로딩 스피너 표시          |

---

## 테스트 실행 방법

```bash
# 모든 ERD 테스트 실행
pnpm test erd

# 특정 테스트 파일 실행
pnpm test erd-generator
pnpm test erd-mapper
pnpm test erd-filter

# Watch 모드
pnpm test:watch erd
```

---

## 참고사항

- ERD 기능은 복잡한 매핑 관계를 다루므로 엣지 케이스 테스트가 중요합니다.
- Mermaid 텍스트 크기 제한(약 50KB)을 고려한 테스트가 필요합니다.
- 대규모 데이터베이스의 경우 필터링 기능이 필수적입니다.
