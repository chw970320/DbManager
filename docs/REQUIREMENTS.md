# 📋 변경 요구사항

이 문서는 프로젝트의 설계 변경, 기능 추가, 리팩토링 등 모든 변경 요구사항을 정의합니다.

## 상태 정의

| 상태      | 설명                          |
| --------- | ----------------------------- |
| 🟡 검토중 | 요구사항 검토 및 영향 분석 중 |
| 🟢 승인됨 | 승인 완료, 문서 반영 대기     |
| 🔵 반영중 | 문서 업데이트 진행 중         |
| 🟣 실행중 | plans 실행 중                 |
| ✅ 완료   | 모든 작업 및 문서 현행화 완료 |
| ❌ 취소   | 요구사항 취소됨               |

---

## 진행 중인 요구사항

<!--
새 요구사항 추가 시 아래 템플릿 복사:

## REQ-XXX: [제목]

- **상태**: 🟡 검토중
- **생성일**: YYYY-MM-DD
- **완료일**: -

### 설명
[변경하려는 내용 상세 설명]

### 변경 이유
[왜 이 변경이 필요한지]

### 영향 범위
- [ ] 데이터 레이어 (types, file-handler)
- [ ] API 레이어 (routes/api)
- [ ] UI 레이어 (components, pages, stores)
- [ ] 설정/구조 (package.json, config)

### 관련 이슈
- #C1, #H3 등 관련 이슈 번호

### 작업 체크리스트
- [ ] 문서 반영 완료
- [ ] plans 생성/업데이트 완료
- [ ] 코드 구현 완료
- [ ] 문서 현행화 완료

-->

## REQ-005: 버그 수정 - UI/API 오류

- **상태**: 🟣 실행중
- **생성일**: 2024-12-12
- **완료일**: -

### 설명

사용자 테스트 중 발견된 버그들을 수정합니다.

### 포함 이슈

| #   | 이슈                                            | 위치                              | 원인                                                | 심각도 | 상태    |
| --- | ----------------------------------------------- | --------------------------------- | --------------------------------------------------- | ------ | ------- |
| B1  | 단어집 새 단어 추가 시 "새 용어 추가" 팝업 표시 | `browse/+page.svelte`             | **VocabularyEditor 컴포넌트 누락**, TermEditor 오용 | 높음   | ✅ 완료 |
| B2  | 단어집 목록 클릭 시 "용어 수정" 팝업 표시       | `browse/+page.svelte`             | B1과 동일 (VocabularyEditor 필요)                   | 높음   | ✅ 완료 |
| B3  | 도메인 통합검색 시 TypeError 발생               | `api/domain/+server.ts:99-118`    | optional 필드에 `.toLowerCase()` 직접 호출          | 중간   | ✅ 완료 |
| B4  | 용어 XLSX 다운로드 시 `term_term_*.xlsx`        | `api/term/download/+server.ts:26` | 파일명 prefix 중복                                  | 낮음   | ✅ 완료 |

### 상세 분석

#### B1, B2: VocabularyEditor 컴포넌트 누락 (심각)

**현재 상태:**

| 엔티티     | Editor              | 상태 |
| ---------- | ------------------- | ---- |
| Domain     | DomainEditor.svelte | ✅   |
| Term       | TermEditor.svelte   | ✅   |
| Vocabulary | **없음**            | ❌   |

**문제점**:

- 단어집(`/browse`)에서 TermEditor를 잘못 사용 중
- VocabularyEntry와 TermEntry는 완전히 다른 필드 구조
- TermEditor: `termName`, `columnName`, `domainName`
- VocabularyEntry: `standardName`, `abbreviation`, `englishName`, `description`, `isFormalWord` 등

**해결 방안**: VocabularyEditor.svelte 신규 생성

```typescript
// src/lib/components/VocabularyEditor.svelte
interface Props {
	entry?: Partial<VocabularyEntry>;
	isEditMode?: boolean;
	serverError?: string;
}

// 필수 편집 필드:
// - standardName (표준단어명)
// - abbreviation (영문약어)
// - englishName (영문명)
// - description (설명)
// - isFormalWord (형식단어여부)
// - domainCategory (도메인분류명)
// - synonyms (이음동의어)
```

#### B3: 도메인 검색 TypeError

**현재 코드:**

```typescript
entry.logicalDataType.toLowerCase().includes(query);
```

**문제점**: `logicalDataType`이 undefined일 때 에러 발생

**해결 방안**: Optional chaining 사용

```typescript
entry.logicalDataType?.toLowerCase().includes(query);
```

#### B4: 용어 XLSX 파일명 형식 불일치

**다른 API 파일명 형식:**

| API             | 파일명 형식                              | 예시                                 |
| --------------- | ---------------------------------------- | ------------------------------------ |
| Vocabulary      | `vocabulary_${YYYY-MM-DD}.xlsx`          | `vocabulary_2024-12-12.xlsx`         |
| Domain          | `domain_${YYYY-MM-DD}.xlsx`              | `domain_2024-12-12.xlsx`             |
| **Term (현재)** | `term_${safeFilename}_${timestamp}.xlsx` | `term_term_2024-12-12T10-30-00.xlsx` |

**문제점:**

