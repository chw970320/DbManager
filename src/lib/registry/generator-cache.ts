import type { VocabularyData } from '$lib/types/vocabulary';

type GeneratorDictionary = {
	ko: Set<string>;
	en: Set<string>;
};

type GeneratorConversionMaps = {
	koToEn: Map<string, string[]>;
	enToKo: Map<string, string[]>;
};

const vocabularyCache: Map<string, VocabularyData> = new Map();
const conversionMapCache: Map<string, GeneratorConversionMaps> = new Map();
const dictionaryCache: Map<string, GeneratorDictionary> = new Map();

export function getCachedGeneratorVocabulary(filename: string): VocabularyData | undefined {
	return vocabularyCache.get(filename);
}

export function setCachedGeneratorVocabulary(filename: string, data: VocabularyData): void {
	vocabularyCache.set(filename, data);
}

export function getCachedGeneratorConversionMaps(
	filename: string
): GeneratorConversionMaps | undefined {
	return conversionMapCache.get(filename);
}

export function setCachedGeneratorConversionMaps(
	filename: string,
	maps: GeneratorConversionMaps
): void {
	conversionMapCache.set(filename, maps);
}

export function getCachedGeneratorDictionary(filename: string): GeneratorDictionary | undefined {
	return dictionaryCache.get(filename);
}

export function setCachedGeneratorDictionary(filename: string, dictionary: GeneratorDictionary): void {
	dictionaryCache.set(filename, dictionary);
}

export function invalidateGeneratorCache(filename?: string): void {
	if (filename) {
		vocabularyCache.delete(filename);
		conversionMapCache.delete(filename);
		dictionaryCache.delete(filename);
		return;
	}

	vocabularyCache.clear();
	conversionMapCache.clear();
	dictionaryCache.clear();
}

export function invalidateAllGeneratorCaches(): void {
	invalidateGeneratorCache();
}

export function __clearGeneratorCacheForTest(): void {
	invalidateAllGeneratorCaches();
}
