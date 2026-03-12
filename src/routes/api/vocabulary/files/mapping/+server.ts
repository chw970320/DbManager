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

function isValidMapping(mapping: unknown): mapping is Record<string, string> {
	if (!mapping || typeof mapping !== 'object') return false;
	const candidate = mapping as Record<string, unknown>;

	return getDbDesignSelectableTypes('vocabulary').every(
		(type) => typeof candidate[type] === 'string' && candidate[type].trim() !== ''
	);
}

function requiredTypesMessage() {
	return getDbDesignSelectableTypes('vocabulary').join(', ');
}

export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'vocabulary.json';
		const bundle = await resolveDbDesignFileMappingBundle('vocabulary', filename);

		return json(
			{
				success: true,
				data: {
					mapping: buildDbDesignStoredMapping('vocabulary', bundle)
				},
				message: 'Vocabulary mapping retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve vocabulary mapping'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

export async function PUT({ request }: RequestEvent) {
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
			currentType: 'vocabulary',
			currentFilename: filename,
			mapping: extractDbDesignRelatedMapping(mapping)
		});

		return json(
			{
				success: true,
				data: {
					mapping: result.currentMapping
				},
				message: 'Vocabulary mapping saved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 저장 중 오류가 발생했습니다.',
				message: 'Failed to save vocabulary mapping'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
