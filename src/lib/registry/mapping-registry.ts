/**
 * 매핑 레지스트리
 * 데이터 타입 간 매핑 관계를 중앙에서 관리합니다.
 * static/data/registry.json 파일에 저장되며,
 * 참조 무결성 검사, 관련 데이터 조회, 파일 이름변경/삭제 시 매핑 동기화를 담당합니다.
 */

import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { DataType, ReferenceCheckResult } from '$lib/types/base';
import { DEFAULT_FILENAMES, DATA_TYPE_LABELS } from '$lib/types/base';
import type {
	MappingRelation,
	MappingRegistryData,
	RelatedMapping,
	MappingGraph
} from '$lib/types/registry';
import { DEFAULT_MAPPING_RELATIONS } from '$lib/types/registry';
import { safeWriteFile, safeReadFile } from '$lib/utils/file-lock';

// ============================================================================
// 레지스트리 파일 경로
// ============================================================================

const DATA_DIR = process.env.DATA_PATH || 'static/data';
const REGISTRY_FILENAME = 'registry.json';

function getRegistryPath(): string {
	return resolve(join(DATA_DIR, REGISTRY_FILENAME));
}

// ============================================================================
// 메모리 캐시
// ============================================================================

let registryCache: MappingRegistryData | null = null;
let registryCacheTimestamp = 0;
const REGISTRY_CACHE_TTL = 60000; // 1분

function isCacheValid(): boolean {
	return registryCache !== null && Date.now() - registryCacheTimestamp < REGISTRY_CACHE_TTL;
}

function invalidateRegistryCache(): void {
	registryCache = null;
	registryCacheTimestamp = 0;
}

// ============================================================================
// 레지스트리 로드/저장
// ============================================================================

/**
 * 매핑 레지스트리 로드
 * 파일이 없으면 기본 매핑 관계로 초기화합니다.
 */
export async function loadRegistry(): Promise<MappingRegistryData> {
	if (isCacheValid()) {
		return registryCache!;
	}

	const registryPath = getRegistryPath();

	try {
		const content = await safeReadFile(registryPath);

		if (!content || !content.trim()) {
			// 파일이 없으면 기본 매핑으로 초기화
			const defaultRegistry = createDefaultRegistry();
			await saveRegistry(defaultRegistry);
			return defaultRegistry;
		}

		const data = JSON.parse(content) as MappingRegistryData;

		// 캐시 갱신
		registryCache = data;
		registryCacheTimestamp = Date.now();

		return data;
	} catch (error) {
		console.error('매핑 레지스트리 로드 실패:', error);
		// 실패 시 기본 매핑으로 초기화
		const defaultRegistry = createDefaultRegistry();
		try {
			await saveRegistry(defaultRegistry);
		} catch (saveError) {
			console.error('기본 레지스트리 저장 실패:', saveError);
		}
		return defaultRegistry;
	}
}

/**
 * 매핑 레지스트리 저장
 */
