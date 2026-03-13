import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DbDesignFileMappingFields from './DbDesignFileMappingFields.svelte';

describe('DbDesignFileMappingFields', () => {
	it('현재 파일을 제외하고 표준 용어/DB 설계 카테고리를 한 번씩만 렌더링한다', () => {
		render(DbDesignFileMappingFields, {
			props: {
				currentType: 'database',
				mapping: {
					vocabulary: 'team-vocabulary.json',
					domain: 'team-domain.json',
					term: 'team-term.json',
					entity: 'team-entity.json',
					attribute: 'team-attribute.json',
					table: 'team-table.json',
					column: 'team-column.json'
				},
				fileOptions: {
					vocabulary: ['team-vocabulary.json'],
					domain: ['team-domain.json'],
					term: ['team-term.json'],
					entity: ['team-entity.json'],
					attribute: ['team-attribute.json'],
					table: ['team-table.json'],
					column: ['team-column.json']
				}
			}
		});

		expect(screen.getAllByText('표준 용어')).toHaveLength(1);
		expect(screen.getAllByText('DB 설계')).toHaveLength(1);
		expect(screen.getByLabelText('단어집 파일')).toBeInTheDocument();
		expect(screen.getByLabelText('용어집 파일')).toBeInTheDocument();
		expect(screen.getByLabelText('엔터티 정의서 파일')).toBeInTheDocument();
		expect(screen.queryByLabelText('데이터베이스 정의서 파일')).not.toBeInTheDocument();
	});

	it('선택 값을 변경하면 해당 셀렉트에 즉시 반영한다', async () => {
		render(DbDesignFileMappingFields, {
			props: {
				currentType: 'term',
				mapping: {
					vocabulary: 'vocabulary.json',
					domain: 'domain.json',
					database: 'database.json',
					entity: 'entity.json',
					attribute: 'attribute.json',
					table: 'table.json',
					column: 'column.json'
				},
				fileOptions: {
					vocabulary: ['vocabulary.json', 'team-vocabulary.json'],
					domain: ['domain.json'],
					database: ['database.json'],
					entity: ['entity.json'],
					attribute: ['attribute.json'],
					table: ['table.json'],
					column: ['column.json']
				}
			}
		});

		const vocabularySelect = screen.getByLabelText('단어집 파일') as HTMLSelectElement;

		await fireEvent.change(vocabularySelect, {
			target: { value: 'team-vocabulary.json' }
		});

		expect(vocabularySelect.value).toBe('team-vocabulary.json');
	});
});
