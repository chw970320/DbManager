# 📋 문서 업데이트 템플릿

이 폴더에는 Cursor AI가 문서 업데이트 작업을 수행할 때 참조하는 가이드가 포함되어 있습니다.

## 📁 파일 목록

| 파일                  | 용도                                  |
| --------------------- | ------------------------------------- |
| `doc-update-guide.md` | 문서 업데이트 순서, 규칙, 의존성 정보 |

## 💡 사용법

### 요구사항 반영 시

```
REQUIREMENTS.md에 REQ-001 추가했어.
@docs/template/doc-update-guide.md 참고해서 전체 문서에 반영하고 plans 업데이트해줘
```

### 작업 완료 후 현행화 시

```
REQ-001 관련 작업 완료했어.
@docs/template/doc-update-guide.md 참고해서 문서 현행화해줘
```

### 특정 이슈 해결 후

```
#C10 이슈 해결했어.
@docs/template/doc-update-guide.md 참고해서 관련 문서 업데이트해줘
```

## 🔄 전체 워크플로우

```
REQUIREMENTS.md에 요구사항 정의
            ↓
doc-update-guide.md 참고하여 문서 반영
            ↓
plans/ 생성/업데이트
            ↓
plans 실행 (코드 구현)
            ↓
doc-update-guide.md 참고하여 문서 현행화
```
