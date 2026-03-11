import { describe, expect, it } from 'vitest';
import { resolvePreferredFilename } from './file-selection';

describe('resolvePreferredFilename', () => {
	it('선호 파일이 목록에 있으면 우선 선택한다', () => {
		expect(
			resolvePreferredFilename({
				files: ['alpha.json', 'beta.json'],
				preferredFilename: 'beta.json',
				currentSelection: 'alpha.json',
				fallbackFilename: 'default.json'
			})
		).toBe('beta.json');
	});

	it('선호 파일이 없으면 현재 선택을 유지한다', () => {
		expect(
			resolvePreferredFilename({
				files: ['alpha.json', 'beta.json'],
				preferredFilename: 'missing.json',
				currentSelection: 'beta.json',
				fallbackFilename: 'default.json'
			})
		).toBe('beta.json');
	});

	it('선호 파일과 현재 선택이 모두 없으면 첫 번째 파일을 선택한다', () => {
		expect(
			resolvePreferredFilename({
				files: ['alpha.json', 'beta.json'],
				preferredFilename: 'missing.json',
				currentSelection: 'other.json',
				fallbackFilename: 'default.json'
			})
		).toBe('alpha.json');
	});

	it('파일이 없으면 fallback 파일을 선택한다', () => {
		expect(
			resolvePreferredFilename({
				files: [],
				preferredFilename: 'missing.json',
				currentSelection: 'other.json',
				fallbackFilename: 'default.json'
			})
		).toBe('default.json');
	});
});
