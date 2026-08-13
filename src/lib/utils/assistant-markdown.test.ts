import { describe, expect, it } from 'vitest';

import {
	parseAssistantMarkdown,
	parseInlineMarkdown,
	stripAssistantResponseBoilerplate
} from './assistant-markdown';

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
				'### 1. 주요 단어 **Vocabulary**',
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
			'heading',
			'unordered-list',
			'table',
			'code'
		]);
		expect(blocks[1]).toEqual({
			type: 'heading',
			level: 3,
			segments: [
				{ type: 'text', text: '1. 주요 단어 ' },
				{ type: 'strong', text: 'Vocabulary' }
			]
		});
	});

	it('strips duplicated source and tool-result note boilerplate outside code blocks', () => {
		const content = stripAssistantResponseBoilerplate(
			[
				'출처: 단어집 검색(biomimicry.json), 용어집 검색(biomimicry.json)',
				'',
				'확인 결과입니다.',
				'- 출처: biomimicry 번들',
				'- 코드: `HLDY`',
				'',
				'*참고: 답변은 제공된 도구 검색 결과에 기반하여 작성되었습니다.*',
				'',
				'```text',
				'출처: code sample',
				'```'
			].join('\n')
		);

		expect(content).toBe(
			['확인 결과입니다.', '- 코드: `HLDY`', '', '```text', '출처: code sample', '```'].join('\n')
		);
	});

	// provider 교체 후에도 유지되어야 하는 표기 변형. 영어 표기(`Sources:`)는 두 패턴이
	// 리터럴 `출처`를 하드 요구하므로 이번 범위에서 제외한다 — 패턴 확장은 별도 작업.
	it.each([
		['**출처**: 표준용어집', '**출처**: 표준용어집'],
		['## 출처', '## 출처'],
		['- 출처: biomimicry 번들', '- 출처: biomimicry 번들']
	])('strips the %s source notation', (_label, line) => {
		const content = stripAssistantResponseBoilerplate(['확인 결과입니다.', line].join('\n'));

		expect(content).toBe('확인 결과입니다.');
	});
});
