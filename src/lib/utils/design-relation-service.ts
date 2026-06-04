import type { DataType } from '$lib/types/base.js';
import type { DesignRelationValidationResult } from '$lib/types/design-relation.js';
import {
	loadDesignRelationContext,
	type StandardReferenceLoadStatus
} from './design-relation-context.js';
import {
	DesignRelationBundleError,
	resolveDesignRelationFileBundle,
	type DesignRelationFileBundle,
	type ResolveDesignRelationFileBundleInput
} from './design-relation-bundle.js';
import {
	applyDesignRelationCorrection,
	previewDesignRelationCorrection
} from './design-relation-correction.js';
import { validateDesignRelations } from './design-relation-validator.js';

export type DesignRelationValidationRequest = ResolveDesignRelationFileBundleInput;

export type DesignRelationValidationServiceResult = {
	files: Partial<Record<DataType, string>>;
	sources: Record<DataType, string>;
	validation: DesignRelationValidationResult;
};

export function validateLoadedDesignRelationContext(
	context: Parameters<typeof validateDesignRelations>[0],
	standardReferences: StandardReferenceLoadStatus,
	options: { requireStandardReferences?: boolean } = {}
): DesignRelationValidationResult {
	const includeStandardReferences =
		options.requireStandardReferences === true || standardReferences.complete;
	return validateDesignRelations(context, { includeStandardReferences });
}

export async function runDesignRelationValidation(
	input: DesignRelationValidationRequest,
	options: { requireStandardReferences?: boolean } = {}
): Promise<DesignRelationValidationServiceResult> {
	const requireStandardReferences =
		options.requireStandardReferences ?? input.requireStandardReferences ?? false;
	const resolved = await resolveDesignRelationFileBundle({
		...input,
		requireStandardReferences
	});
	const bundle = resolved.bundle;
	const { context, standardReferences } = await loadDesignRelationContext({
		databaseFile: bundle.database,
		entityFile: bundle.entity,
		attributeFile: bundle.attribute,
		tableFile: bundle.table,
		columnFile: bundle.column,
		domainFile: bundle.domain,
		termFile: bundle.term,
		vocabularyFile: bundle.vocabulary,
		includeDomain: Boolean(bundle.domain),
		includeTerm: Boolean(bundle.term),
		includeVocabularyMap: Boolean(bundle.vocabulary),
		fallbackToFirstWhenMissing: false,
		strictStandardReferences: requireStandardReferences
	});
	return {
		files: bundle,
		sources: resolved.sources,
		validation: validateLoadedDesignRelationContext(context, standardReferences, {
			requireStandardReferences
		})
	};
}

export async function runDesignRelationPreview(
	input: DesignRelationValidationRequest & {
		issueId: string;
		candidateId?: string | null;
	}
): Promise<
	ReturnType<typeof previewDesignRelationCorrection> & DesignRelationValidationServiceResult
> {
	const validationResult = await runDesignRelationValidation(input, {
		requireStandardReferences: true
	});
	const preview = previewDesignRelationCorrection(validationResult.validation, {
		issueId: input.issueId,
		candidateId: input.candidateId
	});
	return { ...validationResult, ...preview };
}

export async function runDesignRelationApply(
	input: DesignRelationValidationRequest & {
		issueId: string;
		candidateId?: string | null;
	}
): Promise<
	DesignRelationValidationServiceResult & {
		apply: Awaited<ReturnType<typeof applyDesignRelationCorrection>>;
	}
> {
	const validationResult = await runDesignRelationValidation(input, {
		requireStandardReferences: true
	});
	const apply = await applyDesignRelationCorrection({
		validation: validationResult.validation,
		issueId: input.issueId,
		candidateId: input.candidateId,
		files: validationResult.files as DesignRelationFileBundle
	});
	const refreshed = await runDesignRelationValidation(input, { requireStandardReferences: true });
	return { ...refreshed, apply };
}

export function relationApiErrorStatus(error: unknown): number {
	if (error instanceof DesignRelationBundleError) return error.status;
	if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
		return error.status;
	}
	return 500;
}
