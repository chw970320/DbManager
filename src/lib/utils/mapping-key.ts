export type NormalizeKeyOptions = {
	emptyLikeDash?: boolean;
};

/**
 * Normalize string keys used in mapping/relation comparisons.
 * - trims leading/trailing whitespace
 * - lowercases for case-insensitive matching
 * - optionally treats "-" as empty
 */
export function normalizeKey(
	value: string | number | undefined | null,
	options: NormalizeKeyOptions = {}
): string {
	if (value === undefined || value === null) return '';
	const trimmed = String(value).trim();
	if (trimmed.length === 0) return '';
	if (options.emptyLikeDash && trimmed === '-') return '';
	return trimmed.toLowerCase();
}

/**
 * Build a normalized composite key.
 * Returns empty string when at least one part is empty after normalization.
 */
export function buildCompositeKey(
	parts: Array<string | number | undefined | null>,
	options: NormalizeKeyOptions = {}
): string {
	const normalized = parts.map((part) => normalizeKey(part, options));
	if (normalized.some((part) => part === '')) {
		return '';
	}
	return normalized.join('|');
}

/**
 * Split underscore-based name parts and normalize each token.
 */
export function splitUnderscoreParts(value: string | undefined | null): string[] {
	if (!value) return [];
	return value
		.split('_')
		.map((part) => part.trim())
		.filter((part) => part.length > 0)
		.map((part) => part.toLowerCase());
}
