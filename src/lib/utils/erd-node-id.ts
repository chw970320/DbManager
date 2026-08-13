/**
 * ERD SVG 노드와 정의서 엔트리를 연결하기 위한 노드 ID 유틸리티
 *
 * Graphviz DOT의 `id` 속성은 SVG `<g class="node">` 요소의 `id`로 그대로 출력된다.
 * 서버는 테이블 정의서 엔트리 ID를 이 규칙으로 심고, 뷰어는 같은 규칙으로 되읽는다.
 */

export const ERD_TABLE_NODE_ID_PREFIX = 'erd-table-';

/** XML NAME으로 안전하게 쓸 수 있는 엔트리 ID 형식 (uuid 포함) */
const SAFE_ENTRY_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * 테이블 정의서 엔트리 ID를 SVG 노드 ID로 변환한다.
 * XML NAME으로 쓸 수 없는 ID는 심지 않고 null을 반환한다.
 */
export function createErdTableNodeId(tableId: string | undefined | null): string | null {
	const normalized = (tableId ?? '').trim();
	if (!normalized || !SAFE_ENTRY_ID_PATTERN.test(normalized)) return null;
	return `${ERD_TABLE_NODE_ID_PREFIX}${normalized}`;
}

/**
 * SVG 노드 ID에서 테이블 정의서 엔트리 ID를 되돌린다.
 */
export function parseErdTableNodeId(nodeId: string | undefined | null): string | null {
	const normalized = (nodeId ?? '').trim();
	if (!normalized.startsWith(ERD_TABLE_NODE_ID_PREFIX)) return null;
	const tableId = normalized.slice(ERD_TABLE_NODE_ID_PREFIX.length);
	return SAFE_ENTRY_ID_PATTERN.test(tableId) ? tableId : null;
}
