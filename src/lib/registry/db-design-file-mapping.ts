import { ALL_DATA_TYPES, DEFAULT_FILENAMES, type DataType, type DataTypeMap } from '$lib/types/base';
import { loadData } from '$lib/registry/data-registry';
import {
	addMapping,
	getMappingBetween,
	removeMapping,
	resolveRelatedFilenames,
	updateMapping
} from '$lib/registry/mapping-registry';
import type { MappingCardinality } from '$lib/types/registry';
import {
	buildDbDesignStoredMapping,
	createDbDesignMappingBundle,
	extractDbDesignRelatedMapping,
	type DbDesignDefinitionType,
	type DbDesignMappingBundle,
	type DbDesignRelatedMapping
} from '$lib/utils/db-design-file-mapping';
import {
	resolveSharedFileMappingBundle,
	saveSharedFileMappingBundle
} from '$lib/registry/shared-file-mapping-registry';

type SharedRelationDefinition = {
	sourceType: DbDesignDefinitionType;
	targetType: DbDesignDefinitionType;
	mappingKey: string;
	cardinality: MappingCardinality;
	description: string;
};

const SHARED_MAPPING_RELATIONS: SharedRelationDefinition[] = [
	{
		sourceType: 'vocabulary',
		targetType: 'domain',
		mappingKey: 'domainCategory',
		cardinality: 'N:1',
		description: '단어집 → 도메인 분류 매핑'
	},
	{
		sourceType: 'term',
		targetType: 'vocabulary',
		mappingKey: 'termName_parts→standardName',
		cardinality: 'N:N',
		description: '용어집 → 단어집 매핑'
	},
	{
		sourceType: 'term',
		targetType: 'domain',
		mappingKey: 'domainName→standardDomainName',
		cardinality: 'N:1',
		description: '용어집 → 도메인 매핑'
	},
	{
		sourceType: 'database',
		targetType: 'entity',
		mappingKey: 'logicalDbName',
		cardinality: '1:N',
		description: 'DB → 엔터티 매핑'
	},
	{
		sourceType: 'database',
		targetType: 'table',
		mappingKey: 'physicalDbName',
		cardinality: '1:N',
		description: 'DB → 테이블 매핑'
	},
	{
		sourceType: 'entity',
		targetType: 'attribute',
		mappingKey: 'schemaName+entityName',
		cardinality: '1:N',
		description: '엔터티 → 속성 매핑'
	},
	{
		sourceType: 'table',
		targetType: 'entity',
		mappingKey: 'relatedEntityName→entityName',
		cardinality: 'N:1',
		description: '테이블 → 엔터티 매핑'
	},
	{
		sourceType: 'table',
		targetType: 'column',
		mappingKey: 'schemaName+tableEnglishName',
		cardinality: '1:N',
		description: '테이블 → 컬럼 매핑'
	},
	{
		sourceType: 'attribute',
		targetType: 'column',
		mappingKey: 'schemaName+entityName+attributeName',
		cardinality: '1:1',
		description: '속성 → 컬럼 매핑'
	},
	{
		sourceType: 'column',
		targetType: 'term',
		mappingKey: 'columnEnglishName→columnName',
		cardinality: 'N:1',
		description: '컬럼 → 용어 매핑'
	},
	{
		sourceType: 'column',
		targetType: 'domain',
		mappingKey: 'domainName→standardDomainName',
		cardinality: 'N:1',
		description: '컬럼 → 도메인 매핑'
	}
];

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRawMapping(data: DataTypeMap[DbDesignDefinitionType]): Record<string, unknown> {
	const mapping = (data as { mapping?: unknown }).mapping;
	return isObject(mapping) ? mapping : {};
}

function createPriorityMap(currentType: DbDesignDefinitionType): Record<DbDesignDefinitionType, number> {
	const priorities = {} as Record<DbDesignDefinitionType, number>;

	for (const type of ALL_DATA_TYPES) {
		priorities[type] = type === currentType ? 100 : 0;
	}

	return priorities;
}

function applyBundleValues(
	bundle: DbDesignMappingBundle,
	priorities: Record<DbDesignDefinitionType, number>,
	mapping: DbDesignRelatedMapping,
	priority: number
): DbDesignDefinitionType[] {
	const changedTypes: DbDesignDefinitionType[] = [];

	for (const [type, filename] of Object.entries(mapping) as Array<[DbDesignDefinitionType, string]>) {
		if (!filename?.trim()) continue;
		if (priority < priorities[type]) continue;

		const nextFilename = filename.trim();
		if (bundle[type] === nextFilename && priorities[type] === priority) {
			continue;
		}

		bundle[type] = nextFilename;
		priorities[type] = priority;
		changedTypes.push(type);
	}

	return changedTypes;
}

function toDiscoveredMapping(relatedFiles: Map<DataType, string>): DbDesignRelatedMapping {
	const discovered: DbDesignRelatedMapping = {};

	for (const [type, filename] of relatedFiles.entries()) {
		if (typeof filename === 'string' && filename.trim() !== '') {
			discovered[type] = filename.trim();
		}
	}

	return discovered;
}

