import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerBundleTools } from './bundles.js';
import { createDbManagerApiClient } from './http-client.js';
import { registerSearchTools } from './search-tools.js';

export interface SearchMcpServerOptions {
	apiBaseUrl?: string;
	fetchImpl?: typeof fetch;
}

export function createSearchMcpServer(options: SearchMcpServerOptions = {}) {
	const apiClient = createDbManagerApiClient({
		baseUrl: options.apiBaseUrl,
		fetchImpl: options.fetchImpl
	});
	const server = new McpServer({
		name: 'dbmanager-search',
		version: '0.1.0'
	});

	registerBundleTools(server, apiClient);
	registerSearchTools(server, apiClient);

	return server;
}

async function main() {
	const server = createSearchMcpServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

function isDirectRun(): boolean {
	const scriptPath = process.argv[1];
	return scriptPath ? resolve(scriptPath) === fileURLToPath(import.meta.url) : false;
}

if (isDirectRun()) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
