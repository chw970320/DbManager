import { json, type RequestEvent } from '@sveltejs/kit';
import type { DbDesignApiResponse, ColumnData, ColumnEntry } from '$lib/types/database-design';
import { saveColumnData, loadColumnData } from '$lib/utils/database-design-handler.js';
import { safeMerge } from '$lib/utils/type-guards.js';
import { v4 as uuidv4 } from 'uuid';

export async function GET({ url }: RequestEvent) {
	try {
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const searchQuery = url.searchParams.get('query') || '';
		const searchField = url.searchParams.get('field') || 'all';
		const filename = url.searchParams.get('filename') || 'column.json';

		const sortByArray = url.searchParams.getAll('sortBy[]');
		const sortOrderArray = url.searchParams.getAll('sortOrder[]');
		const singleSortBy = url.searchParams.get('sortBy');
		const singleSortOrder = url.searchParams.get('sortOrder');

		type SortConfig = { column: string; direction: 'asc' | 'desc' };
		const sortConfigs: SortConfig[] = [];

		if (sortByArray.length > 0 && sortOrderArray.length > 0) {
			for (let i = 0; i < Math.min(sortByArray.length, sortOrderArray.length); i++) {
				const direction = sortOrderArray[i];
				if (direction === 'asc' || direction === 'desc') sortConfigs.push({ column: sortByArray[i], direction });
			}
		} else if (singleSortBy && singleSortOrder && (singleSortOrder === 'asc' || singleSortOrder === 'desc')) {
			sortConfigs.push({ column: singleSortBy, direction: singleSortOrder });
		}

		const columnFilters: Record<string, string> = {};
		url.searchParams.forEach((value, key) => {
			const match = key.match(/^filters\[(.+)\]$/);
			if (match && value) columnFilters[match[1]] = value;
		});

		if (page < 1 || limit < 1 || limit > 100) {
			return json({ success: false, error: '잘못된 페이지네이션 파라미터입니다.' } as DbDesignApiResponse, { status: 400 });
		}

		let columnData: ColumnData;
		try { columnData = await loadColumnData(filename); }
		catch (e) { return json({ success: false, error: e instanceof Error ? e.message : '데이터 로드 실패' } as DbDesignApiResponse, { status: 500 }); }

		let filteredEntries = columnData.entries;

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filteredEntries = columnData.entries.filter((entry) => {
				switch (searchField) {
					case 'schemaName': return entry.schemaName?.toLowerCase().includes(query);
					case 'tableEnglishName': return entry.tableEnglishName?.toLowerCase().includes(query);
					case 'columnEnglishName': return entry.columnEnglishName?.toLowerCase().includes(query);
					case 'columnKoreanName': return entry.columnKoreanName?.toLowerCase().includes(query);
					case 'dataType': return entry.dataType?.toLowerCase().includes(query);
					case 'all':
					default:
						return entry.schemaName?.toLowerCase().includes(query) ||
							entry.tableEnglishName?.toLowerCase().includes(query) ||
							entry.columnEnglishName?.toLowerCase().includes(query) ||
							entry.columnKoreanName?.toLowerCase().includes(query) ||
							entry.dataType?.toLowerCase().includes(query);
				}
			});
		}

		if (Object.keys(columnFilters).length > 0) {
			filteredEntries = filteredEntries.filter((entry) => Object.entries(columnFilters).every(([k, v]) => {
				const val = entry[k as keyof ColumnEntry];
				return val != null && String(val).toLowerCase().includes(v.toLowerCase());
			}));
		}

		filteredEntries.sort((a, b) => {
			for (const config of sortConfigs) {
				const aVal = a[config.column as keyof ColumnEntry], bVal = b[config.column as keyof ColumnEntry];
				if (aVal == null) { if (bVal == null) continue; return 1; }
				if (bVal == null) return -1;
				const cmp = String(aVal).localeCompare(String(bVal), 'ko');
				if (cmp !== 0) return config.direction === 'desc' ? -cmp : cmp;
			}
			return (b.updatedAt || '').localeCompare(a.updatedAt || '');
		});

		const startIndex = (page - 1) * limit;
		const paginatedEntries = filteredEntries.slice(startIndex, startIndex + limit);
		const totalPages = Math.ceil(filteredEntries.length / limit);

		return json({
			success: true,
			data: { entries: paginatedEntries, pagination: { currentPage: page, totalPages, totalCount: filteredEntries.length, limit, hasNextPage: page < totalPages, hasPrevPage: page > 1 }, lastUpdated: columnData.lastUpdated }
		} as DbDesignApiResponse, { status: 200 });
	} catch (error) {
		return json({ success: false, error: '서버에서 데이터 조회 중 오류가 발생했습니다.' } as DbDesignApiResponse, { status: 500 });
	}
}

