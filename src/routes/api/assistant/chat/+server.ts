import { env } from '$env/dynamic/private';
import { json, type RequestEvent } from '@sveltejs/kit';

import { AssistantError, createAssistantChatResponse } from '$lib/server/assistant.js';
import type { AssistantChatRequest, AssistantChatResponse } from '$lib/types/assistant.js';

export async function POST({ request, url, fetch }: RequestEvent) {
	try {
		const payload = parseAssistantChatPayload(await readJson(request));
		const data = await createAssistantChatResponse({
			bundleId: payload.bundleId,
			messages: payload.messages,
			apiBaseUrl: url.origin,
			fetchImpl: fetch as typeof globalThis.fetch,
			env
		});

		return json(
			{
				success: true,
				data
			} satisfies AssistantChatResponse,
			{ status: 200 }
		);
	} catch (error) {
		const status = error instanceof AssistantError ? error.status : 500;
		return json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Assistant 응답을 생성하는 중 오류가 발생했습니다.',
				message: 'Assistant chat failed'
			} satisfies AssistantChatResponse,
			{ status }
		);
	}
}

async function readJson(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		throw new AssistantError(400, '요청 JSON 형식이 올바르지 않습니다.');
	}
}

function parseAssistantChatPayload(payload: unknown): AssistantChatRequest {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		throw new AssistantError(400, 'Assistant 요청 본문이 올바르지 않습니다.');
	}

	const record = payload as Partial<AssistantChatRequest>;
	if (typeof record.bundleId !== 'string' || !record.bundleId.trim()) {
		throw new AssistantError(400, 'bundleId는 필수입니다.');
	}
	if (!Array.isArray(record.messages)) {
		throw new AssistantError(400, 'messages는 배열이어야 합니다.');
	}
	const messages = record.messages.map((message) => parseAssistantMessage(message));

	return {
		bundleId: record.bundleId,
		messages
	};
}

function parseAssistantMessage(message: unknown): AssistantChatRequest['messages'][number] {
	if (!message || typeof message !== 'object' || Array.isArray(message)) {
		throw new AssistantError(400, 'messages 항목 형식이 올바르지 않습니다.');
	}

	const record = message as Partial<AssistantChatRequest['messages'][number]>;
	if (record.role !== 'user' && record.role !== 'assistant') {
		throw new AssistantError(400, 'messages.role은 user 또는 assistant여야 합니다.');
	}
	if (typeof record.content !== 'string' || !record.content.trim()) {
		throw new AssistantError(400, 'messages.content는 비어 있지 않은 문자열이어야 합니다.');
	}

	return {
		role: record.role,
		content: record.content
	};
}
