import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AssistantDrawer from './AssistantDrawer.svelte';
import { goto } from '$app/navigation';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

const chatRequests: Array<{
	bundleId: string;
	messages: Array<{ role: string; content: string }>;
}> = [];
const deferredChatResponses: Array<{
	resolve: (response: Response) => void;
}> = [];
let deferChatResponses = false;

const defaultBundle = {
	id: 'default-shared-file-mapping',
	name: '기본 공통 번들',
	files: {
		vocabulary: 'vocabulary.json',
		domain: 'domain.json',
		term: 'term.json',
		database: 'database.json',
		entity: 'entity.json',
		attribute: 'attribute.json',
		table: 'table.json',
		column: 'column.json'
	},
	createdAt: '2026-06-01T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z'
};

const customBundle = {
	id: 'bio',
	name: 'biomimicry 번들',
	files: {
		vocabulary: 'biomimicry.json',
		domain: 'biomimicry.json',
		term: 'biomimicry.json',
		database: 'biomimicry.json',
		entity: 'biomimicry.json',
		attribute: 'biomimicry.json',
		table: 'biomimicry.json',
		column: 'biomimicry.json'
	},
	createdAt: '2026-06-01T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z'
};

function mockFetch() {
	chatRequests.length = 0;
	deferredChatResponses.length = 0;
	deferChatResponses = false;
	global.fetch = vi.fn(async (input, init) => {
		const url = String(input);
		if (url === '/api/assistant/bundles') {
			return new Response(
				JSON.stringify({
					success: true,
					data: {
						bundles: [defaultBundle, customBundle],
						recommendedBundleId: 'bio',
						defaultBundleId: 'default-shared-file-mapping'
					}
				}),
				{ headers: { 'content-type': 'application/json' } }
			);
		}

		if (url === '/api/assistant/chat') {
			const requestBody = JSON.parse(String((init as RequestInit | undefined)?.body ?? '{}')) as {
				bundleId: string;
				messages: Array<{ role: string; content: string }>;
			};
			chatRequests.push(requestBody);
			const bundle = requestBody.bundleId === customBundle.id ? customBundle : defaultBundle;
			const response = new Response(
				JSON.stringify({
					success: true,
					data: {
						bundle,
						sources: [],
						actions: [],
						message: {
							id: `assistant-${chatRequests.length}`,
							role: 'assistant',
							content: `${bundle.name} 기준으로 확인했습니다.\n\n출처: ${bundle.name}`,
							createdAt: '2026-06-19T00:00:00.000Z',
							bundleId: bundle.id,
							sources: [
								{
									id: 'source-1',
									tool: 'search_bundle',
									title: '단어집 검색',
									summary: '단어집 1건',
									bundleId: bundle.id,
									bundleName: bundle.name,
									type: 'vocabulary',
									filename: bundle.files.vocabulary,
									count: 1
								}
							],
							actions: [
								{
									id: 'open-vocabulary',
									type: 'navigate',
									label: '단어집 화면 열기',
									href: '/browse'
								}
							]
						}
					}
				}),
				{ headers: { 'content-type': 'application/json' } }
			);
			if (deferChatResponses) {
				return new Promise<Response>((resolve) => {
					deferredChatResponses.push({ resolve });
				});
			}

			return response;
		}

		return new Response('{}', { status: 404 });
	}) as typeof fetch;
}

