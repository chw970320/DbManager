// @ts-check

import { randomUUID } from 'crypto';
import { mkdir, readdir, rm, writeFile } from 'fs/promises';
import { join, resolve } from 'path';

/**
 * @typedef {'vocabulary' | 'domain' | 'term' | 'database' | 'entity' | 'attribute' | 'table' | 'column'} ResetDataType
 */

/**
 * @typedef {'1:1' | '1:N' | 'N:1' | 'N:N'} MappingCardinality
 */

/**
 * @typedef {{
 *   sourceType: ResetDataType;
 *   sourceFilename: string;
 *   targetType: ResetDataType;
 *   targetFilename: string;
 *   mappingKey: string;
 *   cardinality: MappingCardinality;
 *   description: string;
 * }} MappingRelationSeed
 */

/**
 * @typedef {{
 *   dataDir?: string;
 *   timestamp?: string;
 * }} ResetTestDataOptions
 */

/**
 * @typedef {{
 *   dataDir: string;
 *   removedFiles: string[];
 *   rewrittenFiles: string[];
 *   registryPath: string;
 *   sharedFileMappingsPath: string;
 * }} ResetTestDataResult
 */

/** @type {ResetDataType[]} */
export const RESET_DATA_TYPES = [
	'vocabulary',
	'domain',
	'term',
	'database',
	'entity',
	'attribute',
	'table',
	'column'
];

/** @type {Record<ResetDataType, string>} */
export const DEFAULT_FILENAMES = {
	vocabulary: 'vocabulary.json',
	domain: 'domain.json',
	term: 'term.json',
	database: 'database.json',
	entity: 'entity.json',
	attribute: 'attribute.json',
	table: 'table.json',
	column: 'column.json'
};

/** @type {MappingRelationSeed[]} */
export const DEFAULT_MAPPING_RELATIONS = [
	{
		sourceType: 'vocabulary',
		sourceFilename: 'vocabulary.json',
		targetType: 'domain',
		targetFilename: 'domain.json',
		mappingKey: 'domainCategory',
		cardinality: 'N:1',
		description: '단어집 → 도메인 분류 매핑 (단어의 도메인분류명이 도메인에 존재하는지)'
	},
	{
		sourceType: 'term',
		sourceFilename: 'term.json',
		targetType: 'vocabulary',
		targetFilename: 'vocabulary.json',
		mappingKey: 'termName_parts→standardName',
		cardinality: 'N:N',
		description: '용어집 → 단어집 매핑 (용어명의 각 부분이 단어집에 등록되어 있는지)'
	},
	{
		sourceType: 'term',
		sourceFilename: 'term.json',
		targetType: 'domain',
		targetFilename: 'domain.json',
		mappingKey: 'domainName→standardDomainName',
		cardinality: 'N:1',
		description: '용어집 → 도메인 매핑 (용어의 도메인명이 도메인에 존재하는지)'
	},
	{
		sourceType: 'database',
		sourceFilename: 'database.json',
		targetType: 'entity',
		targetFilename: 'entity.json',
		mappingKey: 'logicalDbName',
		cardinality: '1:N',
		description: 'DB → 엔터티 매핑 (논리DB명 기반)'
	},
	{
		sourceType: 'entity',
		sourceFilename: 'entity.json',
		targetType: 'attribute',
		targetFilename: 'attribute.json',
		mappingKey: 'schemaName+entityName',
		cardinality: '1:N',
		description: '엔터티 → 속성 매핑 (스키마명+엔터티명 기반)'
	},
	{
		sourceType: 'database',
		sourceFilename: 'database.json',
		targetType: 'table',
		targetFilename: 'table.json',
		mappingKey: 'physicalDbName',
		cardinality: '1:N',
		description: 'DB → 테이블 매핑 (물리DB명 기반)'
	},
	{
		sourceType: 'table',
		sourceFilename: 'table.json',
		targetType: 'column',
		targetFilename: 'column.json',
		mappingKey: 'schemaName+tableEnglishName',
		cardinality: '1:N',
		description: '테이블 → 컬럼 매핑 (스키마명+테이블영문명 기반)'
	},
	{
		sourceType: 'table',
		sourceFilename: 'table.json',
		targetType: 'entity',
		targetFilename: 'entity.json',
		mappingKey: 'relatedEntityName→entityName',
		cardinality: 'N:1',
		description: '테이블 → 엔터티 매핑 (관련엔터티명 기반, 논리-물리 연결)'
	},
	{
		sourceType: 'attribute',
		sourceFilename: 'attribute.json',
		targetType: 'column',
		targetFilename: 'column.json',
		mappingKey: 'schemaName+entityName+attributeName',
		cardinality: '1:1',
		description: '속성 → 컬럼 매핑 (논리-물리 연결)'
	},
	{
		sourceType: 'column',
		sourceFilename: 'column.json',
		targetType: 'term',
		targetFilename: 'term.json',
		mappingKey: 'columnEnglishName→columnName',
		cardinality: 'N:1',
		description: '컬럼 → 용어 매핑 (컬럼영문명과 용어 컬럼명 일치)'
	},
	{
		sourceType: 'column',
		sourceFilename: 'column.json',
		targetType: 'domain',
		targetFilename: 'domain.json',
		mappingKey: 'domainName→standardDomainName',
		cardinality: 'N:1',
		description: '컬럼 → 도메인 매핑 (domainName 직접 매핑, 접미사 기반은 하위 호환 fallback)'
	}
];

