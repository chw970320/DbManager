/**
 * Graphviz CLI 렌더러
 */

import { spawn } from 'node:child_process';
import type { GraphvizERDFormat } from '$lib/utils/erd-graphviz-model.js';

export const DEFAULT_GRAPHVIZ_PNG_DPI = 192;
export const MIN_GRAPHVIZ_PNG_DPI = 96;
export const MAX_GRAPHVIZ_PNG_DPI = 600;

export interface GraphvizRenderOptions {
	timeoutMs?: number;
	dpi?: number;
}

export class GraphvizNotAvailableError extends Error {
	constructor(message = 'Graphviz dot 실행 파일을 찾을 수 없습니다.') {
		super(message);
		this.name = 'GraphvizNotAvailableError';
	}
}

export class GraphvizRenderError extends Error {
	readonly stderr?: string;
	readonly exitCode?: number | null;

	constructor(message: string, options: { stderr?: string; exitCode?: number | null } = {}) {
		super(message);
		this.name = 'GraphvizRenderError';
		this.stderr = options.stderr;
		this.exitCode = options.exitCode;
	}
}

export function getGraphvizInstallHint(): string {
	return 'Graphviz가 필요합니다. 로컬에는 graphviz(dot)를 설치하고, Docker 환경은 이미지 빌드 시 graphviz 패키지를 포함해야 합니다.';
}

export async function renderGraphvizDot(
	dot: string,
	format: GraphvizERDFormat,
	optionsOrTimeoutMs: GraphvizRenderOptions | number = {}
): Promise<Buffer> {
	const options =
		typeof optionsOrTimeoutMs === 'number' ? { timeoutMs: optionsOrTimeoutMs } : optionsOrTimeoutMs;
	const timeoutMs = options.timeoutMs ?? 30_000;
	const command = process.env.GRAPHVIZ_DOT || 'dot';
	const args = [`-T${format}`];
	if (format === 'png') {
		args.push(`-Gdpi=${options.dpi ?? DEFAULT_GRAPHVIZ_PNG_DPI}`);
	}

	return new Promise<Buffer>((resolve, reject) => {
		const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
		const stdoutChunks: Buffer[] = [];
		const stderrChunks: Buffer[] = [];
		let settled = false;

		const settle = (callback: () => void) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			callback();
		};

		const timeout = setTimeout(() => {
			child.kill('SIGKILL');
			settle(() => {
				reject(
					new GraphvizRenderError(`Graphviz 렌더링 시간이 ${timeoutMs}ms를 초과했습니다.`, {
						exitCode: null
					})
				);
			});
		}, timeoutMs);

		child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
		child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

		child.on('error', (error: NodeJS.ErrnoException) => {
			settle(() => {
				if (error.code === 'ENOENT') {
					reject(new GraphvizNotAvailableError(`${error.message}. ${getGraphvizInstallHint()}`));
					return;
				}
				reject(new GraphvizRenderError(error.message));
			});
		});

		child.on('close', (code) => {
			settle(() => {
				const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
				if (code !== 0) {
					reject(
						new GraphvizRenderError(
							stderr || `Graphviz 렌더링이 종료 코드 ${code ?? 'unknown'}로 실패했습니다.`,
							{ stderr, exitCode: code }
						)
					);
					return;
				}
				resolve(Buffer.concat(stdoutChunks));
			});
		});

		child.stdin.on('error', (error) => {
			settle(() => reject(new GraphvizRenderError(error.message)));
		});
		child.stdin.end(dot, 'utf8');
	});
}
