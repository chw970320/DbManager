import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ERDViewer from './ERDViewer.svelte';
import type { ERDData } from '../types/erd-mapping.js';

function createMockERDData(): ERDData {
	return {
		nodes: [
			{
				id: 'node-1',
				type: 'table',
				layerType: 'physical',
				label: 'users',
				data: {
					id: 'table-1',
					tableEnglishName: 'users',
					schemaName: 'public',
					businessClassification: 'COMMON',
					tableVolume: 'SMALL',
					nonPublicReason: '',
					openDataList: '',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z'
				}
			}
		],
		edges: [],
		mappings: [],
		metadata: {
			generatedAt: '2024-01-01T00:00:00.000Z',
			totalNodes: 1,
			totalEdges: 0,
			totalMappings: 0,
			logicalNodes: 0,
			physicalNodes: 1,
			domainNodes: 0
		}
	};
}

const defaultProps = {
	erdData: createMockERDData(),
	renderUrl: '/api/erd/render?format=svg&mode=logical',
	mode: 'logical' as const
};

describe('ERDViewer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('Graphviz ERD 뷰어와 이미지 미리보기를 렌더링한다', () => {
		render(ERDViewer, { props: defaultProps });

		expect(screen.getByText('Graphviz ERD 다이어그램')).toBeInTheDocument();
		const image = screen.getByAltText('Graphviz ERD 다이어그램') as HTMLImageElement;
		expect(image.src).toContain('/api/erd/render?format=svg&mode=logical');
	});

	it('Mermaid 코드 복사/다운로드 버튼을 노출하지 않는다', () => {
		render(ERDViewer, { props: defaultProps });

		expect(screen.queryByText('Mermaid 코드 복사')).not.toBeInTheDocument();
		expect(screen.queryByText('Mermaid 파일 다운로드')).not.toBeInTheDocument();
	});

	it('미리보기 헤더에 중복 다운로드 링크를 노출하지 않는다', () => {
		render(ERDViewer, { props: defaultProps });

		expect(screen.queryByText('SVG 다운로드')).not.toBeInTheDocument();
		expect(screen.queryByText('PNG 다운로드')).not.toBeInTheDocument();
	});

	it('이미지 로드 오류를 한국어 메시지로 표시한다', async () => {
		render(ERDViewer, { props: defaultProps });

		await fireEvent.error(screen.getByAltText('Graphviz ERD 다이어그램'));

		expect(screen.getByText('이미지 생성 오류')).toBeInTheDocument();
		expect(screen.getByText(/Graphviz ERD 이미지를 불러오지 못했습니다/)).toBeInTheDocument();
	});
});
