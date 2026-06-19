import type { RequestEvent, RequestHandler } from './$types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DELETE, GET, POST } from './+server';

const ROUTE_API_KEY = 'route-secret';
const ORIGINAL_MCP_API_KEY = process.env.MCP_API_KEY;

function createRouteEvent(
	method: string,
	options: { authorization?: string; body?: unknown } = {}
): RequestEvent {
	const headers = new Headers({
		accept: 'application/json, text/event-stream'
	});
	if (options.authorization) {
		headers.set('authorization', options.authorization);
	}
	if (options.body !== undefined) {
		headers.set('content-type', 'application/json');
	}

	return {
		request: new Request('http://internal.example/mcp', {
			method,
			headers,
			body: options.body === undefined ? undefined : JSON.stringify(options.body)
		})
	} as RequestEvent;
}

function createInitializeBody() {
	return {
		jsonrpc: '2.0',
		id: 1,
		method: 'initialize',
		params: {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'route-test', version: '0.0.0' }
		}
	};
}

async function callRoute(handler: RequestHandler, event: RequestEvent): Promise<Response> {
	return await handler(event);
}

async function readJson<T>(response: Response): Promise<T> {
	return (await response.json()) as T;
}

describe('Route: /mcp', () => {
	beforeEach(() => {
		process.env.MCP_API_KEY = ROUTE_API_KEY;
	});

	afterEach(() => {
		if (ORIGINAL_MCP_API_KEY === undefined) {
			delete process.env.MCP_API_KEY;
		} else {
			process.env.MCP_API_KEY = ORIGINAL_MCP_API_KEY;
		}
	});

	it('fails closed when the route API key is not configured', async () => {
		delete process.env.MCP_API_KEY;

		const response = await callRoute(
			POST,
			createRouteEvent('POST', {
				authorization: `Bearer ${ROUTE_API_KEY}`,
				body: createInitializeBody()
			})
		);
		const payload = await readJson<{ error: { message: string } }>(response);

		expect(response.status).toBe(503);
		expect(payload.error.message).toContain('MCP_API_KEY');
	});

	it('auth-gates POST before serving MCP requests', async () => {
		const missing = await callRoute(
			POST,
			createRouteEvent('POST', { body: createInitializeBody() })
		);
		const invalid = await callRoute(
			POST,
			createRouteEvent('POST', {
				authorization: 'Bearer wrong-secret',
				body: createInitializeBody()
			})
		);

		expect(missing.status).toBe(401);
		expect(missing.headers.get('www-authenticate')).toBe('Bearer');
		expect(invalid.status).toBe(403);
	});

	it('serves MCP initialization through the POST route', async () => {
		const response = await callRoute(
			POST,
			createRouteEvent('POST', {
				authorization: `Bearer ${ROUTE_API_KEY}`,
				body: createInitializeBody()
			})
		);
		const payload = await readJson<{ result: { serverInfo: { name: string } } }>(response);

		expect(response.status).toBe(200);
		expect(payload.result.serverInfo.name).toBe('dbmanager-search');
	});

	it.each([
		['GET', GET],
		['DELETE', DELETE]
	])(
		'auth-gates %s and returns 405 after valid auth in stateless mode',
		async (method, handler) => {
			const missing = await callRoute(handler, createRouteEvent(method));
			const invalid = await callRoute(
				handler,
				createRouteEvent(method, { authorization: 'Bearer wrong-secret' })
			);
			const valid = await callRoute(
				handler,
				createRouteEvent(method, { authorization: `Bearer ${ROUTE_API_KEY}` })
			);
			const payload = await readJson<{ error: { message: string } }>(valid);

			expect(missing.status).toBe(401);
			expect(invalid.status).toBe(403);
			expect(valid.status).toBe(405);
			expect(valid.headers.get('allow')).toBe('POST');
			expect(payload.error.message).toContain('POST');
		}
	);
});
