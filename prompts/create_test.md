sveltekit 프로젝트의 테스트를 생성하려고 해. frontend와 backend가 한 프로젝트 안에서 구현되어 있어. 첨부한 문서는 프로젝트 설계 문서야 참고해서 어떻게 설계하면 좋을지 제안해줘.

---

@docs/PROJECT_TEST_DESIGN.md 설계가 적절한지 코드베이스와 @docs\ 를 참고하여 검토해

---

@prompts/create_test.md 설계를 기반으로 프로젝트 테스트 설계 구현 시작해.

---

테스트가 성공적으로 통과했습니다.

저는 다음을 완료했습니다:

1. 테스트 설계를 제안하고 @docs/PROJECT_TEST_DESIGN.md를 생성했습니다.
2. 필요한 테스트 종속성을 설치했습니다.
3. Vitest를 구성했습니다.
4. debounce.ts에 대한 단위 테스트를 작성하고 성공적으로 실행했습니다.

이것으로 테스트 설계 구현의 초기 단계를 완료했습니다. 사용자에게 알리겠습니다.

검토해봐. 적절하게 구현된 것 같아?

---

다음 step 설명하고, 진행

---

단어, 도메인, 용어, 데이터베이스 등을 주제영역으로 명명하여 해당 주제영역별로 @docs/PROJECT_TEST_DESIGN.md 을 수행하면 좋을 것 같아.  
 현재는 단어가 진행 중인데 아직 단어의 모든 기능을 포괄하지 못해. VocabularyEditor와 +server.test.ts는 단어 주제영역의 일부이고, @src/routes/api/vocabulary\와 @src/routes/browse\ 가 대표적인 단어 주제영역 파트이며  
 이 외에도 검색 api나 @src/lib/components\ 에도 다양하게 존재해. 수행 계획을 세워봐

---

단어, 도메인, 용어, 데이터베이스, 엔터티, 속성, 테이블, 컬럼을 주제영역으로 명명하여 해당 주제영역별로 @docs/plan/PROJECT_TEST_DESIGN.md 를 수행하기 위해 우선적으로 @docs/plan/VOCABULARY_TEST_PLAN.md 를 생성했어.
해당 파일을 분석해서 다른 영역들에 대해서도 동일하게 파일 생성하고, 프로젝트 관련 문서는 @docs/ 내의 markdown 문서들을 참고해.

---

@docs/plan/VOCABULARY_TEST_PLAN.md 를 토대로 @docs/plan/\*\_TEST_PLAN.md 파일들을 생성했는데 검토해봐

---

<발견된 문제점>
<문제점1>
TERM_TEST_PLAN.md - API 누락
실제 존재하지만 계획에 없는 API: - /api/term/validate - 용어 유효성 검증 - /api/term/validate-all - 전체 용어 일괄 검증
</문제점1>
<수정제안1>수정 제안: Phase 1에 validate API 테스트 케이스 추가</수정제안1>
<문제점2>
VOCABULARY_TEST_PLAN.md - 중복 확인 필요 - /api/generator API가 Term 계획에도 있음 - 실제로는 용어 생성에 사용되므로 Term 주제영역에서 관리하는 것이 적절
</문제점2>
<수정제안2>Vocabulary 계획에서 generator 제거, Term에서 관리</수정제안2>
<문제점3>
공통 유틸리티 테스트 누락
$lib/utils/ 디렉토리의 유틸리티 함수들이 개별 주제영역에 포함되지 않음: - file-handler.ts - database-design-handler.ts - validation.ts - cache.ts
</문제점3>
<수정제안3>공통 유틸리티 테스트 계획 별도 작성 또는 기존 계획에 통합</수정제안3>
<수정제안4> ## TERM_TEST_PLAN.md 수정 필요

      ### 1.2 테스트 대상 전체 범위 - API 엔드포인트에 추가:
      | 9 | `/api/term/validate` | POST | 용어 유효성 검증 | 높음 | 미완료 |
      | 10 | `/api/term/validate-all` | POST | 전체 용어 일괄 검증 | 중간 | 미완료 |

      ### 2.1 Phase 1에 추가:
      #### 2.1.3 validate API 테스트
      **파일**: `src/routes/api/term/validate/+server.test.ts`

      | 테스트 케이스 | 설명 |
      |---|---|
      | 용어 유효성 검증 성공 | 유효한 용어 입력 시 success |
      | 필수 필드 누락 | koreanName/englishName 누락 시 400 에러 |

