import { json, type RequestEvent } from '@sveltejs/kit';

type AlignmentSyncRequest = {
	apply?: boolean;
	vocabularyFilename?: string;
	termFilename?: string;
	domainFilename?: string;
	databaseFile?: string;
	entityFile?: string;
	attributeFile?: string;
	tableFile?: string;
	columnFile?: string;
	columnFilename?: string;
};

type UpstreamResult<T = unknown> = {
	success?: boolean;
	error?: string;
	data?: T;
};

function toBooleanFlag(value: string | null | undefined, fallback: boolean): boolean {
	if (value == null) return fallback;
	return !['false', '0', 'no'].includes(value.toLowerCase());
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

async function readUpstream<T>(response: Response): Promise<{ status: number; body: UpstreamResult<T> }> {
	try {
		const body = (await response.json()) as UpstreamResult<T>;
		return { status: response.status, body };
	} catch {
		return {
			status: response.status || 500,
			body: {
				success: false,
				error: '응답 파싱에 실패했습니다.'
			}
		};
	}
}

export async function POST({ request, url, fetch }: RequestEvent) {
	try {
		const rawBody = (await request.json().catch(() => ({}))) as AlignmentSyncRequest;
		const applyFromBody = typeof rawBody.apply === 'boolean' ? rawBody.apply : undefined;
		const apply = toBooleanFlag(url.searchParams.get('apply'), applyFromBody ?? true);

		const vocabularyFilename =
			readString(rawBody.vocabularyFilename) ||
			readString(url.searchParams.get('vocabularyFilename')) ||
			'vocabulary.json';
		const termFilename =
			readString(rawBody.termFilename) || readString(url.searchParams.get('termFilename')) || 'term.json';
		const columnFilename =
			readString(rawBody.columnFilename) ||
			readString(rawBody.columnFile) ||
			readString(url.searchParams.get('columnFilename')) ||
			readString(url.searchParams.get('columnFile')) ||
			'column.json';
		const domainFilename =
			readString(rawBody.domainFilename) ||
			readString(url.searchParams.get('domainFilename')) ||
			'domain.json';

		const vocabularyResponse = await fetch(`/api/vocabulary/sync-domain?apply=${apply ? 'true' : 'false'}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				apply,
				vocabularyFilename,
				domainFilename
			})
		});
		const vocabulary = await readUpstream(vocabularyResponse);
		if (!vocabularyResponse.ok || vocabulary.body.success !== true) {
			return json(
				{
					success: false,
					error: vocabulary.body.error || '단어집-도메인 동기화 실행 중 오류가 발생했습니다.',
					data: { failedStep: 'vocabulary' }
				} as ApiResponse,
				{ status: vocabulary.status || 500 }
			);
		}

		const termResponse = await fetch(`/api/term/sync?apply=${apply ? 'true' : 'false'}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				apply,
				filename: termFilename
			})
		});
		const term = await readUpstream(termResponse);
		if (!termResponse.ok || term.body.success !== true) {
			return json(
				{
					success: false,
					error: term.body.error || '용어 동기화 실행 중 오류가 발생했습니다.',
					data: { failedStep: 'term' }
				} as ApiResponse,
				{ status: term.status || 500 }
			);
		}

		const relationPayload = {
			apply,
			databaseFile: readString(rawBody.databaseFile) || readString(url.searchParams.get('databaseFile')),
			entityFile: readString(rawBody.entityFile) || readString(url.searchParams.get('entityFile')),
			attributeFile: readString(rawBody.attributeFile) || readString(url.searchParams.get('attributeFile')),
			tableFile: readString(rawBody.tableFile) || readString(url.searchParams.get('tableFile')),
			columnFile: readString(rawBody.columnFile) || readString(url.searchParams.get('columnFile'))
		};

		const relationResponse = await fetch('/api/erd/relations/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(relationPayload)
		});
		const relation = await readUpstream(relationResponse);
		if (!relationResponse.ok || relation.body.success !== true) {
			return json(
				{
					success: false,
					error: relation.body.error || '관계 동기화 실행 중 오류가 발생했습니다.',
					data: { failedStep: 'relation' }
				} as ApiResponse,
				{ status: relation.status || 500 }
			);
		}

		const columnResponse = await fetch(`/api/column/sync-term?apply=${apply ? 'true' : 'false'}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				apply,
				columnFilename,
				termFilename,
				domainFilename
			})
		});
		const column = await readUpstream(columnResponse);
		if (!columnResponse.ok || column.body.success !== true) {
			return json(
				{
					success: false,
					error: column.body.error || '컬럼-용어 동기화 실행 중 오류가 발생했습니다.',
					data: { failedStep: 'column' }
				} as ApiResponse,
				{ status: column.status || 500 }
			);
		}

		const reportParams = new URLSearchParams();
		reportParams.set('termFilename', termFilename);

		const relationFileParams: Record<string, string | undefined> = {
			databaseFile: relationPayload.databaseFile,
			entityFile: relationPayload.entityFile,
			attributeFile: relationPayload.attributeFile,
			tableFile: relationPayload.tableFile,
			columnFile: relationPayload.columnFile
		};
		for (const [key, value] of Object.entries(relationFileParams)) {
			if (value) {
				reportParams.set(key, value);
			}
		}

		const reportResponse = await fetch(`/api/validation/report?${reportParams.toString()}`);
		const report = await readUpstream(reportResponse);
		if (!reportResponse.ok || report.body.success !== true) {
			return json(
				{
					success: false,
					error: report.body.error || '통합 진단 리포트 조회 중 오류가 발생했습니다.',
					data: { failedStep: 'validation' }
				} as ApiResponse,
				{ status: report.status || 500 }
			);
		}

		const relationData = relation.body.data as {
			counts?: { appliedTotalUpdates?: number };
		};
		const vocabularyData = vocabulary.body.data as {
			updated?: number;
		};
		const termData = term.body.data as {
			updated?: number;
		};
		const columnData = column.body.data as {
			updated?: number;
		};
		const reportData = report.body.data as {
			summary?: {
				totalIssues?: number;
				relationUnmatchedCount?: number;
				termFailedCount?: number;
			};
		};

		return json(
			{
				success: true,
				data: {
					mode: apply ? 'apply' : 'preview',
					applied: apply,
					steps: {
						vocabulary: {
							data: vocabulary.body.data
						},
						term: {
							data: term.body.data
						},
						relation: {
							data: relation.body.data
						},
						column: {
							data: column.body.data
						},
						validation: {
							data: report.body.data
						}
					},
					summary: {
						appliedVocabularyUpdates: vocabularyData?.updated ?? 0,
						appliedTermUpdates: termData?.updated ?? 0,
						appliedRelationUpdates: relationData?.counts?.appliedTotalUpdates ?? 0,
						appliedColumnUpdates: columnData?.updated ?? 0,
						remainingTermFailed: reportData?.summary?.termFailedCount ?? 0,
						relationUnmatchedCount: reportData?.summary?.relationUnmatchedCount ?? 0,
						totalIssues: reportData?.summary?.totalIssues ?? 0
					}
				},
				message: apply ? '통합 정합화가 완료되었습니다.' : '통합 정합화 미리보기 결과입니다.'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('통합 정합화 실행 오류:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '통합 정합화 실행 중 오류가 발생했습니다.'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
