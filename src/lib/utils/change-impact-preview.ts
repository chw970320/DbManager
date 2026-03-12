import { DEFAULT_FILENAMES, type DataType, type ReferenceCheckResult } from '$lib/types/base.js';
import type { DomainEntry } from '$lib/types/domain.js';
import type { TermEntry } from '$lib/types/term.js';
import type { DomainImpactPreview, ImpactReferenceSummary, TermImpactPreview } from '$lib/types/change-impact.js';
import { resolveRelatedFilenames, checkEntryReferences } from '$lib/registry/mapping-registry.js';
import { loadData } from '$lib/registry/data-registry.js';
import { normalizeKey } from '$lib/utils/mapping-key.js';

type TermImpactParams = {
	filename?: string;
	currentEntry?: Partial<TermEntry> | null;
	proposedEntry: Partial<TermEntry>;
};

type DomainImpactParams = {
	filename?: string;
	mode?: 'create' | 'update' | 'delete';
	currentEntry?: Partial<DomainEntry> | null;
	proposedEntry?: Partial<DomainEntry> | null;
};

function countReferences(
	references: ReferenceCheckResult['references'],
	type: DataType
): ImpactReferenceSummary {
	const reference = references.find((item) => item.type === type);
	return {
		type,
		filename: reference?.filename || DEFAULT_FILENAMES[type],
		count: reference?.count || 0,
		entries: reference?.entries || []
	};
}

function normalizeOptional(value: string | undefined): string {
	return normalizeKey(value);
}

function pickTermEntry(entry: Partial<TermEntry> | null | undefined) {
	if (!entry) return null;
	return {
		id: entry.id || '',
		termName: entry.termName?.trim() || '',
		columnName: entry.columnName?.trim() || '',
		domainName: entry.domainName?.trim() || ''
	};
}

function pickDomainEntry(entry: Partial<DomainEntry> | null | undefined) {
	if (!entry) return null;
	return {
		id: entry.id || '',
		domainCategory: entry.domainCategory?.trim() || '',
		standardDomainName: entry.standardDomainName?.trim() || '',
		physicalDataType: entry.physicalDataType?.trim() || '',
		dataLength: entry.dataLength?.trim() || '',
		decimalPlaces: entry.decimalPlaces?.trim() || ''
	};
}

export async function buildTermImpactPreview({
	filename,
	currentEntry,
	proposedEntry
}: TermImpactParams): Promise<TermImpactPreview> {
	const termFilename = filename || DEFAULT_FILENAMES.term;
	const relatedFiles = await resolveRelatedFilenames('term', termFilename);
	const domainFilename = relatedFiles.get('domain') || DEFAULT_FILENAMES.domain;
	const columnFilename = relatedFiles.get('column') || DEFAULT_FILENAMES.column;

	const current = pickTermEntry(currentEntry);
	const proposed = pickTermEntry(proposedEntry);

	if (!proposed || !proposed.termName || !proposed.columnName || !proposed.domainName) {
		throw new Error('영향도 미리보기를 계산하려면 termName, columnName, domainName이 필요합니다.');
	}

	const [currentReferences, nextReferences, domainData] = await Promise.all([
		current
			? checkEntryReferences('term', current, termFilename)
			: Promise.resolve({ canDelete: true, references: [] } as ReferenceCheckResult),
		checkEntryReferences('term', proposed, termFilename),
		loadData('domain', domainFilename)
	]);

	const currentColumnRefs = countReferences(currentReferences.references, 'column');
	const nextColumnRefs = countReferences(nextReferences.references, 'column');
	const proposedDomainExists = (domainData.entries as DomainEntry[]).some(
		(entry) => normalizeOptional(entry.standardDomainName) === normalizeOptional(proposed.domainName)
	);

	const termNameChanged =
		current !== null && normalizeOptional(current.termName) !== normalizeOptional(proposed.termName);
	const columnNameChanged =
		current !== null && normalizeOptional(current.columnName) !== normalizeOptional(proposed.columnName);
	const domainNameChanged =
		current !== null && normalizeOptional(current.domainName) !== normalizeOptional(proposed.domainName);

	const affectedColumnStandardizationCount =
		current !== null && !columnNameChanged && (termNameChanged || domainNameChanged)
			? nextColumnRefs.count
			: 0;
	const columnLinksToBeBroken = current !== null && columnNameChanged ? currentColumnRefs.count : 0;
	const newColumnLinksDetected =
		current !== null && columnNameChanged ? nextColumnRefs.count : current === null ? nextColumnRefs.count : 0;

	const guidance: string[] = [];

	if (!proposedDomainExists) {
		guidance.push(
			`선택한 도메인 '${proposed.domainName}'이(가) ${domainFilename}에 없어 저장 후에도 도메인 매핑 실패가 남을 수 있습니다.`
		);
	}

	if (current === null) {
		if (nextColumnRefs.count > 0) {
			guidance.push(
				`저장 후 컬럼-용어 동기화를 실행하면 ${nextColumnRefs.count}개 컬럼이 새 용어와 연결될 수 있습니다.`
			);
		} else {
			guidance.push('현재 columnEnglishName 기준으로 새 용어와 바로 연결되는 컬럼은 없습니다.');
		}
	} else if (columnNameChanged) {
		if (columnLinksToBeBroken > 0) {
			guidance.push(
				`기존 columnName과 연결된 ${columnLinksToBeBroken}개 컬럼은 저장 후 이 용어 기준에서 벗어납니다.`
			);
		}
		if (newColumnLinksDetected > 0) {
			guidance.push(
				`새 columnName과 일치하는 ${newColumnLinksDetected}개 컬럼이 이후 동기화 대상이 됩니다.`
			);
		}
		if (columnLinksToBeBroken === 0 && newColumnLinksDetected === 0) {
			guidance.push('columnName 변경은 있지만 현재/새 기준 모두 연결되는 컬럼이 없어 즉시 파급은 작습니다.');
		}
	} else if (affectedColumnStandardizationCount > 0) {
		const labels = [
			termNameChanged ? '컬럼 한글명' : null,
			domainNameChanged ? '도메인/자료형' : null
		].filter(Boolean);
		guidance.push(
			`연결된 ${affectedColumnStandardizationCount}개 컬럼의 ${labels.join(' 및 ')} 보정 결과가 달라질 수 있습니다.`
		);
	} else {
		guidance.push('이번 수정은 컬럼 연결 키와 동기화 대상에 즉시 영향을 주지 않습니다.');
	}

	return {
		files: {
			term: termFilename,
			domain: domainFilename,
			column: columnFilename
		},
		mode: current === null ? 'create' : 'update',
		current,
		proposed,
		changes: {
			termNameChanged,
			columnNameChanged,
			domainNameChanged
		},
		summary: {
			currentLinkedColumnCount: currentColumnRefs.count,
			nextLinkedColumnCount: nextColumnRefs.count,
			columnLinksToBeBroken,
			newColumnLinksDetected,
			affectedColumnStandardizationCount,
			proposedDomainExists
		},
		samples: {
			currentLinkedColumns: currentColumnRefs.entries,
			nextLinkedColumns: nextColumnRefs.entries
		},
		guidance
	};
}

