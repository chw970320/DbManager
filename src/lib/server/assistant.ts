import { randomUUID } from 'node:crypto';

import { ALL_DATA_TYPES, DATA_TYPE_LABELS, type DataType } from '$lib/types/base.js';
import type {
	AssistantAction,
	AssistantBundleListData,
	AssistantChatMessage,
	AssistantChatRequestMessage,
	AssistantChatResponseData,
	AssistantSource
} from '$lib/types/assistant.js';
import type {
	SharedFileMappingBundle,
	SharedFileMappingBundleEntry,
	SharedFileMappingRegistryData
} from '$lib/types/shared-file-mapping.js';
import { loadSharedFileMappingRegistryData } from '$lib/registry/shared-file-mapping-registry.js';
import { createBrowseHref } from '$lib/utils/browse-url-state.js';

import { createDbManagerApiClient, type DbManagerApiClient } from '../../mcp/http-client.js';
import { convertTerm, searchBundle, segmentTerm } from '../../mcp/search-tools.js';

const DEFAULT_SHARED_FILE_MAPPING_ID = 'default-shared-file-mapping';
const MAX_HISTORY_MESSAGES = 8;
const MAX_ASSISTANT_INPUT_CHARS = 1200;
const MAX_HISTORY_MESSAGE_CHARS = 2000;
const DEFAULT_LLM_TIMEOUT_MS = 60000;
const DEFAULT_LLM_CONTEXT_TOKENS = 4096;
const DEFAULT_LLM_RESPONSE_RESERVE_TOKENS = 768;
const PROMPT_SAFETY_MARGIN_TOKENS = 128;
const MIN_TOOL_CONTEXT_TOKENS = 256;
const ESTIMATED_CHARS_PER_TOKEN = 2;

const ROUTE_BY_TYPE: Record<DataType, string> = {
	vocabulary: '/browse',
	domain: '/domain/browse',
	term: '/term/browse',
	database: '/database/browse',
	entity: '/entity/browse',
	attribute: '/attribute/browse',
	table: '/table/browse',
	column: '/column/browse'
};

type AssistantEnv = Partial<Record<string, string | undefined>>;

interface CreateAssistantResponseOptions {
	bundleId: string;
	messages: AssistantChatRequestMessage[];
	apiBaseUrl: string;
	fetchImpl?: typeof fetch;
	llmFetchImpl?: typeof fetch;
	env?: AssistantEnv;
	bundleLoader?: () => Promise<SharedFileMappingRegistryData>;
	now?: () => Date;
}

interface ToolContext {
	sources: AssistantSource[];
	actions: AssistantAction[];
	contextText: string;
}

interface LlmChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export class AssistantError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = 'AssistantError';
		this.status = status;
	}
}

export async function getAssistantBundleList(
	bundleLoader: () => Promise<SharedFileMappingRegistryData> = loadSharedFileMappingRegistryData
): Promise<AssistantBundleListData> {
	const data = await bundleLoader();
	const bundles = data.bundles;
	if (bundles.length === 0) {
		throw new AssistantError(500, '사용 가능한 파일 번들이 없습니다.');
	}

	return {
		bundles,
		recommendedBundleId: recommendAssistantBundleId(bundles),
		defaultBundleId: DEFAULT_SHARED_FILE_MAPPING_ID
	};
}

export function recommendAssistantBundleId(bundles: SharedFileMappingBundleEntry[]): string {
	const nonDefaultBundle = bundles.find((bundle) => bundle.id !== DEFAULT_SHARED_FILE_MAPPING_ID);
	return nonDefaultBundle?.id ?? bundles[0]?.id ?? '';
}

export async function createAssistantChatResponse(
	options: CreateAssistantResponseOptions
): Promise<AssistantChatResponseData> {
	const now = options.now ?? (() => new Date());
	const env = options.env ?? process.env;
	validateLatestUserInput(options.messages, env);
	const messages = sanitizeMessages(options.messages);
	const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
	if (!lastUserMessage) {
		throw new AssistantError(400, '사용자 질문이 필요합니다.');
	}

	const bundle = await resolveAssistantBundle(options.bundleId, options.bundleLoader);
	const apiClient = createDbManagerApiClient({
		baseUrl: options.apiBaseUrl,
		fetchImpl: options.fetchImpl
	});
	const toolContext = await collectToolContext(apiClient, bundle, lastUserMessage.content);
	const content = await createAssistantAnswer({
		bundle,
		messages,
		question: lastUserMessage.content,
		toolContext,
		env,
		fetchImpl: options.llmFetchImpl ?? options.fetchImpl
	});

	const assistantMessage: AssistantChatMessage = {
		id: randomUUID(),
		role: 'assistant',
		content,
		createdAt: now().toISOString(),
		bundleId: bundle.id,
		sources: toolContext.sources,
		actions: toolContext.actions
	};

	return {
		message: assistantMessage,
		bundle,
		sources: toolContext.sources,
		actions: toolContext.actions
	};
}

