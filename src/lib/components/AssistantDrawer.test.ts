import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const ASSISTANT_MODE_STORAGE_KEY = 'dbmanager.assistant.view-mode';

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
							content: `**${bundle.name}** 기준으로 확인했습니다.\n\n- 출처: ${bundle.name}\n- 코드: \`HLDY\`\n\n*참고: 답변은 제공된 도구 검색 결과에 기반하여 작성되었습니다.*`,
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
									count: 1,
									targetId: 'vocabulary-1',
									targetLabel: '방문자'
								}
							],
							actions: [
								{
									id: 'open-vocabulary',
									type: 'navigate',
									label: '단어집 화면 열기',
									href: '/browse?filename=biomimicry.json&q=%EB%B0%A9%EB%AC%B8%EC%9E%90&field=all&exact=false&target=vocabulary-1&open=detail'
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

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('opens from the bottom-left circular launcher as a compact floating assistant by default', async () => {
		render(AssistantDrawer);

		const launcher = screen.getByRole('button', { name: 'AI Assistant 열기' });
		expect(launcher.className).toContain('bottom-8');
		expect(launcher.className).toContain('left-8');
		expect(launcher.className).toContain('h-12');
		expect(launcher.className).toContain('w-12');
		expect(launcher.className).toContain('rounded-full');
		expect(launcher.className).not.toContain('right-24');
		expect(launcher.className).not.toContain('top-1/2');

		await fireEvent.click(launcher);
		const dialog = await screen.findByRole('dialog', { name: 'AI Assistant 플로팅 창' });

		expect(dialog.className).toContain('bottom-3');
		expect(dialog.className).toContain('sm:left-6');
		expect(screen.getByRole('button', { name: '플로팅 보기' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	it('moves keyboard focus into the assistant and restores it to the launcher on Escape', async () => {
		render(AssistantDrawer);

		await fireEvent.click(screen.getByRole('button', { name: 'AI Assistant 열기' }));
		const dialog = await screen.findByRole('dialog', { name: 'AI Assistant 플로팅 창' });

		await waitFor(() => expect(dialog).toHaveFocus());
		await fireEvent.keyDown(dialog, { key: 'Escape' });

		const launcher = await screen.findByRole('button', { name: 'AI Assistant 열기' });
		await waitFor(() => expect(launcher).toHaveFocus());
	});

	it('switches to the left tab mode without pushing layout and remembers the mode', async () => {
		const { unmount } = render(AssistantDrawer);

		await fireEvent.click(screen.getByRole('button', { name: 'AI Assistant 열기' }));
		await fireEvent.click(await screen.findByRole('button', { name: '좌측 탭 보기' }));

		const tabDialog = await screen.findByRole('dialog', { name: 'AI Assistant 좌측 탭' });
		expect(tabDialog.className).toContain('left-0');
		expect(tabDialog.className).toContain('top-[var(--layout-header-height)]');
		expect(localStorage.getItem(ASSISTANT_MODE_STORAGE_KEY)).toBe('tab');

		unmount();
		render(AssistantDrawer);
		await fireEvent.click(screen.getByRole('button', { name: 'AI Assistant 열기' }));

		expect(await screen.findByRole('dialog', { name: 'AI Assistant 좌측 탭' })).toBeInTheDocument();
	});

	it('keeps mode switching usable when browser mode storage is unavailable', async () => {
		const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('storage blocked for test');
		});
		render(AssistantDrawer);

		await fireEvent.click(screen.getByRole('button', { name: 'AI Assistant 열기' }));
		await fireEvent.click(await screen.findByRole('button', { name: '좌측 탭 보기' }));

		expect(await screen.findByRole('dialog', { name: 'AI Assistant 좌측 탭' })).toBeInTheDocument();
		expect(setItem).toHaveBeenCalledWith(ASSISTANT_MODE_STORAGE_KEY, 'tab');
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
		expect(
			screen.getAllByText('biomimicry 번들').some((element) => element.tagName === 'STRONG')
		).toBe(true);
		expect(screen.queryByText('출처: biomimicry 번들')).not.toBeInTheDocument();
		expect(
			screen.queryByText('참고: 답변은 제공된 도구 검색 결과에 기반하여 작성되었습니다.')
		).not.toBeInTheDocument();
		expect(screen.getByText('HLDY').tagName).toBe('CODE');
		expect(goto).not.toHaveBeenCalled();

		await fireEvent.click(action);
		expect(goto).toHaveBeenCalledWith(
			'/browse?filename=biomimicry.json&q=%EB%B0%A9%EB%AC%B8%EC%9E%90&field=all&exact=false&target=vocabulary-1&open=detail'
		);
	});

	it('limits assistant input length in the composer', async () => {
		render(AssistantDrawer);

		await fireEvent.click(screen.getByRole('button', { name: 'AI Assistant 열기' }));
		const input = (await screen.findByLabelText('Assistant 질문')) as HTMLTextAreaElement;

		expect(input.maxLength).toBe(1200);
		expect(screen.getByText('0/1200')).toBeInTheDocument();

		await fireEvent.input(input, { target: { value: '방문자' } });
		expect(screen.getByText('3/1200')).toBeInTheDocument();
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
		await screen.findByText('HLDY');

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
