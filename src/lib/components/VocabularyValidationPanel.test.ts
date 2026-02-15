import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import VocabularyValidationPanel from './VocabularyValidationPanel.svelte';

describe('VocabularyValidationPanel', () => {
	it('renders summary and entries', () => {
		render(VocabularyValidationPanel, {
			props: {
				open: true,
				totalCount: 2,
				failedCount: 1,
				passedCount: 1,
				results: [
					{
						entry: {
							id: 'v1',
							standardName: '사용자',
							abbreviation: 'USER',
							englishName: 'User',
							createdAt: '',
							updatedAt: ''
						},
						errors: [
							{
								type: 'ABBREVIATION_DUPLICATE',
								code: 'ABBREVIATION_DUPLICATE',
								message: '중복 약어',
								priority: 1
							}
						]
					}
				]
			}
		});

		expect(screen.getByText('단어집 유효성 검사 결과')).toBeInTheDocument();
		expect(screen.getByText('사용자')).toBeInTheDocument();
		expect(screen.getByText('중복 약어')).toBeInTheDocument();
	});
});