1. `term_` prefix 중복 (safeFilename이 'term'일 때)
2. timestamp 형식이 다름 (ISO 전체 vs YYYY-MM-DD만)

**해결 방안**: 다른 API와 동일한 형식으로 통일

```typescript
const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const downloadFilename = `${safeFilename}_${currentDate}.xlsx`;
// 결과: term_2024-12-12.xlsx
```

### 영향 범위

- [x] UI 레이어 (components)
- [x] API 레이어 (routes/api)

### 작업 체크리스트

- [x] 문서 반영 완료
- [x] B1, B2: VocabularyEditor.svelte 신규 생성
- [x] B1, B2: browse/+page.svelte에서 VocabularyEditor 사용하도록 수정
- [x] B3: 도메인 API 검색 로직 수정 (optional chaining)
- [x] B4: 용어 다운로드 파일명 수정 (YYYY-MM-DD, prefix 제거)
- [ ] 테스트 완료

---

## 완료된 요구사항

## REQ-004: Phase 4 - Low Priority 이슈 해결

- **상태**: ✅ 완료
- **생성일**: 2024-12-12
- **완료일**: 2024-12-12

### 설명

Low Priority 레벨의 이슈들을 해결하여 코드 품질 및 개발 편의성을 향상합니다.

### 포함 이슈

| 이슈 | 제목              | 상태    |
| ---- | ----------------- | ------- |
| #L1  | console 로깅 정리 | ⚠️ 부분 |
| #L2  | window any 타입   | ✅ 완료 |

### 제외 항목

- ~~#L3: 테스트 코드 없음~~ - 현재 단계에서 제외

---

## REQ-003: Phase 3 - Medium Priority 이슈 해결

- **상태**: ✅ 완료
- **생성일**: 2024-12-12
- **완료일**: 2024-12-12

### 설명

Medium Priority 레벨의 이슈들을 해결하여 코드 중복 제거 및 유지보수성 향상을 진행합니다.

### 포함 이슈

| 이슈 | 제목                   | 상태    |
| ---- | ---------------------- | ------- |
| #M6  | 네이밍 컨벤션 불일치   | ✅ 완료 |
| #M11 | 데이터 변환 로직 중복  | ✅ 완료 |
| #M2  | 파일 관리 함수 중복    | ✅ 완료 |
| #M5  | XLSX 파싱 중복         | ✅ 완료 |
| #M1  | load/save 함수 중복    | ⚠️ 부분 |
| #M9  | file-handler 파일 크기 | ⚠️ 부분 |
| #M12 | 데이터 로드 패턴 중복  | ✅ 완료 |
| #M13 | xlsx-parser 파일 크기  | ⚠️ 부분 |
| #M3  | Table 컴포넌트 중복    | ⚠️ 부분 |
| #M4  | FileManager 중복       | ⚠️ 부분 |
| #M7  | 상태 관리 중복         | ⚠️ 부분 |
| #M8  | TermEditor 이중 역할   | ⚠️ 부분 |
| #M10 | Table Props Drilling   | ⚠️ 부분 |
| #M14 | 상태 관리 패턴 불일치  | ⚠️ 부분 |

---

## REQ-001: Phase 1 - Critical 이슈 해결

- **상태**: ✅ 완료
- **생성일**: 2024-12-12
- **완료일**: 2024-12-12

### 설명

Critical 레벨의 이슈들을 해결하여 데이터 손실 위험, 보안 취약점, 런타임 크래시 가능성을 제거합니다.

### 포함 이슈

| 이슈 | 제목                         | 상태    |
| ---- | ---------------------------- | ------- |
| #C10 | Path Traversal 취약점        | ✅ 완료 |
| #C2  | JSON 파싱 타입 검증 없음     | ✅ 완료 |
| #C1  | 동시성 문제 (파일 락)        | ✅ 완료 |
| #C5  | 파일 쓰기 실패 시 롤백 없음  | ✅ 완료 |
| #C3  | FormData null 체크 부족      | ✅ 완료 |
| #C4  | 부분 업데이트 undefined 처리 | ✅ 완료 |
| #C7  | Non-null assertion 남용      | ✅ 완료 |
| #C8  | 파일 읽기 실패 처리          | ✅ 완료 |
| #C6  | 참조 무결성 검증 없음        | ✅ 완료 |

### 제외 항목

- ~~#C9: 인증/권한 체크 부재~~ - 현재 단계에서 제외

---

## REQ-002: Phase 2 - High Priority 이슈 해결

- **상태**: ✅ 완료
- **생성일**: 2024-12-12
- **완료일**: 2024-12-12

### 설명

High Priority 레벨의 이슈들을 해결하여 성능 개선 및 코드 품질 향상을 진행합니다.

### 포함 이슈

| 이슈 | 제목                    | 상태    |
| ---- | ----------------------- | ------- |
| #H3  | Term API N+1 문제       | ✅ 완료 |
| #H4  | 데이터 검증 로직 부족   | ✅ 완료 |
| #H7  | 전체 파일 메모리 로드   | ✅ 완료 |
| #H1  | 하위 호환성 필드 중복   | ✅ 완료 |
| #H2  | History API 유니온 타입 | ✅ 완료 |
| #H5  | Domain API POST 없음    | ✅ 완료 |
