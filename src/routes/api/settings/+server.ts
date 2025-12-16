import { json, type RequestEvent } from '@sveltejs/kit';
import {
	setShowVocabularySystemFiles,
	setShowDomainSystemFiles,
	setShowTermSystemFiles,
	getAllSettings,
	setAllSettings
} from '$lib/utils/settings.js';

/**
 * 설정 조회 API
 * GET /api/settings
 */
export async function GET() {
	try {
		const allSettings = await getAllSettings();

		return json({
			success: true,
			data: allSettings
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '설정 조회 중 오류가 발생했습니다.'
			},
			{ status: 500 }
		);
	}
}

/**
 * 설정 저장 API
 * POST /api/settings
 */
export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();

		// 단어집 설정 업데이트
		if (typeof body.showVocabularySystemFiles === 'boolean') {
			await setShowVocabularySystemFiles(body.showVocabularySystemFiles);
		}

		// 도메인 설정 업데이트
		if (typeof body.showDomainSystemFiles === 'boolean') {
			await setShowDomainSystemFiles(body.showDomainSystemFiles);
		}

		// 용어 설정 업데이트
		if (typeof body.showTermSystemFiles === 'boolean') {
			await setShowTermSystemFiles(body.showTermSystemFiles);
		}

		// 전체 설정 객체인 경우
		if (
			body.showVocabularySystemFiles === undefined &&
			body.showDomainSystemFiles === undefined &&
			body.showTermSystemFiles === undefined &&
			Object.keys(body).length > 0
		) {
			await setAllSettings(body);
		}

		return json({
			success: true,
			message: '설정이 저장되었습니다.'
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '설정 저장 중 오류가 발생했습니다.'
			},
			{ status: 500 }
		);
	}
}
