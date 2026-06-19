# DbManager MCP Search Server

DbManager MCP search server exposes the existing local SvelteKit search/filter/generator APIs as read-only MCP tools. It is a thin HTTP proxy: it does not read `static/data` directly and it does not change existing `/api/...` response contracts.

## Requirements

1. Start the DbManager app server first.

```bash
pnpm run dev
```

2. Start the MCP server in a separate process.

PowerShell:

```powershell
$env:DBMANAGER_API_BASE_URL = "http://localhost:5173"
pnpm run mcp:search
```

Bash:

```bash
DBMANAGER_API_BASE_URL=http://localhost:5173 pnpm run mcp:search
```

If `DBMANAGER_API_BASE_URL` is omitted, the MCP server uses `http://localhost:5173`.

## MCP Client Command

Use this command from an MCP client that supports stdio servers:

```json
{
	"command": "pnpm",
	"args": ["run", "mcp:search"],
	"env": {
		"DBMANAGER_API_BASE_URL": "http://localhost:5173"
	}
}
```

## Bundle-First Rule

DbManager data is usually meaningful as a connected 8-file set:

- `vocabulary`
- `domain`
- `term`
- `database`
- `entity`
- `attribute`
- `table`
- `column`

All data-reading MCP tools require one of these selectors:

- `bundleId`
- `bundleName`
- complete `bundleFiles`

When no selector is supplied, the tool returns `needs_bundle_selection` with available bundles. It does not silently use default filenames. This prevents mixed-context answers, such as reading `term/biomimicry.json` while using default vocabulary data.

Raw filenames are not public MCP tool inputs. The MCP server resolves filenames from the selected bundle before proxying to the backing API routes.

If both `bundleId` and `bundleName` are supplied, they must resolve to the same bundle. Conflicting selector state returns `bundle_resolution_error`.

If complete `bundleFiles` is supplied together with `bundleId` or `bundleName`, the resolved shared bundle must contain the same filenames. Conflicting redundant selector state returns `bundle_resolution_error`.

Search limits mirror the backing routes: vocabulary search accepts `limit` up to 500, domain/term/DB design search tools accept `limit` up to 100, and `search_bundle.limitPerType` accepts up to 100.

## Tools

| Tool                  | Backing API                                | Notes                                                                            |
| --------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| `list_file_bundles`   | `GET /api/design-snapshots`                | Returns only `data.bundles`.                                                     |
| `resolve_file_bundle` | `GET /api/design-snapshots`                | Resolves exact id, exact name, then unique case-insensitive name substring.      |
| `search_vocabulary`   | `GET /api/search`                          | Uses `bundle.files.vocabulary`.                                                  |
| `suggest_vocabulary`  | `POST /api/search?filename=...`            | Uses `bundle.files.vocabulary`.                                                  |
| `search_domain`       | `GET /api/domain`                          | Uses `bundle.files.domain`.                                                      |
| `search_term`         | `GET /api/term`                            | Uses `bundle.files.term`.                                                        |
| `search_database`     | `GET /api/database`                        | Uses `bundle.files.database`.                                                    |
| `search_entity`       | `GET /api/entity`                          | Uses `bundle.files.entity`.                                                      |
| `search_attribute`    | `GET /api/attribute`                       | Uses `bundle.files.attribute`.                                                   |
| `search_table`        | `GET /api/table`                           | Uses `bundle.files.table`.                                                       |
| `search_column`       | `GET /api/column`                          | Uses `bundle.files.column`.                                                      |
| `get_filter_options`  | `GET /api/{type}/filter-options`           | Supports all 8 data types.                                                       |
| `search_bundle`       | Multiple GET routes                        | Searches grouped connected-set results. Defaults to all 8 data types.            |
| `convert_term`        | `POST /api/generator?filename=...`         | Uses the resolved term file so the API follows its connected vocabulary mapping. |
| `segment_term`        | `POST /api/generator/segment?filename=...` | Uses the resolved term file before segmentation.                                 |

## Example Use Cases

- "biomimicry bundle에서 방문자 관련 단어, 용어, 컬럼을 같이 찾아줘"
  - Use `search_bundle` with `bundleName: "biomimicry"` and `query: "방문자"`.
- "방문자*수*현황\_연월의 영문약어가 뭐야?"
  - Use `convert_term` with `bundleName: "biomimicry"`, `term: "방문자_수_현황_연월"`, and `direction: "ko-to-en"`.
- "VSTRCNTPRSTYM을 표준 약어 토큰으로 나눠줘"
  - Use `segment_term` with `bundleName: "biomimicry"`, `term: "VSTRCNTPRSTYM"`, and `direction: "en-to-ko"`.

## Scope Limits

This first pass intentionally excludes:

- mutation tools
- validation report tools
- ERD graph/image tools
- direct file or registry reads
- auth or hosted network exposure
