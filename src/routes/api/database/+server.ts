import { json, type RequestEvent } from '@sveltejs/kit';
import type { DbDesignApiResponse, DatabaseData, DatabaseEntry } from '$lib/types/database-design';
import { saveDatabaseData, loadDatabaseData } from '$lib/utils/database-design-handler.js';
import { safeMerge } from '$lib/utils/type-guards.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 데이터베이스 정의서 데이터 조회 API
 * GET /api/database
 */
export async function GET({ url }: RequestEvent) {
	try {
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const searchQuery = url.searchParams.get('q') || url.searchParams.get('query') || '';
		const searchField = url.searchParams.get('field') || 'all';
		const searchExact = url.searchParams.get('exact') === 'true';
		const filename = url.searchParams.get('filename') || 'database.json';

		// 다중 정렬 파라미터 처리
		const sortByArray = url.searchParams.getAll('sortBy[]');
		const sortOrderArray = url.searchParams.getAll('sortOrder[]');
		const singleSortBy = url.searchParams.get('sortBy');
		const singleSortOrder = url.searchParams.get('sortOrder');

		type SortConfig = { column: string; direction: 'asc' | 'desc' };
		const sortConfigs: SortConfig[] = [];

		if (sortByArray.length > 0 && sortOrderArray.length > 0) {
			for (let i = 0; i < Math.min(sortByArray.length, sortOrderArray.length); i++) {
				const direction = sortOrderArray[i];
				if (direction === 'asc' || direction === 'desc') {
					sortConfigs.push({ column: sortByArray[i], direction });
				}
			}
		} else if (singleSortBy && singleSortOrder) {
			if (singleSortOrder === 'asc' || singleSortOrder === 'desc') {
				sortConfigs.push({ column: singleSortBy, direction: singleSortOrder });
			}
		}

		// 컬럼 필터 파라미터 추출
		const columnFilters: Record<string, string> = {};
		url.searchParams.forEach((value, key) => {
			const match = key.match(/^filters\[(.+)\]$/);
			if (match && value) {
				columnFilters[match[1]] = value;
			}
		});

		if (page < 1 || limit < 1 || limit > 100) {
			return json(
				{
					success: false,
					error: '잘못된 페이지네이션 파라미터입니다.',
					message: 'Invalid pagination parameters'
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		let dbData: DatabaseData;
		try {
			dbData = await loadDatabaseData(filename);
		} catch (loadError) {
			return json(
				{
					success: false,
					error: loadError instanceof Error ? loadError.message : '데이터 로드 실패',
					message: 'Data loading failed'
				} as DbDesignApiResponse,
				{ status: 500 }
			);
		}

		let filteredEntries = dbData.entries;

		// 검색 필터링
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			// 정확히 일치 또는 부분 일치 검색 함수
			const matchFn = (value: string | undefined | null) => {
				if (!value) return false;
				const target = value.toLowerCase();
				return searchExact ? target === query : target.includes(query);
			};
			filteredEntries = dbData.entries.filter((entry) => {
				switch (searchField) {
					case 'organizationName':
						return matchFn(entry.organizationName);
					case 'logicalDbName':
						return matchFn(entry.logicalDbName);
					case 'physicalDbName':
						return matchFn(entry.physicalDbName);
					case 'all':
					default:
						return (
							matchFn(entry.organizationName) ||
							matchFn(entry.departmentName) ||
							matchFn(entry.logicalDbName) ||
							matchFn(entry.physicalDbName) ||
							matchFn(entry.dbDescription) ||
							matchFn(entry.dbmsInfo)
						);
				}
			});
		}

		// 컬럼 필터 적용
		if (Object.keys(columnFilters).length > 0) {
			filteredEntries = filteredEntries.filter((entry) => {
				return Object.entries(columnFilters).every(([columnKey, filterValue]) => {
					const entryValue = entry[columnKey as keyof DatabaseEntry];
					// "(빈값)" 필터 처리
					if (filterValue === '(빈값)') {
						return entryValue === null || entryValue === undefined || entryValue === '';
					}
					if (entryValue === null || entryValue === undefined) return false;
					return String(entryValue).toLowerCase().includes(filterValue.toLowerCase());
				});
			});
		}

		// 정렬
		filteredEntries.sort((a, b) => {
			for (const config of sortConfigs) {
				const aValue = a[config.column as keyof DatabaseEntry];
				const bValue = b[config.column as keyof DatabaseEntry];

				if (aValue === null || aValue === undefined) {
					if (bValue === null || bValue === undefined) continue;
					return 1;
				}
				if (bValue === null || bValue === undefined) return -1;

				let comparison = 0;
				if (typeof aValue === 'string' && typeof bValue === 'string') {
					comparison = aValue.localeCompare(bValue, 'ko');
				} else {
					comparison = String(aValue).localeCompare(String(bValue), 'ko');
				}

				if (comparison !== 0) {
					return config.direction === 'desc' ? -comparison : comparison;
				}
			}

			const aDate = a.updatedAt || a.createdAt || '';
			const bDate = b.updatedAt || b.createdAt || '';
			return bDate.localeCompare(aDate);
		});

		// 페이지네이션
		const startIndex = (page - 1) * limit;
		const paginatedEntries = filteredEntries.slice(startIndex, startIndex + limit);
		const totalPages = Math.ceil(filteredEntries.length / limit);

		return json(
			{
				success: true,
				data: {
					entries: paginatedEntries,
					pagination: {
						currentPage: page,
						totalPages,
						totalCount: filteredEntries.length,
						limit,
						hasNextPage: page < totalPages,
						hasPrevPage: page > 1
					},
					lastUpdated: dbData.lastUpdated
				},
				message: 'Database definition data retrieved successfully'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('데이터베이스 정의서 조회 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 데이터 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 데이터베이스 정의서 추가 API
 * POST /api/database
 */
export async function POST({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'database.json';
		const body = await request.json();

		const requiredFields = ['organizationName', 'departmentName', 'appliedTask', 'logicalDbName', 'physicalDbName', 'dbmsInfo'];
		const missingFields = requiredFields.filter((field) => !body[field] || (typeof body[field] === 'string' && body[field].trim() === ''));

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

		const requiredFields = ['organizationName', 'departmentName', 'appliedTask', 'logicalDbName', 'physicalDbName', 'dbmsInfo'];
		const missingFields = requiredFields.filter((field) => !updateFields[field] || (typeof updateFields[field] === 'string' && updateFields[field].trim() === ''));

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

		dbData.entries = dbData.entries.filter((e) => e.id !== id);
		await saveDatabaseData(dbData, filename);

		return json({ success: true, message: '삭제 완료' }, { status: 200 });
	} catch (error) {
		console.error('데이터베이스 정의서 삭제 중 오류:', error);
		return json(
			{ success: false, error: '서버 오류', message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
