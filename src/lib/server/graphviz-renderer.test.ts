import { EventEmitter } from 'node:events';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { spawn } from 'node:child_process';
import {
	DEFAULT_GRAPHVIZ_PNG_DPI,
	GraphvizNotAvailableError,
	GraphvizRenderError,
	renderGraphvizDot
} from './graphviz-renderer.js';

const { mockSpawn } = vi.hoisted(() => ({
	mockSpawn: vi.fn()
}));

vi.mock('node:child_process', () => ({
	spawn: mockSpawn,
	default: {
		spawn: mockSpawn
	}
}));

function createMockChild() {
	const child = new EventEmitter() as EventEmitter & {
		stdout: EventEmitter;
		stderr: EventEmitter;
		stdin: { end: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };
		kill: ReturnType<typeof vi.fn>;
	};
	child.stdout = new EventEmitter();
	child.stderr = new EventEmitter();
	child.stdin = {
		end: vi.fn(),
		on: vi.fn()
	};
	child.kill = vi.fn();
	return child;
}

describe('renderGraphvizDot', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('dot CLI에 format 인자를 전달하고 stdout Buffer를 반환한다', async () => {
		const child = createMockChild();
		vi.mocked(spawn).mockReturnValue(child as never);

		const resultPromise = renderGraphvizDot('digraph G {}', 'svg');
		child.stdout.emit('data', Buffer.from('<svg/>'));
		child.emit('close', 0);

		await expect(resultPromise).resolves.toEqual(Buffer.from('<svg/>'));
		expect(spawn).toHaveBeenCalledWith('dot', ['-Tsvg'], { stdio: ['pipe', 'pipe', 'pipe'] });
		expect(child.stdin.end).toHaveBeenCalledWith('digraph G {}', 'utf8');
	});

	it('PNG 렌더링은 기본 고DPI 옵션을 전달한다', async () => {
		const child = createMockChild();
		vi.mocked(spawn).mockReturnValue(child as never);

		const resultPromise = renderGraphvizDot('digraph G {}', 'png');
		child.stdout.emit('data', Buffer.from([0x89, 0x50, 0x4e, 0x47]));
		child.emit('close', 0);

		await expect(resultPromise).resolves.toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
		expect(spawn).toHaveBeenCalledWith('dot', ['-Tpng', `-Gdpi=${DEFAULT_GRAPHVIZ_PNG_DPI}`], {
			stdio: ['pipe', 'pipe', 'pipe']
		});
	});

	it('PNG 렌더링에 사용자 지정 DPI 옵션을 전달한다', async () => {
		const child = createMockChild();
		vi.mocked(spawn).mockReturnValue(child as never);

		const resultPromise = renderGraphvizDot('digraph G {}', 'png', { dpi: 300 });
		child.stdout.emit('data', Buffer.from([0x89, 0x50, 0x4e, 0x47]));
		child.emit('close', 0);

		await expect(resultPromise).resolves.toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
		expect(spawn).toHaveBeenCalledWith('dot', ['-Tpng', '-Gdpi=300'], {
			stdio: ['pipe', 'pipe', 'pipe']
		});
	});

	it('ENOENT를 GraphvizNotAvailableError로 변환한다', async () => {
		const child = createMockChild();
		vi.mocked(spawn).mockReturnValue(child as never);

		const resultPromise = renderGraphvizDot('digraph G {}', 'png');
		const error = new Error('not found') as NodeJS.ErrnoException;
		error.code = 'ENOENT';
		child.emit('error', error);

		await expect(resultPromise).rejects.toBeInstanceOf(GraphvizNotAvailableError);
	});

	it('non-zero exit을 GraphvizRenderError로 변환한다', async () => {
		const child = createMockChild();
		vi.mocked(spawn).mockReturnValue(child as never);

		const resultPromise = renderGraphvizDot('digraph G {}', 'svg');
		child.stderr.emit('data', Buffer.from('syntax error'));
		child.emit('close', 1);

		await expect(resultPromise).rejects.toBeInstanceOf(GraphvizRenderError);
	});
});
