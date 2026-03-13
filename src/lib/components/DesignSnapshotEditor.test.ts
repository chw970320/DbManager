import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DesignSnapshotEditor from './DesignSnapshotEditor.svelte';

const bundles = [
	{
		id: 'bundle-1',
		files: {
			vocabulary: 'vocabulary-1.json',
			domain: 'domain-1.json',
			term: 'term-1.json',
			database: 'database-1.json',
			entity: 'entity-1.json',
			attribute: 'attribute-1.json',
			table: 'table-1.json',
			column: 'column-1.json'
		},
		createdAt: '2026-03-13T01:00:00.000Z',
		updatedAt: '2026-03-13T01:00:00.000Z'
	},
	{
		id: 'bundle-2',
		files: {
			vocabulary: 'vocabulary-2.json',
			domain: 'domain-2.json',
			term: 'term-2.json',
			database: 'database-2.json',
			entity: 'entity-2.json',
			attribute: 'attribute-2.json',
			table: 'table-2.json',
			column: 'column-2.json'
		},
		createdAt: '2026-03-13T02:00:00.000Z',
		updatedAt: '2026-03-13T02:00:00.000Z'
	}
];

describe('DesignSnapshotEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render an empty state when no bundles are available', () => {
		render(DesignSnapshotEditor, {
			props: {
				isOpen: true,
				bundles: []
			}
		});

		expect(screen.getByRole('dialog', { name: '스냅샷 추가' })).toBeInTheDocument();
		expect(screen.getByText('저장 가능한 파일 번들이 없습니다.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '스냅샷 저장' })).toBeDisabled();
	});

	it('should dispatch a save event with trimmed values for the chosen bundle', async () => {
		const handleSave = vi.fn();
		render(DesignSnapshotEditor, {
			props: {
				isOpen: true,
				bundles,
				initialBundleId: 'bundle-2',
				onsave: handleSave
			}
		});

		expect(screen.getByLabelText('대상 번들')).toHaveValue('bundle-2');

		await fireEvent.input(screen.getByLabelText('스냅샷명'), {
			target: { value: '  표준 보정 전  ' }
		});
		await fireEvent.input(screen.getByLabelText('설명'), {
			target: { value: '  자동 보정 실행 전 상태  ' }
		});
		await fireEvent.click(screen.getByRole('button', { name: '스냅샷 저장' }));

		expect(handleSave).toHaveBeenCalledTimes(1);
		expect(handleSave).toHaveBeenCalledWith({
			bundleId: 'bundle-2',
			name: '표준 보정 전',
			description: '자동 보정 실행 전 상태'
		});
	});

	it('should update the included file summary when the bundle changes', async () => {
		render(DesignSnapshotEditor, {
			props: {
				isOpen: true,
				bundles
			}
		});

		expect(screen.getByText('컬럼 정의서 · column-1.json')).toBeInTheDocument();

		await fireEvent.change(screen.getByLabelText('대상 번들'), {
			target: { value: 'bundle-2' }
		});

		expect(screen.getByText('컬럼 정의서 · column-2.json')).toBeInTheDocument();
		expect(screen.getByText('용어집 · term-2.json')).toBeInTheDocument();
	});
});
