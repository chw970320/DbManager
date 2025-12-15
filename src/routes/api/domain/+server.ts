import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary.js';
import type { DomainData, DomainEntry } from '$lib/types/domain.js';
import { saveDomainData, loadDomainData, checkDomainReferences } from '$lib/utils/file-handler.js';
import { safeMerge } from '$lib/utils/type-guards.js';
import { invalidateCache } from '$lib/utils/cache.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 저장된 도메인 데이터 조회 API
 * GET /api/domain
 */
export async function GET({ url }: RequestEvent) {
	try {
		// 쿼리 파라미터 추출
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const sortBy = url.searchParams.get('sortBy') || 'createdAt';
		const sortOrder = url.searchParams.get('sortOrder') || 'desc';
		const searchQuery = url.searchParams.get('query') || '';
		const searchField = url.searchParams.get('field') || 'all';
		const filename = url.searchParams.get('filename') || 'domain.json';

		// 페이지네이션 유효성 검증
		if (page < 1 || limit < 1 || limit > 100) {
			return json(
				{
					success: false,
					error: '잘못된 페이지네이션 파라미터입니다. (page >= 1, 1 <= limit <= 100)',
					message: 'Invalid pagination parameters'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 정렬 필드 유효성 검증
		const validSortFields = [
			'domainGroup',
			'domainCategory',
			'standardDomainName',
			'logicalDataType',
			'physicalDataType',
			'createdAt'
		];
		if (!validSortFields.includes(sortBy)) {
			return json(
				{
					success: false,
					error: `지원하지 않는 정렬 필드입니다. 사용 가능: ${validSortFields.join(', ')}`,
					message: 'Invalid sort field'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 검색 필드 유효성 검증
		const validSearchFields = [
			'all',
			'domainGroup',
			'domainCategory',
			'standardDomainName',
			'logicalDataType',
			'physicalDataType'
		];
		if (!validSearchFields.includes(searchField)) {
			return json(
				{
					success: false,
					error: `지원하지 않는 검색 필드입니다. 사용 가능: ${validSearchFields.join(', ')}`,
					message: 'Invalid search field'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 데이터 로드
		let domainData: DomainData;
		try {
			domainData = await loadDomainData(filename);
		} catch (loadError) {
			return json(
				{
					success: false,
					error: loadError instanceof Error ? loadError.message : '데이터 로드 실패',
					message: 'Data loading failed'
				} as ApiResponse,
				{ status: 500 }
			);
		}

		let filteredEntries = domainData.entries;

		// 검색 필터링
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filteredEntries = domainData.entries.filter((entry) => {
				switch (searchField) {
					case 'domainGroup':
						return entry.domainGroup.toLowerCase().includes(query);
					case 'domainCategory':
						return entry.domainCategory.toLowerCase().includes(query);
					case 'standardDomainName':
						return entry.standardDomainName.toLowerCase().includes(query);
					case 'logicalDataType':
						return entry.logicalDataType.toLowerCase().includes(query);
					case 'physicalDataType':
						return entry.physicalDataType.toLowerCase().includes(query);
					case 'all':
					default:
						return (
							entry.domainGroup.toLowerCase().includes(query) ||
							entry.domainCategory.toLowerCase().includes(query) ||
							entry.standardDomainName.toLowerCase().includes(query) ||
							entry.logicalDataType.toLowerCase().includes(query) ||
							entry.physicalDataType.toLowerCase().includes(query) ||
							(entry.dataValue && entry.dataValue.toLowerCase().includes(query)) ||
							(entry.measurementUnit && entry.measurementUnit.toLowerCase().includes(query)) ||
							(entry.remarks && entry.remarks.toLowerCase().includes(query))
						);
				}
			});
		}

		// 정렬
		filteredEntries.sort((a, b) => {
			const aValue = a[sortBy as keyof DomainEntry];
			const bValue = b[sortBy as keyof DomainEntry];

			let comparison = 0;
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				comparison = aValue.localeCompare(bValue, 'ko');
			} else if (typeof aValue === 'number' && typeof bValue === 'number') {
				comparison = aValue - bValue;
			} else {
				// 기본 문자열 비교
				comparison = String(aValue).localeCompare(String(bValue), 'ko');
			}

			return sortOrder === 'desc' ? -comparison : comparison;
		});

		// 페이지네이션
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

		// 페이지네이션 메타 정보
		const totalPages = Math.ceil(filteredEntries.length / limit);
		const hasNextPage = page < totalPages;
		const hasPrevPage = page > 1;

		const responseData = {
			entries: paginatedEntries,
			pagination: {
				currentPage: page,
				totalPages,
				totalCount: filteredEntries.length,
				limit,
				hasNextPage,
				hasPrevPage
			},
			sorting: {
				sortBy,
				sortOrder
			},
			search: {
				query: searchQuery,
				field: searchField,
				isFiltered: searchQuery.trim().length > 0
			},
			lastUpdated: domainData.lastUpdated
		};

		return json(
			{
				success: true,
				data: responseData,
				message: 'Domain data retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('도메인 데이터 조회 중 오류:', error);

		return json(
			{
				success: false,
				error: '서버에서 도메인 데이터 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 도메인 통계 정보 조회 API
 * OPTIONS /api/domain
 */
export async function OPTIONS({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'domain.json';

		// 데이터 로드 (비동기 함수이므로 await 사용)
		let domainData: DomainData;
		try {
			domainData = await loadDomainData(filename);
		} catch (loadError) {
			return json(
				{
					success: false,
					error: loadError instanceof Error ? loadError.message : '데이터 로드 실패',
					message: 'Data loading failed'
				} as ApiResponse,
				{ status: 500 }
			);
		}

		// 빈 데이터 처리
		if (!domainData.entries || domainData.entries.length === 0) {
			return json(
				{
					success: true,
					data: {
						totalEntries: 0,
						lastUpdated: domainData.lastUpdated,
						domainGroups: {},
						logicalDataTypes: {},
						physicalDataTypes: {},
						summary: {
							uniqueGroups: 0,
							uniqueLogicalDataTypes: 0,
							uniquePhysicalDataTypes: 0
						}
					},
					message: 'Domain statistics retrieved successfully (no data)'
				} as ApiResponse,
				{ status: 200 }
			);
		}

		// 도메인 그룹별 통계
		const groupStats = new Map<string, number>();
		const logicalDataTypeStats = new Map<string, number>();
		const physicalDataTypeStats = new Map<string, number>();

		domainData.entries.forEach((entry) => {
			// 도메인 그룹별 카운트
			groupStats.set(entry.domainGroup, (groupStats.get(entry.domainGroup) || 0) + 1);

			// 논리 데이터 타입별 카운트
			logicalDataTypeStats.set(
				entry.logicalDataType,
				(logicalDataTypeStats.get(entry.logicalDataType) || 0) + 1
			);

			// 물리 데이터 타입별 카운트
			physicalDataTypeStats.set(
				entry.physicalDataType,
				(physicalDataTypeStats.get(entry.physicalDataType) || 0) + 1
			);
		});

		const statsData = {
			totalEntries: domainData.totalCount,
			lastUpdated: domainData.lastUpdated,
			domainGroups: Object.fromEntries(groupStats),
			logicalDataTypes: Object.fromEntries(logicalDataTypeStats),
			physicalDataTypes: Object.fromEntries(physicalDataTypeStats),
			summary: {
				uniqueGroups: groupStats.size,
				uniqueLogicalDataTypes: logicalDataTypeStats.size,
				uniquePhysicalDataTypes: physicalDataTypeStats.size
			}
		};

		return json(
			{
				success: true,
				data: statsData,
				message: 'Domain statistics retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('도메인 통계 조회 중 오류:', error);

		return json(
			{
				success: false,
				error: '서버에서 통계 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 새로운 도메인 추가 API
 * POST /api/domain
 */
export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { filename = 'domain.json', ...entryData } = body;

		// 필수 필드 검증
		const requiredFields = [
			'domainGroup',
			'domainCategory',
			'standardDomainName',
			'physicalDataType'
		];
		const missingFields = requiredFields.filter((field) => !entryData[field]);

		if (missingFields.length > 0) {
			return json(
				{
					success: false,
					error: `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`,
					message: 'Missing required fields'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 기존 데이터 로드
		let domainData: DomainData;
		try {
			domainData = await loadDomainData(filename);
		} catch (loadError) {
			// 파일이 없으면 새로 생성
			domainData = {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
		}

		// 중복 검사 (도메인 그룹 + 분류 + 표준도메인명)
		const isDuplicate = domainData.entries.some(
			(entry) =>
				entry.domainGroup === entryData.domainGroup &&
				entry.domainCategory === entryData.domainCategory &&
				entry.standardDomainName === entryData.standardDomainName
		);

		if (isDuplicate) {
			return json(
				{
					success: false,
					error: '이미 동일한 도메인이 존재합니다.',
					message: 'Duplicate domain entry'
				} as ApiResponse,
				{ status: 409 }
			);
		}

		// 새 도메인 엔트리 생성
		const now = new Date().toISOString();
		const newEntry: DomainEntry = {
			id: uuidv4(),
			domainGroup: entryData.domainGroup,
			domainCategory: entryData.domainCategory,
			standardDomainName: entryData.standardDomainName,
			physicalDataType: entryData.physicalDataType,
			dataLength: entryData.dataLength || undefined,
			decimalPlaces: entryData.decimalPlaces || undefined,
			measurementUnit: entryData.measurementUnit || undefined,
			revision: entryData.revision || undefined,
			description: entryData.description || undefined,
			storageFormat: entryData.storageFormat || undefined,
			displayFormat: entryData.displayFormat || undefined,
			allowedValues: entryData.allowedValues || undefined,
			createdAt: now,
			updatedAt: now
		};

		// 데이터에 추가
		domainData.entries.push(newEntry);
		domainData.lastUpdated = now;
		domainData.totalCount = domainData.entries.length;

		// 저장
		await saveDomainData(domainData, filename);
		invalidateCache('domain', filename);

		return json(
			{
				success: true,
				data: newEntry,
				message: '도메인이 성공적으로 추가되었습니다.'
			} as ApiResponse,
			{ status: 201 }
		);
	} catch (error) {
		console.error('도메인 추가 중 오류:', error);

		// JSON 파싱 오류
		if (error instanceof SyntaxError) {
			return json(
				{
					success: false,
					error: '요청 데이터 형식이 올바르지 않습니다.',
					message: 'Invalid JSON format'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		return json(
			{
				success: false,
				error: '서버에서 도메인 추가 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

export async function PUT({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { id, filename = 'domain.json', ...updateFields } = body;

		if (!id) {
			return json(
				{ success: false, error: 'ID가 필요합니다.', message: 'ID required' },
				{ status: 400 }
			);
		}

		const domainData = await loadDomainData(filename);
		const entryIndex = domainData.entries.findIndex((e) => e.id === id);

		if (entryIndex === -1) {
			return json(
				{ success: false, error: '수정할 도메인을 찾을 수 없습니다.', message: 'Not found' },
				{ status: 404 }
			);
		}

		// 데이터 수정 (undefined 값은 무시)
		domainData.entries[entryIndex] = {
			...safeMerge(domainData.entries[entryIndex], updateFields),
			updatedAt: new Date().toISOString()
		};

		await saveDomainData(domainData, filename);
		invalidateCache('domain', filename); // 캐시 무효화

		return json(
			{ success: true, data: domainData.entries[entryIndex], message: '도메인 수정 완료' },
			{ status: 200 }
		);
	} catch (error) {
		console.error('도메인 수정 중 오류:', error);
		return json(
			{ success: false, error: '서버 오류', message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		const filename = url.searchParams.get('filename') || 'domain.json';
		const force = url.searchParams.get('force') === 'true'; // 강제 삭제 옵션

		if (!id) {
			return json(
				{ success: false, error: '삭제할 도메인 ID가 필요합니다.', message: 'ID required' },
				{ status: 400 }
			);
		}

		const domainData = await loadDomainData(filename);
		const entryToDelete = domainData.entries.find((e) => e.id === id);

		if (!entryToDelete) {
			return json(
				{ success: false, error: '삭제할 도메인을 찾을 수 없습니다.', message: 'Not found' },
				{ status: 404 }
			);
		}

		// 참조 무결성 검증 (강제 삭제가 아닌 경우)
		if (!force) {
			const refCheck = await checkDomainReferences(entryToDelete);
			if (!refCheck.canDelete) {
				return json(
					{
						success: false,
						error: refCheck.message || '다른 항목에서 참조 중이므로 삭제할 수 없습니다.',
						message: 'Referential integrity violation',
						data: { references: refCheck.references }
					},
					{ status: 409 }
				);
			}
		}

		// 데이터 삭제
		domainData.entries = domainData.entries.filter((e) => e.id !== id);
		await saveDomainData(domainData, filename);
		invalidateCache('domain', filename); // 캐시 무효화

		return json({ success: true, message: '도메인 삭제 완료' }, { status: 200 });
	} catch (error) {
		console.error('도메인 삭제 중 오류:', error);
		return json(
			{ success: false, error: '서버 오류', message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
