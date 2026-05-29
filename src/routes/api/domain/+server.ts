import { json, type RequestEvent } from '@sveltejs/kit';
import {
	loadData,
	saveData,
	mergeData,
	listFiles,
	createFile,
	renameFile,
	deleteFile,
	loadVocabularyData,
	saveVocabularyData,
	mergeVocabularyData,
	listVocabularyFiles,
	createVocabularyFile,
	renameVocabularyFile,
	deleteVocabularyFile,
	loadDomainData,
	saveDomainData,
	mergeDomainData,
	listDomainFiles,
	createDomainFile,
	renameDomainFile,
	deleteDomainFile,
	loadTermData,
	saveTermData,
	mergeTermData,
	listTermFiles,
	createTermFile,
	renameTermFile,
	deleteTermFile,
	loadDatabaseData,
	saveDatabaseData,
	mergeDatabaseData,
	listDatabaseFiles,
	createDatabaseFile,
	renameDatabaseFile,
	deleteDatabaseFile,
	loadEntityData,
	saveEntityData,
	mergeEntityData,
	listEntityFiles,
	createEntityFile,
	renameEntityFile,
	deleteEntityFile,
	loadAttributeData,
	saveAttributeData,
	mergeAttributeData,
	listAttributeFiles,
	createAttributeFile,
	renameAttributeFile,
	deleteAttributeFile,
	loadTableData,
	saveTableData,
	mergeTableData,
	listTableFiles,
	createTableFile,
	renameTableFile,
	deleteTableFile,
	loadColumnData,
	saveColumnData,
	mergeColumnData,
	listColumnFiles,
	createColumnFile,
	renameColumnFile,
	deleteColumnFile,
	loadForbiddenWords
} from '$lib/registry/data-registry';
import {
	getCachedData,
	getCachedVocabularyData,
	getCachedDomainData,
	getCachedTermData,
	invalidateCache,
	invalidateDataCache,
	invalidateAllCaches
} from '$lib/registry/cache-registry';
import { checkEntryReferences } from '$lib/registry/mapping-registry';
import { loadDomainDataTypeMappingData } from '$lib/registry/domain-data-type-mapping-registry';
import { planCascadeUpdate } from '$lib/utils/cascade-update-plan.js';
import { applyCascadePlan } from '$lib/utils/cascade-update-transaction.js';
import { safeMerge } from '$lib/utils/type-guards.js';

import { generateStandardDomainName, validateDomainNameUniqueness } from '$lib/utils/validation.js';
import {
	extractReferenceWarnings,
	findInvalidField,
	getMissingRequiredFields,
	isInvalidPagination,
	paginateEntries,
	parseColumnFilters,
	parsePaginationParams,
	parseSortConfigs
} from '$lib/server/standardization-crud';
import { v4 as uuidv4 } from 'uuid';

/**
 * 저장된 도메인 데이터 조회 API
 * GET /api/domain
 */
