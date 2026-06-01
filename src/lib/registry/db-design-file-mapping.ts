import { DEFAULT_FILENAMES } from '$lib/types/base';
import {
	buildDbDesignStoredMapping,
	createDbDesignMappingBundle,
	type DbDesignDefinitionType,
	type DbDesignMappingBundle,
	type DbDesignRelatedMapping
} from '$lib/utils/db-design-file-mapping';
import {
	resolveSharedFileMappingBundle,
	saveSharedFileMappingBundle
} from '$lib/registry/shared-file-mapping-registry';

function createPriorityMap(
	currentType: DbDesignDefinitionType
): Record<DbDesignDefinitionType, number> {
	const priorities = {} as Record<DbDesignDefinitionType, number>;

	for (const type of Object.keys(DEFAULT_FILENAMES) as DbDesignDefinitionType[]) {
		priorities[type] = type === currentType ? 100 : 0;
	}

	return priorities;
}

function applyBundleValues(
	bundle: DbDesignMappingBundle,
	priorities: Record<DbDesignDefinitionType, number>,
	mapping: DbDesignRelatedMapping,
	priority: number
): void {
	for (const [type, filename] of Object.entries(mapping) as Array<
		[DbDesignDefinitionType, string]
	>) {
		if (!filename?.trim()) continue;
		if (priority < priorities[type]) continue;

		bundle[type] = filename.trim();
		priorities[type] = priority;
	}
}

export async function resolveDbDesignFileMappingBundle(
	currentType: DbDesignDefinitionType,
	currentFilename: string,
	override?: DbDesignRelatedMapping
): Promise<DbDesignMappingBundle> {
	const sharedBundle = await resolveSharedFileMappingBundle(currentType, currentFilename);
	if (!sharedBundle && currentFilename !== DEFAULT_FILENAMES[currentType]) {
		throw new Error(
			`공통 파일 매핑을 찾을 수 없습니다: ${currentType}/${currentFilename}. v2 매핑 마이그레이션 결과를 확인하세요.`
		);
	}

	const bundle = sharedBundle ?? createDbDesignMappingBundle(currentType, currentFilename);
	if (override) {
		applyBundleValues(bundle, createPriorityMap(currentType), override, 95);
	}
	bundle[currentType] = currentFilename;

	return bundle;
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
