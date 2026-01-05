import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, DomainEntry } from '$lib/types/domain.js';
import { loadDomainData, listDomainFiles } from '$lib/utils/file-handler.js';
import { generateStandardDomainName, validateDomainNameUniqueness } from '$lib/utils/validation.js';

/**
 * 도메인 validation API
 * POST /api/domain/validate
 *
 * 클라이언트에서 전송 전에 validation을 수행하기 위한 엔드포인트
 */
export async function POST({ request, url }: RequestEvent) {
	try {
		const body = await request.json();
		const { domainCategory, physicalDataType, dataLength, decimalPlaces, entryId } = body;
		const filename = url.searchParams.get('filename') || 'domain.json';

		// 필수 필드 검증
		if (!domainCategory || typeof domainCategory !== 'string' || !domainCategory.trim()) {
			return json(
				{
					success: false,
					error: '도메인 분류명이 필요합니다.',
					message: 'Missing domainCategory'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		if (!physicalDataType || typeof physicalDataType !== 'string' || !physicalDataType.trim()) {
			return json(
				{
					success: false,
					error: '물리 데이터타입이 필요합니다.',
					message: 'Missing physicalDataType'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 도메인명 자동 생성
		const generatedDomainName = generateStandardDomainName(
			domainCategory,
			physicalDataType,
			dataLength,
			decimalPlaces
		);

		// 도메인명 유일성 검사
		try {
			const allDomainFiles = await listDomainFiles();
			const allDomainEntries: DomainEntry[] = [];
			for (const file of allDomainFiles) {
				try {
					const fileData = await loadDomainData(file);
					// 수정 모드인 경우 현재 entry 제외
					const filteredEntries = entryId
						? fileData.entries.filter((e) => e.id !== entryId)
						: fileData.entries;
					allDomainEntries.push(...filteredEntries);
				} catch (error) {
					console.warn(`도메인 파일 ${file} 로드 실패:`, error);
				}
			}

			const uniquenessError = validateDomainNameUniqueness(generatedDomainName, allDomainEntries);
			if (uniquenessError) {
				return json(
					{
						success: false,
						error: uniquenessError,
						message: 'Duplicate domain name'
					} as ApiResponse,
					{ status: 409 }
				);
			}
		} catch (validationError) {
			console.warn('도메인명 유일성 확인 중 오류:', validationError);
			// validation 실패 시에도 성공으로 반환 (서버에서 다시 검증)
		}

		// 모든 validation 통과
		return json(
			{
				success: true,
				message: 'Validation passed'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('Validation 중 오류:', error);
		return json(
			{
				success: false,
				error: 'Validation 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
