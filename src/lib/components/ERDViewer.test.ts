import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import ERDViewer from './ERDViewer.svelte';
import type { ERDData } from '../types/erd-mapping.js';

// Mock mermaid
vi.mock('mermaid', () => ({
	default: {
		initialize: vi.fn(),
		run: vi.fn().mockResolvedValue(undefined)
	}
}));

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
	value: {
		writeText: vi.fn().mockResolvedValue(undefined)
	},
	writable: true
});

// Mock alert
global.alert = vi.fn();

// 테스트용 Mock ERD 데이터
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
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z'
				}
			}
		],
		edges: [],
		mappings: [],
		metadata: {
			generatedAt: new Date().toISOString(),
			totalNodes: 1,
			totalEdges: 0,
			totalMappings: 0,
			logicalNodes: 0,
			physicalNodes: 1,
			domainNodes: 0
		}
	};
}

describe('ERDViewer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render ERD viewer component', async () => {
			const erdData = createMockERDData();
			render(ERDViewer, { props: { erdData } });

			expect(screen.getByText('ERD 다이어그램')).toBeInTheDocument();
		});

		it('should display metadata correctly', async () => {
			const erdData = createMockERDData();
			render(ERDViewer, { props: { erdData } });

			expect(screen.getByText(/논리적 계층/)).toBeInTheDocument();
			expect(screen.getByText(/물리적 계층/)).toBeInTheDocument();
			expect(screen.getByText(/도메인/)).toBeInTheDocument();
		});

		it('should show size warning when limited', async () => {
			const erdData: ERDData = {
				...createMockERDData(),
				nodes: Array.from({ length: 150 }, (_, i) => ({
					id: `node-${i}`,
					type: 'table' as const,
					layerType: 'physical' as const,
					label: `table-${i}`,
					data: {
						id: `table-${i}`,
						tableEnglishName: `table-${i}`,
						schemaName: 'public',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				})),
				metadata: {
					...createMockERDData().metadata,
					totalNodes: 150,
					physicalNodes: 150
				}
			};

			render(ERDViewer, { props: { erdData } });

			await waitFor(() => {
				expect(screen.getByText(/⚠️/)).toBeInTheDocument();
			});
		});
	});

	describe('Mermaid initialization and rendering', () => {
		it('should initialize Mermaid on mount', async () => {
			const mermaid = await import('mermaid');
			const erdData = createMockERDData();
			render(ERDViewer, { props: { erdData } });

			await waitFor(() => {
				expect(mermaid.default.initialize).toHaveBeenCalled();
			});
		});

		it('should render Mermaid diagram', async () => {
			const mermaid = await import('mermaid');
			const erdData = createMockERDData();
			render(ERDViewer, { props: { erdData } });

			await waitFor(
				() => {
					expect(mermaid.default.run).toHaveBeenCalled();
				},
				{ timeout: 3000 }
			);
		});

		it('should handle Mermaid rendering errors', async () => {
			const mermaid = await import('mermaid');
			vi.mocked(mermaid.default.run).mockRejectedValue(new Error('Rendering failed'));

			const erdData = createMockERDData();
			render(ERDViewer, { props: { erdData } });

			await waitFor(
				() => {
					expect(screen.getByText(/오류 발생/)).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		it('should update diagram when erdData changes', async () => {
			const mermaid = await import('mermaid');
			const erdData = createMockERDData();
			const { rerender } = render(ERDViewer, { props: { erdData } });

			await waitFor(() => {
				expect(mermaid.default.run).toHaveBeenCalled();
			});

			vi.clearAllMocks();

			// erdData 변경
			const newErdData = {
				...erdData,
				nodes: [
					...erdData.nodes,
					{
						id: 'node-2',
						type: 'table' as const,
						layerType: 'physical' as const,
						label: 'products',
						data: {
							id: 'table-2',
							tableEnglishName: 'products',
							schemaName: 'public',
							createdAt: '2024-01-01T00:00:00.000Z',
							updatedAt: '2024-01-01T00:00:00.000Z'
						}
					}
				]
			};

			rerender({ erdData: newErdData });

			await waitFor(
				() => {
					expect(mermaid.default.run).toHaveBeenCalledTimes(1);
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('User interactions', () => {
		it('should copy Mermaid code to clipboard', async () => {
			const erdData = createMockERDData();
			render(ERDViewer, { props: { erdData } });

			await waitFor(() => {
				const copyButton = screen.getByText('Mermaid 코드 복사');
				copyButton.click();
			});

			expect(navigator.clipboard.writeText).toHaveBeenCalled();
			expect(global.alert).toHaveBeenCalledWith('Mermaid 코드가 클립보드에 복사되었습니다.');
		});

		it('should download Mermaid file', async () => {
			// Mock URL.createObjectURL
			const mockCreateObjectURL = vi.fn(() => 'blob:url');
			global.URL.createObjectURL = mockCreateObjectURL;
			global.URL.revokeObjectURL = vi.fn();

			// 실제 anchor 요소를 사용하되 click만 모킹
			const mockClick = vi.fn();
			const originalCreateElement = document.createElement.bind(document);
			vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
				const element = originalCreateElement(tag);
				if (tag === 'a') {
					element.click = mockClick;
				}
				return element;
			});

			const erdData = createMockERDData();
			render(ERDViewer, { props: { erdData } });

			await waitFor(() => {
				const downloadButton = screen.getByText('Mermaid 파일 다운로드');
				downloadButton.click();
			});

			expect(mockCreateObjectURL).toHaveBeenCalled();
			expect(mockClick).toHaveBeenCalled();
		});

		it('should show loading state during rendering', async () => {
			const mermaid = await import('mermaid');
			// 렌더링을 지연시켜 로딩 상태 확인
			let resolveRender: () => void;
			const renderPromise = new Promise<void>((resolve) => {
				resolveRender = resolve;
			});
			vi.mocked(mermaid.default.run).mockImplementation(() => renderPromise);

			const erdData = createMockERDData();
			render(ERDViewer, { props: { erdData } });

			// 로딩 상태 확인
			expect(screen.getByText('ERD 다이어그램 생성 중...')).toBeInTheDocument();

			// 렌더링 완료
			resolveRender!();
			await renderPromise;
		});
	});
});
