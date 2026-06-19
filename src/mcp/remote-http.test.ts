import { describe, expect, it, vi } from 'vitest';

import { handleRemoteMcpRequest } from './remote-http.js';
import type { FileBundle } from './bundles.js';

const TEST_API_KEY = 'remote-secret';

const BUNDLE_FILES: FileBundle = {
	vocabulary: 'biomimicry.json',
	domain: 'biomimicry.json',
	term: 'biomimicry.json',
	database: 'biomimicry.json',
	entity: 'biomimicry.json',
	attribute: 'biomimicry.json',
	table: 'biomimicry.json',
	column: 'biomimicry.json'
};

function createMcpRequest(body: unknown, options: { authorization?: string; url?: string } = {}) {
	const headers: Record<string, string> = {
		'content-type': 'application/json',
		accept: 'application/json, text/event-stream'
	};
	if (options.authorization) {
		headers.authorization = options.authorization;
	}

	return new Request(options.url ?? 'http://internal.example/mcp', {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});
}

async function readJson<T>(response: Response): Promise<T> {
	return (await response.json()) as T;
}

describe('remote MCP HTTP transport', () => {
	it('fails closed when MCP_API_KEY is not configured', async () => {
		const response = await handleRemoteMcpRequest(
			createMcpRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
			{ env: {} }
		);
		const payload = await readJson<{ error: { message: string } }>(response);

		expect(response.status).toBe(503);
		expect(payload.error.message).toContain('MCP_API_KEY');
	});

	it('rejects missing and wrong bearer tokens before tool execution', async () => {
		const fetchImpl = vi.fn();

		const missing = await handleRemoteMcpRequest(
			createMcpRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
			{ apiKey: TEST_API_KEY, fetchImpl }
		);
		const wrong = await handleRemoteMcpRequest(
			createMcpRequest(
				{ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
				{ authorization: 'Bearer wrong-secret' }
			),
			{ apiKey: TEST_API_KEY, fetchImpl }
		);

		expect(missing.status).toBe(401);
		expect(missing.headers.get('www-authenticate')).toBe('Bearer');
		expect(wrong.status).toBe(403);
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('does not accept API keys from query strings', async () => {
		const response = await handleRemoteMcpRequest(
			createMcpRequest(
				{ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
				{ url: `http://internal.example/mcp?api_key=${TEST_API_KEY}` }
			),
			{ apiKey: TEST_API_KEY }
		);

		expect(response.status).toBe(401);
	});

	it('serves MCP initialization and tool discovery with a valid bearer token', async () => {
		const initialize = await handleRemoteMcpRequest(
			createMcpRequest(
				{
					jsonrpc: '2.0',
					id: 1,
					method: 'initialize',
					params: {
						protocolVersion: '2025-06-18',
						capabilities: {},
						clientInfo: { name: 'remote-test', version: '0.0.0' }
					}
				},
				{ authorization: `Bearer ${TEST_API_KEY}` }
			),
			{ apiKey: TEST_API_KEY }
		);
		const tools = await handleRemoteMcpRequest(
			createMcpRequest(
				{ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
				{ authorization: `Bearer ${TEST_API_KEY}` }
			),
			{ apiKey: TEST_API_KEY }
		);

		const initializePayload = await readJson<{
			result: { serverInfo: { name: string } };
		}>(initialize);
		const toolsPayload = await readJson<{
			result: { tools: Array<{ name: string }> };
		}>(tools);

		expect(initialize.status).toBe(200);
		expect(initializePayload.result.serverInfo.name).toBe('dbmanager-search');
		expect(tools.status).toBe(200);
		expect(toolsPayload.result.tools.map((tool: { name: string }) => tool.name)).toEqual(
			expect.arrayContaining(['search_bundle', 'convert_term', 'list_file_bundles'])
		);
	});

	it('calls backing APIs through the request origin when DBMANAGER_API_BASE_URL is omitted', async () => {
		const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			expect(url.origin).toBe('http://internal.example');
			expect(url.pathname).toBe('/api/design-snapshots');

			return Response.json({
				success: true,
				data: {
					bundles: [{ id: 'bio', name: 'biomimicry', files: BUNDLE_FILES }]
				}
			});
		});

		const response = await handleRemoteMcpRequest(
			createMcpRequest(
				{
					jsonrpc: '2.0',
					id: 3,
					method: 'tools/call',
					params: { name: 'list_file_bundles', arguments: {} }
				},
				{ authorization: `Bearer ${TEST_API_KEY}` }
			),
			{ apiKey: TEST_API_KEY, fetchImpl }
		);
		const payload = await readJson<{
			result: {
				structuredContent: {
					status: string;
					bundles: Array<{ files: FileBundle }>;
				};
			};
		}>(response);

		expect(response.status).toBe(200);
		expect(payload.result.structuredContent.status).toBe('ok');
		expect(payload.result.structuredContent.bundles[0].files.term).toBe('biomimicry.json');
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it('uses DBMANAGER_API_BASE_URL for backing APIs when configured', async () => {
		const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			expect(url.origin).toBe('http://api.internal.local');
			expect(url.pathname).toBe('/api/design-snapshots');

			return Response.json({
				success: true,
				data: {
					bundles: [{ id: 'bio', name: 'biomimicry', files: BUNDLE_FILES }]
				}
			});
		});

		const response = await handleRemoteMcpRequest(
			createMcpRequest(
				{
					jsonrpc: '2.0',
					id: 4,
					method: 'tools/call',
					params: { name: 'list_file_bundles', arguments: {} }
				},
				{ authorization: `Bearer ${TEST_API_KEY}` }
			),
			{
				apiKey: TEST_API_KEY,
				env: { DBMANAGER_API_BASE_URL: 'http://api.internal.local' },
				fetchImpl
			}
		);
		const payload = await readJson<{
			result: {
				structuredContent: {
					status: string;
					bundles: Array<{ files: FileBundle }>;
				};
			};
		}>(response);

		expect(response.status).toBe(200);
		expect(payload.result.structuredContent.status).toBe('ok');
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});
});
