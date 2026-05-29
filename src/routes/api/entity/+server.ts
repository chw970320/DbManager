import { json, type RequestEvent } from '@sveltejs/kit';
import { loadEntityData, saveEntityData } from '$lib/registry/data-registry';
import {
	collectDeleteWarnings,
	getMissingRequiredFields,
	handleDbDesignList,
	type DbDesignListDescriptor
} from '$lib/server/db-design-crud';
import type { EntityData, EntityEntry } from '$lib/types/database-design';
import { safeMerge } from '$lib/utils/type-guards.js';
import { v4 as uuidv4 } from 'uuid';

const entityListDescriptor: DbDesignListDescriptor<EntityEntry, EntityData> = {
	defaultFilename: 'entity.json',
	loadData: loadEntityData,
	searchMatches: (entry, searchField, matchValue) => {
		switch (searchField) {
			case 'entityName':
				return matchValue(entry.entityName);
			case 'schemaName':
				return matchValue(entry.schemaName);
			case 'primaryIdentifier':
				return matchValue(entry.primaryIdentifier);
			case 'superTypeEntityName':
				return matchValue(entry.superTypeEntityName);
			case 'tableKoreanName':
				return matchValue(entry.tableKoreanName);
			case 'all':
			default:
				return (
					matchValue(entry.schemaName) ||
					matchValue(entry.entityName) ||
					matchValue(entry.primaryIdentifier) ||
					matchValue(entry.superTypeEntityName) ||
					matchValue(entry.tableKoreanName)
				);
		}
	},
	invalidPaginationBody: {
		success: false,
		error: '잘못된 페이지네이션 파라미터입니다.'
	},
	loadFailureBody: (error) => ({
		success: false,
		error: error instanceof Error ? error.message : '데이터 로드 실패'
	}),
	serverErrorBody: {
		success: false,
		error: '서버에서 데이터 조회 중 오류가 발생했습니다.'
	},
	defaultSortDateFields: ['updatedAt', 'createdAt'],
	errorLogPrefix: '엔터티 정의서 조회 중 오류:'
};

export async function GET({ url }: RequestEvent) {
	return handleDbDesignList(url, entityListDescriptor);
}

export async function POST({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'entity.json';
		const body = await request.json();

		const requiredFields = [
			'logicalDbName',
			'schemaName',
			'entityName',
			'primaryIdentifier',
			'tableKoreanName'
		];
		const missingFields = getMissingRequiredFields(body, requiredFields);

		if (missingFields.length > 0) {
			return json(
				{
					success: false,
					error: `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`,
					message: 'Missing required fields'
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		let entityData: EntityData;
		try {
			entityData = await loadEntityData(filename);
		} catch {
			entityData = { entries: [], lastUpdated: new Date().toISOString(), totalCount: 0 };
		}

		const now = new Date().toISOString();
		const newEntry: EntityEntry = {
			id: uuidv4(),
			logicalDbName: body.logicalDbName,
			schemaName: body.schemaName,
			entityName: body.entityName,
			primaryIdentifier: body.primaryIdentifier,
			tableKoreanName: body.tableKoreanName,
			entityDescription: body.entityDescription || undefined,
			superTypeEntityName: body.superTypeEntityName || undefined,
			createdAt: now,
			updatedAt: now
		};

		entityData.entries.push(newEntry);
		entityData.lastUpdated = now;
		entityData.totalCount = entityData.entries.length;
		await saveEntityData(entityData, filename);

		return json(
			{
				success: true,
				data: newEntry,
				message: '엔터티 정의서가 성공적으로 추가되었습니다.'
			} as DbDesignApiResponse,
			{ status: 201 }
		);
	} catch (error) {
		console.error('엔터티 정의서 추가 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 데이터 추가 중 오류가 발생했습니다.'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

export async function PUT({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'entity.json';
		const body = await request.json();
		const { id, ...updateFields } = body;

		if (!id) return json({ success: false, error: 'ID가 필요합니다.' }, { status: 400 });

		const requiredFields = [
			'logicalDbName',
			'schemaName',
			'entityName',
			'primaryIdentifier',
			'tableKoreanName'
		];
		const missingFields = getMissingRequiredFields(updateFields, requiredFields);

		if (missingFields.length > 0) {
			return json(
				{
					success: false,
					error: `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`,
					message: 'Missing required fields'
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		const entityData = await loadEntityData(filename);
		const entryIndex = entityData.entries.findIndex((e) => e.id === id);
		if (entryIndex === -1)
			return json({ success: false, error: '수정할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		entityData.entries[entryIndex] = {
			...safeMerge(entityData.entries[entryIndex], updateFields),
			updatedAt: new Date().toISOString()
		};
		await saveEntityData(entityData, filename);

		return json(
			{ success: true, data: entityData.entries[entryIndex], message: '수정 완료' },
			{ status: 200 }
		);
	} catch (error) {
		console.error('엔터티 정의서 수정 중 오류:', error);
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		const filename = url.searchParams.get('filename') || 'entity.json';
		const force = url.searchParams.get('force') === 'true';
		if (!id) return json({ success: false, error: '삭제할 ID가 필요합니다.' }, { status: 400 });

		const entityData = await loadEntityData(filename);
		const entryToDelete = entityData.entries.find((e) => e.id === id);
		if (!entryToDelete)
			return json({ success: false, error: '삭제할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		const warnings = await collectDeleteWarnings('entity', entryToDelete, filename, force);

		entityData.entries = entityData.entries.filter((e) => e.id !== id);
		await saveEntityData(entityData, filename);

		return json({ success: true, message: '삭제 완료', warnings }, { status: 200 });
	} catch (error) {
		console.error('엔터티 정의서 삭제 중 오류:', error);
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}