</수정제안4>
</발견된 문제점>

---

@docs/plan/VOCABULARY_TEST_PLAN.md 를 수행해.

---

@docs/plan/vocabulary_test_plan.md 의 `/api/vocabulary/duplicates` api에 대한 테스트를 구현하는 중에 됐어. 이어서 진행해.

---

앞으로 단어 주제영역에 해당 test가 작성되면 @docs/tests/VOCABULARY_TEST_DESCRIPTION.md 에 테스트 설명을 정리하면서 작업 진행해. 다른 주제영역들에 대해서도 추후 동일하게 진행할거야. 기존에 작업했던 테스트 설명도 없다면 추가해.

---

@docs/plan/VOCABULARY_TEST_PLAN.md 을 구현하며 @docs/tests/VOCABULARY_TEST_DESCRIPTION.md 에 작업들을 정리하면서 진행하다가 중료됐어. 이어서 진행해.

---

<확인사항>
단어집의 모든 기능은 현재 selected 된 파일을 기준으로 동작되어야 하는데 이 점이 고려되어 있어?
</확인사항>

---

@docs/plan/ATTRIBUTE_TEST_PLAN.md @docs/plan/COLUMN_TEST_PLAN.md @docs/plan/DATABASE_TEST_PLAN.md @docs/plan/DOMAIN_TEST_PLAN.md @docs/plan/ENTITY_TEST_PLAN.md @docs/plan/TABLE_TEST_PLAN.md @docs/plan/TERM_TEST_PLAN.md 에도 동일하게 selected 된 파일에 기능이 적용될 수 있게 수정해

---

@esbuild (2-156) 오류 있네 확인해서 수정해

---

TDD 개발을 진행할거야. 현재 @docs/tests/VOCABULARY_TEST_DESCRIPTION.md을 기반으로 test code는 작성 됐으며 이를 기반으로 실제 코드베이스가 test와 동일하게 구현되어 있는지 확인하고 수정해

---

@docs/plan/DOMAIN_TEST_PLAN.md 을 기반으로 테스트 코드를 작성하고, @docs/tests/VOCABULARY_TEST_DESCRIPTION.md 을 참고해서 DOMAIN_TEST_DESCRIPTION을 작성해. 완료 이후에는 테스트 코드와 실제 코드베이스 코드가 일치하는지 검사하고 수정할거야.

---

@docs/plan/TERM_TEST_PLAN.md 을 기반으로 동일한 작업 진행해.

---

실사용자 테스트로 파일을 변경하고, 새 도메인 추가를 진행했는데 이미 사용 중인 도메인이라는 에러가 발생해 해당 파일에는 아무런 데이터가 존재하지 않는데 에러가 발생하는 것으로 보아 selected 된 파일을 제대로 검증하는 로직이 없는 것 같아.

모든 도메인 기능은 selected 된 파일을 기준으로 적용되어야 하며 이를 테스트 코드와 실제 코드베이스에 적용해

---

용어도 동일하게 selected 된 파일을 기준으로 모든 기능이 동작해야 해. 테스트 코드 구현과 실제 구현을 확인해서 수정해

---

@docs/plan/DATABASE_TEST_PLAN.md 도 동일하게 작업하며 현재 파일 기준으로 기능이 적용되어야 한다는 점도 명심해

---

@docs/tests/ 폴더에 DATABASE_TEST_DESCRIPTION.md 파일에 정리하면서 진행 시작해.

---

확인해보니까 $app/environment가 추가 되어 있는데 @docs/tests/VOCABULARY_TEST_DESCRIPTION.md 나 @docs/tests/DOMAIN_TEST_DESCRIPTION.md 에는 없는 것 같은데 왜 필요한거야?

---

FileManager는 단어, 도메인, 용어에도 존재하는 부분인데 그렇다면 이들에게도 적용하기 위한 준비를 해. 각각은 @docs/tests/ 와 @docs/plan/ 을 참고하면 좋을거야.

---

코드베이스 전체이 있는 테스트들이 각각의 실제 코드들과 일치하는지 구체적인 검증 시작해

---

@docs/plan/ 폴더의 _\_TEST_PLAN.md 기반으로 test를 생성하고, @docs/tests/ 폴더에 _\_TEST_DESCRIPTION.md 파일을 생성하고 있어. 이버에는 ENTITY에 대해 테스트를 생성해줘.

---
