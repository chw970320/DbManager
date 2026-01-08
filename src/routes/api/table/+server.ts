import { json, type RequestEvent } from '@sveltejs/kit';
import type { DbDesignApiResponse, TableData, TableEntry } from '$lib/types/database-design';
import { saveTableData, loadTableData } from '$lib/utils/database-design-handler.js';
import { safeMerge } from '$lib/utils/type-guards.js';
import { v4 as uuidv4 } from 'uuid';

export async function GET({ url }: RequestEvent) {
	try {
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const searchQuery = url.searchParams.get('q') || url.searchParams.get('query') || '';
		const searchField = url.searchParams.get('field') || 'all';
		const searchExact = url.searchParams.get('exact') === 'true';
		const filename = url.searchParams.get('filename') || 'table.json';

		const sortByArray = url.searchParams.getAll('sortBy[]');
		const sortOrderArray = url.searchParams.getAll('sortOrder[]');
		const singleSortBy = url.searchParams.get('sortBy');
		const singleSortOrder = url.searchParams.get('sortOrder');

		type SortConfig = { column: string; direction: 'asc' | 'desc' };
		const sortConfigs: SortConfig[] = [];

		if (sortByArray.length > 0 && sortOrderArray.length > 0) {
			for (let i = 0; i < Math.min(sortByArray.length, sortOrderArray.length); i++) {
				const direction = sortOrderArray[i];
				if (direction === 'asc' || direction === 'desc')
					sortConfigs.push({ column: sortByArray[i], direction });
			}
		} else if (
			singleSortBy &&
			singleSortOrder &&
			(singleSortOrder === 'asc' || singleSortOrder === 'desc')
		) {
			sortConfigs.push({ column: singleSortBy, direction: singleSortOrder });
		}

		const columnFilters: Record<string, string> = {};
		url.searchParams.forEach((value, key) => {
			const match = key.match(/^filters\[(.+)\]$/);
			if (match && value) columnFilters[match[1]] = value;
		});

		if (page < 1 || limit < 1 || limit > 100) {
			return json(
				{ success: false, error: '잘못된 페이지네이션 파라미터입니다.' } as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		let tableData: TableData;
		try {
			tableData = await loadTableData(filename);
		} catch (e) {
			return json(
				{
					success: false,
					error: e instanceof Error ? e.message : '데이터 로드 실패'
				} as DbDesignApiResponse,
				{ status: 500 }
			);
		}

		let filteredEntries = tableData.entries;

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			const matchFn = (value: string | undefined | null) => {
				if (!value) return false;
				const target = value.toLowerCase();
				return searchExact ? target === query : target.includes(query);
			};
			filteredEntries = tableData.entries.filter((entry) => {
				switch (searchField) {
					case 'physicalDbName':
						return matchFn(entry.physicalDbName);
					case 'schemaName':
						return matchFn(entry.schemaName);
					case 'tableEnglishName':
						return matchFn(entry.tableEnglishName);
					case 'tableKoreanName':
						return matchFn(entry.tableKoreanName);
					case 'tableType':
						return matchFn(entry.tableType);
					case 'subjectArea':
						return matchFn(entry.subjectArea);
					case 'all':
					default:
						return (
							matchFn(entry.physicalDbName) ||
							matchFn(entry.schemaName) ||
							matchFn(entry.tableEnglishName) ||
							matchFn(entry.tableKoreanName) ||
							matchFn(entry.tableType) ||
							matchFn(entry.subjectArea)
						);
				}
			});
		}

		if (Object.keys(columnFilters).length > 0) {
			filteredEntries = filteredEntries.filter((entry) =>
				Object.entries(columnFilters).every(([k, v]) => {
					const val = entry[k as keyof TableEntry];
					// "(빈값)" 필터 처리
					if (v === '(빈값)') {
						return val === null || val === undefined || val === '';
					}
					return val != null && String(val).toLowerCase().includes(v.toLowerCase());
				})
			);
		}

		filteredEntries.sort((a, b) => {
			for (const config of sortConfigs) {
				const aVal = a[config.column as keyof TableEntry],
					bVal = b[config.column as keyof TableEntry];
				if (aVal == null) {
					if (bVal == null) continue;
					return 1;
				}
				if (bVal == null) return -1;
				const cmp = String(aVal).localeCompare(String(bVal), 'ko');
				if (cmp !== 0) return config.direction === 'desc' ? -cmp : cmp;
			}
			return (b.updatedAt || '').localeCompare(a.updatedAt || '');
		});

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
					lastUpdated: tableData.lastUpdated
				}
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: '서버에서 데이터 조회 중 오류가 발생했습니다.'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

export async function POST({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'table.json';
		const body = await request.json();

		const requiredFields = [
			'physicalDbName',
			'tableOwner',
			'subjectArea',
			'schemaName',
			'tableEnglishName',
			'tableKoreanName',
			'tableType',
			'relatedEntityName',
			'publicFlag'
		];
		const missingFields = requiredFields.filter(
			(field) => !body[field] || (typeof body[field] === 'string' && body[field].trim() === '')
		);

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

		let tableData: TableData;
		try {
			tableData = await loadTableData(filename);
		} catch {
			tableData = { entries: [], lastUpdated: new Date().toISOString(), totalCount: 0 };
		}

		const now = new Date().toISOString();
		const newEntry: TableEntry = {
			id: uuidv4(),
			physicalDbName: body.physicalDbName,
			tableOwner: body.tableOwner,
			subjectArea: body.subjectArea,
			schemaName: body.schemaName,
			tableEnglishName: body.tableEnglishName,
			tableKoreanName: body.tableKoreanName,
			tableType: body.tableType,
			relatedEntityName: body.relatedEntityName,
			publicFlag: body.publicFlag,
			tableDescription: body.tableDescription || undefined,
			businessClassification: body.businessClassification || undefined,
			retentionPeriod: body.retentionPeriod || undefined,
			tableVolume: body.tableVolume || undefined,
			occurrenceCycle: body.occurrenceCycle || undefined,
			nonPublicReason: body.nonPublicReason || undefined,
			openDataList: body.openDataList || undefined,
			createdAt: now,
			updatedAt: now
		};

		tableData.entries.push(newEntry);
		tableData.lastUpdated = now;
		tableData.totalCount = tableData.entries.length;
		await saveTableData(tableData, filename);

		return json(
			{
				success: true,
				data: newEntry,
				message: '테이블 정의서가 성공적으로 추가되었습니다.'
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
		const filename = url.searchParams.get('filename') || 'table.json';
		const body = await request.json();
		const { id, ...updateFields } = body;
		if (!id) return json({ success: false, error: 'ID가 필요합니다.' }, { status: 400 });

		const requiredFields = [
			'physicalDbName',
			'tableOwner',
			'subjectArea',
			'schemaName',
			'tableEnglishName',
			'tableKoreanName',
			'tableType',
			'relatedEntityName',
			'publicFlag'
		];
		const missingFields = requiredFields.filter(
			(field) =>
				!updateFields[field] ||
				(typeof updateFields[field] === 'string' && updateFields[field].trim() === '')
		);

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

		const tableData = await loadTableData(filename);
		const idx = tableData.entries.findIndex((e) => e.id === id);
		if (idx === -1)
			return json({ success: false, error: '수정할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		tableData.entries[idx] = {
			...safeMerge(tableData.entries[idx], updateFields),
			updatedAt: new Date().toISOString()
		};
		await saveTableData(tableData, filename);

		return json(
			{ success: true, data: tableData.entries[idx], message: '수정 완료' },
			{ status: 200 }
		);
	} catch (error) {
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		const filename = url.searchParams.get('filename') || 'table.json';
		if (!id) return json({ success: false, error: '삭제할 ID가 필요합니다.' }, { status: 400 });

		const tableData = await loadTableData(filename);
		if (!tableData.entries.find((e) => e.id === id))
			return json({ success: false, error: '삭제할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		tableData.entries = tableData.entries.filter((e) => e.id !== id);
		await saveTableData(tableData, filename);

		return json({ success: true, message: '삭제 완료' }, { status: 200 });
	} catch (error) {
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}
