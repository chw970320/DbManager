import { json, type RequestEvent } from '@sveltejs/kit';
import { loadAttributeData, saveAttributeData } from '$lib/registry/data-registry';
import {
	collectDeleteWarnings,
	getMissingRequiredFields,
	handleDbDesignList,
	type DbDesignListDescriptor
} from '$lib/server/db-design-crud';
import type { AttributeData, AttributeEntry } from '$lib/types/database-design';
import { safeMerge } from '$lib/utils/type-guards.js';
import { v4 as uuidv4 } from 'uuid';

const attributeListDescriptor: DbDesignListDescriptor<AttributeEntry, AttributeData> = {
	defaultFilename: 'attribute.json',
	loadData: loadAttributeData,
	searchMatches: (entry, searchField, matchValue) => {
		switch (searchField) {
			case 'schemaName':
				return matchValue(entry.schemaName);
			case 'entityName':
				return matchValue(entry.entityName);
			case 'attributeName':
				return matchValue(entry.attributeName);
			case 'all':
			default:
				return (
					matchValue(entry.schemaName) ||
					matchValue(entry.entityName) ||
					matchValue(entry.attributeName)
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
	defaultSortDateFields: ['updatedAt']
};

export async function GET({ url }: RequestEvent) {
	return handleDbDesignList(url, attributeListDescriptor);
}

export async function POST({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'attribute.json';
		const body = await request.json();

		const requiredFields = ['schemaName', 'entityName', 'attributeName', 'attributeType'];
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

		let attrData: AttributeData;
		try {
			attrData = await loadAttributeData(filename);
		} catch {
			attrData = { entries: [], lastUpdated: new Date().toISOString(), totalCount: 0 };
		}

		const now = new Date().toISOString();
		const newEntry: AttributeEntry = {
			id: uuidv4(),
			schemaName: body.schemaName,
			entityName: body.entityName,
			attributeName: body.attributeName,
			attributeType: body.attributeType,
			requiredInput: body.requiredInput || '',
			identifierFlag: body.identifierFlag || undefined,
			refEntityName: body.refEntityName || undefined,
			refAttributeName: body.refAttributeName || undefined,
			attributeDescription: body.attributeDescription || undefined,
			createdAt: now,
			updatedAt: now
		};

		attrData.entries.push(newEntry);
		attrData.lastUpdated = now;
		attrData.totalCount = attrData.entries.length;
		await saveAttributeData(attrData, filename);

		return json(
			{
				success: true,
				data: newEntry,
				message: '속성 정의서가 성공적으로 추가되었습니다.'
			} as DbDesignApiResponse,
			{ status: 201 }
		);
	} catch (error) {
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
		const filename = url.searchParams.get('filename') || 'attribute.json';
		const body = await request.json();
		const { id, ...updateFields } = body;
		if (!id) return json({ success: false, error: 'ID가 필요합니다.' }, { status: 400 });

		const requiredFields = ['schemaName', 'entityName', 'attributeName', 'attributeType'];
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

		const attrData = await loadAttributeData(filename);
		const idx = attrData.entries.findIndex((e) => e.id === id);
		if (idx === -1)
			return json({ success: false, error: '수정할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		attrData.entries[idx] = {
			...safeMerge(attrData.entries[idx], updateFields),
			updatedAt: new Date().toISOString()
		};
		await saveAttributeData(attrData, filename);

		return json(
			{ success: true, data: attrData.entries[idx], message: '수정 완료' },
			{ status: 200 }
		);
	} catch (error) {
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		const filename = url.searchParams.get('filename') || 'attribute.json';
		const force = url.searchParams.get('force') === 'true';
		if (!id) return json({ success: false, error: '삭제할 ID가 필요합니다.' }, { status: 400 });

		const attrData = await loadAttributeData(filename);
		const entryToDelete = attrData.entries.find((e) => e.id === id);
		if (!entryToDelete)
			return json({ success: false, error: '삭제할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		const warnings = await collectDeleteWarnings('attribute', entryToDelete, filename, force);

		attrData.entries = attrData.entries.filter((e) => e.id !== id);
		await saveAttributeData(attrData, filename);

		return json({ success: true, message: '삭제 완료', warnings }, { status: 200 });
	} catch (error) {
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}
