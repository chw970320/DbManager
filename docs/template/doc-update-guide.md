# 📘 문서 업데이트 가이드

이 가이드는 REQUIREMENTS.md의 요구사항을 전체 문서에 반영하고, 작업 완료 후 문서를 현행화하는 규칙을 정의합니다.

---

## 1. 요구사항 반영 (REQUIREMENTS → 문서)

REQUIREMENTS.md에 새 요구사항이 추가되면 아래 순서대로 문서를 업데이트합니다.

### 업데이트 순서

```
1. analysis/ (기반 문서)
   ├── 01-project-structure.md  ← 구조/설정 변경 시
   ├── 02-data-layer.md         ← 타입/데이터 변경 시
   ├── 03-api-layer.md          ← API 변경 시
   ├── 04-ui-layer.md           ← UI 변경 시
   └── 05-data-flow.md          ← 흐름 변경 시
       ↓
2. specs/ (스펙 문서)
   ├── data-model.md            ← 02-data-layer 변경 시
   ├── api-reference.md         ← 03-api-layer 변경 시
   └── features.md              ← 기능 상태 변경 시
       ↓
3. issues/ (이슈 문서)
   ├── critical.md              ← 관련 이슈 업데이트
   ├── high-priority.md
   ├── medium-priority.md
   └── low-priority.md
       ↓
4. features/ (기능 상세)
   └── *-detail.md              ← 관련 기능 문서 업데이트
       ↓
5. plans/ (실행 계획)
   ├── refactoring-plan.md      ← 전체 로드맵 업데이트
   └── implementation-plan.md   ← 실행 체크리스트 업데이트
```

### 영향 범위별 업데이트 대상

| 영향 범위     | 업데이트할 analysis       | 업데이트할 specs                  |
| ------------- | ------------------------- | --------------------------------- |
| 데이터 레이어 | `02-data-layer.md`        | `data-model.md`, `features.md`    |
| API 레이어    | `03-api-layer.md`         | `api-reference.md`, `features.md` |
| UI 레이어     | `04-ui-layer.md`          | `features.md`                     |
| 설정/구조     | `01-project-structure.md` | `features.md`                     |

---

## 2. 작업 완료 후 문서 현행화

plans 실행이 완료되면 아래 순서로 문서를 현행화합니다.

### 현행화 체크리스트

```markdown
- [ ] REQUIREMENTS.md 상태 업데이트 (🟣 실행중 → ✅ 완료)
- [ ] issues/ 해결된 이슈 완료 표시
- [ ] plans/implementation-plan.md 체크박스 체크
- [ ] analysis/ 문서 코드와 동기화 확인
- [ ] specs/ 문서 최신화 확인
- [ ] features/ 관련 문서 업데이트
```

### 이슈 완료 표시 형식

```markdown
## ~~이슈 #C10: [제목]~~ ✅ 해결됨

> **해결일**: YYYY-MM-DD
> **관련 요구사항**: REQ-XXX
```

### implementation-plan.md 체크 형식

```markdown
- [x] #C10: [이슈 설명] ✅
```

---

## 3. 문서 의존성 참조

### analysis/ → 파생 문서 의존성

| analysis 문서             | 영향받는 파생 문서                                           |
| ------------------------- | ------------------------------------------------------------ |
| `01-project-structure.md` | `features.md`                                                |
| `02-data-layer.md`        | `data-model.md`, `features.md`, `*-detail.md`, `issues/*`    |
| `03-api-layer.md`         | `api-reference.md`, `features.md`, `*-detail.md`, `issues/*` |
| `04-ui-layer.md`          | `features.md`, `*-detail.md`, `issues/*`                     |
| `05-data-flow.md`         | `*-detail.md`, `issues/*`                                    |

### 코드 경로 → analysis 문서 매핑

| 코드 경로                                               | 관련 analysis 문서        |
| ------------------------------------------------------- | ------------------------- |
| `src/lib/types/`, `src/lib/utils/file-handler.ts`       | `02-data-layer.md`        |
| `src/routes/api/`                                       | `03-api-layer.md`         |
| `src/routes/`, `src/lib/components/`, `src/lib/stores/` | `04-ui-layer.md`          |
| `package.json`, 설정 파일                               | `01-project-structure.md` |

---

## 4. 사용 예시

### 요구사항 반영

```
REQUIREMENTS.md에 REQ-001 추가했어.
@docs/template/doc-update-guide.md 참고해서 전체 문서에 반영하고 plans 업데이트해줘
```

### 작업 완료 후 현행화

```
REQ-001 관련 작업 완료했어.
@docs/template/doc-update-guide.md 참고해서 문서 현행화해줘
```

### 특정 이슈 해결 후

```
#C10 이슈 해결했어.
@docs/template/doc-update-guide.md 참고해서 관련 문서 업데이트해줘
```
