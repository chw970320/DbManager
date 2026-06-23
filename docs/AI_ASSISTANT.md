# DbManager AI Assistant

DbManager AI Assistant is an in-app chat surface for asking questions about the currently selected 8-file bundle. It uses the internal LLM server and DbManager read-only MCP/search tool surface, then shows source/provenance and user-clicked action buttons.

## Setup

Configure the internal OpenAI-compatible llama.cpp server in `.env`:

```env
LLM_PROVIDER=llama_cpp
LLM_BASE_URL=http://ecobank-dev-was:58000/v1
LLM_MODEL=qwen3.5-4b
LLM_API_KEY=<secret>
LLM_TIMEOUT_MS=60000
LLM_ENABLE_REAL_CALLS=true
LLM_CONTEXT_TOKENS=4096
LLM_RESPONSE_RESERVE_TOKENS=768
```

Secrets are read only by server routes. The browser receives assistant messages, source metadata, and action buttons; it does not receive `LLM_API_KEY`.

When running with `docker-compose.yml`, the Compose file passes these `.env` values into the `app` container. Without those explicit environment entries, Compose can read `.env` for variable substitution while the SvelteKit server still sees `LLM_ENABLE_REAL_CALLS` as unset and returns the deterministic fallback answer instead of calling the LLM.

For local UI/testing without a live LLM, set:

```env
LLM_ENABLE_REAL_CALLS=false
```

The assistant then returns a deterministic source summary from the collected DbManager context.

## Behavior

- The assistant is available globally from a bottom-left circular launcher.
- The default view is a compact fixed-position floating window in the left-bottom area.
- Users can switch to a left overlay tab panel when they want a taller docked review surface.
- The last selected assistant view mode is remembered in browser storage.
- Assistant surfaces use the highest app layer so they appear above validation panels, dialogs, toasts, and tooltips.
- The assistant no longer uses a right-side full-height drawer, so it does not compete with validation panels that open from the right.
- Header and history controls stay compact so the conversation area remains the primary reading surface.
- A bundle is always selected.
- The default shared bundle remains selectable.
- If non-default bundles exist, the first non-default bundle is selected by default.
- DbManager data operations are read-only in this first pass.
- Suggested route actions are rendered as buttons and run only after the user clicks them.
- Route actions preserve search context with `filename`, `q`, `field`, and `exact` URL params when possible.
- Search-result route actions can also include `target` and `open=detail` so linked browse screens open the matched row detail when the row is present in the hydrated result page.
- Linked browse screens hydrate those params into the search bar and existing table highlighting, then safely fall back to the search result view when the target row is not present.
- Answers keep source/provenance in the dedicated source area and avoid duplicating `출처:` or tool-result note text in the answer body.
- Assistant answers render safe markdown blocks for headings, paragraphs, lists, tables, inline code, and code fences.
- The browser limits a single user question to 1200 characters.
- The server trims recent history and tool context against `LLM_CONTEXT_TOKENS - LLM_RESPONSE_RESERVE_TOKENS`.

## Local History

Chat history is stored in the browser, not on the server.

- Primary storage: IndexedDB
- Fallback storage: localStorage when IndexedDB is unavailable
- Stored messages are normalized into plain JSON-compatible DTOs before IndexedDB writes so source/action arrays from the Svelte UI remain clone-safe.
- Conversations are partitioned by bundle id, so switching bundles does not replay another bundle's transcript into the current request.
- History survives normal reloads, hard reloads, and HTTP cache clearing.
- Browser site-data deletion can still remove it.
- The assistant provides export, import, and delete controls for the currently selected bundle conversation.

Server-side user history, login/session identity, and recovery-key storage are intentionally out of scope for the first pass.

## Internal API

- `GET /api/assistant/bundles`
  - Returns all shared file bundles, including `default-shared-file-mapping`.
  - Returns the recommended initial bundle id.
- `POST /api/assistant/chat`
  - Accepts `bundleId` and recent chat messages.
  - Resolves the selected bundle server-side.
  - Collects read-only DbManager context through MCP-equivalent search/generator tools.
  - Calls the configured internal LLM when `LLM_ENABLE_REAL_CALLS=true`.
  - Returns the assistant message, source metadata, and user-clicked actions.

The first-pass assistant intentionally reuses the existing same-origin `/api/search`,
`/api/generator`, and `/api/generator/segment` HTTP contracts through the MCP-equivalent
tool helpers. This keeps assistant answers aligned with the current app and remote MCP
behavior while staying read-only. If assistant traffic, tracing, or latency becomes a
problem, move that tool context collection behind a shared internal service boundary.
