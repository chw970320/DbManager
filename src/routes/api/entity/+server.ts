import { json, type RequestEvent } from '@sveltejs/kit';
import type { DbDesignApiResponse, EntityData, EntityEntry } from '$lib/types/database-design';
import { saveEntityData, loadEntityData } from '$lib/utils/database-design-handler.js';
import { safeMerge } from '$lib/utils/type-guards.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 엔터티 정의서 데이터 조회 API
 * GET /api/entity-def
 */
export async function GET({ url }: RequestEvent) {
	try {
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const searchQuery = url.searchParams.get('query') || '';
		const searchField = url.searchParams.get('field') || 'all';
		const filename = url.searchParams.get('filename') || 'entity.json';

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

		const columnFilters: Record<string, string> = {};
		url.searchParams.forEach((value, key) => {
			const match = key.match(/^filters\[(.+)\]$/);
			if (match && value) columnFilters[match[1]] = value;
		});

		if (page < 1 || limit < 1 || limit > 100) {
			return json({ success: false, error: '잘못된 페이지네이션 파라미터입니다.' } as DbDesignApiResponse, { status: 400 });
		}

		let entityData: EntityData;
		try {
			entityData = await loadEntityData(filename);
		} catch (loadError) {
			return json({ success: false, error: loadError instanceof Error ? loadError.message : '데이터 로드 실패' } as DbDesignApiResponse, { status: 500 });
		}

		let filteredEntries = entityData.entries;

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filteredEntries = entityData.entries.filter((entry) => {
				switch (searchField) {
					case 'entityName': return entry.entityName?.toLowerCase().includes(query);
					case 'schemaName': return entry.schemaName?.toLowerCase().includes(query);
					case 'all':
					default:
						return (
							entry.entityName?.toLowerCase().includes(query) ||
							entry.schemaName?.toLowerCase().includes(query) ||
							entry.logicalDbName?.toLowerCase().includes(query) ||
							entry.entityDescription?.toLowerCase().includes(query)
						);
				}
			});
		}

		if (Object.keys(columnFilters).length > 0) {
			filteredEntries = filteredEntries.filter((entry) => {
				return Object.entries(columnFilters).every(([columnKey, filterValue]) => {
					const entryValue = entry[columnKey as keyof EntityEntry];
					if (entryValue === null || entryValue === undefined) return false;
					return String(entryValue).toLowerCase().includes(filterValue.toLowerCase());
				});
			});
		}

		filteredEntries.sort((a, b) => {
			for (const config of sortConfigs) {
				const aValue = a[config.column as keyof EntityEntry];
				const bValue = b[config.column as keyof EntityEntry];
				if (aValue === null || aValue === undefined) { if (bValue === null || bValue === undefined) continue; return 1; }
				if (bValue === null || bValue === undefined) return -1;
				const comparison = String(aValue).localeCompare(String(bValue), 'ko');
				if (comparison !== 0) return config.direction === 'desc' ? -comparison : comparison;
			}
			return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
		});

		const startIndex = (page - 1) * limit;
		const paginatedEntries = filteredEntries.slice(startIndex, startIndex + limit);
		const totalPages = Math.ceil(filteredEntries.length / limit);

		return json({
			success: true,
			data: {
				entries: paginatedEntries,
				pagination: { currentPage: page, totalPages, totalCount: filteredEntries.length, limit, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
				lastUpdated: entityData.lastUpdated
			}
		} as DbDesignApiResponse, { status: 200 });
	} catch (error) {
		console.error('엔터티 정의서 조회 중 오류:', error);
		return json({ success: false, error: '서버에서 데이터 조회 중 오류가 발생했습니다.' } as DbDesignApiResponse, { status: 500 });
	}
}

export async function POST({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'entity.json';
		const body = await request.json();

		let entityData: EntityData;
		try { entityData = await loadEntityData(filename); }
		catch { entityData = { entries: [], lastUpdated: new Date().toISOString(), totalCount: 0 }; }

		const now = new Date().toISOString();
		const newEntry: EntityEntry = {
			id: uuidv4(),
			logicalDbName: body.logicalDbName || undefined,
			schemaName: body.schemaName || undefined,
			entityName: body.entityName || undefined,
			entityDescription: body.entityDescription || undefined,
			primaryIdentifier: body.primaryIdentifier || undefined,
			superTypeEntityName: body.superTypeEntityName || '',
			tableKoreanName: body.tableKoreanName || undefined,
			createdAt: now,
			updatedAt: now
		};

		entityData.entries.push(newEntry);
		entityData.lastUpdated = now;
		entityData.totalCount = entityData.entries.length;
		await saveEntityData(entityData, filename);

		return json({ success: true, data: newEntry, message: '엔터티 정의서가 성공적으로 추가되었습니다.' } as DbDesignApiResponse, { status: 201 });
	} catch (error) {
		console.error('엔터티 정의서 추가 중 오류:', error);
		return json({ success: false, error: '서버에서 데이터 추가 중 오류가 발생했습니다.' } as DbDesignApiResponse, { status: 500 });
	}
}

export async function PUT({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'entity.json';
		const body = await request.json();
		const { id, ...updateFields } = body;

		if (!id) return json({ success: false, error: 'ID가 필요합니다.' }, { status: 400 });

		const entityData = await loadEntityData(filename);
		const entryIndex = entityData.entries.findIndex((e) => e.id === id);
		if (entryIndex === -1) return json({ success: false, error: '수정할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		entityData.entries[entryIndex] = { ...safeMerge(entityData.entries[entryIndex], updateFields), updatedAt: new Date().toISOString() };
		await saveEntityData(entityData, filename);

		return json({ success: true, data: entityData.entries[entryIndex], message: '수정 완료' }, { status: 200 });
	} catch (error) {
		console.error('엔터티 정의서 수정 중 오류:', error);
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		const filename = url.searchParams.get('filename') || 'entity.json';
		if (!id) return json({ success: false, error: '삭제할 ID가 필요합니다.' }, { status: 400 });

		const entityData = await loadEntityData(filename);
		if (!entityData.entries.find((e) => e.id === id)) return json({ success: false, error: '삭제할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		entityData.entries = entityData.entries.filter((e) => e.id !== id);
		await saveEntityData(entityData, filename);

		return json({ success: true, message: '삭제 완료' }, { status: 200 });
	} catch (error) {
		console.error('엔터티 정의서 삭제 중 오류:', error);
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}

