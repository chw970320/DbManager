# 기능 명세서

이 문서는 DbManager 프로젝트에 구현된 모든 기능을 정리합니다.

**마지막 업데이트**: 2024-01-01

---

## 목차

1. [단어집 관리 (Vocabulary)](#1-단어집-관리-vocabulary)
2. [도메인 관리 (Domain)](#2-도메인-관리-domain)
3. [용어 관리 (Term)](#3-용어-관리-term)
4. [검색 기능](#4-검색-기능)
5. [파일 관리](#5-파일-관리)
6. [히스토리 관리](#6-히스토리-관리)
7. [설정 관리](#7-설정-관리)
8. [인증 및 권한](#8-인증-및-권한)

---

## 1. 단어집 관리 (Vocabulary)

### 1.1 단어 조회

**카테고리**: 데이터 조회

**설명**: 단어집 데이터를 페이지네이션, 정렬, 필터링하여 조회합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/browse/+page.svelte`
  - `src/lib/components/VocabularyTable.svelte`
  - `src/lib/components/SearchBar.svelte`

- **API 엔드포인트**:
  - `GET /api/vocabulary` (`src/routes/api/vocabulary/+server.ts`)

- **DB 모델/타입**:
  - `VocabularyEntry` (`src/lib/types/vocabulary.ts`)
  - `VocabularyData` (`src/lib/types/vocabulary.ts`)

**발견된 이슈**:

- [#H7](docs/issues/high-priority.md#이슈-h7-전체-파일을-메모리로-로드하는-성능-문제): 전체 파일을 메모리로 로드하는 성능 문제
- [#L8](docs/issues/low-priority.md#이슈-l8-성능-최적화-기회-불필요한-반복문): 성능 최적화 기회

---

### 1.2 단어 검색

**카테고리**: 데이터 조회

**설명**: 검색어를 입력하여 단어집을 검색합니다. 부분 일치 및 정확 일치 검색을 지원합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/browse/+page.svelte`
  - `src/lib/components/SearchBar.svelte`

- **API 엔드포인트**:
  - `GET /api/search` (`src/routes/api/search/+server.ts`)

- **DB 모델/타입**:
  - `SearchQuery` (`src/lib/types/vocabulary.ts`)
  - `SearchResult` (`src/lib/types/vocabulary.ts`)

**발견된 이슈**:

- [#H7](docs/issues/high-priority.md#이슈-h7-전체-파일을-메모리로-로드하는-성능-문제): 전체 파일을 메모리로 로드하는 성능 문제

---

### 1.3 단어 추가

**카테고리**: 데이터 생성

**설명**: 새로운 단어를 단어집에 추가합니다. 필수 필드 검증, 금지어 검사, 중복 검사를 수행합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/browse/+page.svelte`
  - `src/lib/components/TermEditor.svelte`

- **API 엔드포인트**:
  - `POST /api/vocabulary` (`src/routes/api/vocabulary/+server.ts`)

- **DB 모델/타입**:
  - `VocabularyEntry` (`src/lib/types/vocabulary.ts`)

**발견된 이슈**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제로 인한 데이터 손실 위험
- [#C2](docs/issues/critical.md#이슈-c2-json-파싱-결과에-대한-런타임-타입-검증-없음): JSON 파싱 결과에 대한 런타임 타입 검증 없음
- [#H4](docs/issues/high-priority.md#이슈-h4-데이터-검증-로직-부족-타입-형식-참조-무결성): 데이터 검증 로직 부족

---

### 1.4 단어 수정

**카테고리**: 데이터 수정

**설명**: 기존 단어의 정보를 수정합니다. ID를 기반으로 엔트리를 찾아 업데이트합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/browse/+page.svelte`
  - `src/lib/components/TermEditor.svelte`

- **API 엔드포인트**:
  - `PUT /api/vocabulary` (`src/routes/api/vocabulary/+server.ts`)

- **DB 모델/타입**:
  - `VocabularyEntry` (`src/lib/types/vocabulary.ts`)

**발견된 이슈**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제로 인한 데이터 손실 위험
- [#C2](docs/issues/critical.md#이슈-c2-json-파싱-결과에-대한-런타임-타입-검증-없음): JSON 파싱 결과에 대한 런타임 타입 검증 없음

---

### 1.5 단어 삭제

**카테고리**: 데이터 삭제

**설명**: 단어를 삭제합니다. ID를 기반으로 엔트리를 찾아 배열에서 제거합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/browse/+page.svelte`
  - `src/lib/components/TermEditor.svelte`

- **API 엔드포인트**:
  - `DELETE /api/vocabulary` (`src/routes/api/vocabulary/+server.ts`)

- **DB 모델/타입**:
  - `VocabularyEntry` (`src/lib/types/vocabulary.ts`)

**발견된 이슈**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제로 인한 데이터 손실 위험

---

### 1.6 중복 단어 조회

**카테고리**: 데이터 조회

**설명**: 중복된 단어를 조회합니다. 표준단어명, 영문약어, 영문명 기준으로 중복을 검사합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/browse/+page.svelte`
  - `src/lib/components/VocabularyTable.svelte`

- **API 엔드포인트**:
  - `GET /api/vocabulary/duplicates` (`src/routes/api/vocabulary/duplicates/+server.ts`)

- **유틸리티**:
  - `src/lib/utils/duplicate-handler.ts`

- **DB 모델/타입**:
  - `VocabularyEntry` (`src/lib/types/vocabulary.ts`)

**발견된 이슈**:

- 없음

---

### 1.7 도메인 매핑 동기화

**카테고리**: 데이터 동기화

**설명**: 단어집의 도메인 분류명(`domainCategory`)을 도메인 데이터와 매칭하여 도메인 그룹(`domainGroup`)을 자동으로 매핑합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/browse/+page.svelte`
  - `src/lib/components/VocabularyFileManager.svelte`

- **API 엔드포인트**:
  - `POST /api/vocabulary/sync-domain` (`src/routes/api/vocabulary/sync-domain/+server.ts`)

- **DB 모델/타입**:
  - `VocabularyEntry` (`src/lib/types/vocabulary.ts`)
  - `DomainEntry` (`src/lib/types/domain.ts`)

**발견된 이슈**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제로 인한 데이터 손실 위험
- [#H1](docs/issues/high-priority.md#이슈-h1-하위-호환성-필드-중복으로-인한-스키마-불일치): 하위 호환성 필드 중복

---

### 1.8 단어집 파일 업로드

**카테고리**: 파일 관리

**설명**: XLSX 파일을 업로드하여 대량의 단어를 일괄 추가합니다. 파일 검증, 파싱, 중복 체크, 병합을 수행합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/browse/+page.svelte`
  - `src/lib/components/VocabularyFileManager.svelte`
  - `src/lib/components/FileUpload.svelte`

- **API 엔드포인트**:
  - `POST /api/upload` (`src/routes/api/upload/+server.ts`)

- **유틸리티**:
  - `src/lib/utils/xlsx-parser.ts`
  - `src/lib/utils/file-handler.ts`

- **DB 모델/타입**:
  - `VocabularyEntry` (`src/lib/types/vocabulary.ts`)
  - `UploadResult` (`src/lib/types/vocabulary.ts`)

**발견된 이슈**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제로 인한 데이터 손실 위험
- [#L5](docs/issues/low-priority.md#이슈-l5-todo-주석이-구현되지-않음): TODO 주석 (파일별 히스토리 초기화)

---

### 1.9 단어집 파일 다운로드

**카테고리**: 파일 관리

**설명**: 단어집 데이터를 XLSX 형식으로 다운로드합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/browse/+page.svelte`

- **API 엔드포인트**:
  - `GET /api/vocabulary/download` (`src/routes/api/vocabulary/download/+server.ts`)

- **유틸리티**:
  - `src/lib/utils/xlsx-parser.ts`

- **DB 모델/타입**:
  - `VocabularyEntry` (`src/lib/types/vocabulary.ts`)

**발견된 이슈**:

- 없음

---

### 1.10 금지어 관리

**카테고리**: 데이터 관리

**설명**: 금지어를 추가, 수정, 삭제, 조회합니다. 단어 추가 시 금지어 검사를 수행합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/browse/+page.svelte`
  - `src/lib/components/ForbiddenWordManager.svelte`

- **API 엔드포인트**:
  - `GET /api/forbidden-words` (`src/routes/api/forbidden-words/+server.ts`)
  - `POST /api/forbidden-words` (`src/routes/api/forbidden-words/+server.ts`)
  - `PUT /api/forbidden-words` (`src/routes/api/forbidden-words/+server.ts`)
  - `DELETE /api/forbidden-words` (`src/routes/api/forbidden-words/+server.ts`)

- **DB 모델/타입**:
  - `ForbiddenWordEntry` (`src/lib/types/vocabulary.ts`)
  - `ForbiddenWordsData` (`src/lib/types/vocabulary.ts`)

**발견된 이슈**:

- 없음

---

## 2. 도메인 관리 (Domain)

### 2.1 도메인 조회

**카테고리**: 데이터 조회

**설명**: 도메인 데이터를 페이지네이션, 정렬, 검색하여 조회합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/domain/browse/+page.svelte`
  - `src/lib/components/DomainTable.svelte`
  - `src/lib/components/SearchBar.svelte`

- **API 엔드포인트**:
  - `GET /api/domain` (`src/routes/api/domain/+server.ts`)

- **DB 모델/타입**:
  - `DomainEntry` (`src/lib/types/domain.ts`)
  - `DomainData` (`src/lib/types/domain.ts`)

**발견된 이슈**:

- [#H7](docs/issues/high-priority.md#이슈-h7-전체-파일을-메모리로-로드하는-성능-문제): 전체 파일을 메모리로 로드하는 성능 문제

---

### 2.2 도메인 수정

**카테고리**: 데이터 수정

**설명**: 기존 도메인의 정보를 수정합니다. ID를 기반으로 엔트리를 찾아 업데이트합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/domain/browse/+page.svelte`
  - `src/lib/components/DomainEditor.svelte`

- **API 엔드포인트**:
  - `PUT /api/domain` (`src/routes/api/domain/+server.ts`)

- **DB 모델/타입**:
  - `DomainEntry` (`src/lib/types/domain.ts`)

**발견된 이슈**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제로 인한 데이터 손실 위험
- [#C2](docs/issues/critical.md#이슈-c2-json-파싱-결과에-대한-런타임-타입-검증-없음): JSON 파싱 결과에 대한 런타임 타입 검증 없음

---

### 2.3 도메인 삭제

**카테고리**: 데이터 삭제

**설명**: 도메인을 삭제합니다. ID를 기반으로 엔트리를 찾아 배열에서 제거합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/domain/browse/+page.svelte`
  - `src/lib/components/DomainEditor.svelte`

- **API 엔드포인트**:
  - `DELETE /api/domain` (`src/routes/api/domain/+server.ts`)

- **DB 모델/타입**:
  - `DomainEntry` (`src/lib/types/domain.ts`)

**발견된 이슈**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제로 인한 데이터 손실 위험

---

### 2.4 도메인 통계 조회

**카테고리**: 데이터 조회

**설명**: 도메인 통계 정보를 조회합니다. 도메인 그룹별, 데이터 타입별 통계를 제공합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **API 엔드포인트**:
  - `OPTIONS /api/domain` (`src/routes/api/domain/+server.ts`)

- **DB 모델/타입**:
  - `DomainEntry` (`src/lib/types/domain.ts`)

**발견된 이슈**:

- 없음

---

### 2.5 도메인 파일 업로드

**카테고리**: 파일 관리

**설명**: XLSX 파일을 업로드하여 대량의 도메인을 일괄 추가합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/domain/browse/+page.svelte`
  - `src/lib/components/DomainFileManager.svelte`
  - `src/lib/components/FileUpload.svelte`

- **API 엔드포인트**:
  - `POST /api/domain/upload` (`src/routes/api/domain/upload/+server.ts`)

- **유틸리티**:
  - `src/lib/utils/xlsx-parser.ts`

- **DB 모델/타입**:
  - `DomainEntry` (`src/lib/types/domain.ts`)

**발견된 이슈**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제로 인한 데이터 손실 위험

---

### 2.6 도메인 파일 다운로드

**카테고리**: 파일 관리

**설명**: 도메인 데이터를 XLSX 형식으로 다운로드합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/domain/browse/+page.svelte`

- **API 엔드포인트**:
  - `GET /api/domain/download` (`src/routes/api/domain/download/+server.ts`)

- **유틸리티**:
  - `src/lib/utils/xlsx-parser.ts`

- **DB 모델/타입**:
  - `DomainEntry` (`src/lib/types/domain.ts`)

**발견된 이슈**:

- 없음

---

## 3. 용어 관리 (Term)

### 3.1 용어 조회

**카테고리**: 데이터 조회

**설명**: 용어 데이터를 페이지네이션, 정렬, 검색하여 조회합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/term/browse/+page.svelte`
  - `src/lib/components/TermTable.svelte`
  - `src/lib/components/SearchBar.svelte`

- **API 엔드포인트**:
  - `GET /api/term` (`src/routes/api/term/+server.ts`)

- **DB 모델/타입**:
  - `TermEntry` (`src/lib/types/term.ts`)
  - `TermData` (`src/lib/types/term.ts`)

**발견된 이슈**:

- [#H7](docs/issues/high-priority.md#이슈-h7-전체-파일을-메모리로-로드하는-성능-문제): 전체 파일을 메모리로 로드하는 성능 문제

---

### 3.2 용어 추가

**카테고리**: 데이터 생성

**설명**: 새로운 용어를 추가하고 매핑 검증을 수행합니다. 용어명, 칼럼명, 도메인명이 각각 vocabulary, domain과 매핑되는지 검증합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/term/browse/+page.svelte`
  - `src/lib/components/TermEditor.svelte`

- **API 엔드포인트**:
  - `POST /api/term` (`src/routes/api/term/+server.ts`)

- **DB 모델/타입**:
  - `TermEntry` (`src/lib/types/term.ts`)

**발견된 이슈**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제로 인한 데이터 손실 위험
- [#H3](docs/issues/high-priority.md#이슈-h3-term-api에서-매번-vocabularydomain-데이터를-로드하는-n1-문제): N+1 문제 (매번 Vocabulary/Domain 데이터 로드)

---

### 3.3 용어 수정

**카테고리**: 데이터 수정

**설명**: 기존 용어의 정보를 수정합니다. ID를 기반으로 엔트리를 찾아 업데이트합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/term/browse/+page.svelte`
  - `src/lib/components/TermEditor.svelte`

- **API 엔드포인트**:
  - `PUT /api/term` (`src/routes/api/term/+server.ts`)

- **DB 모델/타입**:
  - `TermEntry` (`src/lib/types/term.ts`)

**발견된 이슈**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제로 인한 데이터 손실 위험
- [#H3](docs/issues/high-priority.md#이슈-h3-term-api에서-매번-vocabularydomain-데이터를-로드하는-n1-문제): N+1 문제

---

### 3.4 용어 삭제

**카테고리**: 데이터 삭제

**설명**: 용어를 삭제합니다. ID를 기반으로 엔트리를 찾아 배열에서 제거합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/term/browse/+page.svelte`
  - `src/lib/components/TermEditor.svelte`

- **API 엔드포인트**:
  - `DELETE /api/term` (`src/routes/api/term/+server.ts`)

- **DB 모델/타입**:
  - `TermEntry` (`src/lib/types/term.ts`)

**발견된 이슈**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제로 인한 데이터 손실 위험

---

### 3.5 용어 매핑 동기화

**카테고리**: 데이터 동기화

**설명**: 용어의 매핑 상태를 재검증하고 동기화합니다. 용어명, 칼럼명, 도메인명이 각각 vocabulary, domain과 매핑되는지 재검증합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/term/browse/+page.svelte`
  - `src/lib/components/TermFileManager.svelte`

- **API 엔드포인트**:
  - `POST /api/term/sync` (`src/routes/api/term/sync/+server.ts`)

- **DB 모델/타입**:
  - `TermEntry` (`src/lib/types/term.ts`)

**발견된 이슈**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제로 인한 데이터 손실 위험
- [#H3](docs/issues/high-priority.md#이슈-h3-term-api에서-매번-vocabularydomain-데이터를-로드하는-n1-문제): N+1 문제

---

### 3.6 용어 파일 업로드

**카테고리**: 파일 관리

**설명**: XLSX 파일을 업로드하여 대량의 용어를 일괄 추가합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/term/browse/+page.svelte`
  - `src/lib/components/TermFileManager.svelte`
  - `src/lib/components/FileUpload.svelte`

- **API 엔드포인트**:
  - `POST /api/term/upload` (`src/routes/api/term/upload/+server.ts`)

- **유틸리티**:
  - `src/lib/utils/xlsx-parser.ts`

- **DB 모델/타입**:
  - `TermEntry` (`src/lib/types/term.ts`)

**발견된 이슈**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제로 인한 데이터 손실 위험
- [#H3](docs/issues/high-priority.md#이슈-h3-term-api에서-매번-vocabularydomain-데이터를-로드하는-n1-문제): N+1 문제

---

### 3.7 용어 파일 다운로드

**카테고리**: 파일 관리

**설명**: 용어 데이터를 XLSX 형식으로 다운로드합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/term/browse/+page.svelte`

- **API 엔드포인트**:
  - `GET /api/term/download` (`src/routes/api/term/download/+server.ts`)

- **유틸리티**:
  - `src/lib/utils/xlsx-parser.ts`

- **DB 모델/타입**:
  - `TermEntry` (`src/lib/types/term.ts`)

**발견된 이슈**:

- 없음

---

### 3.8 용어 변환기 (TermGenerator)

**카테고리**: 유틸리티

**설명**: 한국어 용어를 영어로 변환하거나 영어 용어를 한국어로 변환합니다. 동적 프로그래밍을 사용하여 가능한 모든 조합을 생성합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/routes/term/browse/+page.svelte`
  - `src/lib/components/TermGenerator.svelte`

- **API 엔드포인트**:
  - `POST /api/generator` (`src/routes/api/generator/+server.ts`)
  - `POST /api/generator/segment` (`src/routes/api/generator/segment/+server.ts`)

- **DB 모델/타입**:
  - `VocabularyEntry` (`src/lib/types/vocabulary.ts`)

**발견된 이슈**:

- 없음

---

## 4. 검색 기능

### 4.1 검색 제안 (자동완성)

**카테고리**: 검색

**설명**: 검색어 입력 시 자동완성 제안을 제공합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **API 엔드포인트**:
  - `POST /api/search` (`src/routes/api/search/+server.ts`)

- **DB 모델/타입**:
  - `VocabularyEntry` (`src/lib/types/vocabulary.ts`)

**발견된 이슈**:

- 없음

---

## 5. 파일 관리

### 5.1 파일 목록 조회

**카테고리**: 파일 관리

**설명**: Vocabulary, Domain, Term 파일 목록을 조회합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/lib/components/VocabularyFileManager.svelte`
  - `src/lib/components/DomainFileManager.svelte`
  - `src/lib/components/TermFileManager.svelte`

- **API 엔드포인트**:
  - `GET /api/vocabulary/files` (`src/routes/api/vocabulary/files/+server.ts`)
  - `GET /api/domain/files` (`src/routes/api/domain/files/+server.ts`)
  - `GET /api/term/files` (`src/routes/api/term/files/+server.ts`)

**발견된 이슈**:

- 없음

---

### 5.2 파일 생성

**카테고리**: 파일 관리

**설명**: 새로운 Vocabulary, Domain, Term 파일을 생성합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/lib/components/VocabularyFileManager.svelte`
  - `src/lib/components/DomainFileManager.svelte`
  - `src/lib/components/TermFileManager.svelte`

- **API 엔드포인트**:
  - `POST /api/vocabulary/files` (`src/routes/api/vocabulary/files/+server.ts`)
  - `POST /api/domain/files` (`src/routes/api/domain/files/+server.ts`)
  - `POST /api/term/files` (`src/routes/api/term/files/+server.ts`)

**발견된 이슈**:

- 없음

---

### 5.3 파일 이름 변경

**카테고리**: 파일 관리

**설명**: Vocabulary, Domain, Term 파일의 이름을 변경합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/lib/components/VocabularyFileManager.svelte`
  - `src/lib/components/DomainFileManager.svelte`
  - `src/lib/components/TermFileManager.svelte`

- **API 엔드포인트**:
  - `PUT /api/vocabulary/files` (`src/routes/api/vocabulary/files/+server.ts`)
  - `PUT /api/domain/files` (`src/routes/api/domain/files/+server.ts`)
  - `PUT /api/term/files` (`src/routes/api/term/files/+server.ts`)

**발견된 이슈**:

- 없음

---

### 5.4 파일 삭제

**카테고리**: 파일 관리

**설명**: Vocabulary, Domain, Term 파일을 삭제합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/lib/components/VocabularyFileManager.svelte`
  - `src/lib/components/DomainFileManager.svelte`
  - `src/lib/components/TermFileManager.svelte`

- **API 엔드포인트**:
  - `DELETE /api/vocabulary/files` (`src/routes/api/vocabulary/files/+server.ts`)
  - `DELETE /api/domain/files` (`src/routes/api/domain/files/+server.ts`)
  - `DELETE /api/term/files` (`src/routes/api/term/files/+server.ts`)

**발견된 이슈**:

- 없음

---

### 5.5 매핑 정보 조회/저장

**카테고리**: 파일 관리

**설명**: Vocabulary와 Term 파일의 매핑 정보(연결된 Domain/Vocabulary 파일)를 조회하고 저장합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **API 엔드포인트**:
  - `GET /api/vocabulary/files/mapping` (`src/routes/api/vocabulary/files/mapping/+server.ts`)
  - `PUT /api/vocabulary/files/mapping` (`src/routes/api/vocabulary/files/mapping/+server.ts`)
  - `GET /api/term/files/mapping` (`src/routes/api/term/files/mapping/+server.ts`)
  - `PUT /api/term/files/mapping` (`src/routes/api/term/files/mapping/+server.ts`)

- **DB 모델/타입**:
  - `VocabularyData.mapping` (`src/lib/types/vocabulary.ts`)
  - `TermData.mapping` (`src/lib/types/term.ts`)

**발견된 이슈**:

- [#H1](docs/issues/high-priority.md#이슈-h1-하위-호환성-필드-중복으로-인한-스키마-불일치): 하위 호환성 필드 중복

---

## 6. 히스토리 관리

### 6.1 히스토리 로그 조회

**카테고리**: 히스토리 관리

**설명**: Vocabulary, Domain, Term의 변경 이력을 조회합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **UI 컴포넌트/페이지**:
  - `src/lib/components/HistoryLog.svelte`
  - `src/routes/browse/+page.svelte`
  - `src/routes/domain/browse/+page.svelte`
  - `src/routes/term/browse/+page.svelte`

- **API 엔드포인트**:
  - `GET /api/history` (`src/routes/api/history/+server.ts`)

- **DB 모델/타입**:
  - `HistoryLogEntry` (`src/lib/types/vocabulary.ts`)
  - `DomainHistoryLogEntry` (`src/lib/types/domain.ts`)
  - `TermHistoryLogEntry` (`src/lib/types/term.ts`)

**발견된 이슈**:

- [#H2](docs/issues/high-priority.md#이슈-h2-history-api의-유니온-타입-응답으로-인한-타입-안정성-저하): 유니온 타입 응답으로 인한 타입 안정성 저하

---

### 6.2 히스토리 로그 추가

**카테고리**: 히스토리 관리

**설명**: Vocabulary, Domain, Term의 변경 이력을 기록합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **API 엔드포인트**:
  - `POST /api/history` (`src/routes/api/history/+server.ts`)

- **유틸리티**:
  - `src/lib/utils/history-handler.ts`

- **DB 모델/타입**:
  - `HistoryLogEntry` (`src/lib/types/vocabulary.ts`)
  - `DomainHistoryLogEntry` (`src/lib/types/domain.ts`)
  - `TermHistoryLogEntry` (`src/lib/types/term.ts`)

**발견된 이슈**:

- [#H2](docs/issues/high-priority.md#이슈-h2-history-api의-유니온-타입-응답으로-인한-타입-안정성-저하): 유니온 타입 응답으로 인한 타입 안정성 저하

---

## 7. 설정 관리

### 7.1 설정 조회

**카테고리**: 설정 관리

**설명**: 애플리케이션 설정을 조회합니다. 시스템 파일 표시 여부 등을 관리합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **API 엔드포인트**:
  - `GET /api/settings` (`src/routes/api/settings/+server.ts`)

- **유틸리티**:
  - `src/lib/utils/settings.ts`

- **Store**:
  - `src/lib/stores/settings-store.ts`

- **DB 모델/타입**:
  - `Settings` (`src/lib/utils/settings.ts`)

**발견된 이슈**:

- 없음

---

### 7.2 설정 저장

**카테고리**: 설정 관리

**설명**: 애플리케이션 설정을 저장합니다.

**구현 상태**: ✅ 완료

**관련 파일들**:

- **API 엔드포인트**:
  - `POST /api/settings` (`src/routes/api/settings/+server.ts`)

- **유틸리티**:
  - `src/lib/utils/settings.ts`

- **Store**:
  - `src/lib/stores/settings-store.ts`

- **DB 모델/타입**:
  - `Settings` (`src/lib/utils/settings.ts`)

**발견된 이슈**:

- 없음

---

## 8. 인증 및 권한

### 8.1 인증/권한 체크

**카테고리**: 보안

**설명**: 사용자 인증 및 권한 체크 기능입니다.

**구현 상태**: ❌ 미구현

**관련 파일들**:

- 없음

**발견된 이슈**:

- [#C9](docs/issues/critical.md#이슈-c9-인증권한-체크-완전-부재): 인증/권한 체크 완전 부재
- [#C10](docs/issues/critical.md#이슈-c10-파일-경로-조작-공격-가능성-path-traversal): 파일 경로 조작 공격 가능성

---

## 기능 요약

### 구현 상태 통계

| 상태      | 개수   | 비율     |
| --------- | ------ | -------- |
| ✅ 완료   | 40     | 97.6%    |
| ⚠️ 불완전 | 0      | 0%       |
| ❌ 미구현 | 1      | 2.4%     |
| **총계**  | **41** | **100%** |

### 카테고리별 기능 수

| 카테고리      | 기능 수 |
| ------------- | ------- |
| 데이터 조회   | 6       |
| 데이터 생성   | 3       |
| 데이터 수정   | 3       |
| 데이터 삭제   | 3       |
| 데이터 동기화 | 2       |
| 파일 관리     | 11      |
| 히스토리 관리 | 2       |
| 검색          | 2       |
| 설정 관리     | 2       |
| 유틸리티      | 1       |
| 보안          | 1       |
| **총계**      | **41**  |

### 주요 이슈 요약

**Critical 이슈 (즉시 수정 필요)**:

- [#C1](docs/issues/critical.md#이슈-c1-파일-기반-저장소의-동시성-문제로-인한-데이터-손실-위험): 동시성 문제 (모든 CRUD 작업)
- [#C2](docs/issues/critical.md#이슈-c2-json-파싱-결과에-대한-런타임-타입-검증-없음): 런타임 타입 검증 없음 (모든 데이터 로드)
- [#C9](docs/issues/critical.md#이슈-c9-인증권한-체크-완전-부재): 인증/권한 체크 부재
- [#C10](docs/issues/critical.md#이슈-c10-파일-경로-조작-공격-가능성-path-traversal): 파일 경로 조작 공격 가능성

**High Priority 이슈 (빠른 시일 내 수정)**:

- [#H1](docs/issues/high-priority.md#이슈-h1-하위-호환성-필드-중복으로-인한-스키마-불일치): 하위 호환성 필드 중복
- [#H2](docs/issues/high-priority.md#이슈-h2-history-api의-유니온-타입-응답으로-인한-타입-안정성-저하): History API 타입 안정성 저하
- [#H3](docs/issues/high-priority.md#이슈-h3-term-api에서-매번-vocabularydomain-데이터를-로드하는-n1-문제): N+1 문제 (Term API)
- [#H4](docs/issues/high-priority.md#이슈-h4-데이터-검증-로직-부족-타입-형식-참조-무결성): 데이터 검증 로직 부족
- [#H7](docs/issues/high-priority.md#이슈-h7-전체-파일을-메모리로-로드하는-성능-문제): 전체 파일을 메모리로 로드하는 성능 문제

---

**마지막 업데이트**: 2024-01-01