describe('AssistantDrawer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		mockFetch();
	});

	it('shows a required bundle selectbox with default selectable and first custom selected', async () => {
		render(AssistantDrawer);

		await fireEvent.click(screen.getByRole('button', { name: 'AI Assistant 열기' }));
		const select = (await screen.findByLabelText('번들')) as HTMLSelectElement;

		await waitFor(() => expect(select.value).toBe('bio'));
		expect(screen.getByRole('option', { name: '기본 공통 번들' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'biomimicry 번들' })).toBeInTheDocument();
	});

	it('renders response sources and runs navigation only after action click', async () => {
		render(AssistantDrawer);

		await fireEvent.click(screen.getByRole('button', { name: 'AI Assistant 열기' }));
		await screen.findByLabelText('번들');
		await fireEvent.input(screen.getByLabelText('Assistant 질문'), {
			target: { value: '방문자 찾아줘' }
		});
		await fireEvent.click(screen.getByRole('button', { name: '전송' }));

		const action = await screen.findByRole('button', { name: '단어집 화면 열기' });
		expect(screen.getByText('단어집 검색 · 1건')).toBeInTheDocument();
		expect(goto).not.toHaveBeenCalled();

		await fireEvent.click(action);
		expect(goto).toHaveBeenCalledWith('/browse');
	});

	it('keeps chat history scoped to the selected bundle', async () => {
		render(AssistantDrawer);

		await fireEvent.click(screen.getByRole('button', { name: 'AI Assistant 열기' }));
		const select = (await screen.findByLabelText('번들')) as HTMLSelectElement;
		await waitFor(() => expect(select.value).toBe('bio'));

		await fireEvent.input(screen.getByLabelText('Assistant 질문'), {
			target: { value: '방문자 찾아줘' }
		});
		await fireEvent.click(screen.getByRole('button', { name: '전송' }));
		await screen.findByText(/biomimicry 번들 기준으로 확인했습니다/);

		await fireEvent.change(select, { target: { value: 'default-shared-file-mapping' } });
		await waitFor(() => expect(select.value).toBe('default-shared-file-mapping'));
		expect(screen.getByText('질문을 입력해 주세요.')).toBeInTheDocument();

		await fireEvent.input(screen.getByLabelText('Assistant 질문'), {
			target: { value: '휴일 알려줘' }
		});
		await fireEvent.click(screen.getByRole('button', { name: '전송' }));
		await waitFor(() => expect(chatRequests).toHaveLength(2));

		expect(chatRequests[0]).toEqual(
			expect.objectContaining({
				bundleId: 'bio',
				messages: [{ role: 'user', content: '방문자 찾아줘' }]
			})
		);
		expect(chatRequests[1]).toEqual(
			expect.objectContaining({
				bundleId: 'default-shared-file-mapping',
				messages: [{ role: 'user', content: '휴일 알려줘' }]
			})
		);

		await fireEvent.change(select, { target: { value: 'bio' } });
		expect(screen.getByText('방문자 찾아줘')).toBeInTheDocument();
	});

	it('locks the bundle selector while sending', async () => {
		deferChatResponses = true;
		render(AssistantDrawer);

		await fireEvent.click(screen.getByRole('button', { name: 'AI Assistant 열기' }));
		const select = (await screen.findByLabelText('번들')) as HTMLSelectElement;
		await waitFor(() => expect(select.value).toBe('bio'));

		await fireEvent.input(screen.getByLabelText('Assistant 질문'), {
			target: { value: '느린 응답 테스트' }
		});
		await fireEvent.click(screen.getByRole('button', { name: '전송' }));

		expect(select).toBeDisabled();
		expect(screen.getByRole('button', { name: '내보내기' })).toBeDisabled();
		expect(screen.getByRole('button', { name: '가져오기' })).toBeDisabled();
		expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled();
		await waitFor(() => expect(deferredChatResponses).toHaveLength(1));
		expect(chatRequests[0]?.bundleId).toBe('bio');
		deferredChatResponses[0]?.resolve(
			new Response(
				JSON.stringify({
					success: true,
					data: {
						bundle: customBundle,
						sources: [],
						actions: [],
						message: {
							id: 'assistant-delayed',
							role: 'assistant',
							content: '지연 응답\n\n출처: biomimicry 번들',
							createdAt: '2026-06-19T00:00:00.000Z',
							bundleId: 'bio',
							sources: [],
							actions: []
						}
					}
				}),
				{ headers: { 'content-type': 'application/json' } }
			)
		);

		await screen.findByText(/지연 응답/);
		await waitFor(() => expect(select).not.toBeDisabled());
		expect(screen.getByRole('button', { name: '내보내기' })).not.toBeDisabled();
		expect(screen.getByRole('button', { name: '가져오기' })).not.toBeDisabled();
		expect(screen.getByRole('button', { name: '삭제' })).not.toBeDisabled();
	});

	it('imports and deletes only the currently selected bundle conversation', async () => {
		render(AssistantDrawer);

		await fireEvent.click(screen.getByRole('button', { name: 'AI Assistant 열기' }));
		const select = (await screen.findByLabelText('번들')) as HTMLSelectElement;
		await waitFor(() => expect(select.value).toBe('bio'));
		await fireEvent.change(select, { target: { value: 'default-shared-file-mapping' } });
		await waitFor(() => expect(select.value).toBe('default-shared-file-mapping'));

		const importedText = JSON.stringify({
			version: 1,
			selectedBundleId: 'bio',
			conversations: {
				bio: {
					bundleId: 'bio',
					messages: [
						{
							id: 'imported-1',
							role: 'user',
							content: 'imported from bio',
							createdAt: '2026-06-19T00:00:00.000Z',
							bundleId: 'bio'
						}
					],
					updatedAt: '2026-06-19T00:00:00.000Z'
				}
			},
			updatedAt: '2026-06-19T00:00:00.000Z'
		});
		const imported = new File([importedText], 'assistant-history.json', {
			type: 'application/json'
		});
		Object.defineProperty(imported, 'text', {
			value: vi.fn().mockResolvedValue(importedText)
		});

		await fireEvent.click(screen.getByRole('button', { name: '가져오기' }));
		const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
		await fireEvent.change(fileInput, { target: { files: [imported] } });

		expect(select.value).toBe('default-shared-file-mapping');
		expect(await screen.findByText('imported from bio')).toBeInTheDocument();

		await fireEvent.change(select, { target: { value: 'bio' } });
		await waitFor(() => expect(select.value).toBe('bio'));
		expect(screen.getByText('질문을 입력해 주세요.')).toBeInTheDocument();

		await fireEvent.change(select, { target: { value: 'default-shared-file-mapping' } });
		expect(await screen.findByText('imported from bio')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: '삭제' }));
		expect(screen.getByText('질문을 입력해 주세요.')).toBeInTheDocument();
	});
});
