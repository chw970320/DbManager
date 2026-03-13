import {
	ALL_DATA_TYPES,
	DATA_TYPE_LABELS,
	DEFAULT_FILENAMES,
	type DataType,
	type SharedDataFileMapping
} from '$lib/types/base';

export const DB_DESIGN_DEFINITION_TYPES = [...ALL_DATA_TYPES] as const;

export type DbDesignDefinitionType = DataType;

export type DbDesignMappingBundle = Record<DbDesignDefinitionType, string>;
export type DbDesignRelatedMapping = SharedDataFileMapping;
export type DbDesignFileOptions = Partial<Record<DbDesignDefinitionType, string[]>>;

export const DB_DESIGN_DEFINITION_LABELS: Record<DbDesignDefinitionType, string> = {
	...DATA_TYPE_LABELS
};

export type DbDesignDefinitionCategory = 'standard-terms' | 'db-design';

export const DB_DESIGN_CATEGORY_LABELS: Record<DbDesignDefinitionCategory, string> = {
	'standard-terms': '표준 용어',
	'db-design': 'DB 설계'
};

export const DB_DESIGN_CATEGORY_DESCRIPTIONS: Record<DbDesignDefinitionCategory, string> = {
	'standard-terms': '단어집, 도메인, 용어 파일을 연결합니다.',
	'db-design': 'DB, 엔터티, 속성, 테이블, 컬럼 정의서를 연결합니다.'
};

export const DB_DESIGN_DEFINITION_CATEGORIES: Record<
	DbDesignDefinitionType,
	DbDesignDefinitionCategory
> = {
	vocabulary: 'standard-terms',
	domain: 'standard-terms',
	term: 'standard-terms',
	database: 'db-design',
	entity: 'db-design',
	attribute: 'db-design',
	table: 'db-design',
	column: 'db-design'
};

export interface DbDesignSelectableTypeGroup {
	key: DbDesignDefinitionCategory;
	label: string;
	description: string;
	types: DbDesignDefinitionType[];
}

export function isDbDesignDefinitionType(value: string): value is DbDesignDefinitionType {
	return ALL_DATA_TYPES.includes(value as DbDesignDefinitionType);
}

export function createDbDesignMappingBundle(
	currentType: DbDesignDefinitionType,
	currentFilename = DEFAULT_FILENAMES[currentType]
): DbDesignMappingBundle {
	const bundle = {} as DbDesignMappingBundle;

	for (const type of ALL_DATA_TYPES) {
		bundle[type] = type === currentType ? currentFilename : DEFAULT_FILENAMES[type];
	}

	return bundle;
}

export function createDbDesignRelatedMapping(
	currentType: DbDesignDefinitionType,
	currentFilename = DEFAULT_FILENAMES[currentType]
): DbDesignRelatedMapping {
	return buildDbDesignStoredMapping(
		currentType,
		createDbDesignMappingBundle(currentType, currentFilename)
	);
}

export function createEmptyDbDesignFileOptions(
	currentType: DbDesignDefinitionType
): DbDesignFileOptions {
	const options: DbDesignFileOptions = {};

	for (const type of ALL_DATA_TYPES) {
		if (type === currentType) continue;
		options[type] = [];
	}

	return options;
}

export function getDbDesignSelectableTypes(
	currentType: DbDesignDefinitionType
): DbDesignDefinitionType[] {
	return ALL_DATA_TYPES.filter((type) => type !== currentType);
}

export function getDbDesignSelectableTypeGroups(
	currentType: DbDesignDefinitionType
): DbDesignSelectableTypeGroup[] {
	const groups = new Map<DbDesignDefinitionCategory, DbDesignDefinitionType[]>();

	for (const type of getDbDesignSelectableTypes(currentType)) {
		const category = DB_DESIGN_DEFINITION_CATEGORIES[type];
		const types = groups.get(category) ?? [];
		types.push(type);
		groups.set(category, types);
	}

	return (Object.keys(DB_DESIGN_CATEGORY_LABELS) as DbDesignDefinitionCategory[])
		.map((key) => ({
			key,
			label: DB_DESIGN_CATEGORY_LABELS[key],
			description: DB_DESIGN_CATEGORY_DESCRIPTIONS[key],
			types: groups.get(key) ?? []
		}))
		.filter((group) => group.types.length > 0);
}

export function extractDbDesignRelatedMapping(mapping?: Record<string, unknown>): DbDesignRelatedMapping {
	const result: DbDesignRelatedMapping = {};

	for (const type of ALL_DATA_TYPES) {
		const value = mapping?.[type];
		if (typeof value === 'string' && value.trim() !== '') {
			result[type] = value.trim();
		}
	}

	return result;
}

export function mergeDbDesignRelatedMapping(
	currentType: DbDesignDefinitionType,
	mapping?: Record<string, unknown>
): DbDesignRelatedMapping {
	return {
		...createDbDesignRelatedMapping(currentType),
		...extractDbDesignRelatedMapping(mapping)
	};
}

export function buildDbDesignStoredMapping(
	currentType: DbDesignDefinitionType,
	bundle: DbDesignMappingBundle
): DbDesignRelatedMapping {
	const mapping: DbDesignRelatedMapping = {};

	for (const type of ALL_DATA_TYPES) {
		if (type === currentType) continue;
		mapping[type] = bundle[type];
	}

	return mapping;
}
