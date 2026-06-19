export const DEFAULT_DBMANAGER_API_BASE_URL = 'http://localhost:5173';

export type QueryParamPrimitive = string | number | boolean;
export type QueryParamValue = QueryParamPrimitive | QueryParamPrimitive[] | null | undefined;
export type QueryParams = Record<string, QueryParamValue>;

export interface DbManagerApiClientOptions {
	baseUrl?: string;
	fetchImpl?: typeof fetch;
}

export interface ApiRequestOptions {
	params?: QueryParams;
	body?: unknown;
}

export class DbManagerApiError extends Error {
	readonly method: string;
	readonly url: string;
	readonly status?: number;
	readonly statusText?: string;
	readonly responseBody?: unknown;

	constructor(options: {
		method: string;
		url: string;
		message: string;
		status?: number;
		statusText?: string;
		responseBody?: unknown;
	}) {
		super(options.message);
		this.name = 'DbManagerApiError';
		this.method = options.method;
		this.url = options.url;
		this.status = options.status;
		this.statusText = options.statusText;
		this.responseBody = options.responseBody;
	}
}

export function normalizeApiBaseUrl(baseUrl: string | undefined): string {
	const rawBaseUrl = baseUrl?.trim() || DEFAULT_DBMANAGER_API_BASE_URL;
	return rawBaseUrl.replace(/\/+$/, '');
}

export function getConfiguredApiBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
	return normalizeApiBaseUrl(env.DBMANAGER_API_BASE_URL);
}

export function buildApiUrl(baseUrl: string, path: string, params: QueryParams = {}): string {
	const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	const url = new URL(`${normalizedBaseUrl}${normalizedPath}`);

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === '') {
			continue;
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				url.searchParams.append(key, String(item));
			}
			continue;
		}

		url.searchParams.set(key, String(value));
	}

	return url.toString();
}

export function createDbManagerApiClient(options: DbManagerApiClientOptions = {}) {
	const baseUrl = normalizeApiBaseUrl(options.baseUrl ?? getConfiguredApiBaseUrl());
	const fetchImpl = options.fetchImpl ?? fetch;

	async function request<T>(
		method: 'GET' | 'POST',
		path: string,
		requestOptions: ApiRequestOptions = {}
	) {
		const url = buildApiUrl(baseUrl, path, requestOptions.params);
		const init: RequestInit = {
			method,
			headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
			body: method === 'POST' ? JSON.stringify(requestOptions.body ?? {}) : undefined
		};

		let response: Response;
		try {
			response = await fetchImpl(url, init);
		} catch (error) {
			throw new DbManagerApiError({
				method,
				url,
				message:
					error instanceof Error
						? `DbManager app server request failed: ${error.message}`
						: 'DbManager app server request failed'
			});
		}

		const responseBody = await readResponseBody(response);
		if (!response.ok) {
			throw new DbManagerApiError({
				method,
				url,
				status: response.status,
				statusText: response.statusText,
				responseBody,
				message: `DbManager API returned ${response.status} ${response.statusText}`.trim()
			});
		}

		return responseBody as T;
	}

	return {
		baseUrl,
		get: <T>(path: string, params?: QueryParams) => request<T>('GET', path, { params }),
		post: <T>(path: string, body: unknown, params?: QueryParams) =>
			request<T>('POST', path, { body, params })
	};
}

export type DbManagerApiClient = ReturnType<typeof createDbManagerApiClient>;

async function readResponseBody(response: Response): Promise<unknown> {
	const text = await response.text();
	if (!text) {
		return null;
	}

	const contentType = response.headers.get('content-type') ?? '';
	const trimmedText = text.trim();

	if (
		contentType.includes('application/json') ||
		trimmedText.startsWith('{') ||
		trimmedText.startsWith('[')
	) {
		try {
			return JSON.parse(text) as unknown;
		} catch {
			return text;
		}
	}

	return text;
}
