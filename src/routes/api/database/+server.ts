import { json, type RequestEvent } from '@sveltejs/kit';
import { loadDatabaseData, saveDatabaseData } from '$lib/registry/data-registry';
import {
	collectDeleteWarnings,
	getMissingRequiredFields,
	handleDbDesignList,
	type DbDesignListDescriptor
} from '$lib/server/db-design-crud';
import type { DatabaseData, DatabaseEntry } from '$lib/types/database-design';
import { safeMerge } from '$lib/utils/type-guards.js';
import { v4 as uuidv4 } from 'uuid';

const databaseListDescriptor: DbDesignListDescriptor<DatabaseEntry, DatabaseData> = {
	defaultFilename: 'database.json',
	loadData: loadDatabaseData,
	searchMatches: (entry, searchField, matchValue) => {
		switch (searchField) {
			case 'organizationName':
				return matchValue(entry.organizationName);
			case 'logicalDbName':
				return matchValue(entry.logicalDbName);
			case 'physicalDbName':
				return matchValue(entry.physicalDbName);
			case 'all':
			default:
				return (
					matchValue(entry.organizationName) ||
					matchValue(entry.departmentName) ||
					matchValue(entry.logicalDbName) ||
					matchValue(entry.physicalDbName) ||
					matchValue(entry.dbDescription) ||
					matchValue(entry.dbmsInfo)
				);
		}
	},
	invalidPaginationBody: {
		success: false,
		error: '잘못된 페이지네이션 파라미터입니다.',
		message: 'Invalid pagination parameters'
	},
	loadFailureBody: (error) => ({
		success: false,
		error: error instanceof Error ? error.message : '데이터 로드 실패',
		message: 'Data loading failed'
	}),
	serverErrorBody: {
		success: false,
		error: '서버에서 데이터 조회 중 오류가 발생했습니다.',
		message: 'Internal server error'
	},
	successMessage: 'Database definition data retrieved successfully',
	defaultSortDateFields: ['updatedAt', 'createdAt'],
	errorLogPrefix: '데이터베이스 정의서 조회 중 오류:'
};

export async function GET({ url }: RequestEvent) {
	return handleDbDesignList(url, databaseListDescriptor);
}

export async function POST({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'database.json';
		const body = await request.json();

		const requiredFields = [
			'organizationName',
			'departmentName',
			'appliedTask',
			'logicalDbName',
			'physicalDbName',
			'dbmsInfo'
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

		let dbData: DatabaseData;
		try {
			dbData = await loadDatabaseData(filename);
		} catch {
			dbData = {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
		}

		const now = new Date().toISOString();
		const newEntry: DatabaseEntry = {
			id: uuidv4(),
			organizationName: body.organizationName,
			departmentName: body.departmentName,
			appliedTask: body.appliedTask,
			relatedLaw: body.relatedLaw || '',
			logicalDbName: body.logicalDbName || undefined,
			physicalDbName: body.physicalDbName || undefined,
			buildDate: body.buildDate,
			dbDescription: body.dbDescription || undefined,
			dbmsInfo: body.dbmsInfo || undefined,
			osInfo: body.osInfo || '',
			exclusionReason: body.exclusionReason || '',
			createdAt: now,
			updatedAt: now
		};

		dbData.entries.push(newEntry);
		dbData.lastUpdated = now;
		dbData.totalCount = dbData.entries.length;

		await saveDatabaseData(dbData, filename);

		return json(
			{
				success: true,
				data: newEntry,
				message: '데이터베이스 정의서가 성공적으로 추가되었습니다.'
			} as DbDesignApiResponse,
			{ status: 201 }
		);
	} catch (error) {
		console.error('데이터베이스 정의서 추가 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 데이터 추가 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 데이터베이스 정의서 수정 API
 * PUT /api/database
 */
export async function PUT({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'database.json';
		const body = await request.json();
		const { id, ...updateFields } = body;

		if (!id || typeof id !== 'string' || id.trim() === '') {
			return json(
				{ success: false, error: 'ID가 필요합니다.', message: 'ID required' },
				{ status: 400 }
			);
		}

		const requiredFields = [
			'organizationName',
			'departmentName',
			'appliedTask',
			'logicalDbName',
			'physicalDbName',
			'dbmsInfo'
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

		const dbData = await loadDatabaseData(filename);
		const entryIndex = dbData.entries.findIndex((e) => e.id === id);

		if (entryIndex === -1) {
			return json(
				{ success: false, error: '수정할 데이터를 찾을 수 없습니다.', message: 'Not found' },
				{ status: 404 }
			);
		}

		dbData.entries[entryIndex] = {
			...safeMerge(dbData.entries[entryIndex], updateFields),
			updatedAt: new Date().toISOString()
		};

		await saveDatabaseData(dbData, filename);

		return json(
			{ success: true, data: dbData.entries[entryIndex], message: '수정 완료' },
			{ status: 200 }
		);
	} catch (error) {
		console.error('데이터베이스 정의서 수정 중 오류:', error);
		return json(
			{ success: false, error: '서버 오류', message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

/**
 * 데이터베이스 정의서 삭제 API
 * DELETE /api/database
 */
export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		const filename = url.searchParams.get('filename') || 'database.json';
		const force = url.searchParams.get('force') === 'true';

		if (!id) {
			return json(
				{ success: false, error: '삭제할 ID가 필요합니다.', message: 'ID required' },
				{ status: 400 }
			);
		}

		const dbData = await loadDatabaseData(filename);
		const entryToDelete = dbData.entries.find((e) => e.id === id);

		if (!entryToDelete) {
			return json(
				{ success: false, error: '삭제할 데이터를 찾을 수 없습니다.', message: 'Not found' },
				{ status: 404 }
			);
		}

		const warnings = await collectDeleteWarnings('database', entryToDelete, filename, force);

		dbData.entries = dbData.entries.filter((e) => e.id !== id);
		await saveDatabaseData(dbData, filename);

		return json({ success: true, message: '삭제 완료', warnings }, { status: 200 });
	} catch (error) {
		console.error('데이터베이스 정의서 삭제 중 오류:', error);
		return json(
			{ success: false, error: '서버 오류', message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
