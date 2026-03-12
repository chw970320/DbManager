import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { GET, PUT } from './+server';

vi.mock('$lib/registry/db-design-file-mapping', () => ({
	resolveDbDesignFileMappingBundle: vi.fn(),
	saveDbDesignFileMappingBundle: vi.fn()
}));

import {
	resolveDbDesignFileMappingBundle,
	saveDbDesignFileMappingBundle
} from '$lib/registry/db-design-file-mapping';

const FULL_BUNDLE = {
	vocabulary: 'vocabulary.json',
	domain: 'domain.json',
	term: 'term.json',
	database: 'database.json',
	entity: 'entity.json',
	attribute: 'attribute.json',
	table: 'table.json',
	column: 'column.json'
} as const;

function createCurrentMapping(excludedType: keyof typeof FULL_BUNDLE) {
	return Object.fromEntries(
		Object.entries(FULL_BUNDLE).filter(([type]) => type !== excludedType)
	) as Record<string, string>;
}

function createMockRequestEvent(options: {
	method?: string;
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/attribute/files/mapping');
	if (options.searchParams) {
		for (const [key, value] of Object.entries(options.searchParams)) {
			url.searchParams.set(key, value);
		}
	}

	const request = {
		json: vi.fn().mockResolvedValue(options.body || {}),
		method: options.method || 'GET'
	} as unknown as Request;

	return { url, request } as RequestEvent;
}

describe('Attribute Mapping API: /api/attribute/files/mapping', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveDbDesignFileMappingBundle).mockResolvedValue({ ...FULL_BUNDLE });
		vi.mocked(saveDbDesignFileMappingBundle).mockResolvedValue({
			bundle: { ...FULL_BUNDLE },
			currentMapping: createCurrentMapping('attribute')
		});
	});

	it('GET should return the shared mapping bundle for the other seven files', async () => {
		const response = await GET(createMockRequestEvent({}));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.mapping).toEqual(createCurrentMapping('attribute'));
	});

	it('PUT should save the shared mapping bundle', async () => {
		const mapping = {
			vocabulary: 'vocabulary-b.json',
			domain: 'domain-b.json',
			term: 'term-b.json',
			database: 'database-b.json',
			entity: 'entity-b.json',
			table: 'table-b.json',
			column: 'column-b.json'
		};
		const response = await PUT(
			createMockRequestEvent({
				method: 'PUT',
				body: {
					filename: 'attribute.json',
					mapping
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(saveDbDesignFileMappingBundle).toHaveBeenCalledWith({
			currentType: 'attribute',
			currentFilename: 'attribute.json',
			mapping
		});
	});

	it('PUT should return 400 on invalid mapping', async () => {
		const response = await PUT(
			createMockRequestEvent({
				method: 'PUT',
				body: {
					filename: 'attribute.json',
					mapping: {
						entity: 'entity-only.json',
						column: 'column-only.json'
					}
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(saveDbDesignFileMappingBundle).not.toHaveBeenCalled();
	});
});
