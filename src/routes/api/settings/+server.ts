import { json, type RequestEvent } from '@sveltejs/kit';
import {
	getShowVocabularySystemFiles,
	setShowVocabularySystemFiles,
	getShowDomainSystemFiles,
	setShowDomainSystemFiles,
	getAllSettings,
	setAllSettings
} from '$lib/utils/settings.js';

/**
 * 설정 조회 API
 * GET /api/settings
 */
export async function GET() {
	// #region agent log
	fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/settings/+server.ts:GET:entry',message:'GET 요청 시작',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
	// #endregion
	try {
		const allSettings = await getAllSettings();
		// #region agent log
		fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/settings/+server.ts:GET:afterGetAll',message:'설정 로드 완료',data:{settings:allSettings},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
		// #endregion

		return json({
			success: true,
			data: allSettings
		});
	} catch (error) {
		// #region agent log
		fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/settings/+server.ts:GET:error',message:'GET 요청 실패',data:{error:error instanceof Error?error.message:String(error),stack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
		// #endregion
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

		// 전체 설정 객체인 경우
		if (
			body.showVocabularySystemFiles === undefined &&
			body.showDomainSystemFiles === undefined &&
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

