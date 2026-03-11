# DbManager Agent Guide

## Purpose

- Use the smallest relevant set of project documents before changing code.
- Keep code changes and documentation updates in the same task when behavior changes.
- Check whether `README.md` should also change when work affects user-facing behavior, setup, workflow, supported features, or repository-level guidance.

## Document Routing

- Feature development, bug fixes, refactors, and API changes:
  Read `docs/TDD_GUIDE.md` and `docs/CONVENTIONS.md` first.
- API contract, JSON shape, import/export format, or data model changes:
  Also read `docs/specs/api-reference.md` and `docs/specs/data-model.md`.
- Project analysis, code review, architecture review, and impact analysis:
  Read `docs/AI_CONTEXT.md` and `docs/PROJECT_DEEP_ANALYSIS.md` first.
- Work where recent behavior matters:
  Check `docs/CHANGELOG.md`.
- Frontend or UX work:
  Also read `docs/FRONTEND_UI_UX_GUIDE.md`.
- File manager, upload/download, mapping, registry, and sample data work:
  Also inspect `references/`.
- Tasks continuing from a repository prompt template:
  Read the specific file under `prompts/` that matches the task.
- Work that changes repository summary, onboarding, setup, or user-visible capabilities:
  Also review `README.md`.

## Working Rules

- Do not read the entire `docs/` folder up front. Start with the most relevant 1-3 documents and expand only if needed.
- Before substantial implementation or analysis, briefly state which documents are being used.
- When a shared behavior already exists in another menu or component, inspect the analogous implementation before editing.
- For DB, Entity, Attribute, Table, and Column features, align overlapping UX and behavior with the existing Vocabulary, Domain, and Term flows unless the user asks for a deliberate change.
- Any change to behavior, API, UX, workflow, validation, or data model must include updates to the relevant files under `docs/` in the same task.
- When a change materially affects repository-level guidance, contributors' first-run understanding, or feature summaries, update `README.md` in the same task.
- Commit messages for this repository must always be written in Korean.
- Immediately before every commit, re-check the repository commit-message rule and ensure the actual commit subject/body are written in Korean.
- If feature work is done on a separate branch, do not stop at implementation only. Before closing the task, make the branch merge-ready for `main` by reflecting the latest `main` baseline into the working branch when possible, resolving conflicts, and rerunning the relevant validation/test commands. If that cannot be completed, report the blocker explicitly.
