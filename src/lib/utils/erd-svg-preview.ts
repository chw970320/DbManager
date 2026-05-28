/**
 * ERD Graphviz SVG preview 전용 유틸리티입니다.
 *
 * 이 모듈은 서버가 생성한 같은 출처 `/api/erd/render?format=svg` 응답만
 * inline 미리보기로 표시하기 위한 최소 guard/sanitizer입니다. 범용 SVG sanitizer로
 * 재사용하지 말고, 다른 inline SVG 표면이 필요하면 별도 allowlist 정책을 설계하세요.
 */

const ERD_RENDER_PATH = '/api/erd/render';
const FALLBACK_SVG_SIZE = 800;

export interface SvgPreviewSize {
	width: number;
	height: number;
}

export interface SanitizedErdSvgPreview extends SvgPreviewSize {
	markup: string;
}

export function isAllowedErdSvgRenderUrl(
	value: string,
	currentHref: string,
	currentOrigin: string
): boolean {
	const targetUrl = new URL(value, currentHref);
	const targetFormat = (targetUrl.searchParams.get('format') || 'svg').toLowerCase();
	return (
		targetUrl.origin === currentOrigin &&
		targetUrl.pathname === ERD_RENDER_PATH &&
		targetFormat === 'svg'
	);
}

export function parseSvgDimension(value: string | null): number | null {
	if (!value) return null;
	const matched = value.trim().match(/^([0-9]*\.?[0-9]+)\s*([a-z%]*)$/i);
	if (!matched) return null;
	const numericValue = Number(matched[1]);
	if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
	const unit = matched[2].toLowerCase();
	if (unit === 'pt') return numericValue * (4 / 3);
	return numericValue;
}

export function extractSvgSize(svgElement: Element): SvgPreviewSize {
	const width = parseSvgDimension(svgElement.getAttribute('width'));
	const height = parseSvgDimension(svgElement.getAttribute('height'));
	if (width && height) return { width, height };

	const viewBox = svgElement.getAttribute('viewBox');
	if (viewBox) {
		const parts = viewBox
			.trim()
			.split(/[\s,]+/)
			.map(Number);
		if (parts.length === 4 && parts.every((part) => Number.isFinite(part))) {
			return {
				width: Math.max(parts[2], 1),
				height: Math.max(parts[3], 1)
			};
		}
	}

	return { width: FALLBACK_SVG_SIZE, height: FALLBACK_SVG_SIZE };
}

export function sanitizeErdSvgText(svgText: string): SanitizedErdSvgPreview {
	const parser = new DOMParser();
	const svgDocument = parser.parseFromString(svgText, 'image/svg+xml');
	if (svgDocument.querySelector('parsererror')) {
		throw new Error('Invalid SVG');
	}

	const svgElement = svgDocument.documentElement;
	if (!svgElement || svgElement.tagName.toLowerCase() !== 'svg') {
		throw new Error('Invalid SVG');
	}

	svgElement
		.querySelectorAll('script, foreignObject, foreignobject')
		.forEach((element) => element.remove());

	const allElements = [svgElement, ...Array.from(svgElement.querySelectorAll('*'))];
	for (const element of allElements) {
		for (const attribute of Array.from(element.attributes)) {
			const attributeName = attribute.name.toLowerCase();
			const attributeValue = attribute.value;
			if (attributeName.startsWith('on') || /javascript\s*:/i.test(attributeValue)) {
				element.removeAttribute(attribute.name);
			}
		}
	}

	const size = extractSvgSize(svgElement);
	return {
		markup: new XMLSerializer().serializeToString(svgElement),
		width: size.width,
		height: size.height
	};
}