export async function POST({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'column.json';
		const body = await request.json();

		let columnData: ColumnData;
		try { columnData = await loadColumnData(filename); }
		catch { columnData = { entries: [], lastUpdated: new Date().toISOString(), totalCount: 0 }; }

		const now = new Date().toISOString();
		const newEntry: ColumnEntry = {
			id: uuidv4(),
			scopeFlag: body.scopeFlag || undefined,
			subjectArea: body.subjectArea || undefined,
			schemaName: body.schemaName || undefined,
			tableEnglishName: body.tableEnglishName || undefined,
			columnEnglishName: body.columnEnglishName || undefined,
			columnKoreanName: body.columnKoreanName || undefined,
			columnDescription: body.columnDescription || undefined,
			relatedEntityName: body.relatedEntityName || undefined,
			dataType: body.dataType || undefined,
			dataLength: body.dataLength || '',
			dataDecimalLength: body.dataDecimalLength || '',
			dataFormat: body.dataFormat || '',
			notNullFlag: body.notNullFlag || undefined,
			pkInfo: body.pkInfo || '',
			fkInfo: body.fkInfo || undefined,
			indexName: body.indexName || '',
			indexOrder: body.indexOrder || '',
			akInfo: body.akInfo || '',
			constraint: body.constraint || '',
			personalInfoFlag: body.personalInfoFlag || undefined,
			encryptionFlag: body.encryptionFlag || undefined,
			publicFlag: body.publicFlag || undefined,
			createdAt: now,
			updatedAt: now
		};

		columnData.entries.push(newEntry);
		columnData.lastUpdated = now;
		columnData.totalCount = columnData.entries.length;
		await saveColumnData(columnData, filename);

		return json({ success: true, data: newEntry, message: '컬럼 정의서가 성공적으로 추가되었습니다.' } as DbDesignApiResponse, { status: 201 });
	} catch (error) {
		return json({ success: false, error: '서버에서 데이터 추가 중 오류가 발생했습니다.' } as DbDesignApiResponse, { status: 500 });
	}
}

export async function PUT({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'column.json';
		const body = await request.json();
		const { id, ...updateFields } = body;
		if (!id) return json({ success: false, error: 'ID가 필요합니다.' }, { status: 400 });

		const columnData = await loadColumnData(filename);
		const idx = columnData.entries.findIndex((e) => e.id === id);
		if (idx === -1) return json({ success: false, error: '수정할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		columnData.entries[idx] = { ...safeMerge(columnData.entries[idx], updateFields), updatedAt: new Date().toISOString() };
		await saveColumnData(columnData, filename);

		return json({ success: true, data: columnData.entries[idx], message: '수정 완료' }, { status: 200 });
	} catch (error) {
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		const filename = url.searchParams.get('filename') || 'column.json';
		if (!id) return json({ success: false, error: '삭제할 ID가 필요합니다.' }, { status: 400 });

		const columnData = await loadColumnData(filename);
		if (!columnData.entries.find((e) => e.id === id)) return json({ success: false, error: '삭제할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		columnData.entries = columnData.entries.filter((e) => e.id !== id);
		await saveColumnData(columnData, filename);

		return json({ success: true, message: '삭제 완료' }, { status: 200 });
	} catch (error) {
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}