async function resolveAssistantBundle(
	bundleId: string,
	bundleLoader: (() => Promise<SharedFileMappingRegistryData>) | undefined
): Promise<SharedFileMappingBundleEntry> {
	const trimmedBundleId = bundleId?.trim();
	if (!trimmedBundleId) {
		throw new AssistantError(400, 'bundleId는 필수입니다.');
	}

	const data = await (bundleLoader ?? loadSharedFileMappingRegistryData)();
	const bundle = data.bundles.find((entry) => entry.id === trimmedBundleId);
	if (!bundle) {
		throw new AssistantError(404, '선택한 파일 번들을 찾을 수 없습니다.');
	}

	return bundle;
}

function sanitizeMessages(messages: AssistantChatRequestMessage[]): AssistantChatRequestMessage[] {
	if (!Array.isArray(messages)) {
		throw new AssistantError(400, 'messages는 배열이어야 합니다.');
	}

	return messages
		.filter(
			(message) =>
				(message.role === 'user' || message.role === 'assistant') &&
				typeof message.content === 'string' &&
				message.content.trim().length > 0
		)
		.slice(-MAX_HISTORY_MESSAGES)
		.map((message) => ({
			role: message.role,
			content: message.content.trim().slice(0, MAX_HISTORY_MESSAGE_CHARS)
		}));
}

function validateLatestUserInput(messages: AssistantChatRequestMessage[], env: AssistantEnv) {
	if (!Array.isArray(messages)) {
		return;
	}
	const limit = getAssistantInputLimit(env);
	const latestUserMessage = [...messages].reverse().find((message) => message?.role === 'user');
	if (
		latestUserMessage &&
		typeof latestUserMessage.content === 'string' &&
		latestUserMessage.content.trim().length > limit
	) {
		throw new AssistantError(400, `질문은 ${limit}자 이하로 입력해 주세요.`);
	}
}

async function collectToolContext(
	apiClient: DbManagerApiClient,
	bundle: SharedFileMappingBundleEntry,
	question: string
): Promise<ToolContext> {
	const searchQuery = extractSearchQuery(question);
	const actionQuery = searchQuery || extractTermCandidate(question);
	const bundleSelector = { bundleFiles: bundle.files };
	const toolResults: Array<{ tool: string; payload: unknown }> = [];

	if (searchQuery) {
		toolResults.push({
			tool: 'search_bundle',
			payload: await searchBundle(apiClient, {
				...bundleSelector,
				query: searchQuery,
				limitPerType: 3
			})
		});
	}

	const termCandidate = extractTermCandidate(question);
	if (termCandidate && wantsKoreanToEnglishConversion(question, termCandidate)) {
		toolResults.push({
			tool: 'convert_term',
			payload: await convertTerm(apiClient, {
				...bundleSelector,
				term: termCandidate,
				direction: 'ko-to-en'
			})
		});
	}

	if (termCandidate && wantsEnglishToKoreanSegmentation(question, termCandidate)) {
		toolResults.push({
			tool: 'segment_term',
			payload: await segmentTerm(apiClient, {
				...bundleSelector,
				term: termCandidate,
				direction: 'en-to-ko'
			})
		});
	}

	const sources = buildSources(bundle, toolResults);
	return {
		sources,
		actions: buildActions(sources, actionQuery),
		contextText: JSON.stringify(
			{
				selectedBundle: {
					id: bundle.id,
					name: bundle.name,
					files: bundle.files
				},
				toolResults: toolResults.map((result) => ({
					tool: result.tool,
					payload: compactForPrompt(result.payload)
				}))
			},
			null,
			2
		)
	};
}

