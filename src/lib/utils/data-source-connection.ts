import { Client } from 'pg';
import type {
	DataSourceConnectionTestResult,
	DataSourceEntry,
	DataSourceInput,
	DataSourceType,
	PostgreSqlConnectionConfig
} from '$lib/types/data-source.js';

type DataSourceConnectionTarget =
	| Pick<DataSourceEntry, 'type' | 'config'>
	| Pick<DataSourceInput, 'type' | 'config'>;

function trimVersion(value: unknown): string | undefined {
	if (typeof value !== 'string' || !value.trim()) {
		return undefined;
	}

	const version = value.trim();
	const firstLine = version.split('\n')[0]?.trim();
	return firstLine || version;
}

async function testPostgreSqlConnection(
	config: PostgreSqlConnectionConfig
): Promise<DataSourceConnectionTestResult> {
	const testedAt = new Date().toISOString();
	const startedAt = Date.now();
	const client = new Client({
		host: config.host,
		port: config.port,
		database: config.database,
		user: config.username,
		password: config.password,
		ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
		connectionTimeoutMillis: config.connectionTimeoutSeconds * 1000,
		application_name: 'DbManager'
	});

	try {
		await client.connect();
		const result = await client.query<{
			database: string;
			schema: string;
			version: string;
		}>('select current_database() as database, current_schema() as schema, version() as version');
		const row = result.rows[0];

		return {
			success: true,
			message: '연결에 성공했습니다.',
			details: {
				host: config.host,
				port: config.port,
				database: row?.database || config.database,
				schema: row?.schema || config.schema || 'public',
				serverVersion: trimVersion(row?.version)
			},
			latencyMs: Date.now() - startedAt,
			testedAt
		};
	} catch (error) {
		return {
			success: false,
			message:
				error instanceof Error ? error.message : 'PostgreSQL 연결 테스트 중 오류가 발생했습니다.',
			details: {
				host: config.host,
				port: config.port,
				database: config.database,
				schema: config.schema || 'public'
			},
			latencyMs: Date.now() - startedAt,
			testedAt
		};
	} finally {
		await client.end().catch(() => undefined);
	}
}

export async function testDataSourceConnection(
	target: DataSourceConnectionTarget
): Promise<DataSourceConnectionTestResult> {
	const type: DataSourceType = target.type;

	switch (type) {
		case 'postgresql':
			return testPostgreSqlConnection(target.config);
		default:
			return {
				success: false,
				message: '지원하지 않는 데이터 소스 유형입니다.',
				testedAt: new Date().toISOString()
			};
	}
}
