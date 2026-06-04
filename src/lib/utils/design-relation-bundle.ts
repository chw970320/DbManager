import { ALL_DATA_TYPES, DEFAULT_FILENAMES, type DataType } from '$lib/types/base.js';
import type { SharedFileMappingBundle } from '$lib/types/shared-file-mapping.js';
import { resolveSharedFileMappingBundle } from '$lib/registry/shared-file-mapping-registry.js';

export type DesignRelationFileBundle = SharedFileMappingBundle;
export type DesignRelationFileBundleSource = 'explicit' | 'shared-bundle' | 'default' | 'missing';

export type ResolveDesignRelationFileBundleInput = Partial<Record<`${DataType}File`, string>> & {
	scopeType?: DataType | null;
	scopeFile?: string | null;
	requireStandardReferences?: boolean;
};

export interface ResolvedDesignRelationFileBundle {
	bundle: Partial<Record<DataType, string>>;
	sources: Record<DataType, DesignRelationFileBundleSource>;
	missingStandardFiles: DataType[];
	toCompleteBundle(): DesignRelationFileBundle;
}

export class DesignRelationBundleError extends Error {
	status = 400;
	missingStandardFiles: DataType[];
	missingFiles: DataType[];

	constructor(
		message: string,
		missingStandardFiles: DataType[] = [],
		missingFiles = missingStandardFiles
	) {
		super(message);
		this.name = 'DesignRelationBundleError';
		this.missingStandardFiles = missingStandardFiles;
		this.missingFiles = missingFiles;
	}
}

const STANDARD_REFERENCE_TYPES: DataType[] = ['vocabulary', 'domain', 'term'];

function fileKey(type: DataType): `${DataType}File` {
	return `${type}File` as `${DataType}File`;
}

function clean(value: string | null | undefined): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isNonDefaultFile(type: DataType, file: string): boolean {
	return file !== DEFAULT_FILENAMES[type];
}

function firstNonDefaultExplicitScope(
	input: ResolveDesignRelationFileBundleInput
): { type: DataType; file: string } | null {
	if (input.scopeType && input.scopeFile && clean(input.scopeFile)) {
		const file = clean(input.scopeFile)!;
		if (isNonDefaultFile(input.scopeType, file)) return { type: input.scopeType, file };
	}
	for (const type of ALL_DATA_TYPES) {
		const explicit = clean(input[fileKey(type)]);
		if (explicit && isNonDefaultFile(type, explicit)) return { type, file: explicit };
	}
	return null;
}

function firstExplicitScope(
	input: ResolveDesignRelationFileBundleInput
): { type: DataType; file: string } | null {
	if (input.scopeType && input.scopeFile && clean(input.scopeFile)) {
		const file = clean(input.scopeFile)!;
		if (isNonDefaultFile(input.scopeType, file)) return { type: input.scopeType, file };
	}
	const firstNonDefault = firstNonDefaultExplicitScope(input);
	if (firstNonDefault) return firstNonDefault;
	if (input.scopeType && input.scopeFile && clean(input.scopeFile)) {
		return { type: input.scopeType, file: clean(input.scopeFile)! };
	}
	for (const type of ALL_DATA_TYPES) {
		const explicit = clean(input[fileKey(type)]);
		if (explicit) return { type, file: explicit };
	}
	return null;
}

function explicitFileBundle(
	input: ResolveDesignRelationFileBundleInput
): Partial<Record<DataType, string>> {
	return Object.fromEntries(
		ALL_DATA_TYPES.flatMap((type) => {
			const explicit = clean(input[fileKey(type)]);
			return explicit ? [[type, explicit]] : [];
		})
	) as Partial<Record<DataType, string>>;
}

export async function resolveDesignRelationFileBundle(
	input: ResolveDesignRelationFileBundleInput = {}
): Promise<ResolvedDesignRelationFileBundle> {
	const explicitFiles = explicitFileBundle(input);
	const hasCompleteExplicitBundle = ALL_DATA_TYPES.every((type) => explicitFiles[type]);
	const nonDefaultExplicitScope = firstNonDefaultExplicitScope(input);
	const scope = firstExplicitScope(input);
	const shared = scope ? await resolveSharedFileMappingBundle(scope.type, scope.file) : null;
	if (nonDefaultExplicitScope && !shared && !hasCompleteExplicitBundle) {
		throw new DesignRelationBundleError(
			`공통 파일 매핑을 찾을 수 없습니다: ${nonDefaultExplicitScope.type}/${nonDefaultExplicitScope.file}. 8종 shared mapping bundle을 먼저 선택하거나 저장하세요.`
		);
	}

	const bundle: Partial<Record<DataType, string>> = {};
	const sources = {} as Record<DataType, DesignRelationFileBundleSource>;
	for (const type of ALL_DATA_TYPES) {
		const explicit = explicitFiles[type];
		if (explicit) {
			bundle[type] = explicit;
			sources[type] = 'explicit';
			continue;
		}
		if (shared?.[type]) {
			bundle[type] = shared[type];
			sources[type] = 'shared-bundle';
			continue;
		}
		if (!input.requireStandardReferences && !STANDARD_REFERENCE_TYPES.includes(type)) {
			bundle[type] = DEFAULT_FILENAMES[type];
			sources[type] = 'default';
			continue;
		}
		sources[type] = 'missing';
	}

	const missingStandardFiles = input.requireStandardReferences
		? STANDARD_REFERENCE_TYPES.filter((type) => !bundle[type])
		: [];
	const missingRequiredFiles = input.requireStandardReferences
		? ALL_DATA_TYPES.filter((type) => !bundle[type])
		: [];
	if (missingRequiredFiles.length > 0) {
		throw new DesignRelationBundleError(
			`정의서 관계 검증에 필요한 8종 파일이 누락되었습니다: ${missingRequiredFiles.join(', ')}. 각 *File 파라미터 또는 완전한 8종 shared mapping bundle을 지정하세요.`,
			missingStandardFiles,
			missingRequiredFiles
		);
	}

	return {
		bundle,
		sources,
		missingStandardFiles,
		toCompleteBundle() {
			const missing = ALL_DATA_TYPES.filter((type) => !bundle[type]);
			if (missing.length > 0) {
				throw new DesignRelationBundleError(
					`8종 shared mapping bundle이 불완전합니다: ${missing.join(', ')}`
				);
			}
			return Object.fromEntries(
				ALL_DATA_TYPES.map((type) => [type, bundle[type]!])
			) as DesignRelationFileBundle;
		}
	};
}
