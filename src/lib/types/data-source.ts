export type DataSourceType = 'postgresql';

export interface PostgreSqlConnectionConfig {
	host: string;
	port: number;
	database: string;
	schema?: string;
	username: string;
	password: string;
	ssl: boolean;
	connectionTimeoutSeconds: number;
}

export interface DataSourceEntry {
	id: string;
	name: string;
	type: DataSourceType;
	description?: string;
	config: PostgreSqlConnectionConfig;
	createdAt: string;
	updatedAt: string;
}

export interface DataSourceSummaryConfig extends Omit<PostgreSqlConnectionConfig, 'password'> {
	hasPassword: boolean;
}

export interface DataSourceSummaryEntry extends Omit<DataSourceEntry, 'config'> {
	config: DataSourceSummaryConfig;
}

export interface DataSourceData {
	entries: DataSourceEntry[];
	lastUpdated: string;
	totalCount: number;
}

export interface DataSourceInput {
	name: string;
	type: DataSourceType;
	description?: string;
	config: PostgreSqlConnectionConfig;
}

export interface DataSourceConnectionTestResult {
	success: boolean;
	message: string;
	details?: {
		host?: string;
		port?: number;
		database?: string;
		schema?: string;
		serverVersion?: string;
	};
	latencyMs?: number;
	testedAt: string;
}
