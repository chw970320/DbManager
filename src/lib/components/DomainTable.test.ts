import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import DomainTable from './DomainTable.svelte';
import type { DomainEntry } from '$lib/types/domain';

const createEntry = (overrides: Partial<DomainEntry> = {}): DomainEntry => ({
	id: 'domain-1',
	revision: '1',
	domainGroup: '공통',
	domainCategory: '분류',
	standardDomainName: '공통_분류_VARCHAR',
	physicalDataType: 'VARCHAR',
	dataLength: '50',
	decimalPlaces: '0',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
	...overrides
});

describe('DomainTable', () => {
	it('검색어 하이라이트는 HTML을 실행하지 않고 텍스트로 렌더링한다', () => {
		const entries = [
			createEntry({
				standardDomainName: '<mark onmouseover=alert(1)>위험도메인'
			})
		];

		const { container } = render(DomainTable, {
			props: {
				entries,
				searchQuery: '위험도메인',
				onsort: vi.fn(),
				onpagechange: vi.fn()
			}
		});

		expect(container).toHaveTextContent('<mark onmouseover=alert(1)>위험도메인');
		expect(screen.getByText('위험도메인', { selector: 'mark' })).toBeInTheDocument();
		expect(container.querySelector('[onmouseover]')).not.toBeInTheDocument();
	});
});
