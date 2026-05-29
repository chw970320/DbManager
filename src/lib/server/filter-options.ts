import { json, type RequestEvent } from '@sveltejs/kit';

export type FilterOptionColumn<TEntry> = Extract<keyof TEntry, string>;

export interface FilterOptionsDescriptor<TEntry> {
	defaultFilename: string;
	filterableColumns: readonly FilterOptionColumn<TEntry>[];
	nullableColumns?: readonly FilterOptionColumn<TEntry>[];
	loadData: (filename: string) => Promise<{ entries: TEntry[] }>;
	transformValue?: (
		value: unknown,
		entry: TEntry,
		columnKey: FilterOptionColumn<TEntry>
	) => unknown;
}

function isPresentFilterValue(value: unknown): boolean {
	return value !== null && value !== undefined && value !== '';
}

function buildFilterOptions<TEntry>(
	entries: readonly TEntry[],
	filterableColumns: readonly FilterOptionColumn<TEntry>[],
	nullableColumns: ReadonlySet<FilterOptionColumn<TEntry>>,
	transformValue?: FilterOptionsDescriptor<TEntry>['transformValue']
): Record<string, string[]> {
	const options: Record<string, string[]> = {};

	for (const columnKey of filterableColumns) {
		const values = new Set<string>();
		let hasEmptyValue = false;

		for (const entry of entries) {
			const rawValue = entry[columnKey];
			const value = transformValue ? transformValue(rawValue, entry, columnKey) : rawValue;

			if (isPresentFilterValue(value)) {
				values.add(String(value));
			} else if (nullableColumns.has(columnKey)) {
				hasEmptyValue = true;
			}
		}

		const sortedValues = Array.from(values).sort();

		if (hasEmptyValue) {
			sortedValues.unshift('(빈값)');
		}

		options[columnKey] = sortedValues;
	}

	return options;
}

export async function handleFilterOptions<TEntry>(
	{ url }: Pick<RequestEvent, 'url'>,
	descriptor: FilterOptionsDescriptor<TEntry>
): Promise<Response> {
	try {
		const filename = url.searchParams.get('filename') || descriptor.defaultFilename;
		let data: { entries: TEntry[] };

		try {
			data = await descriptor.loadData(filename);
		} catch (loadError) {
			console.error('데이터 로드 실패:', loadError);

			return json(
				{
					success: false,
					error: loadError instanceof Error ? loadError.message : '데이터 로드 실패',
					message: 'Data loading failed'
				},
				{ status: 500 }
			);
		}

		const options = buildFilterOptions(
			data.entries,
			descriptor.filterableColumns,
			new Set(descriptor.nullableColumns ?? []),
			descriptor.transformValue
		);

		return json(
			{
				success: true,
				data: options,
				message: 'Filter options retrieved successfully'
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('필터 옵션 조회 중 오류:', error);

		return json(
			{
				success: false,
				error: '서버에서 필터 옵션 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			},
			{ status: 500 }
		);
	}
}
