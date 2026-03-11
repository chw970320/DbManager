import { json, type RequestEvent } from '@sveltejs/kit';
import {
	createDomainDataTypeMapping,
	deleteDomainDataTypeMapping,
	loadDomainDataTypeMappingData,
	updateDomainDataTypeMapping
} from '$lib/registry/domain-data-type-mapping-registry.js';

function resolveErrorStatus(error: unknown): number {
	if (!(error instanceof Error)) {
		return 500;
	}

	if (error.message.includes('찾을 수 없습니다.')) {
		return 404;
	}

	if (
		error.message.includes('필수') ||
		error.message.includes('이미') ||
		error.message.includes('필드')
	) {
		return 400;
	}

	return 500;
}

export async function GET() {
	try {
		const data = await loadDomainDataTypeMappingData();
		return json(
			{
				success: true,
				data,
				message: '데이터타입 매핑 목록을 조회했습니다.'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('데이터타입 매핑 조회 중 오류:', error);
		return json(
			{
				success: false,
				error: '데이터타입 매핑 목록 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { dataType, abbreviation } = body as {
			dataType?: string;
			abbreviation?: string;
		};

		if (!dataType || !dataType.trim() || !abbreviation || !abbreviation.trim()) {
			return json(
				{
					success: false,
					error: '데이터타입과 매핑약어는 필수입니다.',
					message: 'Missing required fields'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const result = await createDomainDataTypeMapping(dataType, abbreviation);
		return json(
			{
				success: true,
				data: result,
				message: '데이터타입 매핑이 등록되었습니다.'
			} as ApiResponse,
			{ status: 201 }
		);
	} catch (error) {
		console.error('데이터타입 매핑 등록 중 오류:', error);
		return json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: '데이터타입 매핑 등록 중 오류가 발생했습니다.',
				message: 'Create failed'
			} as ApiResponse,
			{ status: resolveErrorStatus(error) }
		);
	}
}

export async function PUT({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { id, dataType, abbreviation } = body as {
			id?: string;
			dataType?: string;
			abbreviation?: string;
		};

		if (!id || !id.trim()) {
			return json(
				{
					success: false,
					error: '수정할 데이터타입 매핑 ID가 필요합니다.',
					message: 'Missing mapping id'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		if (!dataType || !dataType.trim() || !abbreviation || !abbreviation.trim()) {
			return json(
				{
					success: false,
					error: '데이터타입과 매핑약어는 필수입니다.',
					message: 'Missing required fields'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const result = await updateDomainDataTypeMapping(id, dataType, abbreviation);
		return json(
			{
				success: true,
				data: result,
				message: '데이터타입 매핑이 수정되었습니다.'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('데이터타입 매핑 수정 중 오류:', error);
		return json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: '데이터타입 매핑 수정 중 오류가 발생했습니다.',
				message: 'Update failed'
			} as ApiResponse,
			{ status: resolveErrorStatus(error) }
		);
	}
}

export async function DELETE({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { id } = body as { id?: string };

		if (!id || !id.trim()) {
			return json(
				{
					success: false,
					error: '삭제할 데이터타입 매핑 ID가 필요합니다.',
					message: 'Missing mapping id'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const result = await deleteDomainDataTypeMapping(id);
		return json(
			{
				success: true,
				data: result,
				message: '데이터타입 매핑이 삭제되었습니다.'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('데이터타입 매핑 삭제 중 오류:', error);
		return json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: '데이터타입 매핑 삭제 중 오류가 발생했습니다.',
				message: 'Delete failed'
			} as ApiResponse,
			{ status: resolveErrorStatus(error) }
		);
	}
}