export async function buildDomainImpactPreview({
	filename,
	mode,
	currentEntry,
	proposedEntry
}: DomainImpactParams): Promise<DomainImpactPreview> {
	const domainFilename = filename || DEFAULT_FILENAMES.domain;
	const relatedFiles = await resolveRelatedFilenames('domain', domainFilename);
	const vocabularyFilename = relatedFiles.get('vocabulary') || DEFAULT_FILENAMES.vocabulary;
	const termFilename = relatedFiles.get('term') || DEFAULT_FILENAMES.term;
	const columnFilename = relatedFiles.get('column') || DEFAULT_FILENAMES.column;

	const current = pickDomainEntry(currentEntry);
	const proposed = pickDomainEntry(proposedEntry);
	const previewMode =
		mode || (current ? (proposed ? 'update' : 'delete') : 'create');

	const referenceResult =
		current && previewMode !== 'create'
			? await checkEntryReferences('domain', current, domainFilename)
			: ({ canDelete: true, references: [] } as ReferenceCheckResult);

	const vocabularyRefs = countReferences(referenceResult.references, 'vocabulary');
	const termRefs = countReferences(referenceResult.references, 'term');
	const columnRefs = countReferences(referenceResult.references, 'column');
	const totalReferenceCount = vocabularyRefs.count + termRefs.count + columnRefs.count;

	const referenceKeyChanged =
		current !== null &&
		proposed !== null &&
		(normalizeOptional(current.domainCategory) !== normalizeOptional(proposed.domainCategory) ||
			normalizeOptional(current.standardDomainName) !== normalizeOptional(proposed.standardDomainName));
	const syncSpecChanged =
		current !== null &&
		proposed !== null &&
		(normalizeOptional(current.physicalDataType) !== normalizeOptional(proposed.physicalDataType) ||
			normalizeOptional(current.dataLength) !== normalizeOptional(proposed.dataLength) ||
			normalizeOptional(current.decimalPlaces) !== normalizeOptional(proposed.decimalPlaces));

	const downstreamBreakCount =
		previewMode === 'delete' || referenceKeyChanged ? totalReferenceCount : 0;
	const affectedColumnSyncCount =
		previewMode !== 'delete' && !referenceKeyChanged && syncSpecChanged ? columnRefs.count : 0;

	const guidance: string[] = [];

	if (previewMode === 'create') {
		guidance.push('신규 도메인은 저장 전 기준으로 downstream 참조가 없습니다.');
	} else {
		if (totalReferenceCount > 0) {
			guidance.push(
				`현재 이 도메인은 단어 ${vocabularyRefs.count}건, 용어 ${termRefs.count}건, 컬럼 ${columnRefs.count}건에서 참조되고 있습니다.`
			);
		} else {
			guidance.push('현재 이 도메인을 참조하는 단어/용어/컬럼이 없습니다.');
		}

		if (previewMode === 'delete' && totalReferenceCount > 0) {
			guidance.push(
				`삭제 시 총 ${totalReferenceCount}건이 미참조 또는 매핑 누락 상태가 될 수 있습니다.`
			);
		} else if (referenceKeyChanged && totalReferenceCount > 0) {
			guidance.push(
				`도메인명 또는 분류명 변경 시 총 ${totalReferenceCount}건의 참조 기준이 달라집니다.`
			);
		} else if (affectedColumnSyncCount > 0) {
			guidance.push(
				`자료형 스펙 변경은 ${affectedColumnSyncCount}개 컬럼의 동기화 결과에 반영될 수 있습니다.`
			);
		} else {
			guidance.push('이번 수정은 참조 키와 컬럼 동기화 스펙을 바꾸지 않아 즉시 파급은 없습니다.');
		}
	}

	return {
		files: {
			domain: domainFilename,
			vocabulary: vocabularyFilename,
			term: termFilename,
			column: columnFilename
		},
		mode: previewMode,
		current,
		proposed,
		changes: {
			referenceKeyChanged,
			syncSpecChanged
		},
		summary: {
			vocabularyReferenceCount: vocabularyRefs.count,
			termReferenceCount: termRefs.count,
			columnReferenceCount: columnRefs.count,
			totalReferenceCount,
			downstreamBreakCount,
			affectedColumnSyncCount
		},
		references: [vocabularyRefs, termRefs, columnRefs],
		guidance
	};
}
