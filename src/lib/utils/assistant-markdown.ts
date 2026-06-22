export type AssistantMarkdownInlineSegment =
	| {
			type: 'text';
			text: string;
	  }
	| {
			type: 'strong';
			text: string;
	  }
	| {
			type: 'code';
			text: string;
	  };

export type AssistantMarkdownBlock =
	| {
			type: 'paragraph';
			segments: AssistantMarkdownInlineSegment[];
	  }
	| {
			type: 'unordered-list' | 'ordered-list';
			items: AssistantMarkdownInlineSegment[][];
	  }
	| {
			type: 'code';
			language: string;
			code: string;
	  }
	| {
			type: 'table';
			headers: AssistantMarkdownInlineSegment[][];
			rows: AssistantMarkdownInlineSegment[][][];
	  };

const UNORDERED_LIST_PATTERN = /^\s*[-*]\s+(.+)$/;
const ORDERED_LIST_PATTERN = /^\s*\d+[.)]\s+(.+)$/;
const TABLE_SEPARATOR_PATTERN = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const SOURCE_LINE_PATTERN = /^\s*(?:[-*]\s*)?(?:#{1,6}\s*)?\*{0,2}출처\*{0,2}\s*[:：]\s*\*{0,2}.+$/;
const SOURCE_HEADING_PATTERN =
	/^\s*(?:[-*]\s*)?(?:#{1,6}\s*)?\*{0,2}출처\*{0,2}\s*[:：]?\s*\*{0,2}\s*$/;
const TOOL_RESULT_NOTE_PATTERN =
	/^\s*(?:[-*]\s*)?\*?\s*참고\s*[:：]\s*답변은\s*제공된\s*도구\s*검색\s*결과에\s*기반(?:하여)?\s*작성되었습니다\.?\s*\*?\s*$/;

export function stripAssistantResponseBoilerplate(content: string): string {
	const lines = content.replace(/\r\n/g, '\n').split('\n');
	const keptLines: string[] = [];
	let inCodeFence = false;
	let skippingSourceBlock = false;

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith('```')) {
			inCodeFence = !inCodeFence;
			skippingSourceBlock = false;
			keptLines.push(line);
			continue;
		}

		if (!inCodeFence && skippingSourceBlock) {
			if (!trimmed) {
				skippingSourceBlock = false;
				keptLines.push(line);
			}
			continue;
		}

		if (!inCodeFence && TOOL_RESULT_NOTE_PATTERN.test(line)) {
			continue;
		}

		if (!inCodeFence && SOURCE_LINE_PATTERN.test(line)) {
			continue;
		}

		if (!inCodeFence && SOURCE_HEADING_PATTERN.test(line)) {
			skippingSourceBlock = true;
			continue;
		}

		keptLines.push(line);
	}

	return collapseBlankLines(keptLines).join('\n').trim();
}

export function parseAssistantMarkdown(markdown: string): AssistantMarkdownBlock[] {
	const lines = markdown.replace(/\r\n/g, '\n').split('\n');
	const blocks: AssistantMarkdownBlock[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index] ?? '';
		if (!line.trim()) {
			index += 1;
			continue;
		}

		if (line.trimStart().startsWith('```')) {
			const language = line.trim().slice(3).trim();
			const codeLines: string[] = [];
			index += 1;
			while (index < lines.length && !(lines[index] ?? '').trimStart().startsWith('```')) {
				codeLines.push(lines[index] ?? '');
				index += 1;
			}
			if (index < lines.length) {
				index += 1;
			}
			blocks.push({
				type: 'code',
				language,
				code: codeLines.join('\n')
			});
			continue;
		}

		if (isTableStart(lines, index)) {
			const headers = splitTableCells(lines[index] ?? '').map(parseInlineMarkdown);
			index += 2;
			const rows: AssistantMarkdownInlineSegment[][][] = [];
			while (index < lines.length && isTableRow(lines[index] ?? '')) {
				rows.push(splitTableCells(lines[index] ?? '').map(parseInlineMarkdown));
				index += 1;
			}
			blocks.push({ type: 'table', headers, rows });
			continue;
		}

		const unorderedMatch = line.match(UNORDERED_LIST_PATTERN);
		if (unorderedMatch) {
			const items: AssistantMarkdownInlineSegment[][] = [];
			while (index < lines.length) {
				const match = (lines[index] ?? '').match(UNORDERED_LIST_PATTERN);
				if (!match) break;
				items.push(parseInlineMarkdown(match[1] ?? ''));
				index += 1;
			}
			blocks.push({ type: 'unordered-list', items });
			continue;
		}

		const orderedMatch = line.match(ORDERED_LIST_PATTERN);
		if (orderedMatch) {
			const items: AssistantMarkdownInlineSegment[][] = [];
			while (index < lines.length) {
				const match = (lines[index] ?? '').match(ORDERED_LIST_PATTERN);
				if (!match) break;
				items.push(parseInlineMarkdown(match[1] ?? ''));
				index += 1;
			}
			blocks.push({ type: 'ordered-list', items });
			continue;
		}

		const paragraphLines: string[] = [];
		while (
			index < lines.length &&
			(lines[index] ?? '').trim() &&
			!(lines[index] ?? '').trimStart().startsWith('```') &&
			!UNORDERED_LIST_PATTERN.test(lines[index] ?? '') &&
			!ORDERED_LIST_PATTERN.test(lines[index] ?? '') &&
			!isTableStart(lines, index)
		) {
			paragraphLines.push((lines[index] ?? '').trim());
			index += 1;
		}
		blocks.push({
			type: 'paragraph',
			segments: parseInlineMarkdown(paragraphLines.join(' '))
		});
	}

	return blocks;
}

