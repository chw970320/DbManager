import { json, type RequestEvent } from '@sveltejs/kit';
import { loadDesignRelationContext } from '$lib/utils/design-relation-context.js';
import {
	getErdFileContextInputFromUrl,
	resolveErdFileContext
} from '$lib/utils/erd-file-context.js';
import {
	buildGraphvizERDModel,
	type GraphvizERDFilterOptions,
	type GraphvizERDFormat,
	type GraphvizERDMode
} from '$lib/utils/erd-graphviz-model.js';
import { buildGraphvizDot } from '$lib/utils/graphviz-dot.js';
import {
	DEFAULT_GRAPHVIZ_PNG_DPI,
	GraphvizNotAvailableError,
	GraphvizRenderError,
	MAX_GRAPHVIZ_PNG_DPI,
	MIN_GRAPHVIZ_PNG_DPI,
	getGraphvizInstallHint,
	renderGraphvizDot
} from '$lib/server/graphviz-renderer.js';

const VALID_FORMATS: GraphvizERDFormat[] = ['svg', 'png'];
const VALID_MODES: GraphvizERDMode[] = ['logical', 'physical'];

function parseListParam(url: URL, ...names: string[]): string[] {
	return names
		.flatMap((name) => url.searchParams.getAll(name))
		.flatMap((value) => value.split(','))
		.map((value) => value.trim())
		.filter(Boolean);
}

function parseBooleanParam(value: string | null, defaultValue: boolean): boolean {
	if (value === null) return defaultValue;
	return !['false', '0', 'no', 'n', 'off'].includes(value.trim().toLowerCase());
}

function createFilename(mode: GraphvizERDMode, format: GraphvizERDFormat): string {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	return `dbmanager-erd-${mode}-${timestamp}.${format}`;
}

function createRenderHeaders(
	format: GraphvizERDFormat,
	mode: GraphvizERDMode,
	download: boolean
): HeadersInit {
	const filename = createFilename(mode, format);
	return {
		'Content-Type': format === 'svg' ? 'image/svg+xml; charset=utf-8' : 'image/png',
		'Cache-Control': 'no-store',
		'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`
	};
}

function parseMode(url: URL): GraphvizERDMode | null {
	const mode = (url.searchParams.get('mode') || 'logical').trim().toLowerCase();
	return VALID_MODES.includes(mode as GraphvizERDMode) ? (mode as GraphvizERDMode) : null;
}

function parseFormat(url: URL): GraphvizERDFormat | null {
	const format = (url.searchParams.get('format') || 'svg').trim().toLowerCase();
	return VALID_FORMATS.includes(format as GraphvizERDFormat) ? (format as GraphvizERDFormat) : null;
}

function parsePngDpi(url: URL): number | null {
	const rawValue = (url.searchParams.get('pngDpi') || url.searchParams.get('dpi'))?.trim();
	if (!rawValue) return DEFAULT_GRAPHVIZ_PNG_DPI;
	const dpi = Number(rawValue);
	if (!Number.isInteger(dpi) || dpi < MIN_GRAPHVIZ_PNG_DPI || dpi > MAX_GRAPHVIZ_PNG_DPI) {
		return null;
	}
	return dpi;
}

function createFilterOptions(url: URL): GraphvizERDFilterOptions {
	return {
		tableIds: parseListParam(url, 'tableIds'),
		subjectAreas: parseListParam(url, 'subjectArea', 'subjectAreas'),
		schemas: parseListParam(url, 'schema', 'schemas'),
		tableSearch: url.searchParams.get('q') || url.searchParams.get('tableSearch') || undefined,
		scopeFlags: parseListParam(url, 'scopeFlag', 'scopeFlags', 'businessScope'),
		includeExternalReferences: parseBooleanParam(
			url.searchParams.get('includeExternalReferences'),
			true
		)
	};
}

/**
 * Graphviz ERD 이미지 렌더링 API
 * GET /api/erd/render
 */
export async function GET({ url }: RequestEvent) {
	try {
		const mode = parseMode(url);
		const format = parseFormat(url);
		if (!mode) {
			return json(
				{
					success: false,
					error: 'mode는 logical 또는 physical 중 하나여야 합니다.',
					message: 'Invalid mode'
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}
		if (!format) {
			return json(
				{
					success: false,
					error: 'format은 svg 또는 png 중 하나여야 합니다.',
					message: 'Invalid format'
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}
		let pngDpi: number | undefined;
		if (format === 'png') {
			const parsedPngDpi = parsePngDpi(url);
			if (parsedPngDpi === null) {
				return json(
					{
						success: false,
						error: `pngDpi는 ${MIN_GRAPHVIZ_PNG_DPI} 이상 ${MAX_GRAPHVIZ_PNG_DPI} 이하의 정수여야 합니다.`,
						message: 'Invalid pngDpi'
					} as DbDesignApiResponse,
					{ status: 400 }
				);
			}
			pngDpi = parsedPngDpi;
		}

		const fileContext = await resolveErdFileContext(getErdFileContextInputFromUrl(url));
		const {
			databaseFile,
			entityFile,
			attributeFile,
			tableFile,
			columnFile,
			domainFile,
			vocabularyFile
		} = fileContext.files;
		const { context } = await loadDesignRelationContext({
			databaseFile,
			entityFile,
			attributeFile,
			tableFile,
			columnFile,
			domainFile,
			vocabularyFile,
			includeDomain: false,
			includeVocabularyMap: false,
			fallbackToFirstWhenMissing: !fileContext.hasExplicitFile
		});

		const model = buildGraphvizERDModel(context, createFilterOptions(url));
		const dot = buildGraphvizDot(model, { mode });
		const rendered =
			format === 'png'
				? await renderGraphvizDot(dot, format, { dpi: pngDpi })
				: await renderGraphvizDot(dot, format);
		const download = parseBooleanParam(url.searchParams.get('download'), false);

		return new Response(rendered, {
			status: 200,
			headers: createRenderHeaders(format, mode, download)
		});
	} catch (error) {
		console.error('Graphviz ERD 렌더링 오류:', error);
		const isGraphvizError =
			error instanceof GraphvizNotAvailableError || error instanceof GraphvizRenderError;
		return json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Graphviz ERD 이미지 생성 중 오류가 발생했습니다.',
				message: isGraphvizError ? getGraphvizInstallHint() : 'Internal server error'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
