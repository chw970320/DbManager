import type { Client } from 'pg';
import { createPostgreSqlClient } from '$lib/utils/data-source-connection.js';
import type { DataSourceEntry } from '$lib/types/data-source.js';
import type {
	DataSourceColumnProfile,
	DataSourceProfileTarget,
	DataSourceProfileTargetsResult,
	DataSourceTableProfileInput,
	DataSourceTableProfileResult
} from '$lib/types/data-profiling.js';

const SYSTEM_SCHEMAS = ['information_schema', 'pg_catalog'];

type TableTargetRow = {
	schema: string;
	table: string;
	tableType: string;
	estimatedRowCount: number | string | null;
	columnCount: number | string | null;
};

type ColumnDefinitionRow = {
	columnName: string;
	ordinalPosition: number | string;
	dataType: string;
	isNullable: boolean;
};

type ColumnMetricRow = {
	nullCount: number | string | null;
	distinctCount: number | string | null;
	minLength: number | string | null;
	maxLength: number | string | null;
};

function trimString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function normalizeSchema(value: unknown, fallback = 'public'): string {
	const normalized = trimString(value);
	return normalized || fallback;
}

function toCount(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return Math.max(0, Math.trunc(value));
	}

	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
	}

	return 0;
}

function toOptionalCount(value: unknown): number | undefined {
	if (value === null || value === undefined || value === '') {
		return undefined;
	}

	return toCount(value);
}

function toRatio(count: number, total: number): number {
	if (total <= 0) {
		return 0;
	}

	return Number((count / total).toFixed(4));
}

function escapeIdentifier(value: string): string {
	return `"${value.replace(/"/g, '""')}"`;
}

function getQualifiedTableName(schema: string, table: string): string {
	return `${escapeIdentifier(schema)}.${escapeIdentifier(table)}`;
}

function normalizeTargetRow(row: TableTargetRow): DataSourceProfileTarget {
	return {
		schema: row.schema,
		table: row.table,
		tableType: row.tableType,
		estimatedRowCount: toOptionalCount(row.estimatedRowCount),
		columnCount: toCount(row.columnCount)
	};
}

function normalizeColumnProfile(
	column: ColumnDefinitionRow,
	metrics: ColumnMetricRow,
	rowCount: number
): DataSourceColumnProfile {
	const nullCount = toCount(metrics.nullCount);
	const distinctCount = toCount(metrics.distinctCount);
	const minLength = toOptionalCount(metrics.minLength);
	const maxLength = toOptionalCount(metrics.maxLength);

	return {
		columnName: column.columnName,
		ordinalPosition: toCount(column.ordinalPosition),
		dataType: column.dataType,
		isNullable: column.isNullable,
		nullCount,
		nullRatio: toRatio(nullCount, rowCount),
		distinctCount,
		distinctRatio: toRatio(distinctCount, rowCount),
		minLength,
		maxLength
	};
}

async function withClient<T>(entry: DataSourceEntry, action: (client: Client) => Promise<T>): Promise<T> {
	if (entry.type !== 'postgresql') {
		throw new Error('지원하지 않는 데이터 소스 유형입니다.');
	}

	const client = createPostgreSqlClient(entry.config);
	await client.connect();

	try {
		return await action(client);
	} finally {
		await client.end().catch(() => undefined);
	}
}

async function loadTableTargets(client: Client): Promise<DataSourceProfileTarget[]> {
	const result = await client.query<TableTargetRow>(
		`
			select
				t.table_schema as "schema",
				t.table_name as "table",
				t.table_type as "tableType",
				stats.n_live_tup::bigint as "estimatedRowCount",
				count(c.column_name)::int as "columnCount"
			from information_schema.tables t
			left join information_schema.columns c
				on c.table_schema = t.table_schema
				and c.table_name = t.table_name
			left join pg_catalog.pg_stat_user_tables stats
				on stats.schemaname = t.table_schema
				and stats.relname = t.table_name
			where t.table_type = 'BASE TABLE'
				and not (t.table_schema = any($1::text[]))
			group by
				t.table_schema,
				t.table_name,
				t.table_type,
				stats.n_live_tup
			order by t.table_schema asc, t.table_name asc
		`,
		[SYSTEM_SCHEMAS]
	);

	return result.rows.map(normalizeTargetRow);
}

