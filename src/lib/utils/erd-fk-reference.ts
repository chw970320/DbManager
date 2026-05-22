/**
 * ERD FK 정보 파싱 공통 유틸리티
 *
 * 컬럼 정의서의 FK정보는 Graphviz 이미지, ERDData metadata, 필터 외부참조,
 * 기존 매핑 생성 경로에서 동일한 경계로 해석되어야 한다.
 */

export interface ERDForeignKeySource {
	schemaName?: string;
	tableEnglishName?: string;
}

export interface ERDForeignKeyReference {
	schemaName?: string;
	tableEnglishName?: string;
	columnEnglishName?: string;
}

function normalizeText(value: string | undefined | null): string {
	return (value ?? '').trim();
}

export function isBlankForeignKeyInfo(value: string | undefined | null): boolean {
	const text = normalizeText(value);
	return text === '' || text === '-' || /^pk\d*$/i.test(text);
}

export function isBooleanForeignKeyMarker(value: string | undefined | null): boolean {
	const normalized = normalizeText(value).toLowerCase();
	return ['y', 'yes', 'true'].includes(normalized);
}

export function hasForeignKeyMarker(value: string | undefined | null): boolean {
	return !isBlankForeignKeyInfo(value);
}

/**
 * FK 참조 대상을 해석한다.
 *
 * - canonical: schema.table.column
 * - explicit shorthand: table.column 또는 table:column (source schema fallback)
 * - one-part column name: 관계 추론으로 간주해 참조를 만들지 않는다.
 * - Y/YES/TRUE: FK badge marker이며 관계 대상은 없다.
 * - PK01/PK02: PK 순번이 FK 칸에 잘못 들어온 값으로 간주해 무시한다.
 */
export function parseForeignKeyReference(
	fkInfo: string | undefined | null,
	source: ERDForeignKeySource = {}
): ERDForeignKeyReference | undefined {
	if (isBlankForeignKeyInfo(fkInfo) || isBooleanForeignKeyMarker(fkInfo)) return undefined;

	const firstReference = normalizeText(fkInfo)
		.split(/[;,\n]/)
		.map((part) => part.trim())
		.find((part) => part.length > 0);
	if (!firstReference) return undefined;

	const parts = firstReference
		.replace(/[`"'[\]{}()]/g, ' ')
		.replace(/->/g, '.')
		.replace(/=>/g, '.')
		.replace(/\s+/g, ' ')
		.trim()
		.split(/[.:]/)
		.map((part) => part.trim())
		.filter(Boolean);

	if (parts.length >= 3) {
		return {
			schemaName: parts[parts.length - 3],
			tableEnglishName: parts[parts.length - 2],
			columnEnglishName: parts[parts.length - 1]
		};
	}

	if (parts.length === 2) {
		return {
			schemaName: source.schemaName,
			tableEnglishName: parts[0],
			columnEnglishName: parts[1]
		};
	}

	return undefined;
}
