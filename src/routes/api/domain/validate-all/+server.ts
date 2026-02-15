import { json, type RequestEvent } from '@sveltejs/kit';
import { loadDomainData } from '$lib/registry/data-registry';
import type { DomainApiResponse, DomainEntry } from '$lib/types/domain';
import { generateStandardDomainName } from '$lib/utils/validation';

type ValidationIssue = {
	type: string;
	code: string;
	message: string;
	field?: string;
	priority: number;
};

type ValidationResult = {
	entry: DomainEntry;
	errors: ValidationIssue[];
	generatedDomainName: string;
};

const ERROR_PRIORITY: Record<string, number> = {
	REQUIRED_FIELD: 1,
	DOMAIN_NAME_MISMATCH: 2,
	DOMAIN_NAME_DUPLICATE: 3
};

function sortIssues(errors: ValidationIssue[]): ValidationIssue[] {
	return [...errors].sort((a, b) => a.priority - b.priority);
}

export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'domain.json';
		const domainData = await loadDomainData(filename);
		const entries = domainData.entries;

		const generatedNameCount = new Map<string, number>();
		const generatedById = new Map<string, string>();

		for (const entry of entries) {
			const generated = generateStandardDomainName(
				entry.domainCategory,
				entry.physicalDataType,
				entry.dataLength,
				entry.decimalPlaces
			);
			generatedById.set(entry.id, generated);
			generatedNameCount.set(generated, (generatedNameCount.get(generated) || 0) + 1);
		}

		const failedEntries: ValidationResult[] = [];
		for (const entry of entries) {
			const errors: ValidationIssue[] = [];
			const generatedDomainName = generatedById.get(entry.id) || '';

			if (!entry.domainCategory?.trim()) {
				errors.push({
					type: 'REQUIRED_FIELD',
					code: 'REQUIRED_FIELD',
					message: '도메인 분류명이 필요합니다.',
					field: 'domainCategory',
					priority: ERROR_PRIORITY.REQUIRED_FIELD
				});
			}
			if (!entry.physicalDataType?.trim()) {
				errors.push({
					type: 'REQUIRED_FIELD',
					code: 'REQUIRED_FIELD',
					message: '물리 데이터타입이 필요합니다.',
					field: 'physicalDataType',
					priority: ERROR_PRIORITY.REQUIRED_FIELD
				});
			}

			if (generatedDomainName && entry.standardDomainName !== generatedDomainName) {
				errors.push({
					type: 'DOMAIN_NAME_MISMATCH',
					code: 'DOMAIN_NAME_MISMATCH',
					message: `표준도메인명과 계산값이 다릅니다. 기대값: ${generatedDomainName}`,
					field: 'standardDomainName',
					priority: ERROR_PRIORITY.DOMAIN_NAME_MISMATCH
				});
			}

			if ((generatedNameCount.get(generatedDomainName) || 0) > 1) {
				errors.push({
					type: 'DOMAIN_NAME_DUPLICATE',
					code: 'DOMAIN_NAME_DUPLICATE',
					message: '생성되는 표준도메인명이 중복됩니다.',
					field: 'standardDomainName',
					priority: ERROR_PRIORITY.DOMAIN_NAME_DUPLICATE
				});
			}

			if (errors.length > 0) {
				failedEntries.push({
					entry,
					errors: sortIssues(errors),
					generatedDomainName
				});
			}
		}

		return json(
			{
				success: true,
				data: {
					totalCount: entries.length,
					failedCount: failedEntries.length,
					passedCount: entries.length - failedEntries.length,
					failedEntries
				},
				message: 'Domain validation completed'
			} as DomainApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('Domain validate-all 오류:', error);
		return json(
			{
				success: false,
				error: '도메인 유효성 검사 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as DomainApiResponse,
			{ status: 500 }
		);
	}
}
