# DbManager

이 프로젝트는 SvelteKit을 기반으로 구축된 데이터 및 단어 관리 시스템입니다. 사용자가 데이터를 쉽게 조회, 검색 및 관리할 수 있는 직관적인 웹 인터페이스를 제공합니다.

## ✨ 주요 기능

- **단어집 관리**:
  - 등록된 모든 단어를 페이지네이션이 적용된 테이블 형태로 조회할 수 있습니다.
  - **다중 파일 지원**: 여러 개의 단어집 파일(`.json`)을 생성하고 관리할 수 있습니다.
  - **동적 기본 파일 선택**: 앱 실행 시 사용 가능한 단어집 파일을 자동으로 감지하여 선택합니다.
- **금지어 관리**:
  - **범위별 관리**: 전체(Global) 또는 특정 단어집 파일별로 금지어를 설정할 수 있습니다.
  - **중복 방지**: 범위 내 중복된 금지어 등록을 방지합니다.
- **단어집 업로드**: XLSX, CSV 등 다양한 형식의 파일을 드래그 앤 드롭으로 간편하게 업로드하여 단어 데이터를 시스템에 등록할 수 있습니다.
- **파일 관리**: 웹 인터페이스에서 직접 새로운 단어집 파일을 생성하거나 이름을 변경할 수 있습니다.

## 기술 스택

- **프레임워크**: SvelteKit
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **빌드 도구**: Vite
- **패키지 매니저**: pnpm
- **컨테이너**: Docker

## 📁 프로젝트 구조

```
/
├── src/
│   ├── lib/
│   │   ├── components/  # 재사용 가능한 Svelte 컴포넌트 (VocabularyFileManager, ForbiddenWordManager 등)
│   │   ├── stores/      # Svelte Stores (vocabularyStore 등)
│   │   ├── types/       # TypeScript 타입 정의
│   │   └── utils/       # 유틸리티 함수 (file-handler, parser 등)
│   ├── routes/          # SvelteKit의 파일 기반 라우팅
│   │   ├── api/         # 서버 API 엔드포인트 (vocabulary, forbidden-words 등)
│   │   └── ...          # 각 페이지 경로
│   └── app.html         # 메인 HTML 템플릿
├── static/
│   ├── data/            # 데이터 파일 저장소 (vocabulary.json 등)
│   └── ...              # 정적 에셋
├── package.json         # 프로젝트 의존성 및 스크립트
├── svelte.config.js     # SvelteKit 설정
├── tailwind.config.js   # Tailwind CSS 설정
├── Dockerfile           # Docker 이미지 빌드 설정
└── docker-compose.yml   # Docker 컨테이너 실행 설정
```

## 🚀 시작 가이드

### 전제 조건

- [Node.js](https://nodejs.org/) (v20 이상 권장)
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (선택 사항)

### 로컬 설치 및 실행

1.  **저장소 복제:**

    ```bash
    git clone https://github.com/chw970320/DbManager.git
    cd DbManager
    ```

2.  **의존성 설치:**

    ```bash
    pnpm install
    ```

3.  **개발 서버 실행:**

    ```bash
    pnpm run dev
    ```

4.  브라우저에서 `http://localhost:5173`으로 접속하세요.

### Docker로 실행

1.  **Docker 컨테이너 실행:**

    ```bash
    docker-compose up --build
    ```

2.  브라우저에서 `http://localhost:63000`으로 접속하세요. (포트 매핑: 63000 -> 3000)

## 📜 사용 가능한 스크립트

- `pnpm run dev`: 개발 모드로 애플리케이션을 실행합니다.
- `pnpm run build`: 프로덕션 용으로 애플리케이션을 빌드합니다.
- `pnpm run preview`: 프로덕션 빌드를 로컬에서 미리 봅니다.
- `pnpm run check`: TypeScript와 Svelte 코드의 타입 오류를 검사합니다.
- `pnpm run lint`: ESLint로 코드 스타일을 검사합니다.
- `pnpm run format`: Prettier로 전체 코드의 형식을 맞춥니다.
