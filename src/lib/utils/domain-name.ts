import type { DomainDataTypeMappingEntry } from '$lib/types/domain-data-type-mapping.js';

export type DomainDataTypeMappingLike = Pick<DomainDataTypeMappingEntry, 'dataType' | 'abbreviation'>;

export const DEFAULT_DOMAIN_DATA_TYPE_MAPPINGS: DomainDataTypeMappingLike[] = [
	{ dataType: 'NUMERIC', abbreviation: 'N' },
	{ dataType: 'VARCHAR', abbreviation: 'V' },
	{ dataType: 'DOUBLE PRECISION', abbreviation: 'DP' },
	{ dataType: 'INT4', abbreviation: 'I' },
	{ dataType: 'CHAR', abbreviation: 'C' },
	{ dataType: 'TIME', abbreviation: 'TM' },
	{ dataType: 'TIMESTAMP', abbreviation: 'TS' },
	{ dataType: 'TIMESTAMPTZ', abbreviation: 'TSTZ' },
	{ dataType: 'DATE', abbreviation: 'D' },
	{ dataType: 'DATETIME', abbreviation: 'DT' },
	{ dataType: 'BOOLEAN', abbreviation: 'B' },
	{ dataType: 'TEXT', abbreviation: 'TXT' },
	{ dataType: 'SERIAL', abbreviation: 'S' },
	{ dataType: 'INT8', abbreviation: 'BI' },
	{ dataType: 'GEOMETRY', abbreviation: 'GEO' }
];

export function normalizePhysicalDataTypeKey(value: string | undefined | null): string {
	return (value || '')
		.trim()
		.replace(/\s+/g, ' ')
		.toUpperCase();
}

export function normalizeDomainDataTypeAbbreviation(value: string | undefined | null): string {
	return (value || '')
		.trim()
		.replace(/\s+/g, '')
		.toUpperCase();
}

export function resolveDomainDataTypeAbbreviation(
	physicalDataType: string,
	mappings: DomainDataTypeMappingLike[] = DEFAULT_DOMAIN_DATA_TYPE_MAPPINGS
): string {
	const normalizedType = normalizePhysicalDataTypeKey(physicalDataType);
	if (!normalizedType) {
		return '';
	}

	for (const mapping of mappings) {
		if (normalizePhysicalDataTypeKey(mapping.dataType) === normalizedType) {
			const abbreviation = normalizeDomainDataTypeAbbreviation(mapping.abbreviation);
			if (abbreviation) {
				return abbreviation;
			}
			break;
		}
	}

	return normalizedType.charAt(0);
}

export function buildStandardDomainName(
	domainCategory: string,
	physicalDataType: string,
	dataLength?: string | number,
	decimalPlaces?: string | number,
	mappings: DomainDataTypeMappingLike[] = DEFAULT_DOMAIN_DATA_TYPE_MAPPINGS
): string {
	const category = (domainCategory || '').trim();
	const dataTypeAbbreviation = resolveDomainDataTypeAbbreviation(physicalDataType, mappings);

	const length =
		dataLength !== undefined && dataLength !== null && dataLength !== ''
			? String(dataLength).trim()
			: '';

	const decimal =
		decimalPlaces !== undefined && decimalPlaces !== null && decimalPlaces !== ''
			? String(decimalPlaces).trim()
			: '';

	let domainName = category + dataTypeAbbreviation;

	if (length) {
		domainName += length;
		if (decimal) {
			domainName += ',' + decimal;
		}
	}

	return domainName;
}
