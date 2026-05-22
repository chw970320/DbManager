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
	GraphvizNotAvailableError,
	GraphvizRenderError,
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
		const dot = buildGraphvizDot(model, {
			mode,
			title: mode === 'logical' ? '논리 ERD' : '물리 ERD'
		});
		const rendered = await renderGraphvizDot(dot, format);
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
