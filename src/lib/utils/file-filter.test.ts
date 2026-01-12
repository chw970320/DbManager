import { describe, it, expect } from 'vitest';
import {
	isSystemVocabularyFile,
	isSystemDomainFile,
	isSystemTermFile,
	isSystemDatabaseFile,
	isSystemEntityFile,
	isSystemAttributeFile,
	isSystemTableFile,
	isSystemColumnFile,
	filterVocabularyFiles,
	filterDomainFiles,
	filterTermFiles,
	filterDatabaseFiles,
	filterEntityFiles,
	filterAttributeFiles,
	filterTableFiles,
	filterColumnFiles
} from './file-filter';

describe('file-filter', () => {
	describe('isSystemVocabularyFile', () => {
		it('should return true for system vocabulary files', () => {
			expect(isSystemVocabularyFile('vocabulary.json')).toBe(true);
			expect(isSystemVocabularyFile('history.json')).toBe(true);
		});

		it('should return false for user files', () => {
			expect(isSystemVocabularyFile('custom-vocabulary.json')).toBe(false);
		});
	});

	describe('isSystemDomainFile', () => {
		it('should return true for system domain files', () => {
			expect(isSystemDomainFile('domain.json')).toBe(true);
			expect(isSystemDomainFile('history.json')).toBe(true);
		});

		it('should return false for user files', () => {
			expect(isSystemDomainFile('custom-domain.json')).toBe(false);
		});
	});

	describe('isSystemTermFile', () => {
		it('should return true for system term files', () => {
			expect(isSystemTermFile('term.json')).toBe(true);
			expect(isSystemTermFile('history.json')).toBe(true);
		});

		it('should return false for user files', () => {
			expect(isSystemTermFile('custom-term.json')).toBe(false);
		});
	});

	describe('isSystemDatabaseFile', () => {
		it('should return true for system database files', () => {
			expect(isSystemDatabaseFile('database.json')).toBe(true);
		});

		it('should return false for user files', () => {
			expect(isSystemDatabaseFile('custom-database.json')).toBe(false);
		});
	});

	describe('isSystemEntityFile', () => {
		it('should return true for system entity files', () => {
			expect(isSystemEntityFile('entity.json')).toBe(true);
		});

		it('should return false for user files', () => {
			expect(isSystemEntityFile('custom-entity.json')).toBe(false);
		});
	});

	describe('isSystemAttributeFile', () => {
		it('should return true for system attribute files', () => {
			expect(isSystemAttributeFile('attribute.json')).toBe(true);
		});

		it('should return false for user files', () => {
			expect(isSystemAttributeFile('custom-attribute.json')).toBe(false);
		});
	});

	describe('isSystemTableFile', () => {
		it('should return true for system table files', () => {
			expect(isSystemTableFile('table.json')).toBe(true);
		});

		it('should return false for user files', () => {
			expect(isSystemTableFile('custom-table.json')).toBe(false);
		});
	});

	describe('isSystemColumnFile', () => {
		it('should return true for system column files', () => {
			expect(isSystemColumnFile('column.json')).toBe(true);
		});

		it('should return false for user files', () => {
			expect(isSystemColumnFile('custom-column.json')).toBe(false);
		});
	});

	describe('filterVocabularyFiles', () => {
		it('should filter system files when showSystemFiles is false', () => {
			const files = ['vocabulary.json', 'custom-vocabulary.json', 'history.json'];
			const result = filterVocabularyFiles(files, false);

			expect(result).toEqual(['custom-vocabulary.json']);
		});

		it('should return all files when showSystemFiles is true', () => {
			const files = ['vocabulary.json', 'custom-vocabulary.json', 'history.json'];
			const result = filterVocabularyFiles(files, true);

			expect(result).toEqual(files);
		});

		it('should return system files when no user files exist', () => {
			const files = ['vocabulary.json', 'history.json'];
			const result = filterVocabularyFiles(files, false);

			expect(result).toEqual(files);
		});
	});

	describe('filterDomainFiles', () => {
		it('should filter system files when showSystemFiles is false', () => {
			const files = ['domain.json', 'custom-domain.json', 'history.json'];
			const result = filterDomainFiles(files, false);

			expect(result).toEqual(['custom-domain.json']);
		});

		it('should return all files when showSystemFiles is true', () => {
			const files = ['domain.json', 'custom-domain.json', 'history.json'];
			const result = filterDomainFiles(files, true);

			expect(result).toEqual(files);
		});
	});

	describe('filterTermFiles', () => {
		it('should filter system files when showSystemFiles is false', () => {
			const files = ['term.json', 'custom-term.json', 'history.json'];
			const result = filterTermFiles(files, false);

			expect(result).toEqual(['custom-term.json']);
		});

		it('should return all files when showSystemFiles is true', () => {
			const files = ['term.json', 'custom-term.json', 'history.json'];
			const result = filterTermFiles(files, true);

			expect(result).toEqual(files);
		});
	});

	describe('filterDatabaseFiles', () => {
		it('should filter system files when showSystemFiles is false', () => {
			const files = ['database.json', 'custom-database.json'];
			const result = filterDatabaseFiles(files, false);

			expect(result).toEqual(['custom-database.json']);
		});

		it('should return all files when showSystemFiles is true', () => {
			const files = ['database.json', 'custom-database.json'];
			const result = filterDatabaseFiles(files, true);

			expect(result).toEqual(files);
		});
	});

	describe('filterEntityFiles', () => {
		it('should filter system files when showSystemFiles is false', () => {
			const files = ['entity.json', 'custom-entity.json'];
			const result = filterEntityFiles(files, false);

			expect(result).toEqual(['custom-entity.json']);
		});
	});

	describe('filterAttributeFiles', () => {
		it('should filter system files when showSystemFiles is false', () => {
			const files = ['attribute.json', 'custom-attribute.json'];
			const result = filterAttributeFiles(files, false);

			expect(result).toEqual(['custom-attribute.json']);
		});
	});

	describe('filterTableFiles', () => {
		it('should filter system files when showSystemFiles is false', () => {
			const files = ['table.json', 'custom-table.json'];
			const result = filterTableFiles(files, false);

			expect(result).toEqual(['custom-table.json']);
		});
	});

	describe('filterColumnFiles', () => {
		it('should filter system files when showSystemFiles is false', () => {
			const files = ['column.json', 'custom-column.json'];
			const result = filterColumnFiles(files, false);

			expect(result).toEqual(['custom-column.json']);
		});
	});
});