export function parseInlineMarkdown(markdown: string): AssistantMarkdownInlineSegment[] {
	const segments: AssistantMarkdownInlineSegment[] = [];
	let index = 0;

	while (index < markdown.length) {
		const codeIndex = markdown.indexOf('`', index);
		const strongIndex = markdown.indexOf('**', index);
		const nextIndex = firstNonNegative([codeIndex, strongIndex]);

		if (nextIndex === -1) {
			pushTextSegment(segments, markdown.slice(index));
			break;
		}

		if (nextIndex > index) {
			pushTextSegment(segments, markdown.slice(index, nextIndex));
		}

		if (nextIndex === codeIndex) {
			const closeIndex = markdown.indexOf('`', codeIndex + 1);
			if (closeIndex === -1) {
				pushTextSegment(segments, markdown.slice(codeIndex));
				break;
			}
			segments.push({
				type: 'code',
				text: markdown.slice(codeIndex + 1, closeIndex)
			});
			index = closeIndex + 1;
			continue;
		}

		const closeIndex = markdown.indexOf('**', strongIndex + 2);
		if (closeIndex === -1) {
			pushTextSegment(segments, markdown.slice(strongIndex));
			break;
		}
		segments.push({
			type: 'strong',
			text: markdown.slice(strongIndex + 2, closeIndex)
		});
		index = closeIndex + 2;
	}

	return segments.length > 0 ? segments : [{ type: 'text', text: '' }];
}

function pushTextSegment(segments: AssistantMarkdownInlineSegment[], text: string) {
	if (!text) {
		return;
	}
	const previous = segments.at(-1);
	if (previous?.type === 'text') {
		previous.text += text;
		return;
	}
	segments.push({ type: 'text', text });
}

function firstNonNegative(values: number[]): number {
	const positive = values.filter((value) => value >= 0);
	return positive.length > 0 ? Math.min(...positive) : -1;
}

function isTableStart(lines: string[], index: number): boolean {
	return isTableRow(lines[index] ?? '') && TABLE_SEPARATOR_PATTERN.test(lines[index + 1] ?? '');
}

function isTableRow(line: string): boolean {
	return line.includes('|') && splitTableCells(line).length >= 2;
}

function splitTableCells(line: string): string[] {
	const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
	return trimmed.split('|').map((cell) => cell.trim());
}

function collapseBlankLines(lines: string[]): string[] {
	const collapsed: string[] = [];
	for (const line of lines) {
		const isBlank = !line.trim();
		const previousIsBlank = collapsed.length > 0 && !collapsed.at(-1)?.trim();
		if (isBlank && previousIsBlank) {
			continue;
		}
		collapsed.push(line);
	}

	while (collapsed.length > 0 && !collapsed[0]?.trim()) {
		collapsed.shift();
	}
	while (collapsed.length > 0 && !collapsed.at(-1)?.trim()) {
		collapsed.pop();
	}
	return collapsed;
}
