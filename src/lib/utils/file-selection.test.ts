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

	it('저장된 browse 선택 파일이 있으면 첫 번째 bksp 파일보다 우선 복원한다', () => {
		expect(
			resolvePreferredFilename({
				files: ['bksp.json', 'custom-domain.json', 'domain.json'],
				currentSelection: 'custom-domain.json',
				fallbackFilename: 'domain.json'
			})
		).toBe('custom-domain.json');
	});

	it('저장된 browse 선택 파일이 사라졌으면 현재 목록의 첫 번째 파일로 폴백한다', () => {
		expect(
			resolvePreferredFilename({
				files: ['bksp.json', 'custom-term.json'],
				currentSelection: 'missing-term.json',
				fallbackFilename: 'term.json'
			})
		).toBe('bksp.json');
	});
});
