import { timingSafeEqual } from 'node:crypto';

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { createSearchMcpServer, type SearchMcpServerOptions } from './server.js';

export interface RemoteMcpRequestOptions extends SearchMcpServerOptions {
	apiKey?: string;
	env?: NodeJS.ProcessEnv;
}

const AUTH_HEADER = 'authorization';
const BEARER_PREFIX = 'Bearer ';

export async function handleRemoteMcpRequest(
	request: Request,
	options: RemoteMcpRequestOptions = {}
): Promise<Response> {
	const authFailure = authorizeRemoteMcpRequest(
		request,
		options.apiKey ?? getMcpApiKey(options.env)
	);
	if (authFailure) {
		return authFailure;
	}

	try {
		const transport = new WebStandardStreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
			enableJsonResponse: true
		});
		const server = createSearchMcpServer({
			apiBaseUrl: getRemoteApiBaseUrl(request, options),
			fetchImpl: options.fetchImpl
		});

		await server.connect(transport);
		return await transport.handleRequest(request);
	} catch {
		return jsonError(500, 'MCP request failed.');
	}
}

export function handleUnsupportedRemoteMcpMethod(
	request: Request,
	options: Pick<RemoteMcpRequestOptions, 'apiKey' | 'env'> = {}
): Response {
	const authFailure = authorizeRemoteMcpRequest(
		request,
		options.apiKey ?? getMcpApiKey(options.env)
	);
	if (authFailure) {
		return authFailure;
	}

	return jsonError(405, 'Stateless MCP endpoint accepts POST requests.', {
		Allow: 'POST'
	});
}

export function getMcpApiKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
	const value = env.MCP_API_KEY?.trim();
	return value || undefined;
}

export function authorizeRemoteMcpRequest(
	request: Request,
	apiKey: string | undefined
): Response | null {
	if (!apiKey) {
		return jsonError(503, 'MCP_API_KEY is not configured.');
	}

	const authorization = request.headers.get(AUTH_HEADER);
	if (!authorization?.startsWith(BEARER_PREFIX)) {
		return jsonError(401, 'Bearer token is required.', {
			'WWW-Authenticate': 'Bearer'
		});
	}

	const token = authorization.slice(BEARER_PREFIX.length).trim();
	if (!isEqualSecret(token, apiKey)) {
		return jsonError(403, 'Bearer token is invalid.');
	}

	return null;
}

function getRemoteApiBaseUrl(request: Request, options: RemoteMcpRequestOptions): string {
	const env = options.env ?? process.env;
	const configuredBaseUrl = options.apiBaseUrl ?? env.DBMANAGER_API_BASE_URL?.trim();
	return configuredBaseUrl || new URL(request.url).origin;
}

function isEqualSecret(actual: string, expected: string): boolean {
	const actualBuffer = Buffer.from(actual);
	const expectedBuffer = Buffer.from(expected);
	return (
		actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
	);
}

function jsonError(status: number, message: string, headers: HeadersInit = {}): Response {
	return Response.json(
		{
			jsonrpc: '2.0',
			error: {
				code: -32000,
				message
			},
			id: null
		},
		{
			status,
			headers
		}
	);
}