export async function saveRegistry(data: MappingRegistryData): Promise<void> {
	const registryPath = getRegistryPath();

	try {
		const jsonData = JSON.stringify(data, null, 2);
		await safeWriteFile(registryPath, jsonData);

		// 캐시 갱신
		registryCache = data;
		registryCacheTimestamp = Date.now();
	} catch (error) {
		console.error('매핑 레지스트리 저장 실패:', error);
		throw new Error(
			`레지스트리 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 기본 레지스트리 생성
 */
function createDefaultRegistry(): MappingRegistryData {
	const now = new Date().toISOString();
	const relations: MappingRelation[] = DEFAULT_MAPPING_RELATIONS.map((rel) => ({
		...rel,
		id: uuidv4(),
		createdAt: now
	}));

	return {
		version: '1.0',
		relations,
		lastUpdated: now
	};
}

// ============================================================================
// 매핑 조회
// ============================================================================

/**
 * 특정 데이터 타입에 관련된 모든 매핑 조회
 */
export async function getMappingsFor(
	type: DataType,
	filename?: string
): Promise<RelatedMapping[]> {
	const registry = await loadRegistry();
	const result: RelatedMapping[] = [];

	for (const relation of registry.relations) {
		const matchSource =
			relation.sourceType === type &&
			(!filename || relation.sourceFilename === filename);
		const matchTarget =
			relation.targetType === type &&
			(!filename || relation.targetFilename === filename);

		if (matchSource) {
			result.push({
				relation,
				role: 'source',
				relatedType: relation.targetType,
				relatedFilename: relation.targetFilename
			});
		}

		if (matchTarget) {
			result.push({
				relation,
				role: 'target',
				relatedType: relation.sourceType,
				relatedFilename: relation.sourceFilename
			});
		}
	}

	return result;
}

/**
 * 두 타입 간 매핑 관계 조회
 */
export async function getMappingBetween(
	sourceType: DataType,
	targetType: DataType
): Promise<MappingRelation[]> {
	const registry = await loadRegistry();
	return registry.relations.filter(
		(r) =>
			(r.sourceType === sourceType && r.targetType === targetType) ||
			(r.sourceType === targetType && r.targetType === sourceType)
	);
}

/**
 * 매핑 관계 그래프 조회 (1-hop, 2-hop)
 */
export async function getMappingGraph(
	type: DataType,
	filename: string
): Promise<MappingGraph> {
	const directMappings = await getMappingsFor(type, filename);

	// 2-hop: 직접 연결된 타입들의 매핑도 조회
	const indirectMappings: RelatedMapping[] = [];
	const directTypes = new Set<string>();

	for (const dm of directMappings) {
		directTypes.add(`${dm.relatedType}:${dm.relatedFilename}`);
	}

	for (const dm of directMappings) {
		const secondHop = await getMappingsFor(dm.relatedType, dm.relatedFilename);
		for (const sm of secondHop) {
			const key = `${sm.relatedType}:${sm.relatedFilename}`;
			// 자기 자신이나 이미 직접 연결된 것은 제외
			if (
				sm.relatedType !== type &&
				!directTypes.has(key)
			) {
				indirectMappings.push(sm);
			}
		}
	}

	return {
		centerType: type,
		centerFilename: filename,
		directMappings,
		indirectMappings
	};
}

// ============================================================================
// 매핑 CRUD
// ============================================================================

/**
 * 매핑 관계 추가
 */
export async function addMapping(
	relation: Omit<MappingRelation, 'id' | 'createdAt'>
): Promise<MappingRelation> {
	const registry = await loadRegistry();
	const now = new Date().toISOString();

	const newRelation: MappingRelation = {
		...relation,
		id: uuidv4(),
		createdAt: now
	};

	registry.relations.push(newRelation);
	registry.lastUpdated = now;

	await saveRegistry(registry);
	return newRelation;
}

/**
 * 매핑 관계 수정
 */
export async function updateMapping(
	id: string,
	updates: Partial<Omit<MappingRelation, 'id' | 'createdAt'>>
): Promise<void> {
	const registry = await loadRegistry();
	const index = registry.relations.findIndex((r) => r.id === id);

	if (index === -1) {
		throw new Error(`매핑 관계를 찾을 수 없습니다: ${id}`);
	}

	const now = new Date().toISOString();
	registry.relations[index] = {
		...registry.relations[index],
		...updates,
		updatedAt: now
	};
	registry.lastUpdated = now;

	await saveRegistry(registry);
}

/**
 * 매핑 관계 삭제
 */
export async function removeMapping(id: string): Promise<void> {
	const registry = await loadRegistry();
	const filteredRelations = registry.relations.filter((r) => r.id !== id);

	if (filteredRelations.length === registry.relations.length) {
		throw new Error(`매핑 관계를 찾을 수 없습니다: ${id}`);
	}

	registry.relations = filteredRelations;
	registry.lastUpdated = new Date().toISOString();

	await saveRegistry(registry);
}

// ============================================================================
// 매핑 동기화 (파일 이름변경/삭제 시)
// ============================================================================

/**
 * 파일 이름 변경 시 매핑 관계 자동 업데이트
 */
export async function syncMappingsOnRename(
	type: DataType,
	oldFilename: string,
	newFilename: string
): Promise<number> {
	const registry = await loadRegistry();
	let updated = 0;
	const now = new Date().toISOString();

	for (const relation of registry.relations) {
		if (relation.sourceType === type && relation.sourceFilename === oldFilename) {
			relation.sourceFilename = newFilename;
			relation.updatedAt = now;
			updated++;
		}
		if (relation.targetType === type && relation.targetFilename === oldFilename) {
			relation.targetFilename = newFilename;
			relation.updatedAt = now;
			updated++;
		}
	}

	if (updated > 0) {
		registry.lastUpdated = now;
		await saveRegistry(registry);
	}

	return updated;
}

/**
 * 파일 삭제 시 관련 매핑 관계 정리
 * 삭제된 파일을 참조하는 매핑은 기본 파일명으로 대체합니다.
 */
export async function cleanMappingsOnDelete(
	type: DataType,
	filename: string,
	fallbackFilename?: string
): Promise<number> {
	const { DEFAULT_FILENAMES } = await import('$lib/types/base');
	const registry = await loadRegistry();
	let updated = 0;
	const now = new Date().toISOString();
	const fallback = fallbackFilename || DEFAULT_FILENAMES[type];

	for (const relation of registry.relations) {
		if (relation.sourceType === type && relation.sourceFilename === filename) {
			relation.sourceFilename = fallback;
			relation.updatedAt = now;
			updated++;
		}
		if (relation.targetType === type && relation.targetFilename === filename) {
			relation.targetFilename = fallback;
			relation.updatedAt = now;
			updated++;
		}
	}

	if (updated > 0) {
		registry.lastUpdated = now;
		await saveRegistry(registry);
	}

	return updated;
}

// ============================================================================
// 참조 무결성 검사
// ============================================================================

/**
 * 특정 데이터 타입의 파일이 다른 곳에서 참조되는지 확인
 * 파일 삭제 전 호출하여 안전한 삭제 가능 여부를 판단합니다.
 */
export async function checkFileReferences(
	type: DataType,
	filename: string
): Promise<ReferenceCheckResult> {
	const mappings = await getMappingsFor(type, filename);
	const references: ReferenceCheckResult['references'] = [];

	// 이 파일이 source 또는 target으로 참조되는 매핑 관계 확인
	for (const mapping of mappings) {
		references.push({
			type: mapping.relatedType,
			filename: mapping.relatedFilename,
			count: 1,
			entries: [] // 상세 엔트리 정보는 필요 시 별도 로드
		});
	}

	if (references.length > 0) {
		return {
			canDelete: true, // 파일 레벨에서는 매핑만 갱신하면 삭제 가능
			references,
			message: `${references.length}개의 매핑 관계가 이 파일을 참조하고 있습니다. 삭제 시 기본 파일로 대체됩니다.`
		};
	}

	return { canDelete: true, references: [] };
}

/**
 * 매핑 레지스트리 캐시 무효화 (외부에서 호출 가능)
 */
export function invalidateMappingCache(): void {
	invalidateRegistryCache();
}

/**
 * 특정 데이터 타입과 관련된 모든 파일명 조회
 * (현재 매핑에 등록된 관련 파일명 목록)
 */
export async function getRelatedFilenames(
	type: DataType,
	filename: string
): Promise<Map<DataType, string>> {
	const mappings = await getMappingsFor(type, filename);
	const result = new Map<DataType, string>();

	for (const mapping of mappings) {
		// 같은 타입에 여러 매핑이 있을 수 있으므로 첫 번째만 저장
		if (!result.has(mapping.relatedType)) {
			result.set(mapping.relatedType, mapping.relatedFilename);
		}
	}

	return result;
}

// ============================================================================
// 3단계 폴백 매핑 해석
// ============================================================================

/**
 * DEFAULT_MAPPING_RELATIONS에서 해당 타입과 관계가 정의된 타입 목록 반환 (동기, I/O 없음)
 */
export function getKnownRelatedTypes(type: DataType): DataType[] {
	const related = new Set<DataType>();
	for (const rel of DEFAULT_MAPPING_RELATIONS) {
		if (rel.sourceType === type) related.add(rel.targetType);
		if (rel.targetType === type) related.add(rel.sourceType);
	}
	return Array.from(related);
}

/**
 * 3단계 폴백 전략으로 관련 파일명 해석
 * Tier 1: 레지스트리 (registry.json)
 * Tier 2: 파일 내 mapping 필드 (fileMappingOverride)
 * Tier 3: DEFAULT_FILENAMES에서 알려진 관계 타입만 채움
 */
export async function resolveRelatedFilenames(
	type: DataType,
	filename: string,
	fileMappingOverride?: Partial<Record<DataType, string>>
): Promise<Map<DataType, string>> {
	// Tier 1: 레지스트리에서 조회
	const result = await getRelatedFilenames(type, filename);

	// 알려진 관계 타입 목록
	const knownTypes = getKnownRelatedTypes(type);

	// Tier 2: fileMappingOverride로 빈 슬롯 채우기
	if (fileMappingOverride) {
		for (const relatedType of knownTypes) {
			if (!result.has(relatedType) && fileMappingOverride[relatedType]) {
				result.set(relatedType, fileMappingOverride[relatedType]!);
			}
		}
	}

	// Tier 3: DEFAULT_FILENAMES로 나머지 빈 슬롯 채우기
	for (const relatedType of knownTypes) {
		if (!result.has(relatedType)) {
			result.set(relatedType, DEFAULT_FILENAMES[relatedType]);
		}
	}

	return result;
}

// ============================================================================
// 엔트리 레벨 참조 검사
// ============================================================================

/**
 * 엔트리 레벨 참조 검사 규칙 정의
 */
interface EntryReferenceChecker {
	sourceType: DataType;
	targetType: DataType;
	check: (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		entry: any,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		targetEntries: any[]
	) => { count: number; entries: Array<{ id: string; name: string }> };
}

const ENTRY_REFERENCE_CHECKERS: EntryReferenceChecker[] = [
	// vocabulary → term: term.termName/columnName 파트에 standardName/abbreviation 포함 여부
	{
		sourceType: 'vocabulary',
		targetType: 'term',
		check: (vocabEntry, termEntries) => {
			const standardNameLower = vocabEntry.standardName?.toLowerCase() || '';
			const abbreviationLower = vocabEntry.abbreviation?.toLowerCase() || '';

			const refs = termEntries.filter((term) => {
				const termParts = (term.termName || '').toLowerCase().split('_');
				const hasTermNameRef = termParts.some(
					(part: string) => part === standardNameLower || part === abbreviationLower
				);
				const columnParts = (term.columnName || '').toLowerCase().split('_');
				const hasColumnRef = columnParts.some(
					(part: string) => part === standardNameLower || part === abbreviationLower
				);
				return hasTermNameRef || hasColumnRef;
			});

			return {
				count: refs.length,
				entries: refs.slice(0, 5).map((t: { id: string; termName: string }) => ({
					id: t.id,
					name: t.termName
				}))
			};
		}
	},
	// domain → vocabulary: vocabulary.domainCategory === domain.domainCategory
	{
		sourceType: 'domain',
		targetType: 'vocabulary',
		check: (domainEntry, vocabEntries) => {
			const domainCategoryLower = domainEntry.domainCategory?.toLowerCase() || '';

			const refs = vocabEntries.filter(
				(vocab) =>
					vocab.isDomainCategoryMapped &&
					vocab.domainCategory?.toLowerCase() === domainCategoryLower
			);

			return {
				count: refs.length,
				entries: refs
					.slice(0, 5)
					.map((v: { id: string; standardName: string }) => ({
						id: v.id,
						name: v.standardName
					}))
			};
		}
	},
	// domain → term: term.domainName === domain.standardDomainName
	{
		sourceType: 'domain',
		targetType: 'term',
		check: (domainEntry, termEntries) => {
			const domainNameLower = domainEntry.standardDomainName?.toLowerCase() || '';

			const refs = termEntries.filter(
				(term) => (term.domainName || '').toLowerCase() === domainNameLower
			);

			return {
				count: refs.length,
				entries: refs.slice(0, 5).map((t: { id: string; termName: string }) => ({
					id: t.id,
					name: t.termName
				}))
			};
		}
	}
];

/**
 * 제네릭 엔트리 레벨 참조 검사
 * checkVocabularyReferences / checkDomainReferences를 대체합니다.
 */
export async function checkEntryReferences(
	type: DataType,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	entry: any,
	filename?: string
): Promise<ReferenceCheckResult> {
	const { loadData } = await import('./data-registry');

	// 해당 타입에 대한 체커 필터링
	const checkers = ENTRY_REFERENCE_CHECKERS.filter((c) => c.sourceType === type);

	if (checkers.length === 0) {
		return { canDelete: true, references: [] };
	}

	// 관련 파일명 해석
	const relatedFilenames = await resolveRelatedFilenames(
		type,
		filename || DEFAULT_FILENAMES[type]
	);

	const references: ReferenceCheckResult['references'] = [];

	for (const checker of checkers) {
		const targetFilename = relatedFilenames.get(checker.targetType) || DEFAULT_FILENAMES[checker.targetType];

		try {
			const targetData = await loadData(checker.targetType, targetFilename);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const targetEntries = (targetData as any).entries || [];
			const result = checker.check(entry, targetEntries);

			if (result.count > 0) {
				references.push({
					type: checker.targetType,
					filename: targetFilename,
					count: result.count,
					entries: result.entries
				});
			}
		} catch (error) {
			console.warn(
				`[참조 검사] ${DATA_TYPE_LABELS[checker.targetType]} 데이터 로드 실패:`,
				error
			);
		}
	}

	if (references.length > 0) {
		const totalCount = references.reduce((sum, ref) => sum + ref.count, 0);
		return {
			canDelete: false,
			references,
			message: `${totalCount}개의 항목에서 이 ${DATA_TYPE_LABELS[type]}을(를) 참조하고 있습니다.`
		};
	}

	return { canDelete: true, references: [] };
}
