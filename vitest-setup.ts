import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock SvelteKit $app/environment
vi.mock('$app/environment', () => ({
	browser: true,
	dev: false,
	building: false,
	version: '1.0.0'
}));
