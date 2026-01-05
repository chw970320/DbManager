import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary';
import type { DomainData, DomainEntry, DomainApiResponse } from '$lib/types/domain';
import {
	saveDomainData,
	loadDomainData,
	checkDomainReferences,
	listDomainFiles
} from '$lib/utils/file-handler.js';
import { safeMerge } from '$lib/utils/type-guards.js';
import { invalidateCache } from '$lib/utils/cache.js';
import { generateStandardDomainName, validateDomainNameUniqueness } from '$lib/utils/validation.js';
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
		const searchQuery = url.searchParams.get('query') || '';
		const searchField = url.searchParams.get('field') || 'all';
		const filename = url.searchParams.get('filename') || 'domain.json';

		// 다중 정렬 파라미터 처리 (sortBy[]와 sortOrder[] 배열)
		const sortByArray = url.searchParams.getAll('sortBy[]');
		const sortOrderArray = url.searchParams.getAll('sortOrder[]');

		// 하위 호환성: 단일 정렬 파라미터도 지원
		const singleSortBy = url.searchParams.get('sortBy');
		const singleSortOrder = url.searchParams.get('sortOrder');

		// 정렬 설정 구성
		type SortConfig = { column: string; direction: 'asc' | 'desc' };
		const sortConfigs: SortConfig[] = [];

		if (sortByArray.length > 0 && sortOrderArray.length > 0) {
			// 다중 정렬
			for (let i = 0; i < Math.min(sortByArray.length, sortOrderArray.length); i++) {
				const direction = sortOrderArray[i];
				if (direction === 'asc' || direction === 'desc') {
					sortConfigs.push({ column: sortByArray[i], direction });
				}
			}
		} else if (singleSortBy && singleSortOrder) {
			// 단일 정렬 (하위 호환성)
			if (singleSortOrder === 'asc' || singleSortOrder === 'desc') {
				sortConfigs.push({ column: singleSortBy, direction: singleSortOrder });
			}
		}

		// 컬럼 필터 파라미터 추출 (filters[columnKey]=value 형식)
		const columnFilters: Record<string, string> = {};
		url.searchParams.forEach((value, key) => {
			const match = key.match(/^filters\[(.+)\]$/);
			if (match && value) {
				columnFilters[match[1]] = value;
			}
		});

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
			'createdAt',
			'updatedAt'
		];
		for (const config of sortConfigs) {
			if (!validSortFields.includes(config.column)) {
				return json(
					{
						success: false,
						error: `지원하지 않는 정렬 필드입니다. 사용 가능: ${validSortFields.join(', ')}`,
						message: 'Invalid sort field'
					} as ApiResponse,
					{ status: 400 }
				);
			}
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
						return entry.domainGroup?.toLowerCase().includes(query);
					case 'domainCategory':
						return entry.domainCategory?.toLowerCase().includes(query);
					case 'standardDomainName':
						return entry.standardDomainName?.toLowerCase().includes(query);
					case 'logicalDataType':
						return entry.logicalDataType?.toLowerCase().includes(query);
					case 'physicalDataType':
						return entry.physicalDataType?.toLowerCase().includes(query);
					case 'all':
					default:
						return (
							entry.domainGroup?.toLowerCase().includes(query) ||
							entry.domainCategory?.toLowerCase().includes(query) ||
							entry.standardDomainName?.toLowerCase().includes(query) ||
							entry.logicalDataType?.toLowerCase().includes(query) ||
							entry.physicalDataType?.toLowerCase().includes(query) ||
							entry.dataValue?.toLowerCase().includes(query) ||
							entry.measurementUnit?.toLowerCase().includes(query) ||
							entry.remarks?.toLowerCase().includes(query)
						);
				}
			});
		}

		// 컬럼 필터 적용
		if (Object.keys(columnFilters).length > 0) {
			filteredEntries = filteredEntries.filter((entry) => {
				return Object.entries(columnFilters).every(([columnKey, filterValue]) => {
					const entryValue = entry[columnKey as keyof DomainEntry];
					if (entryValue === null || entryValue === undefined) {
						return false;
					}

					// 문자열 필드의 경우 부분 일치 검색
					const entryStr = String(entryValue).toLowerCase();
					const filterStr = filterValue.toLowerCase();
					return entryStr.includes(filterStr);
				});
			});
		}

		// 정렬
		filteredEntries.sort((a, b) => {
			// 다중 정렬: 각 정렬 조건을 순차적으로 적용
			for (const config of sortConfigs) {
				const aValue = a[config.column as keyof DomainEntry];
				const bValue = b[config.column as keyof DomainEntry];

				// null/undefined 처리
				if (aValue === null || aValue === undefined) {
					if (bValue === null || bValue === undefined) continue;
					return 1; // null은 뒤로
				}
				if (bValue === null || bValue === undefined) {
					return -1; // null은 뒤로
				}

				let comparison = 0;
				if (typeof aValue === 'string' && typeof bValue === 'string') {
					comparison = aValue.localeCompare(bValue, 'ko');
				} else if (typeof aValue === 'number' && typeof bValue === 'number') {
					comparison = aValue - bValue;
				} else {
					// 기본 문자열 비교
					comparison = String(aValue).localeCompare(String(bValue), 'ko');
				}

				if (comparison !== 0) {
					return config.direction === 'desc' ? -comparison : comparison;
				}
			}

			// 모든 정렬 조건이 같으면 기본 정렬 적용 (updatedAt desc, 없으면 createdAt desc)
			const aDate = a.updatedAt || a.createdAt || '';
			const bDate = b.updatedAt || b.createdAt || '';
			if (aDate && bDate) {
				return bDate.localeCompare(aDate); // 내림차순
			}
			return 0;
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
				sortConfigs:
					sortConfigs.length > 0
						? sortConfigs
						: [{ column: 'updatedAt', direction: 'desc' as const }]
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

			// 논리 데이터 타입별 카운트 (값이 있을 때만)
			const logicalType = entry.logicalDataType ?? 'UNKNOWN';
			logicalDataTypeStats.set(logicalType, (logicalDataTypeStats.get(logicalType) || 0) + 1);

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
export async function POST({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'domain.json';
		const body = await request.json();
		const entryData = body;

		// 필수 필드 검증 (standardDomainName은 자동 생성되므로 제외)
		const requiredFields = ['domainGroup', 'domainCategory', 'physicalDataType'];
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

		// 도메인명 자동 생성
		const generatedDomainName = generateStandardDomainName(
			entryData.domainCategory,
			entryData.physicalDataType,
			entryData.dataLength,
			entryData.decimalPlaces
		);

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

		// 모든 도메인 파일 로드하여 도메인명 유일성 검사
		try {
			const allDomainFiles = await listDomainFiles();
			const allDomainEntries: DomainEntry[] = [];
			for (const file of allDomainFiles) {
				try {
					const fileData = await loadDomainData(file);
					allDomainEntries.push(...fileData.entries);
				} catch (error) {
					console.warn(`도메인 파일 ${file} 로드 실패:`, error);
				}
			}

			// 도메인명 유일성 validation
			const validationError = validateDomainNameUniqueness(generatedDomainName, allDomainEntries);
			if (validationError) {
				return json(
					{
						success: false,
						error: validationError,
						message: 'Duplicate domain name'
					} as ApiResponse,
					{ status: 409 }
				);
			}
		} catch (validationError) {
			console.warn('도메인명 유일성 확인 중 오류 (계속 진행):', validationError);
		}

		// 새 도메인 엔트리 생성
		const now = new Date().toISOString();
		const newEntry: DomainEntry = {
			id: uuidv4(),
			domainGroup: entryData.domainGroup,
			domainCategory: entryData.domainCategory,
			standardDomainName: generatedDomainName, // 자동 생성된 도메인명 사용
			physicalDataType: entryData.physicalDataType,
			dataLength: entryData.dataLength || undefined,
			decimalPlaces: entryData.decimalPlaces || undefined,
			logicalDataType: entryData.logicalDataType || undefined,
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

export async function PUT({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'domain.json';
		const body = await request.json();
		const { id, ...updateFields } = body;

		// ID가 없거나 빈 문자열인 경우 에러
		if (!id || typeof id !== 'string' || id.trim() === '') {
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

		const existingEntry = domainData.entries[entryIndex];

		// 도메인명 자동 생성 (도메인분류명, 물리데이터타입, 데이터길이, 소수점자리수가 변경되면 재생성)
		const finalDomainCategory = updateFields.domainCategory ?? existingEntry.domainCategory;
		const finalPhysicalDataType = updateFields.physicalDataType ?? existingEntry.physicalDataType;
		const finalDataLength = updateFields.dataLength ?? existingEntry.dataLength;
		const finalDecimalPlaces = updateFields.decimalPlaces ?? existingEntry.decimalPlaces;

		const generatedDomainName = generateStandardDomainName(
			finalDomainCategory,
			finalPhysicalDataType,
			finalDataLength,
			finalDecimalPlaces
		);

		// 도메인명이 변경되는 경우 유일성 validation
		if (generatedDomainName !== existingEntry.standardDomainName) {
			try {
				const allDomainFiles = await listDomainFiles();
				const allDomainEntries: DomainEntry[] = [];
				for (const file of allDomainFiles) {
					try {
						const fileData = await loadDomainData(file);
						allDomainEntries.push(...fileData.entries);
					} catch (error) {
						console.warn(`도메인 파일 ${file} 로드 실패:`, error);
					}
				}

				// 도메인명 유일성 validation
				const validationError = validateDomainNameUniqueness(
					generatedDomainName,
					allDomainEntries,
					id // 현재 수정 중인 엔트리는 제외
				);
				if (validationError) {
					return json(
						{
							success: false,
							error: validationError,
							message: 'Duplicate domain name'
						} as ApiResponse,
						{ status: 409 }
					);
				}
			} catch (validationError) {
				console.warn('도메인명 유일성 확인 중 오류 (계속 진행):', validationError);
			}
		}

		// 데이터 수정 (undefined 값은 무시, 도메인명은 자동 생성된 값 사용)
		domainData.entries[entryIndex] = {
			...safeMerge(domainData.entries[entryIndex], updateFields),
			standardDomainName: generatedDomainName, // 자동 생성된 도메인명 사용
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

		// 참조 검증: 차단하지 않고 경고 정보만 수집
		let warnings: unknown[] = [];
		if (!force) {
			try {
				const refCheck = await checkDomainReferences(entryToDelete);
				if (!refCheck.canDelete && refCheck.references?.length) {
					warnings = refCheck.references;
				}
			} catch (refError) {
				console.warn('참조 검증 경고 수집 중 오류:', refError);
			}
		}

		// 데이터 삭제
		domainData.entries = domainData.entries.filter((e) => e.id !== id);
		await saveDomainData(domainData, filename);
		invalidateCache('domain', filename); // 캐시 무효화

		return json({ success: true, message: '도메인 삭제 완료', warnings }, { status: 200 });
	} catch (error) {
		console.error('도메인 삭제 중 오류:', error);
		return json(
			{ success: false, error: '서버 오류', message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
