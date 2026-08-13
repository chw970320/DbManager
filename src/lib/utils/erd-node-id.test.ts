import { describe, expect, it } from 'vitest';

import { createErdTableNodeId, parseErdTableNodeId } from './erd-node-id';

describe('ERD 테이블 노드 ID', () => {
	it('uuid 형태 엔트리 ID로 노드 ID를 만든다', () => {
		expect(createErdTableNodeId('3f2b1c4d-55aa-4bb1-9ccd-0123456789ab')).toBe(
			'erd-table-3f2b1c4d-55aa-4bb1-9ccd-0123456789ab'
		);
	});

	it('XML NAME으로 쓸 수 없는 엔트리 ID는 심지 않는다', () => {
		expect(createErdTableNodeId('table 1')).toBeNull();
		expect(createErdTableNodeId('테이블')).toBeNull();
		expect(createErdTableNodeId('t"1')).toBeNull();
		expect(createErdTableNodeId('   ')).toBeNull();
		expect(createErdTableNodeId(undefined)).toBeNull();
	});

	it('노드 ID에서 엔트리 ID를 되돌린다', () => {
		expect(parseErdTableNodeId('erd-table-table-1')).toBe('table-1');
		expect(parseErdTableNodeId(' erd-table-table-1 ')).toBe('table-1');
	});

	it('규칙에 맞지 않는 노드 ID는 무시한다', () => {
		expect(parseErdTableNodeId('node1')).toBeNull();
		expect(parseErdTableNodeId('erd-table-')).toBeNull();
		expect(parseErdTableNodeId(null)).toBeNull();
	});
});
