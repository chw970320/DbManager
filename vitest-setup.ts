import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock SvelteKit $app/environment
vi.mock('$app/environment', () => ({
	browser: true,
	dev: false,
	building: false,
	version: '1.0.0'
}));

// Error-path 테스트에서 의도적으로 발생시키는 로그 노이즈를 숨긴다.
const _consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const _consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