const REGISTRY_FILENAME = 'registry.json';
const SETTINGS_DIRNAME = 'settings';
const SHARED_FILE_MAPPINGS_FILENAME = 'shared-file-mappings.json';
const DESIGN_SNAPSHOTS_FILENAME = 'design-snapshots.json';

/**
 * @param {string} timestamp
 */
export function createEmptyData(timestamp) {
	return {
		entries: [],
		lastUpdated: timestamp,
		totalCount: 0
	};
}

/**
 * @param {string} timestamp
 */
export function createDefaultRegistry(timestamp) {
	return {
		version: '1.0',
		relations: DEFAULT_MAPPING_RELATIONS.map((relation) => ({
			...relation,
			id: randomUUID(),
			createdAt: timestamp
		})),
		lastUpdated: timestamp
	};
}

/**
 * @param {string} timestamp
 */
export function createDefaultSharedFileMappings(timestamp) {
	return {
		version: '1.0',
		bundles: [
			{
				id: 'default-shared-file-mapping',
				files: { ...DEFAULT_FILENAMES },
				createdAt: timestamp,
				updatedAt: timestamp
			}
		],
		lastUpdated: timestamp
	};
}

/**
 * @param {string} filePath
 * @param {unknown} value
 */
async function writeJson(filePath, value) {
	await writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

/**
 * 테스트용 데이터 저장소를 기본 상태로 되돌립니다.
 *
 * - 8개 데이터 디렉터리의 JSON 파일을 모두 제거한 뒤 시스템 기본 파일만 빈 데이터로 다시 생성합니다.
 * - registry/shared-file-mappings 정본도 기본 상태로 다시 씁니다.
 * - 도메인 데이터타입 매핑 같은 비대상 설정 파일은 유지합니다.
 *
 * @param {ResetTestDataOptions} [options]
 * @returns {Promise<ResetTestDataResult>}
 */
export async function resetTestData(options = {}) {
	const dataDir = resolve(options.dataDir ?? process.env.DATA_PATH ?? 'static/data');
	const timestamp = options.timestamp ?? new Date().toISOString();
	const removedFiles = [];
	const rewrittenFiles = [];

	await mkdir(dataDir, { recursive: true });

	for (const type of RESET_DATA_TYPES) {
		const typeDir = join(dataDir, type);
		await mkdir(typeDir, { recursive: true });

		const files = await readdir(typeDir);
		for (const file of files) {
			if (!file.endsWith('.json')) {
				continue;
			}

			const filePath = join(typeDir, file);
			await rm(filePath, { force: true });
			removedFiles.push(filePath);
		}

		const defaultFilePath = join(typeDir, DEFAULT_FILENAMES[type]);
		await writeJson(defaultFilePath, createEmptyData(timestamp));
		rewrittenFiles.push(defaultFilePath);
	}

	const registryPath = join(dataDir, REGISTRY_FILENAME);
	await writeJson(registryPath, createDefaultRegistry(timestamp));

	const settingsDir = join(dataDir, SETTINGS_DIRNAME);
	await mkdir(settingsDir, { recursive: true });

	const sharedFileMappingsPath = join(settingsDir, SHARED_FILE_MAPPINGS_FILENAME);
	await writeJson(sharedFileMappingsPath, createDefaultSharedFileMappings(timestamp));

	const designSnapshotsPath = join(settingsDir, DESIGN_SNAPSHOTS_FILENAME);
	await writeJson(designSnapshotsPath, createEmptyData(timestamp));

	return {
		dataDir,
		removedFiles,
		rewrittenFiles,
		registryPath,
		sharedFileMappingsPath
	};
}
