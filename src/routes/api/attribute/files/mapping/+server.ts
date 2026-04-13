import { json, type RequestEvent } from '@sveltejs/kit';
import type { DbDesignApiResponse } from '$lib/types/database-design';
import {
	buildDbDesignStoredMapping,
	extractDbDesignRelatedMapping,
	getDbDesignSelectableTypes
} from '$lib/utils/db-design-file-mapping';
import {
	resolveDbDesignFileMappingBundle,
	saveDbDesignFileMappingBundle
} from '$lib/registry/db-design-file-mapping';
import { createAutoSyncSummary, runAutoSyncStep } from '$lib/utils/auto-sync';

function isValidMapping(mapping: unknown): mapping is Record<string, string> {
	if (!mapping || typeof mapping !== 'object') return false;
	const candidate = mapping as Record<string, unknown>;

	return getDbDesignSelectableTypes('attribute').every(
		(type) => typeof candidate[type] === 'string' && candidate[type].trim() !== ''
	);
}

function requiredTypesMessage() {
	return getDbDesignSelectableTypes('attribute').join(', ');
}

export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'attribute.json';
		const bundle = await resolveDbDesignFileMappingBundle('attribute', filename);

		return json(
			{
				success: true,
				data: {
					mapping: buildDbDesignStoredMapping('attribute', bundle)
				},
				message: 'Attribute mapping retrieved successfully'
			} satisfies DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve attribute mapping'
			} satisfies DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

export async function PUT({ request, fetch }: RequestEvent) {
	try {
		const body = (await request.json()) as {
			filename?: string;
			mapping?: unknown;
		};
		const { filename, mapping } = body;

		if (!filename || filename.trim() === '') {
			return json(
				{
					success: false,
					error: '파일명이 제공되지 않았습니다.',
					message: 'Filename is required'
				} satisfies DbDesignApiResponse,
				{ status: 400 }
			);
		}

		if (!isValidMapping(mapping)) {
			return json(
				{
					success: false,
					error: `매핑 정보가 올바르지 않습니다. ${requiredTypesMessage()}이 필요합니다.`,
					message: 'Invalid mapping data'
				} satisfies DbDesignApiResponse,
				{ status: 400 }
			);
		}

		const result = await saveDbDesignFileMappingBundle({
			currentType: 'attribute',
			currentFilename: filename,
			mapping: extractDbDesignRelatedMapping(mapping)
		});
		const autoSyncStep = await runAutoSyncStep(fetch, {
			id: 'designAlignment',
			label: 'DB 설계 자동 정합화',
			endpoint: '/api/alignment/sync',
			body: {
				apply: true,
				vocabularyFilename: result.bundle.vocabulary,
				termFilename: result.bundle.term,
				domainFilename: result.bundle.domain,
				databaseFile: result.bundle.database,
				entityFile: result.bundle.entity,
				attributeFile: result.bundle.attribute,
				tableFile: result.bundle.table,
				columnFile: result.bundle.column,
				columnFilename: result.bundle.column
			}
		});
		const autoSync = createAutoSyncSummary({
			steps: [autoSyncStep],
			successSummary: '매핑 저장과 DB 설계 자동 정합화가 완료되었습니다.',
			failureSummary: '매핑 저장은 완료되었지만 DB 설계 자동 정합화 일부가 실패했습니다.',
			retryHint: '/api/alignment/sync 재실행으로 자동 반영을 복구할 수 있습니다.'
		});

		return json(
			{
				success: true,
				data: {
					mapping: result.currentMapping,
					saved: true,
					autoSync
				},
				message: autoSync.success
					? 'Attribute mapping saved and auto-synced successfully'
					: 'Attribute mapping saved with auto-sync warnings'
			} satisfies DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 저장 중 오류가 발생했습니다.',
				message: 'Failed to save attribute mapping'
			} satisfies DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
