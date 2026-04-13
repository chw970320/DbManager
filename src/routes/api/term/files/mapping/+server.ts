import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary';
import {
	buildDbDesignStoredMapping,
	extractDbDesignRelatedMapping,
	getDbDesignSelectableTypes
} from '$lib/utils/db-design-file-mapping';
import {
	resolveDbDesignFileMappingBundle,
	saveDbDesignFileMappingBundle
} from '$lib/registry/db-design-file-mapping';
import { invalidateAllGeneratorCaches } from '$lib/registry/generator-cache';
import { createAutoSyncSummary, runAutoSyncStep } from '$lib/utils/auto-sync';

function isValidMapping(mapping: unknown): mapping is Record<string, string> {
	if (!mapping || typeof mapping !== 'object') return false;
	const candidate = mapping as Record<string, unknown>;

	return getDbDesignSelectableTypes('term').every(
		(type) => typeof candidate[type] === 'string' && candidate[type].trim() !== ''
	);
}

function requiredTypesMessage() {
	return getDbDesignSelectableTypes('term').join(', ');
}

export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'term.json';
		const bundle = await resolveDbDesignFileMappingBundle('term', filename);

		return json(
			{
				success: true,
				data: {
					mapping: buildDbDesignStoredMapping('term', bundle)
				},
				message: 'Term mapping retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve term mapping'
			} as ApiResponse,
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
				} as ApiResponse,
				{ status: 400 }
			);
		}

		if (!isValidMapping(mapping)) {
			return json(
				{
					success: false,
					error: `매핑 정보가 올바르지 않습니다. ${requiredTypesMessage()}이 필요합니다.`,
					message: 'Invalid mapping data'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const result = await saveDbDesignFileMappingBundle({
			currentType: 'term',
			currentFilename: filename,
			mapping: extractDbDesignRelatedMapping(mapping)
		});
		invalidateAllGeneratorCaches();
		const autoSyncStep = await runAutoSyncStep(fetch, {
			id: 'termSync',
			label: '용어 매핑 자동 반영',
			endpoint: '/api/term/sync',
			body: {
				apply: true,
				filename
			}
		});
		const autoSync = createAutoSyncSummary({
			steps: [autoSyncStep],
			successSummary: '매핑 저장과 용어 자동 반영이 완료되었습니다.',
			failureSummary: '매핑 저장은 완료되었지만 용어 자동 반영 일부가 실패했습니다.',
			retryHint: '/api/term/sync 재실행으로 자동 반영을 복구할 수 있습니다.'
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
					? 'Term mapping saved and auto-synced successfully'
					: 'Term mapping saved with auto-sync warnings'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 저장 중 오류가 발생했습니다.',
				message: 'Failed to save term mapping'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
