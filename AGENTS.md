# DbManager Agent Guide

## Authority

- This file is the canonical workflow guide for DbManager agents.
- Load this file first, then load only the smallest relevant docs or source files for the task.
- Do not use a separate DbManager workflow skill or `references/doc-map.md` as a routing source; any external skill must defer to this file.

## Commit Rules (read immediately before every commit)

These rules are mandatory. Re-check this section before `git commit` or `git commit --amend`.

1. **Scope**
   - Default branch is `main`; do not create a branch unless the user asks or isolation is clearly required.
   - When a coherent work unit is implemented, verified, and documented, create a separate scoped commit unless the user explicitly says not to commit.
   - Commit only the coherent work unit.
   - Do not stage unrelated working-tree changes.
   - Check `git status --short` and `git diff --cached --stat` before committing.
2. **Subject**
   - Start with a Conventional Commit prefix: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, or `chore:`.
   - After the prefix, write a concise Korean subject.
   - Do not replace the prefix with a plain descriptive sentence.
3. **Body style**
   - Use short bullet/fragment lines only.
   - Do not write narrative paragraphs.
   - If a body is useful, write 1-3 terse bullets before trailers.
4. **Lore trailers**
   - Add only useful trailers after the bullets.
   - Prefer: `Constraint:`, `Rejected:`, `Confidence:`, `Scope-risk:`, `Directive:`, `Tested:`, `Not-tested:`.

Template:

```text
refactor: 한국어 명사형 요약

- 변경 의도/범위 단문
- 검증 또는 보존한 계약 단문

Constraint: 외부 제약 단문
Rejected: 대안 | 기각 사유 단문
Confidence: high
Scope-risk: narrow
Tested: 검증 명령 단문
Not-tested: 미검증 범위 단문
```

## Minimal Context Routing

Start with code and the fewest documents that can answer the task.

| Task shape                                    | Load first                                                 | Expand only if needed                      |
| --------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Feature, bug fix, refactor                    | relevant source/tests, analogous existing flow             | API/data-model specs when contracts change |
| API, JSON shape, import/export, storage model | `docs/specs/api-reference.md`, `docs/specs/data-model.md`  | related route/component tests              |
| User-facing behavior or setup                 | `README.md`, `docs/QUICK_START.md`, `docs/USER_GUIDE.md`   | changelog when recent behavior matters     |
| UI/UX or visual design                        | `DESIGN.md`, analogous components in `src/lib/components/` | implementation source and tests            |
| Release/history check                         | `docs/CHANGELOG.md`                                        | git history and relevant specs             |
| Documentation topology or workflow cleanup    | this file, `docs/README.md`, current file inventory        | repo-wide Markdown/reference scan          |

## Working Rules

- Do not read the whole `docs/` tree up front.
- Before substantial implementation or analysis, state the small doc/source set being used.
- Prefer existing source, tests, and analogous components over stale narrative docs.
- For DB, Entity, Attribute, Table, and Column flows, align overlapping UX/behavior with Vocabulary, Domain, and Term flows unless the user asks for a deliberate difference.
- If behavior, API, UX, workflow, validation, storage shape, or documentation topology changes, update the matching docs/indexes in the same task.
- Update root `README.md` only when repository-level guidance, setup, supported features, or visible document entry points change.
- Keep diffs small and scoped. Do not revert or commit unrelated working-tree changes.

## Documentation Maintenance

- `docs/README.md` is the current documentation index and cleanup summary.
- Keep `docs/` focused on user-facing guides, current specs, and current history.
- Prefer deleting or merging stale one-off design notes, generated test descriptions, and duplicate AI context docs; preserve rationale in git history, commit messages, or a tracked index summary.
- Before deleting docs, scan repo Markdown/instruction files, including untracked non-ignored files, for inbound references and update active links.
- Untracked docs must be added, merged, or backed up before deletion; external user skill files must be backed up before modification.

## Verification

- For code changes: run targeted tests first, then `pnpm check`, `pnpm run lint`, or `pnpm run validate` as appropriate.
- For docs/workflow-only changes: run Markdown link/reference checks, `git diff --check`, and `pnpm run format:check` unless an existing unrelated formatting issue is documented.
- Report validation evidence before claiming completion.
