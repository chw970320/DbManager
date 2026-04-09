import { invalidateCache } from '$lib/registry/cache-registry.js';
import { saveDomainData, saveTermData, saveVocabularyData } from '$lib/registry/data-registry.js';
import { invalidateAllGeneratorCaches } from '$lib/registry/generator-cache.js';
import type { EditorSaveImpactPreview } from '$lib/types/change-impact.js';
import type { DomainData, DomainEntry } from '$lib/types/domain.js';
import type { CascadeUpdatePlan } from '$lib/utils/cascade-update-plan.js';
import type { TermData, TermEntry } from '$lib/types/term.js';
import type { VocabularyData, VocabularyEntry } from '$lib/types/vocabulary.js';

type ManagedData = VocabularyData | DomainData | TermData;
type ManagedEntry = VocabularyEntry | DomainEntry | TermEntry;

type ApplyResult = {
	sourceEntry: ManagedEntry;
	preview: EditorSaveImpactPreview;
};

async function saveManagedData(
	type: 'vocabulary' | 'domain' | 'term',
	data: ManagedData,
	filename: string
): Promise<void> {
	switch (type) {
		case 'vocabulary':
			return saveVocabularyData(data as VocabularyData, filename);
		case 'domain':
			return saveDomainData(data as DomainData, filename);
		case 'term':
			return saveTermData(data as TermData, filename);
	}
}

function findSourceEntry(plan: CascadeUpdatePlan): ManagedEntry {
	const dataset = plan.datasets.find((item) => item.type === plan.sourceType);
	if (!dataset) {
		throw new Error('원본 데이터셋을 찾을 수 없습니다.');
	}

	const changeId = dataset.changedEntries[0]?.id;
	if (changeId) {
		const matched = dataset.nextData.entries.find((entry) => entry.id === changeId);
		if (matched) {
			return matched as ManagedEntry;
		}
	}

	const fallback = dataset.nextData.entries[dataset.nextData.entries.length - 1];
	if (!fallback) {
		throw new Error('원본 엔트리를 찾을 수 없습니다.');
	}
	return fallback as ManagedEntry;
}

export async function applyCascadePlan(
	plan: CascadeUpdatePlan & { preview: ApplyResult['preview']; blocked?: boolean }
): Promise<ApplyResult> {
	if (plan.blocked || !plan.canApply) {
		throw new Error('자동 반영 충돌이 있어 저장을 진행할 수 없습니다.');
	}

	const written: Array<{
		type: 'vocabulary' | 'domain' | 'term';
		filename: string;
		before: ManagedData;
	}> = [];

	try {
		for (const dataset of plan.datasets) {
			if (dataset.changedEntries.length < 1) {
				continue;
			}

			await saveManagedData(dataset.type, dataset.nextData, dataset.filename);
			invalidateCache(dataset.type, dataset.filename);
			written.push({
				type: dataset.type,
				filename: dataset.filename,
				before: dataset.currentData
			});
		}

		invalidateAllGeneratorCaches();

		return {
			sourceEntry: findSourceEntry(plan),
			preview: plan.preview
		};
	} catch (error) {
		const rollbackErrors: string[] = [];

		for (const dataset of written.reverse()) {
			try {
				await saveManagedData(dataset.type, dataset.before, dataset.filename);
				invalidateCache(dataset.type, dataset.filename);
			} catch (rollbackError) {
				rollbackErrors.push(
					`${dataset.type}:${dataset.filename} -> ${rollbackError instanceof Error ? rollbackError.message : 'unknown'}`
				);
			}
		}

		const baseMessage =
			error instanceof Error ? error.message : '자동 반영 저장 중 오류가 발생했습니다.';
		if (rollbackErrors.length > 0) {
			throw new Error(`${baseMessage} (롤백 실패: ${rollbackErrors.join(', ')})`);
		}
		throw new Error(baseMessage);
	}
}
