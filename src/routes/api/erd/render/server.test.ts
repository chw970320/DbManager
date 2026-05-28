import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import { renderGraphvizDot, GraphvizNotAvailableError } from '$lib/server/graphviz-renderer.js';
import { buildGraphvizERDModel } from '$lib/utils/erd-graphviz-model.js';
import { buildGraphvizDot } from '$lib/utils/graphviz-dot.js';
import { loadDesignRelationContext } from '$lib/utils/design-relation-context.js';
import { resolveDbDesignFileMappingBundle } from '$lib/registry/db-design-file-mapping';

vi.mock('$lib/utils/design-relation-context.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/utils/design-relation-context.js')>();
	return {
		...actual,
		loadDesignRelationContext: vi.fn(async () => ({
			context: {
				databases: [],
				entities: [],
				attributes: [],
				tables: [],
				columns: [],
				domains: []
			},
			files: {}
		}))
	};
});

vi.mock('$lib/registry/db-design-file-mapping', () => ({
	resolveDbDesignFileMappingBundle: vi.fn()
}));

vi.mock('$lib/utils/erd-graphviz-model.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/utils/erd-graphviz-model.js')>();
	return {
		...actual,
		buildGraphvizERDModel: vi.fn(() => ({
			tables: [],
			relationships: [],
			warnings: [],
			filters: {
				tableIds: [],
				subjectAreas: [],
				schemas: [],
				tableSearch: '',
				scopeFlags: [],
				includeExternalReferences: true
			},
			metadata: {
				generatedAt: '2026-01-01T00:00:00.000Z',
				totalTables: 0,
				totalColumns: 0,
				totalRelationships: 0,
				externalTables: 0
			}
		}))
	};
});

vi.mock('$lib/utils/graphviz-dot.js', () => ({
	buildGraphvizDot: vi.fn(() => 'digraph G {}')
}));

vi.mock('$lib/server/graphviz-renderer.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/graphviz-renderer.js')>();
	return {
		...actual,
		renderGraphvizDot: vi.fn(async () => Buffer.from('<svg/>'))
	};
});

function createMockRequestEvent(searchParams: Record<string, string> = {}): RequestEvent {
	const url = new URL('http://localhost/api/erd/render');
	Object.entries(searchParams).forEach(([key, value]) => url.searchParams.set(key, value));
	return { url, request: {} as Request } as RequestEvent;
}

describe('API: /api/erd/render', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(renderGraphvizDot).mockResolvedValue(Buffer.from('<svg/>'));
		vi.mocked(resolveDbDesignFileMappingBundle).mockResolvedValue({
			vocabulary: 'mapped-vocabulary.json',
			domain: 'mapped-domain.json',
			term: 'mapped-term.json',
			database: 'mapped-database.json',
			entity: 'mapped-entity.json',
			attribute: 'mapped-attribute.json',
			table: 'mapped-table.json',
			column: 'custom-column.json'
		});
	});

	it('기본 요청은 SVG 이미지를 반환한다', async () => {
		const response = await GET(createMockRequestEvent());
		const body = Buffer.from(await response.arrayBuffer()).toString('utf8');

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('image/svg+xml');
		expect(body).toBe('<svg/>');
		expect(renderGraphvizDot).toHaveBeenCalledWith('digraph G {}', 'svg');
	});

	it('format=png는 PNG content-type과 기본 고DPI 렌더 옵션을 반환한다', async () => {
		vi.mocked(renderGraphvizDot).mockResolvedValue(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

		const response = await GET(createMockRequestEvent({ format: 'png', mode: 'physical' }));

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('image/png');
		expect(renderGraphvizDot).toHaveBeenCalledWith('digraph G {}', 'png', { dpi: 192 });
	});

	it('format=png에서 pngDpi를 지정하면 렌더 옵션에 전달한다', async () => {
		vi.mocked(renderGraphvizDot).mockResolvedValue(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

		const response = await GET(createMockRequestEvent({ format: 'png', pngDpi: '300' }));

		expect(response.status).toBe(200);
		expect(renderGraphvizDot).toHaveBeenCalledWith('digraph G {}', 'png', { dpi: 300 });
	});

	it('Graphviz layout 개선 속성이 포함된 DOT를 렌더러에 전달한다', async () => {
		vi.mocked(buildGraphvizDot).mockReturnValueOnce(
			'digraph DbManagerERD { graph [pack=12, packmode="array_i2", pad="0.15"]; }'
		);

		const response = await GET(createMockRequestEvent());

		expect(response.status).toBe(200);
		expect(renderGraphvizDot).toHaveBeenCalledWith(
			expect.stringContaining('packmode="array_i2"'),
			'svg'
		);
		expect(renderGraphvizDot).toHaveBeenCalledWith(expect.stringContaining('pack=12'), 'svg');
	});

	it('잘못된 pngDpi는 400 JSON 오류를 반환한다', async () => {
		const response = await GET(createMockRequestEvent({ format: 'png', pngDpi: '48' }));
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('pngDpi');
		expect(renderGraphvizDot).not.toHaveBeenCalled();
	});

	it('잘못된 format은 400 JSON 오류를 반환한다', async () => {
		const response = await GET(createMockRequestEvent({ format: 'pdf' }));
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
	});

	it('필터 query를 Graphviz 모델 빌더에 전달한다', async () => {
		await GET(
			createMockRequestEvent({
				subjectArea: '주문,회원',
				schema: 'bksp',
				q: '고객',
				scopeFlag: 'Y',
				includeExternalReferences: 'false'
			})
		);

		expect(buildGraphvizERDModel).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({
				subjectAreas: ['주문', '회원'],
				schemas: ['bksp'],
				tableSearch: '고객',
				scopeFlags: ['Y'],
				includeExternalReferences: false
			})
		);
	});

	it('columnFile만 전달되어도 매핑된 정의서 파일로 컨텍스트를 로드한다', async () => {
		await GET(createMockRequestEvent({ columnFile: 'custom-column.json' }));

		expect(resolveDbDesignFileMappingBundle).toHaveBeenCalledWith('column', 'custom-column.json');
		expect(loadDesignRelationContext).toHaveBeenCalledWith(
			expect.objectContaining({
				databaseFile: 'mapped-database.json',
				entityFile: 'mapped-entity.json',
				attributeFile: 'mapped-attribute.json',
				tableFile: 'mapped-table.json',
				columnFile: 'custom-column.json',
				fallbackToFirstWhenMissing: false
			})
		);
	});

	it('Graphviz 누락 오류는 설치 안내를 포함한 JSON 오류로 반환한다', async () => {
		vi.mocked(renderGraphvizDot).mockRejectedValue(new GraphvizNotAvailableError('dot 없음'));

		const response = await GET(createMockRequestEvent());
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
		expect(result.error).toContain('dot 없음');
		expect(result.message).toContain('Graphviz');
	});
});
