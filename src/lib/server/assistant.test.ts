import { describe, expect, it } from 'vitest';

import { buildLlmRequestBody, getLlmPromptBudget } from './assistant';

const MODEL = 'gpt-5.6-luna';
const MESSAGES = [{ role: 'user' as const, content: '휴일 알려줘' }];

function body(env: Record<string, string | undefined>) {
	return buildLlmRequestBody(env, MODEL, MESSAGES);
}

describe('buildLlmRequestBody', () => {
	it('sends max_completion_tokens and never max_tokens', () => {
		const result = body({});
		expect(result.max_completion_tokens).toBe(8192);
		expect('max_tokens' in result).toBe(false);
		expect('temperature' in result).toBe(false);
		expect('reasoning_effort' in result).toBe(false);
	});

	// docker-compose의 `${VAR:-}`가 빈 문자열을 주입하므로 blank는 반드시 미설정과 동일해야 한다.
	it.each(['', '   '])('treats blank LLM_TEMPERATURE (%j) as unset', (value) => {
		expect('temperature' in body({ LLM_TEMPERATURE: value })).toBe(false);
	});

	// truthiness 분기로 퇴화하면 '0'이 조용히 사라진다.
	it('keeps an explicit zero temperature', () => {
		expect(body({ LLM_TEMPERATURE: '0' }).temperature).toBe(0);
	});

	it('passes a valid temperature through', () => {
		expect(body({ LLM_TEMPERATURE: '0.2' }).temperature).toBe(0.2);
	});

	it.each(['abc', '-1', '3'])('rejects out-of-contract LLM_TEMPERATURE (%j)', (value) => {
		expect('temperature' in body({ LLM_TEMPERATURE: value })).toBe(false);
	});

	it.each(['', 'turbo'])('rejects invalid LLM_REASONING_EFFORT (%j)', (value) => {
		expect('reasoning_effort' in body({ LLM_REASONING_EFFORT: value })).toBe(false);
	});

	it.each(['low', 'LOW'])('normalizes allowed LLM_REASONING_EFFORT (%j)', (value) => {
		expect(body({ LLM_REASONING_EFFORT: value }).reasoning_effort).toBe('low');
	});

	it('clamps LLM_MAX_OUTPUT_TOKENS to the model output ceiling', () => {
		expect(body({ LLM_MAX_OUTPUT_TOKENS: '999999' }).max_completion_tokens).toBe(128000);
	});

	it('honours an explicit LLM_MAX_OUTPUT_TOKENS', () => {
		expect(body({ LLM_MAX_OUTPUT_TOKENS: '4096' }).max_completion_tokens).toBe(4096);
	});

	// 클램프가 파싱 뒤에 와야 fallback이 클램프되지 않는다.
	it('falls back without clamping when LLM_MAX_OUTPUT_TOKENS is blank', () => {
		expect(body({ LLM_MAX_OUTPUT_TOKENS: '' }).max_completion_tokens).toBe(8192);
	});
});

describe('getLlmPromptBudget', () => {
	it('derives the prompt budget from the defaults', () => {
		expect(getLlmPromptBudget({})).toBe(16384 - 8192 - 128);
	});

	it('fails fast instead of silently flooring an unusable budget', () => {
		expect(() =>
			getLlmPromptBudget({ LLM_CONTEXT_TOKENS: '1024', LLM_MAX_OUTPUT_TOKENS: '8192' })
		).toThrowError(/LLM_CONTEXT_TOKENS=1024.*LLM_MAX_OUTPUT_TOKENS=8192/);
	});

	it('accepts the full model window without overflowing', () => {
		expect(
			getLlmPromptBudget({ LLM_CONTEXT_TOKENS: '1050000', LLM_MAX_OUTPUT_TOKENS: '128000' })
		).toBe(1050000 - 128000 - 128);
	});
});
