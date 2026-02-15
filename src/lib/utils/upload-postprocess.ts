export type UploadPostProcessMode = 'none' | 'validate-only' | 'validate-sync';
export type UploadDataType =
	| 'vocabulary'
	| 'domain'
	| 'term'
	| 'database'
	| 'entity'
	| 'attribute'
	| 'table'
	| 'column';

type PostProcessStep = {
	name: string;
	endpoint: string;
	method: 'GET' | 'POST';
	status: number;
	success: boolean;
	error?: string;
};

type PostProcessResult = {
	mode: UploadPostProcessMode;
	steps: PostProcessStep[];
};

type RunPostProcessParams = {
	fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	dataType: UploadDataType;
	filename: string;
	mode: UploadPostProcessMode;
};

export function normalizeUploadPostProcessMode(value: string | undefined | null): UploadPostProcessMode {
	if (value === 'validate-only' || value === 'validate-sync') return value;
	return 'none';
}

function isTruthySuccess(body: unknown): boolean {
	return !!body && typeof body === 'object' && 'success' in body && (body as { success?: boolean }).success === true;
}

async function callApi(
	fetchFn: RunPostProcessParams['fetch'],
	name: string,
	endpoint: string,
	method: 'GET' | 'POST',
	body?: unknown
): Promise<PostProcessStep> {
	try {
		const response = await fetchFn(endpoint, {
			method,
			headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
			body: method === 'POST' && body !== undefined ? JSON.stringify(body) : undefined
		});
		const payload = await response.json().catch(() => ({}));
		return {
			name,
			endpoint,
			method,
			status: response.status,
			success: response.ok && isTruthySuccess(payload),
			error:
				response.ok && isTruthySuccess(payload)
					? undefined
					: (payload as { error?: string }).error || 'post-process step failed'
		};
	} catch (error) {
		return {
			name,
			endpoint,
			method,
			status: 500,
			success: false,
			error: error instanceof Error ? error.message : 'post-process step failed'
		};
	}
}

function definitionFileParamKey(
	dataType: Exclude<UploadDataType, 'vocabulary' | 'domain' | 'term'>
): 'databaseFile' | 'entityFile' | 'attributeFile' | 'tableFile' | 'columnFile' {
	if (dataType === 'database') return 'databaseFile';
	if (dataType === 'entity') return 'entityFile';
	if (dataType === 'attribute') return 'attributeFile';
	if (dataType === 'table') return 'tableFile';
	return 'columnFile';
}

export async function runUploadPostProcess(params: RunPostProcessParams): Promise<PostProcessResult> {
	const { fetch: fetchFn, dataType, filename, mode } = params;
	if (mode === 'none') {
		return { mode, steps: [] };
	}

	const steps: PostProcessStep[] = [];

	if (dataType === 'vocabulary') {
		steps.push(
			await callApi(fetchFn, 'vocabulary-validate-all', `/api/vocabulary/validate-all?filename=${encodeURIComponent(filename)}`, 'GET')
		);
		if (mode === 'validate-sync') {
			steps.push(
				await callApi(fetchFn, 'vocabulary-sync-domain', '/api/vocabulary/sync-domain?apply=true', 'POST', {
					vocabularyFilename: filename,
					apply: true
				})
			);
			steps.push(
				await callApi(fetchFn, 'term-sync', '/api/term/sync?apply=true', 'POST', {
					filename: 'term.json',
					apply: true
				})
			);
		}
		return { mode, steps };
	}

	if (dataType === 'domain') {
		steps.push(
			await callApi(fetchFn, 'domain-validate-all', `/api/domain/validate-all?filename=${encodeURIComponent(filename)}`, 'GET')
		);
		if (mode === 'validate-sync') {
			steps.push(
				await callApi(fetchFn, 'vocabulary-sync-domain', '/api/vocabulary/sync-domain?apply=true', 'POST', {
					domainFilename: filename,
					apply: true
				})
			);
			steps.push(
				await callApi(fetchFn, 'column-sync-term', '/api/column/sync-term?apply=true', 'POST', {
					domainFilename: filename,
					apply: true
				})
			);
		}
		return { mode, steps };
	}

	if (dataType === 'term') {
		steps.push(
			await callApi(fetchFn, 'term-validate-all', `/api/term/validate-all?filename=${encodeURIComponent(filename)}`, 'GET')
		);
		if (mode === 'validate-sync') {
			steps.push(
				await callApi(fetchFn, 'term-sync', '/api/term/sync?apply=true', 'POST', {
					filename,
					apply: true
				})
			);
		}
		return { mode, steps };
	}

	const fileParam = definitionFileParamKey(dataType);
	steps.push(
		await callApi(
			fetchFn,
			'definition-relation-validate',
			`/api/erd/relations?${fileParam}=${encodeURIComponent(filename)}`,
			'GET'
		)
	);

	if (mode === 'validate-sync') {
		steps.push(
			await callApi(fetchFn, 'alignment-sync', '/api/alignment/sync', 'POST', {
				apply: true,
				[fileParam]: filename
			})
		);
	}

	return { mode, steps };
}
