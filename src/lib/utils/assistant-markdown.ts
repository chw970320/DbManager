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
