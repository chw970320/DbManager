import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ValidationPanelShell from './ValidationPanelShell.svelte';

describe('ValidationPanelShell', () => {
	it('shows a loading status instead of a pass status while validation is running', () => {
		render(ValidationPanelShell, {
			props: {
				title: '단어집 유효성 검사 결과',
				open: true,
				loading: true,
				totalCount: 0,
				passedCount: 0,
				failedCount: 0
			}
		});

		expect(screen.getByText('상태: 검사 중')).toBeInTheDocument();
		expect(screen.getByText('검증 결과를 계산 중입니다.')).toBeInTheDocument();
		expect(screen.queryByText('상태: 통과')).not.toBeInTheDocument();
		expect(screen.getByText('검사 중...')).toBeInTheDocument();
	});
});