async function ensureTableExists(client: Client, schema: string, table: string): Promise<void> {
	const result = await client.query(
		`
			select 1
			from information_schema.tables
			where table_schema = $1
				and table_name = $2
				and table_type = 'BASE TABLE'
			limit 1
		`,
		[schema, table]
	);

	if (result.rowCount === 0) {
		throw new Error('프로파일링 대상 테이블을 찾을 수 없습니다.');
	}
}

async function loadColumnDefinitions(
	client: Client,
	schema: string,
	table: string
): Promise<ColumnDefinitionRow[]> {
	const result = await client.query<ColumnDefinitionRow>(
		`
			select
				c.column_name as "columnName",
				c.ordinal_position as "ordinalPosition",
				pg_catalog.format_type(a.atttypid, a.atttypmod) as "dataType",
				(c.is_nullable = 'YES') as "isNullable"
			from information_schema.columns c
			join pg_catalog.pg_namespace n
				on n.nspname = c.table_schema
			join pg_catalog.pg_class cls
				on cls.relname = c.table_name
				and cls.relnamespace = n.oid
				and cls.relkind in ('r', 'p')
			join pg_catalog.pg_attribute a
				on a.attrelid = cls.oid
				and a.attname = c.column_name
				and a.attnum > 0
				and not a.attisdropped
			where c.table_schema = $1
				and c.table_name = $2
			order by c.ordinal_position asc
		`,
		[schema, table]
	);

	return result.rows;
}

async function loadRowCount(client: Client, schema: string, table: string): Promise<number> {
	const qualifiedTable = getQualifiedTableName(schema, table);
	const result = await client.query<{ rowCount: number | string }>(
		`select count(*)::bigint as "rowCount" from ${qualifiedTable}`
	);

	return toCount(result.rows[0]?.rowCount);
}

async function loadColumnMetrics(
	client: Client,
	schema: string,
	table: string,
	columnName: string
): Promise<ColumnMetricRow> {
	const qualifiedTable = getQualifiedTableName(schema, table);
	const qualifiedColumn = escapeIdentifier(columnName);
	const result = await client.query<ColumnMetricRow>(`
		select
			count(*) filter (where ${qualifiedColumn} is null)::bigint as "nullCount",
			count(distinct case when ${qualifiedColumn} is null then null else ${qualifiedColumn}::text end)::bigint as "distinctCount",
			min(length(${qualifiedColumn}::text)) filter (where ${qualifiedColumn} is not null)::int as "minLength",
			max(length(${qualifiedColumn}::text)) filter (where ${qualifiedColumn} is not null)::int as "maxLength"
		from ${qualifiedTable}
	`);

	return result.rows[0] ?? {
		nullCount: 0,
		distinctCount: 0,
		minLength: null,
		maxLength: null
	};
}

export async function listDataSourceProfileTargets(
	entry: DataSourceEntry
): Promise<DataSourceProfileTargetsResult> {
	return withClient(entry, async (client) => {
		const tables = await loadTableTargets(client);
		const schemas = [...new Set(tables.map((target) => target.schema))];

		return {
			dataSourceId: entry.id,
			dataSourceName: entry.name,
			dataSourceType: entry.type,
			defaultSchema: normalizeSchema(entry.config.schema, schemas[0] ?? 'public'),
			schemas,
			tables
		};
	});
}

export async function profileDataSourceTable(
	entry: DataSourceEntry,
	input: DataSourceTableProfileInput
): Promise<DataSourceTableProfileResult> {
	const schema = normalizeSchema(input.schema);
	const table = trimString(input.table);

	if (!table) {
		throw new Error('프로파일링 대상 테이블을 찾을 수 없습니다.');
	}

	return withClient(entry, async (client) => {
		await ensureTableExists(client, schema, table);

		const rowCount = await loadRowCount(client, schema, table);
		const columns = await loadColumnDefinitions(client, schema, table);
		const profiles: DataSourceColumnProfile[] = [];

		for (const column of columns) {
			const metrics = await loadColumnMetrics(client, schema, table, column.columnName);
			profiles.push(normalizeColumnProfile(column, metrics, rowCount));
		}

		return {
			dataSourceId: entry.id,
			dataSourceName: entry.name,
			dataSourceType: entry.type,
			schema,
			table,
			rowCount,
			profiledAt: new Date().toISOString(),
			columns: profiles
		};
	});
}
