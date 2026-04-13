import type { ApiResponse } from '$lib/types/vocabulary';

type MappingPayload = Record<string, string>;

export type UploadMappingSaveResult = {
	success: boolean;
	partialSuccess: boolean;
	successMessage?: string;
	warningMessage?: string;
	errorMessage?: string;
};

type CompleteUploadWithMappingSaveParams = {
	fetchFn: (input: string, init?: RequestInit) => Promise<Response>;
	mappingEndpoint: string;
	filename: string;
	mapping: MappingPayload;
	uploadMessage: string;
};

export async function completeUploadWithMappingSave(
	params: CompleteUploadWithMappingSaveParams
): Promise<UploadMappingSaveResult> {
	const { fetchFn, mappingEndpoint, filename, mapping, uploadMessage } = params;

	try {
		const response = await fetchFn(mappingEndpoint, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				filename,
				mapping
			})
		});
		const result = (await response.json().catch(() => ({}))) as ApiResponse & {
			data?: {
				autoSync?: {
					success?: boolean;
					summary?: string;
				};
			};
		};

		if (!response.ok || !result.success) {
			return {
				success: false,
				partialSuccess: true,
				successMessage: uploadMessage,
				errorMessage: `업로드는 완료되었지만 현재 매핑 저장에 실패했습니다. ${result.error || ''}`.trim()
			};
		}

		const autoSync = result.data?.autoSync;
		return {
			success: true,
			partialSuccess: autoSync?.success === false,
			successMessage: uploadMessage,
			warningMessage: autoSync?.success === false ? autoSync.summary : undefined
		};
	} catch (error) {
		return {
			success: false,
			partialSuccess: true,
			successMessage: uploadMessage,
			errorMessage: `업로드는 완료되었지만 현재 매핑 저장 중 오류가 발생했습니다. ${error instanceof Error ? error.message : ''}`.trim()
		};
	}
}
