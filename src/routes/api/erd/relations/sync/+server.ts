import { json, type RequestEvent } from '@sveltejs/kit';
import {
	loadDesignRelationContext,
	pickDefinitionFileFromUrl,
	toDefinitionFileSelection
} from '$lib/utils/design-relation-context.js';
import { resolveErdFileContext } from '$lib/utils/erd-file-context.js';
import { buildDesignRelationSyncPlan } from '$lib/utils/design-relation-sync.js';
import { validateDesignRelations } from '$lib/utils/design-relation-validator.js';

type RelationSyncRequest = {
	apply?: boolean;
	databaseFile?: string;
	entityFile?: string;
	attributeFile?: string;
	tableFile?: string;
	columnFile?: string;
};

type RelationSyncParams = {
	apply: boolean;
	databaseFile?: string;
	entityFile?: string;
	attributeFile?: string;
	tableFile?: string;
	columnFile?: string;
};

async function runRelationSync(params: RelationSyncParams) {
	const fileContext = await resolveErdFileContext(params);
	const { context, files } = await loadDesignRelationContext({
		databaseFile: fileContext.files.databaseFile,
		entityFile: fileContext.files.entityFile,
		attributeFile: fileContext.files.attributeFile,
		tableFile: fileContext.files.tableFile,
		columnFile: fileContext.files.columnFile,
		includeDomain: false,
		includeVocabularyMap: false,
		fallbackToFirstWhenMissing: !fileContext.hasExplicitFile
	});

	const validationBefore = validateDesignRelations(context, { includeStandardReferences: false });
	const syncPlan = buildDesignRelationSyncPlan(context);

	const validationAfter = validateDesignRelations(context, { includeStandardReferences: false });

	return {
		mode: 'preview',
		deprecated: true,
		replacement:
			'/api/validation/design-relations/preview 및 /api/validation/design-relations/apply',
		compatibilityNote:
			'레거시 ERD 관계 동기화입니다. 신규 자동 수정은 후보 선택 기반 정의서 관계 검증 API를 사용하세요.',
		files: toDefinitionFileSelection(files),
		counts: {
			...syncPlan.preview.counts,
			appliedTableUpdates: 0,
			appliedColumnUpdates: 0,
			appliedTotalUpdates: 0
		},
		changes: syncPlan.preview.changes.slice(0, 200).map((change) => ({
			...change,
			owner: 'erd/relations/sync' as const
		})),
		suggestions: syncPlan.preview.suggestions.slice(0, 100),
		validationBefore,
		validationAfter
	};
}

function legacyApplyDisabledResponse() {
	return json(
		{
			success: false,
			error:
				'레거시 ERD 관계 동기화 apply=true는 더 이상 지원하지 않습니다. /api/validation/design-relations/apply에서 issueId와 candidateId를 선택해 자동 수정하세요.',
			data: {
				deprecated: true,
				replacement: '/api/validation/design-relations/apply'
			}
		} as DbDesignApiResponse,
		{ status: 410 }
	);
}

function paramsFromUrl(url: URL): RelationSyncParams {
	return {
		apply: url.searchParams.get('apply') === 'true',
		databaseFile: pickDefinitionFileFromUrl(url, 'databaseFile'),
		entityFile: pickDefinitionFileFromUrl(url, 'entityFile'),
		attributeFile: pickDefinitionFileFromUrl(url, 'attributeFile'),
		tableFile: pickDefinitionFileFromUrl(url, 'tableFile'),
		columnFile: pickDefinitionFileFromUrl(url, 'columnFile')
	};
}

export async function GET({ url }: RequestEvent) {
	try {
		const params = paramsFromUrl(url);
		if (params.apply) return legacyApplyDisabledResponse();
		const result = await runRelationSync(params);
		return json(
			{
				success: true,
				data: result,
				message: '5개 정의서 관계 동기화 미리보기를 생성했습니다.'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('5개 정의서 관계 동기화 오류:', error);
		return json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : '5개 정의서 관계 동기화 중 오류가 발생했습니다.'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = (await request.json()) as RelationSyncRequest;
		const params: RelationSyncParams = {
			apply: body.apply === true,
			databaseFile: body.databaseFile,
			entityFile: body.entityFile,
			attributeFile: body.attributeFile,
			tableFile: body.tableFile,
			columnFile: body.columnFile
		};

		if (params.apply) return legacyApplyDisabledResponse();
		const result = await runRelationSync(params);
		return json(
			{
				success: true,
				data: result,
				message: '5개 정의서 관계 동기화 미리보기를 생성했습니다.'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('5개 정의서 관계 동기화 오류:', error);
		return json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : '5개 정의서 관계 동기화 중 오류가 발생했습니다.'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
