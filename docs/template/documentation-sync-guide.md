# 문서 현행화 자동화 지침

이 문서는 docs 폴더 내 문서를 자동으로 현행화하기 위한 지침과 자동화 계획을 정의합니다.

## 목차

1. [개요](#개요)
2. [문서 현행화 자동화 전략](#문서-현행화-자동화-전략)
3. [문서 간 의존성 관리](#문서-간-의존성-관리)
4. [코드 변경 감지 및 문서 업데이트](#코드-변경-감지-및-문서-업데이트)
5. [문서 일관성 검증](#문서-일관성-검증)
6. [자동화 도구 및 스크립트](#자동화-도구-및-스크립트)
7. [워크플로우 통합](#워크플로우-통합)
8. [체크리스트](#체크리스트)

---

## 개요

### 목적

코드 변경 시 관련 문서를 자동으로 감지하고 업데이트를 제안하거나 자동으로 반영하여 문서와 코드 간의 동기화를 유지합니다.

### 범위

- **대상 문서**: `docs/` 폴더 내 모든 문서
- **대상 코드**: `src/` 폴더 내 소스 코드
- **자동화 레벨**:
  - Level 1: 변경 감지 및 알림 (필수)
  - Level 2: 자동 업데이트 제안 (권장)
  - Level 3: 자동 업데이트 실행 (선택)

### 문서 의존성 구조 (경량화 후)

```
PROJECT_DEEP_ANALYSIS.md (프로젝트 본질)
       ↓
QUICK_START.md (빠른 시작)
       ↓
USER_GUIDE.md (상세 가이드)
       ↓
specs/ (기술 문서: API 레퍼런스, 데이터 모델)
```

**핵심 원칙**: 코드가 문서. 코드로 알 수 있는 것은 문서화하지 않음.

---

## 문서 현행화 자동화 전략

### 전략 1: 코드 기반 문서 생성 (Code-First Documentation)

코드에서 직접 추출 가능한 정보는 자동으로 문서화합니다.

#### 대상 정보

1. **API 엔드포인트**
   - 엔드포인트 경로
   - HTTP 메서드
   - 요청/응답 타입
   - 파라미터 정의

2. **타입 정의**
   - 인터페이스 필드
   - 타입 제약조건
   - 기본값

3. **파일 구조**
   - 디렉토리 트리
   - 파일 목록
   - 컴포넌트/함수 목록

#### 구현 방법

```typescript
// scripts/generate-api-docs.ts
import { glob } from 'glob';
import { parse } from '@typescript-eslint/parser';

// API 라우트 파일 스캔
const apiFiles = await glob('src/routes/api/**/+server.ts');

// 각 파일에서 엔드포인트 정보 추출
for (const file of apiFiles) {
	const content = await readFile(file);
	const ast = parse(content);
	// 엔드포인트 정보 추출
	// docs/specs/api-reference.md 업데이트
}
```

### 전략 2: 변경 감지 기반 알림 (Change Detection)

코드 변경 시 관련 문서를 감지하고 업데이트 필요 여부를 알립니다.

#### 감지 대상

1. **파일 추가/삭제**
   - 새 API 엔드포인트 추가 → `specs/api-reference.md` 업데이트 필요
   - 새 타입 정의 추가 → `specs/data-model.md` 업데이트 필요

2. **타입 변경**
   - 인터페이스 필드 추가/삭제 → `specs/data-model.md` 업데이트 필요
   - 타입 정의 변경 → `specs/data-model.md` 및 `AI_CONTEXT.md` 업데이트 필요

3. **API 시그니처 변경**
   - 엔드포인트 파라미터 변경 → `specs/api-reference.md` 업데이트 필요

#### 구현 방법

```typescript
// scripts/detect-doc-changes.ts
import { execSync } from 'child_process';

// Git diff로 변경된 파일 감지
const changedFiles = execSync('git diff --name-only HEAD~1').toString().split('\n').filter(Boolean);

// 변경된 파일에 따라 관련 문서 매핑
const docMapping = {
	'src/routes/api/**': ['docs/specs/api-reference.md'],
	'src/lib/types/**': ['docs/specs/data-model.md', 'docs/AI_CONTEXT.md'],
	'src/lib/components/**': [] // UI 컴포넌트는 코드가 문서이므로 별도 문서화 불필요
};

// 관련 문서 업데이트 필요 알림
```

### 전략 3: 문서 템플릿 기반 검증 (Template-Based Validation)

문서에 포함되어야 할 필수 섹션을 템플릿으로 정의하고 검증합니다.

#### 템플릿 정의

```markdown
<!-- docs/template/api-endpoint-template.md -->

## {METHOD} {ENDPOINT}

### 설명

{설명}

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
| -------- | ---- | ---- | ------ | ---- |

{파라미터 테이블}

### 요청 예시

{예시 코드}

### 응답 예시

{응답 예시}

### 에러 코드

{에러 코드 목록}
```

---

## 문서 간 의존성 관리

### 의존성 그래프 (경량화 후)

```
PROJECT_DEEP_ANALYSIS.md (프로젝트 본질)
    ↓
    ├─→ QUICK_START.md
    ├─→ USER_GUIDE.md
    └─→ AI_CONTEXT.md

QUICK_START.md
    ↓
    └─→ USER_GUIDE.md

specs/data-model.md
    ↓
    └─→ AI_CONTEXT.md (데이터 모델 핵심)

specs/api-reference.md
    ↓
    └─→ AI_CONTEXT.md (비즈니스 로직)

코드 변경
    ↓
    ├─→ specs/api-reference.md (API 변경 시)
    ├─→ specs/data-model.md (타입 변경 시)
    └─→ AI_CONTEXT.md (본질 변경 시)
```

### 의존성 체크 자동화

```typescript
// scripts/check-doc-dependencies.ts

interface DocDependency {
	source: string;
	target: string;
	type: 'references' | 'depends_on' | 'generates';
}

const dependencies: DocDependency[] = [
	{
		source: 'docs/PROJECT_DEEP_ANALYSIS.md',
		target: 'docs/QUICK_START.md',
		type: 'references'
	},
	{
		source: 'docs/QUICK_START.md',
		target: 'docs/USER_GUIDE.md',
		type: 'references'
	},
	{
		source: 'docs/specs/data-model.md',
		target: 'docs/AI_CONTEXT.md',
		type: 'references'
	}
	// ...
];

// 의존성 체크
function checkDependencies() {
	for (const dep of dependencies) {
		const sourceContent = readFile(dep.source);
		const targetExists = existsSync(dep.target);

		if (!targetExists) {
			console.warn(`⚠️  ${dep.source} references ${dep.target} but it doesn't exist`);
		}

		// 참조 링크 확인
		if (!sourceContent.includes(`](${dep.target})`)) {
			console.warn(`⚠️  ${dep.source} should reference ${dep.target}`);
		}
	}
}
```

---

## 코드 변경 감지 및 문서 업데이트

### Git Hooks 통합

#### pre-commit Hook

코드 커밋 전 문서 일관성 검증:

```bash
#!/bin/sh
# .git/hooks/pre-commit

# 문서 일관성 검증
npm run docs:validate

# 실패 시 커밋 차단
if [ $? -ne 0 ]; then
  echo "❌ 문서 검증 실패. 커밋을 중단합니다."
  exit 1
fi
```

#### post-commit Hook

코드 커밋 후 관련 문서 업데이트 제안:

```bash
#!/bin/sh
# .git/hooks/post-commit

# 변경된 파일 감지
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD)

# 관련 문서 업데이트 필요 여부 확인
npm run docs:check-changes -- "$CHANGED_FILES"
```

### CI/CD 통합

#### GitHub Actions Workflow

```yaml
# .github/workflows/docs-sync.yml
name: Documentation Sync

on:
  pull_request:
    paths:
      - 'src/**'
      - 'docs/**'

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check documentation consistency
        run: npm run docs:validate

      - name: Detect documentation updates needed
        run: npm run docs:check-changes

      - name: Comment PR with update suggestions
        uses: actions/github-script@v6
        with:
          script: |
            const suggestions = require('./docs-update-suggestions.json');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              body: `## 📚 문서 업데이트 제안\n\n${suggestions.map(s => `- [ ] ${s}`).join('\n')}`
            });
```

---

## 문서 일관성 검증

### 검증 규칙

#### 1. 필수 섹션 존재 확인

```typescript
// scripts/validate-doc-structure.ts

const requiredSections = {
	'docs/specs/api-reference.md': [
		'## Vocabulary API',
		'## Domain API',
		'## Term API',
		'## 에러 코드'
	],
	'docs/specs/data-model.md': ['## VocabularyEntry', '## DomainEntry', '## TermEntry']
};

function validateDocStructure(file: string) {
	const content = readFile(file);
	const required = requiredSections[file] || [];

	for (const section of required) {
		if (!content.includes(section)) {
			throw new Error(`❌ ${file}에 필수 섹션 "${section}"이 없습니다.`);
		}
	}
}
```

#### 2. 링크 유효성 검증

```typescript
// scripts/validate-doc-links.ts

function validateLinks(file: string) {
	const content = readFile(file);
	const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
	const links: string[] = [];

	let match;
	while ((match = linkRegex.exec(content)) !== null) {
		const linkPath = match[2];
		if (linkPath.startsWith('./') || linkPath.startsWith('../')) {
			const resolvedPath = resolve(dirname(file), linkPath);
			if (!existsSync(resolvedPath)) {
				console.warn(`⚠️  ${file}: 링크가 깨짐 - ${linkPath}`);
			}
		}
	}
}
```

#### 3. 날짜/버전 정보 검증

```typescript
// scripts/validate-doc-metadata.ts

function validateMetadata(file: string) {
	const content = readFile(file);

	// 마지막 업데이트 날짜 확인
	const lastUpdateMatch = content.match(/마지막 업데이트[:\s]+(\d{4}-\d{2}-\d{2})/);
	if (lastUpdateMatch) {
		const updateDate = new Date(lastUpdateMatch[1]);
		const daysSinceUpdate = (Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24);

		if (daysSinceUpdate > 90) {
			console.warn(`⚠️  ${file}: 90일 이상 업데이트되지 않음 (${daysSinceUpdate.toFixed(0)}일 전)`);
		}
	}
}
```

---

## 자동화 도구 및 스크립트

### 스크립트 구조

```
scripts/
├── docs/
│   ├── generate-api-docs.ts      # API 문서 자동 생성
│   ├── generate-type-docs.ts     # 타입 문서 자동 생성
│   ├── detect-doc-changes.ts     # 문서 변경 감지
│   ├── validate-doc-structure.ts  # 문서 구조 검증
│   ├── validate-doc-links.ts     # 링크 유효성 검증
│   ├── check-doc-dependencies.ts # 의존성 체크
│   └── update-doc-metadata.ts    # 메타데이터 업데이트
└── package.json                  # npm 스크립트 정의
```

### npm 스크립트

```json
{
	"scripts": {
		"docs:generate": "tsx scripts/docs/generate-api-docs.ts && tsx scripts/docs/generate-type-docs.ts",
		"docs:validate": "tsx scripts/docs/validate-doc-structure.ts && tsx scripts/docs/validate-doc-links.ts",
		"docs:check-changes": "tsx scripts/docs/detect-doc-changes.ts",
		"docs:check-deps": "tsx scripts/docs/check-doc-dependencies.ts",
		"docs:update-metadata": "tsx scripts/docs/update-doc-metadata.ts",
		"docs:sync": "npm run docs:generate && npm run docs:validate && npm run docs:update-metadata"
	}
}
```

### 주요 스크립트 상세

#### 1. API 문서 자동 생성

```typescript
// scripts/docs/generate-api-docs.ts

import { glob } from 'glob';
import { readFileSync, writeFileSync } from 'fs';
import { parse } from '@typescript-eslint/parser';

interface ApiEndpoint {
	method: string;
	path: string;
	description?: string;
	params?: Array<{ name: string; type: string; required: boolean }>;
}

async function generateApiDocs() {
	const apiFiles = await glob('src/routes/api/**/+server.ts');
	const endpoints: ApiEndpoint[] = [];

	for (const file of apiFiles) {
		const content = readFileSync(file, 'utf-8');
		const ast = parse(content, { sourceType: 'module' });

		// AST에서 엔드포인트 정보 추출
		// ...

		endpoints.push({
			method: 'GET',
			path: '/api/vocabulary'
			// ...
		});
	}

	// docs/specs/api-reference.md 업데이트
	updateApiReference(endpoints);
}
```

#### 2. 문서 변경 감지

```typescript
// scripts/docs/detect-doc-changes.ts

import { execSync } from 'child_process';

const DOC_MAPPING: Record<string, string[]> = {
	'src/routes/api/vocabulary': ['docs/specs/api-reference.md'],
	'src/lib/types/vocabulary.ts': ['docs/specs/data-model.md', 'docs/AI_CONTEXT.md'],
	'src/lib/types/domain.ts': ['docs/specs/data-model.md', 'docs/AI_CONTEXT.md'],
	'src/lib/types/term.ts': ['docs/specs/data-model.md', 'docs/AI_CONTEXT.md']
	// 컴포넌트는 코드가 문서이므로 별도 문서화 불필요
};

function detectChanges(changedFiles: string[]) {
	const docsToUpdate: Set<string> = new Set();

	for (const file of changedFiles) {
		for (const [pattern, docs] of Object.entries(DOC_MAPPING)) {
			if (file.includes(pattern)) {
				docs.forEach((doc) => docsToUpdate.add(doc));
			}
		}
	}

	if (docsToUpdate.size > 0) {
		console.log('📚 다음 문서 업데이트가 필요합니다:');
		Array.from(docsToUpdate).forEach((doc) => {
			console.log(`  - ${doc}`);
		});
	}

	return Array.from(docsToUpdate);
}
```

---

## 워크플로우 통합

### 개발자 워크플로우

```
1. 코드 변경
   ↓
2. Git 커밋 (pre-commit hook)
   ↓
3. 문서 검증 실행
   ↓
4. 검증 실패 시 커밋 차단
   ↓
5. 검증 성공 시 커밋 완료
   ↓
6. post-commit hook에서 문서 업데이트 제안
```

### 문서 업데이트 워크플로우

```
1. 코드 변경 감지
   ↓
2. 관련 문서 식별
   ↓
3. 문서 업데이트 필요 여부 확인
   ↓
4. 자동 업데이트 가능한 부분 업데이트
   ↓
5. 수동 업데이트 필요한 부분 알림
   ↓
6. PR에 문서 업데이트 제안 코멘트
```

---

## 체크리스트

### 개발자 체크리스트

코드 변경 시 다음을 확인하세요:

- [ ] 변경된 파일이 문서에 반영되어 있는가?
- [ ] API 엔드포인트 변경 시 `docs/specs/api-reference.md` 업데이트
- [ ] 타입 정의 변경 시 `docs/specs/data-model.md` 및 `docs/AI_CONTEXT.md` 업데이트
- [ ] 프로젝트 본질 변경 시 `docs/PROJECT_DEEP_ANALYSIS.md` 및 `docs/AI_CONTEXT.md` 업데이트
- [ ] 문서 링크가 유효한가?
- [ ] 문서의 "마지막 업데이트" 날짜 갱신

### 문서 리뷰 체크리스트

PR 리뷰 시 다음을 확인하세요:

- [ ] 코드 변경에 대한 문서 업데이트가 포함되어 있는가?
- [ ] 문서 구조가 템플릿을 따르는가?
- [ ] 문서 간 의존성이 올바른가?
- [ ] 문서 링크가 모두 유효한가?
- [ ] 문서의 예시 코드가 최신 코드와 일치하는가?

---

## 구현 우선순위

### Phase 1: 기본 감지 및 검증 (필수)

- [ ] 문서 구조 검증 스크립트
- [ ] 링크 유효성 검증 스크립트
- [ ] Git hooks 통합
- [ ] CI/CD 통합

**예상 시간**: 16시간

### Phase 2: 자동 생성 (권장)

- [ ] API 문서 자동 생성
- [ ] 타입 문서 자동 생성
- [ ] 파일 구조 자동 생성

**예상 시간**: 24시간

### Phase 3: 고급 자동화 (선택)

- [ ] 변경 감지 기반 자동 업데이트
- [ ] 문서 템플릿 기반 검증
- [ ] 의존성 그래프 시각화

**예상 시간**: 32시간

---

## 참고 자료

- [Documentation as Code](https://www.writethedocs.org/guide/docs-as-code/)
- [Git Hooks Documentation](https://git-scm.com/docs/githooks)
- [TypeScript AST API](https://github.com/typescript-eslint/typescript-eslint)

---

**마지막 업데이트**: 2024-12-12
