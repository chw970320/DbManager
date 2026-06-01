import type { DataType } from './base.js';

export type SharedFileMappingBundle = Record<DataType, string>;
export type SharedFileMappingRegistryVersion = '1.0' | '2.0';

export interface SharedFileMappingBundleEntry {
	id: string;
	name: string;
	files: SharedFileMappingBundle;
	createdAt: string;
	updatedAt: string;
}

export interface SharedFileMappingRegistryData {
	version: SharedFileMappingRegistryVersion;
	bundles: SharedFileMappingBundleEntry[];
	lastUpdated: string;
}
