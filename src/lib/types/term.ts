/**
 * 용어 관리 타입 정의
 */

export interface TermEntry {
	id: string;
	termName: string; // 용어명 (단어집 standardName 기반)
	columnName: string; // 칼럼명 (단어집 abbreviation 기반)
	domainName: string; // 도메인 명 (standardDomainName 기반)
	isMappedTerm: boolean; // 용어명 매핑 성공 여부
	isMappedColumn: boolean; // 칼럼명 매핑 성공 여부
	isMappedDomain: boolean; // 도메인 매핑 성공 여부
	createdAt: string; // ISO 8601
	updatedAt: string; // ISO 8601
}

export interface TermData {
	entries: TermEntry[];
	lastUpdated: string;
	totalCount: number;
	mapping?: {
		vocabulary: string; // 매핑된 단어집 파일명
		domain: string; // 매핑된 도메인 파일명
	};
}

export interface TermHistoryLogEntry {
	id: string;
	action: 'add' | 'update' | 'delete' | 'UPLOAD_MERGE';
	targetId: string;
	targetName: string;
	timestamp: string;
	filename?: string;
	details?: {
		before?: Partial<TermEntry>;
		after?: Partial<TermEntry>;
		fileName?: string;
		fileSize?: number;
		processedCount?: number;
		replaceMode?: boolean;
	};
}

export interface TermHistoryData {
	logs: TermHistoryLogEntry[];
	lastUpdated: string;
	totalCount: number;
}

