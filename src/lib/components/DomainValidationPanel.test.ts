import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import DomainValidationPanel from './DomainValidationPanel.svelte';

describe('DomainValidationPanel', () => {
	it('renders summary and entries', () => {
		render(DomainValidationPanel, {
			props: {
				open: true,
				totalCount: 2,
				failedCount: 1,
				passedCount: 1,
				results: [
					{
						entry: {
							id: 'd1',
							domainGroup: '공통',
							domainCategory: '회원',
							standardDomainName: 'WRONG',
							physicalDataType: 'VARCHAR',
							createdAt: '',
							updatedAt: ''
						},
						generatedDomainName: '회원_VARCHAR(10)',
						errors: [
							{
								type: 'DOMAIN_NAME_MISMATCH',
								code: 'DOMAIN_NAME_MISMATCH',
								message: '도메인명 불일치',
								priority: 1
							}
						]
					}
				]
			}
		});

		expect(screen.getByText('도메인 유효성 검사 결과')).toBeInTheDocument();
		expect(screen.getByText('WRONG')).toBeInTheDocument();
		expect(screen.getByText('도메인명 불일치')).toBeInTheDocument();
	});
});
