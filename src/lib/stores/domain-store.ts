import type { DomainData } from '../types/domain.js';
import { loadDomainData, saveDomainData } from '../utils/file-handler.js';

/**
 * 현재 저장된 도메인 데이터를 반환하는 함수
 */
export async function getDomainDataStore(): Promise<DomainData> {
	try {
		return await loadDomainData();
	} catch (error) {
		console.error('도메인 데이터 로드 실패:', error);
		// 오류 발생 시 빈 데이터 반환
		return {
			entries: [],
			lastUpdated: new Date().toISOString(),
			totalCount: 0
		};
	}
}

/**
 * 도메인 데이터 저장소를 업데이트하는 함수
 */
export async function setDomainDataStore(data: DomainData): Promise<void> {
	try {
		await saveDomainData(data);
	} catch (error) {
		console.error('도메인 데이터 저장 실패:', error);
		throw error;
	}
}

/**
 * 도메인 데이터 저장소를 초기화하는 함수
 */
export async function resetDomainDataStore(): Promise<void> {
	try {
		const emptyData: DomainData = {
			entries: [],
			lastUpdated: new Date().toISOString(),
			totalCount: 0
		};
		await saveDomainData(emptyData);
	} catch (error) {
		console.error('도메인 데이터 초기화 실패:', error);
		throw error;
	}
}