export async function GET({ url }: RequestEvent) {
	try {
		// 쿼리 파라미터 추출
		const { page, limit } = parsePaginationParams(url.searchParams, 20);
		const searchQuery = url.searchParams.get('q') || url.searchParams.get('query') || '';
		const searchField = url.searchParams.get('field') || 'all';
		const searchExact = url.searchParams.get('exact') === 'true';
		const filename = url.searchParams.get('filename') || 'domain.json';

		const sortConfigs = parseSortConfigs(url.searchParams);
		const columnFilters = parseColumnFilters(url.searchParams);

		// 페이지네이션 유효성 검증
		if (isInvalidPagination({ page, limit }, { maxLimit: 100 })) {
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
			'physicalDataType',
			'createdAt',
			'updatedAt'
		];
		const invalidSortField = findInvalidField(
			sortConfigs.map((config) => config.column),
			validSortFields
		);
		if (invalidSortField) {
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
			'physicalDataType'
		];
		if (findInvalidField([searchField], validSearchFields)) {
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
			// 정확히 일치 또는 부분 일치 검색 함수
			const matchFn = (value: string | undefined | null) => {
				if (!value) return false;
				const target = value.toLowerCase();
				return searchExact ? target === query : target.includes(query);
			};
			filteredEntries = domainData.entries.filter((entry) => {
				switch (searchField) {
					case 'domainGroup':
						return matchFn(entry.domainGroup);
					case 'domainCategory':
						return matchFn(entry.domainCategory);
					case 'standardDomainName':
						return matchFn(entry.standardDomainName);
					case 'physicalDataType':
						return matchFn(entry.physicalDataType);
					case 'all':
					default:
						return (
							matchFn(entry.domainGroup) ||
							matchFn(entry.domainCategory) ||
							matchFn(entry.standardDomainName) ||
							matchFn(entry.physicalDataType) ||
							matchFn(entry.dataValue) ||
							matchFn(entry.measurementUnit) ||
							matchFn(entry.remarks)
						);
				}
			});
		}

		// 컬럼 필터 적용
		if (Object.keys(columnFilters).length > 0) {
			filteredEntries = filteredEntries.filter((entry) => {
				return Object.entries(columnFilters).every(([columnKey, filterValue]) => {
					const entryValue = entry[columnKey as keyof DomainEntry];
					// "(빈값)" 필터 처리
					if (filterValue === '(빈값)') {
						return entryValue === null || entryValue === undefined || entryValue === '';
					}
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

		const pagination = paginateEntries(filteredEntries, { page, limit });

		const responseData = {
			entries: pagination.entries,
			pagination: {
				currentPage: page,
				totalPages: pagination.totalPages,
				totalCount: pagination.totalCount,
				limit,
				hasNextPage: pagination.hasNextPage,
				hasPrevPage: pagination.hasPrevPage
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
						physicalDataTypes: {},
						summary: {
							uniqueGroups: 0,
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
		const physicalDataTypeStats = new Map<string, number>();

		domainData.entries.forEach((entry) => {
			// 도메인 그룹별 카운트
			groupStats.set(entry.domainGroup, (groupStats.get(entry.domainGroup) || 0) + 1);

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
			physicalDataTypes: Object.fromEntries(physicalDataTypeStats),
			summary: {
				uniqueGroups: groupStats.size,
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
		const applyCascade = body.applyCascade !== false;
		const entryData = body;

		// 필수 필드 검증 (standardDomainName은 자동 생성되므로 제외)
		const missingFields = getMissingRequiredFields(entryData, [
			'domainGroup',
			'domainCategory',
			'physicalDataType'
		]);

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
		const dataTypeMappingData = await loadDomainDataTypeMappingData();
		const generatedDomainName = generateStandardDomainName(
			entryData.domainCategory,
			entryData.physicalDataType,
			entryData.dataLength,
			entryData.decimalPlaces,
			dataTypeMappingData.entries
		);

		// 기존 데이터 로드 (선택된 파일 기준)
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

		// 선택된 파일 내에서만 도메인명 유일성 검사
		try {
			const validationError = validateDomainNameUniqueness(generatedDomainName, domainData.entries);
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
			measurementUnit: entryData.measurementUnit || undefined,
			revision: entryData.revision || undefined,
			description: entryData.description || undefined,
			storageFormat: entryData.storageFormat || undefined,
			displayFormat: entryData.displayFormat || undefined,
			allowedValues: entryData.allowedValues || undefined,
			createdAt: now,
			updatedAt: now
		};

		if (!applyCascade) {
			domainData.entries.push(newEntry);
			domainData.totalCount = domainData.entries.length;
			domainData.lastUpdated = now;
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
		}

		const plan = await planCascadeUpdate({
			type: 'domain',
			filename,
			proposedEntry: newEntry
		});

		if (plan.blocked) {
			return json(
				{
					success: false,
					error:
						plan.preview.conflicts[0]?.reason ||
						'영향도 충돌이 있어 자동 반영 저장을 진행할 수 없습니다.',
					data: {
						preview: plan.preview
					},
					message: 'Cascade update blocked'
				},
				{ status: 409 }
			);
		}

		const applied = await applyCascadePlan(plan);

		return json(
			{
				success: true,
				data: applied.sourceEntry,
				impact: applied.preview,
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
		const applyCascade = body.applyCascade !== false;
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

		const dataTypeMappingData = await loadDomainDataTypeMappingData();
		const generatedDomainName = generateStandardDomainName(
			finalDomainCategory,
			finalPhysicalDataType,
			finalDataLength,
			finalDecimalPlaces,
			dataTypeMappingData.entries
		);

		// 도메인명이 변경되는 경우 유일성 validation (선택된 파일 기준)
		if (generatedDomainName !== existingEntry.standardDomainName) {
			try {
				// 현재 선택된 파일 내 엔트리만 사용 (자기 자신은 제외)
				const allDomainEntries: DomainEntry[] = domainData.entries.filter((e) => e.id !== id);

				// 도메인명 유일성 validation (선택된 파일 기준)
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
		}

		const nextEntry: DomainEntry = {
			...safeMerge(domainData.entries[entryIndex], updateFields),
			standardDomainName: generatedDomainName,
			updatedAt: new Date().toISOString()
		};

		if (!applyCascade) {
			domainData.entries[entryIndex] = nextEntry;
			await saveDomainData(domainData, filename);
			invalidateCache('domain', filename);

			return json({ success: true, data: nextEntry, message: '도메인 수정 완료' }, { status: 200 });
		}

		const plan = await planCascadeUpdate({
			type: 'domain',
			filename,
			currentEntry: existingEntry,
			proposedEntry: nextEntry
		});

		if (plan.blocked) {
			return json(
				{
					success: false,
					error:
						plan.preview.conflicts[0]?.reason ||
						'영향도 충돌이 있어 자동 반영 저장을 진행할 수 없습니다.',
					data: {
						preview: plan.preview
					},
					message: 'Cascade update blocked'
				},
				{ status: 409 }
			);
		}

		const applied = await applyCascadePlan(plan);

		return json(
			{
				success: true,
				data: applied.sourceEntry,
				impact: applied.preview,
				message: '도메인 수정 완료'
			},
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

		let warnings: unknown[] = [];
		if (!force) {
			try {
				const refCheck = await checkEntryReferences('domain', entryToDelete, filename);
				warnings = extractReferenceWarnings(refCheck);
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
