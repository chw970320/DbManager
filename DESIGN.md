# DbManager Design

## Source of truth

- Status: Active
- Last refreshed: 2026-05-29
- This root `DESIGN.md` is the canonical product/UI design guide.
- Legacy design drafts such as `docs/DESIGN.md`, if restored from history, are reference-only inputs and must not override this file.
- Root `AGENTS.md` is the canonical agent workflow guide.
- Detailed contracts remain in `docs/specs/api-reference.md` and `docs/specs/data-model.md`.
- Primary product surfaces:
  - Home and global navigation: `src/routes/+page.svelte`, `src/routes/+layout.svelte`
  - Standardization workflows: vocabulary, domain, term, generator/converter, validation
  - DB design workflows: database, entity, attribute, table, column, ERD, snapshots
  - Operations/quality workflows: data sources, profiling, quality rules, file management, uploads
- Evidence reviewed:
  - Product/domain guidance from `README.md`, `docs/USER_GUIDE.md`, and `docs/QUICK_START.md`
  - Current API/data contracts from `docs/specs/api-reference.md` and `docs/specs/data-model.md`
  - Existing Tailwind/Svelte implementation evidence from `src/app.css`, `tailwind.config.js`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, and shared components under `src/lib/components/`
  - Legacy/reference design draft formerly located at `docs/DESIGN.md`; its usable guidance is summarized here and any restored copy remains reference-only

## Product identity

DbManager is a Korean-first data standardization and database-design workbench. It helps users manage vocabularies, domains, terms, database definitions, table/column mappings, ERD views, file uploads, snapshots, data sources, profiling, and quality rules with explicit validation and recoverable operations.

## Brand

- Technical, restrained, and trustworthy.
- Optimize for structure, scanability, validation, and safe editing over decorative visuals.
- Use clear Korean business wording for user-facing copy.
- Avoid ad-hoc Tailwind combinations when a shared component, token, or pattern exists.

## Product goals

- Keep the vocabulary → domain → term → database-design flow understandable across screens.
- Make file-based storage, shared mappings, uploads, restores, and sync operations safe to inspect before applying.
- Preserve dense data-table usability for long lists with search, filters, sorting, and clear empty/loading states.
- Surface validation, impact previews, and destructive-action confirmations before risky changes.

## Non-goals

- Do not introduce a new design system or UI dependency without an explicit task.
- Do not perform a full UI redesign as part of ordinary feature work.
- Do not sacrifice data density, keyboard accessibility, or Korean explanatory copy for visual novelty.

## Personas and jobs

- Data architect: standardizes vocabulary/domain/term quality and reuse.
- Database designer: maps standard terms to database/entity/attribute/table/column definitions.
- Internal data operator: manages files, uploads, snapshots, data sources, profiling, and quality rules.
- Developer/reviewer: validates JSON-backed data, API behavior, and UI regressions.

## Information architecture

- Global navigation follows grouped product areas from `src/lib/utils/navigation`.
- Core areas:
  - Home and navigation
  - Standardization: vocabulary, domain, term, generator/converter, validation
  - DB design: database, entity, attribute, table, column, ERD, snapshots
  - Operations/quality: data sources, profiling, quality rules, file management
- Preserve route and menu naming consistency across user docs, UI labels, and tests.

## Design principles

1. **Validate before mutate**: show impact, warnings, and confirmations before destructive or broad changes.
2. **Reuse before invent**: start from existing components and analogous flows.
3. **Explain with data context**: copy should name the file/model/entity affected by the action.
4. **Keep tables operational**: search/filter/sort affordances must remain easy to reach.
5. **Prefer reversible workflows**: uploads, restores, sync, and deletes need confirmation and result feedback.

## Visual language

- Use existing semantic color tokens and shared classes from `src/app.css` and `tailwind.config.js`.
- Favor neutral surfaces, clear borders, restrained emphasis, and state-specific chips/badges.
- Primary actions should be visually distinct; destructive actions should be explicit and confirmed.
- Maintain consistent spacing rhythm across Browse, Editor, Table, modal, and panel surfaces.

## Components

Prefer these existing component families before creating new UI primitives:

- Layout/navigation: `BrowsePageLayout`, `ActionBar`, `Breadcrumb`, global navigation components.
- Search/filter/table: `SearchBar`, `ColumnFilter`, `TablePagination`, domain/table-specific table components.
- Feedback/safety: `Toast`, `ConfirmDialog`, validation panels, impact preview panels.
- State placeholders: `EmptyState`, `Skeleton`, loading/error blocks.
- Cards/home: `BentoGrid`, `BentoCard`, dashboard/entry cards.
- Forms: `FormField`, existing editor modal patterns, existing file-manager/upload patterns.

## Accessibility

- Preserve keyboard access for navigation, dialogs, tables, filters, and destructive confirmations.
- Use semantic buttons/inputs and visible focus states.
- Do not rely on color alone for validation, warning, or error states.
- Keep Korean labels specific enough for screen readers and operational review.

## Responsive behavior

- Desktop data-management workflows are primary, but layouts should degrade gracefully on tablet/mobile.
- Keep table controls and primary actions accessible when horizontal space is constrained.
- Navigation may collapse, but route groups and labels should remain understandable.

## Interaction states

Every new or changed interactive surface should define:

- Initial/loading state
- Empty state
- Success state
- Validation/warning state
- Error state
- Destructive confirmation path when applicable

## Content voice

- Use concise Korean action labels: 저장, 삭제, 복원, 동기화, 검증, 업로드, 다운로드.
- Explain consequences before risky actions.
- Prefer concrete model/file names over generic “항목” when possible.
- Error messages should say what failed, why when known, and the next recovery action.

## Implementation constraints

- Reuse existing source patterns and tests before adding abstractions.
- For DB, Entity, Attribute, Table, and Column flows, mirror Vocabulary, Domain, and Term UX unless the task deliberately changes it.
- If UI behavior changes, update user-facing docs and targeted tests in the same work unit.
- Use root `AGENTS.md` for workflow/verification/commit rules; do not duplicate those rules here.

## Open questions

- Which table interactions should eventually become shared primitives rather than per-model implementations?
- Which validation/impact-preview panels should be unified visually after the current docs cleanup?
- Whether future design audits should generate screenshots or browser-based visual evidence for high-impact UI changes.
