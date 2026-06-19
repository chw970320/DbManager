# DbManager AI Assistant

DbManager AI Assistant is an in-app, right-side chat drawer for asking questions about the currently selected 8-file bundle. It uses the internal LLM server and DbManager read-only MCP/search tool surface, then shows source/provenance and user-clicked action buttons.

## Setup

Configure the internal OpenAI-compatible llama.cpp server in `.env`:

```env
LLM_PROVIDER=llama_cpp
LLM_BASE_URL=http://ecobank-dev-was:58000/v1
LLM_MODEL=qwen3.5-4b
LLM_API_KEY=<secret>
LLM_TIMEOUT_MS=60000
LLM_ENABLE_REAL_CALLS=true
```

Secrets are read only by server routes. The browser receives assistant messages, source metadata, and action buttons; it does not receive `LLM_API_KEY`.

For local UI/testing without a live LLM, set:

```env
LLM_ENABLE_REAL_CALLS=false
```

The assistant then returns a deterministic source summary from the collected DbManager context.

## Behavior

- The assistant is available globally from the floating AI Assistant button.
- The drawer uses the highest app layer so it appears above validation panels, dialogs, toasts, and tooltips.
- A bundle is always selected.
- The default shared bundle remains selectable.
- If non-default bundles exist, the first non-default bundle is selected by default.
- DbManager data operations are read-only in this first pass.
- Suggested route actions are rendered as buttons and run only after the user clicks them.
- Answers emphasize source/provenance from selected bundle files and tool results.

## Local History

Chat history is stored in the browser, not on the server.

- Primary storage: IndexedDB
- Fallback storage: localStorage when IndexedDB is unavailable
- Conversations are partitioned by bundle id, so switching bundles does not replay another bundle's transcript into the current request.
- History survives normal reloads, hard reloads, and HTTP cache clearing.
- Browser site-data deletion can still remove it.
- The drawer provides export, import, and delete controls for the currently selected bundle conversation.

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
