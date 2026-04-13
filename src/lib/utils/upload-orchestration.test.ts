import { describe, expect, it, vi } from 'vitest';
import { completeUploadWithMappingSave } from './upload-orchestration';

describe('upload-orchestration', () => {
	it('업로드 후 매핑 저장 성공 시 최종 성공 상태를 반환한다', async () => {
		const fetchFn = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				success: true,
				data: {
					autoSync: {
						success: true,
						summary: '매핑 저장과 자동 반영이 완료되었습니다.'
					}
				}
			})
		});

		const result = await completeUploadWithMappingSave({
			fetchFn,
			mappingEndpoint: '/api/term/files/mapping',
			filename: 'term.json',
			mapping: {
				vocabulary: 'vocabulary.json',
				domain: 'domain.json',
				database: 'database.json',
				entity: 'entity.json',
				attribute: 'attribute.json',
				table: 'table.json',
				column: 'column.json'
			},
			uploadMessage: '용어 데이터 업로드 완료'
		});

		expect(result.success).toBe(true);
		expect(result.successMessage).toBe('용어 데이터 업로드 완료');
		expect(result.warningMessage).toBeUndefined();
		expect(fetchFn).toHaveBeenCalledWith(
			'/api/term/files/mapping',
			expect.objectContaining({ method: 'PUT' })
		);
	});

	it('매핑 저장 실패 시 partial success를 반환한다', async () => {
		const fetchFn = vi.fn().mockResolvedValue({
			ok: false,
			json: vi.fn().mockResolvedValue({
				success: false,
				error: '매핑 저장 실패'
			})
		});

		const result = await completeUploadWithMappingSave({
			fetchFn,
			mappingEndpoint: '/api/vocabulary/files/mapping',
			filename: 'vocabulary.json',
			mapping: {
				domain: 'domain.json',
				term: 'term.json',
				database: 'database.json',
				entity: 'entity.json',
				attribute: 'attribute.json',
				table: 'table.json',
				column: 'column.json'
			},
			uploadMessage: '단어 업로드 완료'
		});

		expect(result.success).toBe(false);
		expect(result.partialSuccess).toBe(true);
		expect(result.successMessage).toBe('단어 업로드 완료');
		expect(result.errorMessage).toContain('매핑 저장 실패');
	});
});
