export type HighlightSegment = {
	text: string;
	matched: boolean;
	tone?: 'search' | 'error';
};

export function getHighlightedSegments(
	text: string | undefined | null,
	query: string,
	shouldHighlight = true
): HighlightSegment[] {
	if (!text) return [{ text: '-', matched: false }];
	if (!query || !shouldHighlight) return [{ text, matched: false }];

	const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
	const segments: HighlightSegment[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			segments.push({ text: text.slice(lastIndex, match.index), matched: false });
		}

		segments.push({ text: match[0], matched: true, tone: 'search' });
		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		segments.push({ text: text.slice(lastIndex), matched: false });
	}

	return segments.length > 0 ? segments : [{ text, matched: false }];
}
