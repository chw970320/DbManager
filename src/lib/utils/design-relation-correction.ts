import type { DataType, DataTypeMap } from '$lib/types/base.js';
import type {
	DesignRelationApplyResult,
	DesignRelationCandidate,
	DesignRelationCorrectionPreview,
	DesignRelationPatch,
	DesignRelationValidationResult,
	RelationIssue
} from '$lib/types/design-relation.js';
import { loadData, saveData } from '$lib/registry/data-registry.js';
import type { DesignRelationFileBundle } from './design-relation-bundle.js';

export class DesignRelationCorrectionError extends Error {
	status = 400;

	constructor(message: string) {
		super(message);
		this.name = 'DesignRelationCorrectionError';
	}
}

type MutableEntry = { id: string; updatedAt?: string; [key: string]: unknown };
type MutableData = { entries: MutableEntry[]; lastUpdated: string; totalCount: number };

function validationIssues(validation: DesignRelationValidationResult): RelationIssue[] {
	return validation.issues?.length
		? validation.issues
		: validation.summaries.flatMap((s) => s.issues);
}

export function selectDesignRelationCandidate(
	validation: DesignRelationValidationResult,
	issueId: string,
	candidateId?: string | null
): { issue: RelationIssue; candidate: DesignRelationCandidate } {
	const issue = validationIssues(validation).find((item) => item.issueId === issueId);
	if (!issue)
		throw new DesignRelationCorrectionError(`알 수 없는 관계 검증 이슈입니다: ${issueId}`);
	if (issue.candidates.length === 0) {
		throw new DesignRelationCorrectionError(
			'자동 수정 후보가 없는 이슈입니다. 수동 수정만 가능합니다.'
		);
	}
	if (!candidateId && issue.candidates.length > 1) {
		throw new DesignRelationCorrectionError(
			'후보가 여러 개인 이슈는 candidateId를 명시해야 합니다.'
		);
	}
	const candidate = candidateId
		? issue.candidates.find((item) => item.candidateId === candidateId)
		: issue.candidates[0];
	if (!candidate) {
		throw new DesignRelationCorrectionError(
			`선택한 candidateId가 이슈에 속하지 않습니다: ${candidateId}`
		);
	}
	if (!candidate.autoFixable) {
		throw new DesignRelationCorrectionError(
			'선택한 후보는 자동 수정 대상이 아닙니다. 수동 수정하세요.'
		);
	}
	return { issue, candidate };
}

export function previewDesignRelationCorrection(
	validation: DesignRelationValidationResult,
	input: { issueId: string; candidateId?: string | null }
): DesignRelationCorrectionPreview {
	const { issue, candidate } = selectDesignRelationCandidate(
		validation,
		input.issueId,
		input.candidateId
	);
	return {
		issueId: issue.issueId,
		candidateId: candidate.candidateId,
		patch: candidate.patch,
		previewText: candidate.previewText,
		actionGuide: issue.actionGuide
	};
}

export function applyDesignRelationPatchToData<TData extends MutableData>(
	data: TData,
	patch: DesignRelationPatch,
	now = new Date().toISOString()
): { data: TData; updatedEntry: MutableEntry } {
	const index = data.entries.findIndex((entry) => entry.id === patch.targetId);
	if (index < 0) {
		throw new DesignRelationCorrectionError(
			`수정 대상 엔트리를 찾을 수 없습니다: ${patch.targetType}/${patch.targetId}`
		);
	}
	const current = data.entries[index];
	const updated: MutableEntry = {
		...current,
		...patch.fields,
		updatedAt: now
	};
	const entries = [...data.entries];
	entries[index] = updated;
	return {
		data: {
			...data,
			entries,
			lastUpdated: now,
			totalCount: entries.length
		} as TData,
		updatedEntry: updated
	};
}

export async function applyDesignRelationCorrection(input: {
	validation: DesignRelationValidationResult;
	issueId: string;
	candidateId?: string | null;
	files: Partial<Record<DataType, string>> | DesignRelationFileBundle;
	now?: string;
}): Promise<
	DesignRelationApplyResult & { targetType: DataType; targetFile: string; previewText: string }
> {
	const preview = previewDesignRelationCorrection(input.validation, {
		issueId: input.issueId,
		candidateId: input.candidateId
	});
	const targetType = preview.patch.targetType;
	const targetFile = input.files[targetType];
	if (!targetFile) {
		throw new DesignRelationCorrectionError(`수정 대상 파일명이 없습니다: ${targetType}File`);
	}
	const loaded = (await loadData(targetType, targetFile)) as unknown as MutableData;
	const { data, updatedEntry } = applyDesignRelationPatchToData(loaded, preview.patch, input.now);
	await saveData(targetType, data as unknown as DataTypeMap[typeof targetType], targetFile);
	return {
		issueId: preview.issueId,
		candidateId: preview.candidateId,
		applied: true,
		patch: preview.patch,
		updatedEntryId: updatedEntry.id,
		targetType,
		targetFile,
		previewText: preview.previewText
	};
}
