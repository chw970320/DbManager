import type { DataSourceType } from '$lib/types/data-source.js';

export interface DataSourceProfileTarget {
	schema: string;
	table: string;
	tableType: string;
	estimatedRowCount?: number;
	columnCount: number;
}

export interface DataSourceProfileTargetsResult {
	dataSourceId: string;
	dataSourceName: string;
	dataSourceType?: DataSourceType;
	defaultSchema: string;
	schemas: string[];
	tables: DataSourceProfileTarget[];
}

export interface DataSourceColumnProfile {
	columnName: string;
	ordinalPosition: number;
	dataType: string;
	isNullable: boolean;
	nullCount: number;
	nullRatio: number;
	distinctCount: number;
	distinctRatio: number;
	minLength?: number;
	maxLength?: number;
}

export interface DataSourceTableProfileInput {
	schema: string;
	table: string;
}

export interface DataSourceTableProfileResult {
	dataSourceId: string;
	dataSourceName: string;
	dataSourceType?: DataSourceType;
	schema: string;
	table: string;
	rowCount: number;
	profiledAt: string;
	columns: DataSourceColumnProfile[];
}
