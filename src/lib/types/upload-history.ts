import type { DataType, DataTypeMap } from './base';

export type UploadHistoryReason = 'upload-replace';

export interface UploadHistoryEntry<T extends DataType = DataType> {
	id: string;
	dataType: T;
	filename: string;
	reason: UploadHistoryReason;
	createdAt: string;
	expiresAt: string;
	content: DataTypeMap[T];
}

export interface UploadHistorySummaryEntry<T extends DataType = DataType> {
	id: string;
	dataType: T;
	filename: string;
	reason: UploadHistoryReason;
	createdAt: string;
	expiresAt: string;
	entryCount: number;
}

export interface UploadHistoryData<T extends DataType = DataType> {
	entries: UploadHistoryEntry<T>[];
	lastUpdated: string;
	totalCount: number;
}