export async function resolveDbDesignFileMappingBundle(
	currentType: DbDesignDefinitionType,
	currentFilename: string,
	override?: DbDesignRelatedMapping
): Promise<DbDesignMappingBundle> {
	const sharedBundle = await resolveSharedFileMappingBundle(currentType, currentFilename);
	if (sharedBundle) {
		if (!override) {
			return sharedBundle;
		}

		return {
			...sharedBundle,
			...override,
			[currentType]: currentFilename
		};
	}

	const bundle = createDbDesignMappingBundle(currentType, currentFilename);
	const priorities = createPriorityMap(currentType);
	const queue: DbDesignDefinitionType[] = [currentType];

	if (override) {
		for (const type of applyBundleValues(bundle, priorities, override, 95)) {
			if (type !== currentType) {
				queue.push(type);
			}
		}
	}

	const visited = new Set<string>();

	while (queue.length > 0) {
		const type = queue.shift()!;
		const filename = bundle[type];
		const visitKey = `${type}:${filename}`;
		if (visited.has(visitKey)) continue;
		visited.add(visitKey);

		let rawMapping: Record<string, unknown> = {};

		try {
			const data = await loadData(type, filename);
			rawMapping = readRawMapping(data);
			const explicitMapping = extractDbDesignRelatedMapping(rawMapping);
			const explicitPriority = type === currentType ? 90 : 80;

			for (const relatedType of applyBundleValues(bundle, priorities, explicitMapping, explicitPriority)) {
				if (relatedType !== type) {
					queue.push(relatedType);
				}
			}
		} catch (error) {
			console.warn(`[공통 파일 매핑] ${type}:${filename} 매핑 필드 해석 실패:`, error);
		}

		try {
			const relatedFiles = await resolveRelatedFilenames(
				type,
				filename,
				extractDbDesignRelatedMapping(rawMapping)
			);
			const relationPriority = type === currentType ? 85 : 75;

			for (const relatedType of applyBundleValues(
				bundle,
				priorities,
				toDiscoveredMapping(relatedFiles),
				relationPriority
			)) {
				if (relatedType !== type) {
					queue.push(relatedType);
				}
			}
		} catch (registryError) {
			console.warn(`[공통 파일 매핑] ${type}:${filename} 레지스트리 해석 실패:`, registryError);
		}
	}

	return bundle;
}

type UpsertRelationInput = {
	sourceType: DataType;
	sourceFilename: string;
	targetType: DataType;
	targetFilename: string;
	mappingKey: string;
	cardinality: MappingCardinality;
	description: string;
};

async function upsertMappingRelation(input: UpsertRelationInput): Promise<void> {
	const relations = await getMappingBetween(input.sourceType, input.targetType);
	const matchedByCanonicalSource = relations.filter(
		(relation) =>
			(relation.sourceType === input.sourceType &&
				relation.sourceFilename === input.sourceFilename) ||
			(relation.targetType === input.sourceType &&
				relation.targetFilename === input.sourceFilename)
	);

	if (matchedByCanonicalSource.length > 0) {
		const [primary, ...duplicates] = matchedByCanonicalSource;
		await updateMapping(primary.id, {
			sourceType: input.sourceType,
			sourceFilename: input.sourceFilename,
			targetType: input.targetType,
			targetFilename: input.targetFilename,
			mappingKey: input.mappingKey,
			cardinality: input.cardinality,
			description: input.description
		});

		for (const duplicate of duplicates) {
			await removeMapping(duplicate.id);
		}
		return;
	}

	await addMapping({
		sourceType: input.sourceType,
		sourceFilename: input.sourceFilename,
		targetType: input.targetType,
		targetFilename: input.targetFilename,
		mappingKey: input.mappingKey,
		cardinality: input.cardinality,
		description: input.description
	});
}

async function syncSharedMappingRelations(bundle: DbDesignMappingBundle): Promise<void> {
	for (const relation of SHARED_MAPPING_RELATIONS) {
		await upsertMappingRelation({
			...relation,
			sourceFilename: bundle[relation.sourceType],
			targetFilename: bundle[relation.targetType]
		});
	}
}

type SaveDbDesignFileMappingInput = {
	currentType: DbDesignDefinitionType;
	currentFilename: string;
	mapping: DbDesignRelatedMapping;
};

export async function saveDbDesignFileMappingBundle({
	currentType,
	currentFilename,
	mapping
}: SaveDbDesignFileMappingInput): Promise<{
	bundle: DbDesignMappingBundle;
	currentMapping: Record<string, string>;
}> {
	const bundle = createDbDesignMappingBundle(currentType, currentFilename);
	applyBundleValues(bundle, createPriorityMap(currentType), mapping, 95);
	await saveSharedFileMappingBundle(bundle);

	try {
		await syncSharedMappingRelations(bundle);
	} catch (registryError) {
		console.warn(
			'[듀얼 라이트] 공통 파일 매핑 레지스트리 갱신 실패 (공통 매핑 파일 저장은 완료):',
			registryError
		);
	}

	return {
		bundle,
		currentMapping: buildDbDesignStoredMapping(currentType, bundle)
	};
}

export function createDefaultDbDesignFileMapping(
	currentType: DbDesignDefinitionType
): DbDesignRelatedMapping {
	return buildDbDesignStoredMapping(
		currentType,
		createDbDesignMappingBundle(currentType, DEFAULT_FILENAMES[currentType])
	);
}