function extractTermCandidate(question: string): string {
	const backtickMatch = question.match(/`([^`]+)`/);
	if (backtickMatch?.[1]) {
		return normalizeTermCandidate(backtickMatch[1]);
	}

	const underscoredMatch = question.match(/[A-Za-z가-힣0-9]+(?:_[A-Za-z가-힣0-9]+)+/);
	if (underscoredMatch?.[0]) {
		return normalizeTermCandidate(underscoredMatch[0]);
	}

	const conversionMatch = question.match(
		/([A-Za-z가-힣0-9]+)\s*(?:의|가|을|를)?\s*(?:영문약어|약어|한글|뜻)/
	);
	if (conversionMatch?.[1]) {
		return normalizeTermCandidate(conversionMatch[1]);
	}

	return '';
}

function normalizeTermCandidate(value: string): string {
	return value
		.trim()
		.replace(/[?？!！.,，。:：;；]+$/g, '')
		.replace(/\s+/g, '_');
}

function extractSearchQuery(question: string): string {
	const relatedMatch = question.match(/([A-Za-z가-힣0-9_]+)\s*(?:관련|에\s*관한)/);
	if (relatedMatch?.[1]) {
		return normalizeTermCandidate(relatedMatch[1]);
	}

	const termCandidate = extractTermCandidate(question);
	if (termCandidate) {
		return termCandidate.split('_').find((token) => token.length > 0) ?? termCandidate;
	}

	return question
		.replace(/[?？!！.,，。:：;；]/g, ' ')
		.replace(/\b(알려줘|찾아줘|검색|확인|뭐야|무엇|어떻게|해주세요)\b/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 80);
}

function wantsKoreanToEnglishConversion(question: string, termCandidate: string): boolean {
	return /[가-힣]/.test(termCandidate) && /(영문|약어|컬럼|변환|abbr|english)/i.test(question);
}

function wantsEnglishToKoreanSegmentation(question: string, termCandidate: string): boolean {
	return /[A-Za-z]/.test(termCandidate) && /(한글|뜻|분해|나눠|segment|토큰)/i.test(question);
}

function buildSources(
	bundle: SharedFileMappingBundleEntry,
	toolResults: Array<{ tool: string; payload: unknown }>
): AssistantSource[] {
	const sources: AssistantSource[] = [];

	for (const result of toolResults) {
		if (result.tool === 'search_bundle') {
			sources.push(...buildSearchBundleSources(bundle, result.payload));
			continue;
		}

		if (result.tool === 'convert_term' || result.tool === 'segment_term') {
			const summary = summarizeGeneratorResult(result.payload);
			if (summary) {
				sources.push({
					id: `${result.tool}-term`,
					tool: result.tool,
					title: result.tool === 'convert_term' ? '용어 변환 결과' : '용어 분해 결과',
					summary,
					bundleId: bundle.id,
					bundleName: bundle.name,
					type: 'term',
					filename: bundle.files.term,
					count: 1
				});
			}
		}
	}

	return sources;
}

function buildSearchBundleSources(
	bundle: SharedFileMappingBundleEntry,
	payload: unknown
): AssistantSource[] {
	const record = asRecord(payload);
	if (record?.status !== 'ok') {
		return [];
	}

	const results = asRecord(record.results);
	if (!results) {
		return [];
	}

	const sources = ALL_DATA_TYPES.flatMap((type) => {
		const result = asRecord(results[type]);
		const response = asRecord(result?.response);
		const entries = extractResponseEntries(response);
		const count = entries.length;
		if (count === 0) {
			return [];
		}
		const target = extractEntryIdentity(type, entries[0]);

		return [
			{
				id: `search_bundle-${type}`,
				tool: 'search_bundle',
				title: `${DATA_TYPE_LABELS[type]} 검색`,
				summary: `${DATA_TYPE_LABELS[type]} ${count}건`,
				bundleId: bundle.id,
				bundleName: bundle.name,
				type,
				filename: typeof result?.filename === 'string' ? result.filename : bundle.files[type],
				count,
				targetId: target.id,
				targetLabel: target.label
			} satisfies AssistantSource
		];
	});

	if (sources.length > 0) {
		return sources;
	}

	return [
		{
			id: 'search_bundle-empty',
			tool: 'search_bundle',
			title: '연결 번들 검색',
			summary: '검색 결과 0건',
			bundleId: bundle.id,
			bundleName: bundle.name,
			count: 0
		}
	];
}

function extractResponseEntries(
	response: Record<string, unknown> | null
): Record<string, unknown>[] {
	const data = asRecord(response?.data);
	const entries = Array.isArray(data?.entries)
		? data.entries
		: Array.isArray(response?.entries)
			? response.entries
			: [];
	return entries.filter(
		(entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object'
	);
}

function extractEntryIdentity(type: DataType, entry: Record<string, unknown> | undefined) {
	if (!entry) {
		return { id: undefined, label: undefined };
	}

	const id = normalizeTextValue(entry.id);
	const label = extractEntryLabel(type, entry);
	return { id, label };
}

function extractEntryLabel(type: DataType, entry: Record<string, unknown>): string | undefined {
	const labelKeysByType: Record<DataType, string[]> = {
		vocabulary: ['standardName', 'abbreviation', 'englishName'],
		domain: ['standardDomainName', 'domainCategory', 'domainGroup'],
		term: ['termName', 'columnName', 'domainName'],
		database: ['logicalDbName', 'physicalDbName', 'organizationName'],
		entity: ['entityName', 'schemaName', 'tableKoreanName'],
		attribute: ['attributeName', 'entityName', 'schemaName'],
		table: ['tableEnglishName', 'tableKoreanName', 'schemaName'],
		column: ['columnEnglishName', 'columnKoreanName', 'tableEnglishName']
	};

	return labelKeysByType[type].map((key) => normalizeTextValue(entry[key])).find(Boolean);
}

function normalizeTextValue(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const normalized = value.trim();
	return normalized || undefined;
}

function summarizeGeneratorResult(payload: unknown): string {
	const response = asRecord(asRecord(payload)?.response);
	if (!response) {
		return '';
	}

	const values = extractResultValues(response);
	if (values.length > 0) {
		return values.slice(0, 5).join(', ');
	}

	return JSON.stringify(compactForPrompt(response)).slice(0, 240);
}

function extractResultValues(value: unknown): string[] {
	if (!value || typeof value !== 'object') {
		return typeof value === 'string' ? [value] : [];
	}

	const record = value as Record<string, unknown>;
	const candidates = [record.results, record.result, record.segmentedTerm, record.data];
	for (const candidate of candidates) {
		if (Array.isArray(candidate)) {
			return candidate.filter((item): item is string => typeof item === 'string');
		}
		if (typeof candidate === 'string') {
			return [candidate];
		}
		const nested = extractResultValues(candidate);
		if (nested.length > 0) {
			return nested;
		}
	}

	return [];
}

function buildActions(sources: AssistantSource[], query: string): AssistantAction[] {
	const seen = new Set<DataType>();
	const actions: AssistantAction[] = [];

	for (const source of sources) {
		if (!source.type || seen.has(source.type)) {
			continue;
		}
		seen.add(source.type);
		actions.push({
			id: `open-${source.type}`,
			type: 'navigate',
			label: `${DATA_TYPE_LABELS[source.type]} 화면 열기`,
			href: createBrowseHref(ROUTE_BY_TYPE[source.type], {
				filename: source.filename,
				query,
				field: 'all',
				exact: false,
				targetId: source.targetId,
				open: source.targetId ? 'detail' : ''
			}),
			description: source.targetLabel
				? `${source.filename ?? source.bundleName} · ${source.targetLabel} 상세로 이동`
				: source.filename
					? `${source.filename} 기준으로 확인`
					: undefined
		});
		if (actions.length >= 4) {
			break;
		}
	}

	return actions;
}

async function createAssistantAnswer(options: {
	bundle: SharedFileMappingBundleEntry;
	messages: AssistantChatRequestMessage[];
	question: string;
	toolContext: ToolContext;
	env: AssistantEnv;
	fetchImpl?: typeof fetch;
}): Promise<string> {
	const fallback = createFallbackAnswer(options.bundle, options.question, options.toolContext);
	if (options.env.LLM_ENABLE_REAL_CALLS !== 'true') {
		return fallback;
	}

	const llmMessages = buildLlmMessages(options);
	const content = await callLlm({
		env: options.env,
		messages: llmMessages,
		fetchImpl: options.fetchImpl ?? fetch
	});
	if (!content) {
		throw new AssistantError(502, 'LLM 응답에 assistant content가 없습니다.');
	}

	return ensureSourceNote(content, options.bundle, options.toolContext.sources);
}

function buildLlmMessages(options: {
	bundle: SharedFileMappingBundleEntry;
	messages: AssistantChatRequestMessage[];
	question: string;
	toolContext: ToolContext;
	env?: AssistantEnv;
}): LlmChatMessage[] {
	const promptBudget = getLlmPromptBudget(options.env);
	const systemMessage: LlmChatMessage = {
		role: 'system',
		content:
			'당신은 DbManager의 한국어 AI Assistant입니다. 답변은 간결하고 업무용으로 작성하세요. DbManager 데이터에 관한 주장은 제공된 도구 결과와 번들 출처를 우선 근거로 삼고, 직접 생성/수정/삭제를 수행했다고 말하지 마세요. 출처가 없으면 일반 안내임을 밝혀야 합니다.'
	};
	const userPrefix = [
		`선택 번들: ${options.bundle.name} (${options.bundle.id})`,
		`사용자 질문: ${options.question}`,
		'도구 결과:'
	].join('\n');
	const userSuffix =
		'위 정보를 바탕으로 답변하고, DbManager 데이터 근거가 있으면 출처를 명확히 언급하세요.';
	const fixedPromptTokens =
		estimateMessageTokens(systemMessage) +
		estimateTokens(userPrefix) +
		estimateTokens(userSuffix) +
		16;
	const remainingTokens = Math.max(0, promptBudget - fixedPromptTokens);
	const toolContextBudget = Math.max(
		0,
		Math.min(remainingTokens, Math.max(MIN_TOOL_CONTEXT_TOKENS, Math.floor(remainingTokens * 0.7)))
	);
	const contextText = truncateToEstimatedTokens(options.toolContext.contextText, toolContextBudget);
	const historyBudget = Math.max(0, remainingTokens - estimateTokens(contextText));
	const history = fitHistoryToBudget(
		options.messages.slice(0, -1).map((message) => ({
			role: message.role,
			content: message.content
		})),
		historyBudget
	);

	return [
		systemMessage,
		...history,
		{
			role: 'user',
			content: [
				userPrefix,
				contextText,
				contextText === options.toolContext.contextText
					? ''
					: '[도구 결과 일부가 context budget에 맞춰 축약되었습니다.]',
				userSuffix
			].join('\n')
		}
	];
}

async function callLlm(options: {
	env: AssistantEnv;
	messages: LlmChatMessage[];
	fetchImpl: typeof fetch;
}): Promise<string> {
	const baseUrl = options.env.LLM_BASE_URL?.trim();
	const model = options.env.LLM_MODEL?.trim();
	if (!baseUrl || !model) {
		throw new AssistantError(503, 'LLM_BASE_URL 또는 LLM_MODEL이 설정되지 않았습니다.');
	}

	const timeoutMs = parseTimeout(options.env.LLM_TIMEOUT_MS);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};
	const apiKey = options.env.LLM_API_KEY?.trim();
	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
	}

	try {
		const response = await options.fetchImpl(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model,
				messages: options.messages,
				temperature: 0.2,
				max_tokens: parsePositiveInteger(
					options.env.LLM_RESPONSE_RESERVE_TOKENS,
					DEFAULT_LLM_RESPONSE_RESERVE_TOKENS
				)
			}),
			signal: controller.signal
		});
		const body = (await response.json().catch(() => null)) as unknown;
		if (!response.ok) {
			const message = extractLlmErrorMessage(body);
			throw new AssistantError(
				502,
				message ? `LLM 서버 호출에 실패했습니다: ${message}` : 'LLM 서버 호출에 실패했습니다.'
			);
		}

		const choices = asRecord(body)?.choices;
		const firstChoice = Array.isArray(choices) ? choices[0] : null;
		const content = asRecord(firstChoice)?.message;
		const message = asRecord(content)?.content;
		return typeof message === 'string' ? message.trim() : '';
	} catch (error) {
		if (error instanceof AssistantError) {
			throw error;
		}
		throw new AssistantError(502, 'LLM 서버와 통신하지 못했습니다.');
	} finally {
		clearTimeout(timeout);
	}
}

function extractLlmErrorMessage(body: unknown): string {
	const record = asRecord(body);
	const error = asRecord(record?.error);
	const candidates = [error?.message, record?.message, record?.error];
	return candidates.find((candidate): candidate is string => typeof candidate === 'string') ?? '';
}

function parseTimeout(value: string | undefined): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LLM_TIMEOUT_MS;
}

function getAssistantInputLimit(env: AssistantEnv): number {
	return parsePositiveInteger(env.LLM_INPUT_MAX_CHARS, MAX_ASSISTANT_INPUT_CHARS);
}

function getLlmPromptBudget(env: AssistantEnv | undefined): number {
	const contextTokens = parsePositiveInteger(env?.LLM_CONTEXT_TOKENS, DEFAULT_LLM_CONTEXT_TOKENS);
	const responseReserveTokens = parsePositiveInteger(
		env?.LLM_RESPONSE_RESERVE_TOKENS,
		DEFAULT_LLM_RESPONSE_RESERVE_TOKENS
	);
	return Math.max(512, contextTokens - responseReserveTokens - PROMPT_SAFETY_MARGIN_TOKENS);
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function fitHistoryToBudget(messages: LlmChatMessage[], budgetTokens: number): LlmChatMessage[] {
	if (budgetTokens <= 0) {
		return [];
	}

	const selected: LlmChatMessage[] = [];
	let usedTokens = 0;
	for (const message of [...messages].reverse()) {
		const messageTokens = estimateMessageTokens(message);
		if (usedTokens + messageTokens > budgetTokens) {
			continue;
		}
		selected.unshift(message);
		usedTokens += messageTokens;
	}
	return selected;
}

function estimateMessageTokens(message: LlmChatMessage): number {
	return estimateTokens(message.role) + estimateTokens(message.content) + 4;
}

function estimateTokens(text: string): number {
	return Math.ceil(text.length / ESTIMATED_CHARS_PER_TOKEN);
}

function truncateToEstimatedTokens(text: string, maxTokens: number): string {
	if (estimateTokens(text) <= maxTokens) {
		return text;
	}
	const maxChars = Math.max(0, maxTokens * ESTIMATED_CHARS_PER_TOKEN);
	return `${text.slice(0, maxChars).trimEnd()}\n...[truncated]`;
}

function createFallbackAnswer(
	bundle: SharedFileMappingBundleEntry,
	question: string,
	toolContext: ToolContext
): string {
	const sourceSummary = toolContext.sources
		.filter((source) => source.count !== 0)
		.map((source) => `- ${source.title}: ${source.summary}`)
		.join('\n');

	if (!sourceSummary) {
		return [
			`${bundle.name} 기준으로 "${question}"을 확인했지만 연결된 검색 결과는 찾지 못했습니다.`,
			'질문 범위를 더 좁히거나 다른 번들을 선택해 다시 물어보세요.',
			'',
			`출처: ${bundle.name} / MCP 검색 결과 0건`
		].join('\n');
	}

	return [
		`${bundle.name} 기준으로 확인했습니다.`,
		'',
		sourceSummary,
		'',
		'아래 출처와 관련 화면 버튼에서 실제 데이터를 이어서 확인할 수 있습니다.',
		`출처: ${bundle.name} / ${toolContext.sources.map((source) => source.tool).join(', ')}`
	].join('\n');
}

function ensureSourceNote(
	content: string,
	bundle: SharedFileMappingBundleEntry,
	sources: AssistantSource[]
): string {
	if (content.includes('출처')) {
		return content;
	}

	const sourceLabels = sources.length
		? sources.map((source) => `${source.title}(${source.filename ?? source.bundleName})`).join(', ')
		: `${bundle.name} / 도구 결과 없음`;
	return `${content}\n\n출처: ${sourceLabels}`;
}

function compactForPrompt(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.slice(0, 5).map(compactForPrompt);
	}

	if (!value || typeof value !== 'object') {
		return value;
	}

	const record = value as Record<string, unknown>;
	const compact: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(record)) {
		if (key === 'entries' && Array.isArray(item)) {
			compact[key] = item.slice(0, 3);
			continue;
		}
		if (key === 'responseBody') {
			continue;
		}
		compact[key] = compactForPrompt(item);
	}
	return compact;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function getBundleFilenameForType(bundle: SharedFileMappingBundle, type: DataType): string {
	return bundle[type];
}
