# DbManager Documentation

This directory keeps only the current user-facing guides, technical specs, and release history. Root `AGENTS.md` is the canonical agent workflow guide; root `DESIGN.md` is the canonical product/UI design guide.

## Current entry points

| Document                                                                   | Purpose                                                                                                                  | Audience                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| [`QUICK_START.md`](./QUICK_START.md)                                       | Install/run the app and try the first core flow.                                                                         | New users, contributors |
| [`USER_GUIDE.md`](./USER_GUIDE.md)                                         | Detailed feature usage for vocabulary, domain, term, DB design, ERD, profiling, snapshots, uploads, and troubleshooting. | Users, QA               |
| [`MCP_SEARCH.md`](./MCP_SEARCH.md)                                         | Remote `/mcp` and optional stdio read-only MCP search setup, tools, auth, and bundle-first behavior.                     | Developers, agents      |
| [`DESIGN_BACKLOG.md`](./DESIGN_BACKLOG.md)                                 | Remaining design/UI backlog, visual QA gate, and design-only follow-up guardrails.                                       | Designers, maintainers  |
| [`MAINTENANCE_CHECKLIST.md`](./MAINTENANCE_CHECKLIST.md)                   | Remaining backend maintenance/refactor checklist and guardrails.                                                         | Maintainers, agents     |
| [`CHANGELOG.md`](./CHANGELOG.md)                                           | Chronological product/code/documentation history.                                                                        | Maintainers             |
| [`specs/api-reference.md`](./specs/api-reference.md)                       | Current API endpoint reference.                                                                                          | Developers              |
| [`specs/data-model.md`](./specs/data-model.md)                             | Current data/storage model reference.                                                                                    | Developers              |
| [`specs/route-side-effect-matrix.md`](./specs/route-side-effect-matrix.md) | Upload, sync, and validation route side-effect matrix.                                                                   | Developers, agents      |

Related root-level guidance:

- [`../AGENTS.md`](../AGENTS.md): canonical agent workflow, routing, verification, and commit rules.
- [`../DESIGN.md`](../DESIGN.md): canonical product/UI design source of truth.
- [`../README.md`](../README.md): repository overview, setup, scripts, and visible document links.

## Loading policy for agents

1. Read `AGENTS.md` first.
2. Load only the entry point that matches the task.
3. Prefer current source/tests over old narrative docs.
4. If documentation topology changes, update this index and root `README.md` links in the same task.

## 2026-05-29 cleanup audit summary

This tracked summary is the durable repository record of the documentation cleanup decision.

| Decision                            | Files                                                                                                                                              | Rationale / recovery                                                                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep                                | `QUICK_START.md`, `USER_GUIDE.md`, `CHANGELOG.md`, `specs/api-reference.md`, `specs/data-model.md`                                                 | Current user-facing guides, current specs, and release history.                                                                                                                                         |
| Merge into `AGENTS.md`              | `CONVENTIONS.md`, `TDD_GUIDE.md`, `template/documentation-sync-guide.md`                                                                           | Operational workflow, doc-sync, verification, and commit rules now live in root `AGENTS.md`; originals are recoverable from git history.                                                                |
| Merge into root `DESIGN.md`         | `FRONTEND_UI_UX_GUIDE.md`, legacy `docs/DESIGN.md` draft                                                                                           | Design guidance now has a single root source of truth; legacy design drafts are reference-only if restored from history.                                                                                |
| Remove historical one-off docs      | `release/alignment-release-checklist.md`, `specs/HISTORY_REMOVAL_DESIGN.md`, `specs/alignment-operation-guide.md`, `specs/relation-sync-policy.md` | Superseded by current specs, changelog, and git history. Alignment/validation endpoint contracts moved to `specs/api-reference.md`; relationship sync ownership is summarized in `specs/data-model.md`. |
| Remove generated test descriptions  | `tests/*_TEST_DESCRIPTION.md`                                                                                                                      | Executable tests are the source of truth; deleted descriptions are recoverable from git history.                                                                                                        |
| Remove duplicate AI/project context | `AI_CONTEXT.md`, `PROJECT_DEEP_ANALYSIS.md`                                                                                                        | Agent routing belongs in `AGENTS.md`; product/design context belongs in `README.md`, `USER_GUIDE.md`, and root `DESIGN.md`.                                                                             |

Historical mentions in `CHANGELOG.md` may still refer to removed files as past artifacts. Active indexes and workflow routing should not point to deleted docs.
