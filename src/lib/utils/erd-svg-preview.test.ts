import { describe, expect, it } from 'vitest';
import {
	isAllowedErdSvgRenderUrl,
	parseSvgDimension,
	sanitizeErdSvgText
} from './erd-svg-preview.js';

describe('erd-svg-preview', () => {
	const currentHref = 'http://localhost:5173/erd';
	const currentOrigin = 'http://localhost:5173';

	it('같은 출처 ERD SVG render URL만 허용한다', () => {
		expect(
			isAllowedErdSvgRenderUrl(
				'/api/erd/render?format=svg&mode=logical',
				currentHref,
				currentOrigin
			)
		).toBe(true);

		expect(
			isAllowedErdSvgRenderUrl(
				'/api/erd/render?format=png&mode=logical',
				currentHref,
				currentOrigin
			)
		).toBe(false);
		expect(
			isAllowedErdSvgRenderUrl('/api/other/render?format=svg', currentHref, currentOrigin)
		).toBe(false);
		expect(
			isAllowedErdSvgRenderUrl(
				'https://example.com/api/erd/render?format=svg',
				currentHref,
				currentOrigin
			)
		).toBe(false);
	});

	it('Graphviz pt 단위 SVG 크기를 브라우저 px 기준으로 변환한다', () => {
		expect(parseSvgDimension('1252pt')).toBeCloseTo(1669.333, 3);
		expect(parseSvgDimension('1182pt')).toBeCloseTo(1576, 3);
		expect(parseSvgDimension('800')).toBe(800);
		expect(parseSvgDimension('0pt')).toBeNull();
		expect(parseSvgDimension('bad')).toBeNull();
	});

	it('위험한 inline SVG 태그와 속성을 제거한다', () => {
		const result = sanitizeErdSvgText(
			'<svg width="100" height="80"><script>alert(1)</script><foreignObject></foreignObject><g onclick="evil()"><a href="javascript:evil()">ERD</a></g></svg>'
		);

		expect(result.width).toBe(100);
		expect(result.height).toBe(80);
		expect(result.markup).not.toContain('<script');
		expect(result.markup).not.toContain('foreignObject');
		expect(result.markup).not.toContain('onclick=');
		expect(result.markup).not.toContain('javascript:');
		expect(result.markup).toContain('ERD');
	});

	it('SVG root가 아니거나 파싱 실패 시 오류를 반환한다', () => {
		expect(() => sanitizeErdSvgText('<html></html>')).toThrow('Invalid SVG');
		expect(() => sanitizeErdSvgText('<svg><g></svg>')).toThrow('Invalid SVG');
	});
});
