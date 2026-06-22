import { describe, expect, it } from 'vitest';

import { parseAssistantMarkdown, parseInlineMarkdown } from './assistant-markdown';

describe('assistant markdown parser', () => {
	it('parses paragraphs, inline code, and strong text without producing raw HTML', () => {
		expect(parseInlineMarkdown('**휴일** 값은 `HLDY`입니다.')).toEqual([
			{ type: 'strong', text: '휴일' },
			{ type: 'text', text: ' 값은 ' },
			{ type: 'code', text: 'HLDY' },
			{ type: 'text', text: '입니다.' }
		]);
	});

	it('parses common assistant markdown blocks', () => {
		const blocks = parseAssistantMarkdown(
			[
				'확인 결과입니다.',
				'',
				'- 단어: 방문자',
				'- 컬럼: 방문자수',
				'',
				'| 구분 | 값 |',
				'| --- | --- |',
				'| 약어 | HLDY |',
				'',
				'```text',
				'출처: biomimicry',
				'```'
			].join('\n')
		);

		expect(blocks.map((block) => block.type)).toEqual([
			'paragraph',
			'unordered-list',
			'table',
			'code'
		]);
	});
});
