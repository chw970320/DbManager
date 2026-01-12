import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	css: {
		postcss: './postcss.config.js'
	},
	optimizeDeps: {
		include: ['tailwindcss', 'mermaid']
	},
	// 테스트 파일을 파일 감시에서 제외하여 성능 향상
	server: {
		watch: {
			ignored: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**']
		}
	}
});
