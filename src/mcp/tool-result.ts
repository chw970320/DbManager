import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { DbManagerApiError } from './http-client.js';

export function jsonToolResult(payload: unknown, summary?: string): CallToolResult {
	const body = JSON.stringify(payload, null, 2);
	const structuredContent =
		payload && typeof payload === 'object' && !Array.isArray(payload)
			? payload
			: { value: payload };

	return {
		content: [
			{
				type: 'text',
				text: summary ? `${summary}\n\n${body}` : body
			}
		],
		structuredContent: structuredContent as Record<string, unknown>
	};
}

export function errorToolResult(
	error: unknown,
	summary = 'DbManager MCP tool failed.'
): CallToolResult {
	return jsonToolResult(toErrorPayload(error), summary);
}

export function toErrorPayload(error: unknown): Record<string, unknown> {
	if (error instanceof DbManagerApiError) {
		return {
			status: 'upstream_error',
			message: error.message,
			method: error.method,
			url: error.url,
			httpStatus: error.status,
			httpStatusText: error.statusText,
			responseBody: error.responseBody
		};
	}

	return {
		status: 'tool_error',
		message: error instanceof Error ? error.message : 'Unknown MCP tool error.'
	};
}
