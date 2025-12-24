# 📚 문서 디렉토리

이 디렉토리는 프로젝트의 문서를 체계적으로 관리하기 위한 구조입니다.

## 📁 디렉토리 구조

| 폴더/파일           | 용도                                 | 의존성                     |
| ------------------- | ------------------------------------ | -------------------------- |
| **CONVENTIONS.md**  | 개발 컨벤션 및 코딩 스타일 가이드    | - (독립 문서)              |
| **REQUIREMENTS.md** | 변경 요구사항 정의 및 상태 관리      | - (시작점)                 |
| **analysis/**       | 프로젝트 구조 및 레이어 분석         | 소스 코드 기반 (기반 문서) |
| **specs/**          | 데이터 모델, API 레퍼런스, 기능 명세 | analysis/ 기반             |
| **issues/**         | 이슈 및 버그 추적                    | analysis/ 기반             |
| **features/**       | 기능별 상세 분석                     | analysis/ + specs/ 기반    |
| **plans/**          | 리팩토링 및 구현 계획                | issues/ 기반               |
| **template/**       | 문서 업데이트 가이드                 | -                          |

## 🔄 문서 관리 워크플로우

```
1. REQUIREMENTS.md에 요구사항 정의
            ↓
2. 전체 문서 순차 반영 (analysis → specs → issues → plans)
            ↓
3. plans 실행 (코드 구현)
            ↓
4. 문서 현행화
```

## 💡 사용법

### 새 요구사항 추가 시

1. `REQUIREMENTS.md`에 요구사항 작성
2. 아래 명령으로 문서 반영:

```
REQUIREMENTS.md에 REQ-XXX 추가했어.
@docs/template/doc-update-guide.md 참고해서 전체 문서에 반영해줘
```

### 작업 완료 후

```
REQ-XXX 작업 완료했어.
@docs/template/doc-update-guide.md 참고해서 문서 현행화해줘
```

## 📊 문서 의존성

```
REQUIREMENTS.md (시작점)
       ↓
analysis/ (기반 문서)
       ↓
specs/ + issues/ + features/ (파생 문서)
       ↓
plans/ (실행 계획)
```

자세한 의존성 정보: [template/doc-update-guide.md](./template/doc-update-guide.md)
