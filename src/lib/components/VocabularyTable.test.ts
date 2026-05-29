import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import VocabularyTable from './VocabularyTable.svelte';
import type { VocabularyEntry } from '$lib/types/vocabulary';

const createEntry = (overrides: Partial<VocabularyEntry> = {}): VocabularyEntry => ({
	id: 'vocabulary-1',
	standardName: '표준단어',
	abbreviation: 'STD',
	englishName: 'STANDARD',
	description: '설명',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
	...overrides
});

describe('VocabularyTable', () => {
	it('검색어 하이라이트는 HTML을 실행하지 않고 텍스트로 렌더링한다', () => {
		const entries = [
			createEntry({
				standardName: '<mark onmouseover=alert(1)>위험단어'
			})
		];

		const { container } = render(VocabularyTable, {
			props: {
				entries,
				searchQuery: '위험단어',
				onsort: vi.fn(),
				onpagechange: vi.fn()
			}
		});

		expect(container).toHaveTextContent('<mark onmouseover=alert(1)>위험단어');
		expect(screen.getByText('위험단어', { selector: 'mark' })).toBeInTheDocument();
		expect(container.querySelector('[onmouseover]')).not.toBeInTheDocument();
	});
});
