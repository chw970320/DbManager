import type { DataType } from './base.js';
import type { SharedFileMappingBundle } from './shared-file-mapping.js';

export type DesignSnapshotPayload = {
	filename: string;
	entryCount: number;
	data: unknown;
};

export type DesignSnapshotPayloadMap = Record<DataType, DesignSnapshotPayload>;

export interface DesignSnapshotEntry {
	id: string;
	name: string;
	description?: string;
	bundle: SharedFileMappingBundle;
	payloads: DesignSnapshotPayloadMap;
	createdAt: string;
	updatedAt: string;
	restoredAt?: string;
}

export interface DesignSnapshotSummaryEntry {
	id: string;
	name: string;
	description?: string;
	bundle: SharedFileMappingBundle;
	counts: Record<DataType, number>;
	createdAt: string;
	updatedAt: string;
	restoredAt?: string;
}

export interface DesignSnapshotData {
	entries: DesignSnapshotEntry[];
	lastUpdated: string;
	totalCount: number;
}
