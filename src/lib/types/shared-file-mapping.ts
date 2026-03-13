import type { DataType } from './base.js';

export type SharedFileMappingBundle = Record<DataType, string>;

export interface SharedFileMappingBundleEntry {
	id: string;
	name: string;
	files: SharedFileMappingBundle;
	createdAt: string;
	updatedAt: string;
}

export interface SharedFileMappingRegistryData {
	version: '1.0';
	bundles: SharedFileMappingBundleEntry[];
	lastUpdated: string;
}
