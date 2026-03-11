export interface DomainDataTypeMappingEntry {
	id: string;
	dataType: string;
	abbreviation: string;
	createdAt: string;
	updatedAt: string;
}

export interface DomainDataTypeMappingData {
	entries: DomainDataTypeMappingEntry[];
	lastUpdated: string;
	totalCount: number;
}

export interface DomainDataTypeMappingSyncResult {
	domainFilesUpdated: number;
	domainsUpdated: number;
	termFilesUpdated: number;
	termsUpdated: number;
	columnFilesUpdated: number;
	columnsUpdated: number;
}
