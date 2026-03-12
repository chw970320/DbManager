/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}', './src/app.html'],
	darkMode: 'class',
	safelist: [
		// 중복 유형별 배경색 클래스
		'bg-red-100', // 표준단어명 중복
		'bg-orange-100', // 영문약어 중복
		'bg-yellow-100', // 영문명 중복
		'bg-blue-50' // 편집 중 배경색
	],
	theme: {
		extend: {
			colors: {
				brand: {
					DEFAULT: 'rgb(var(--color-brand) / <alpha-value>)',
					light: 'rgb(var(--color-brand-light) / <alpha-value>)',
					dark: 'rgb(var(--color-brand-dark) / <alpha-value>)',
					50: 'rgb(var(--color-brand-50) / <alpha-value>)',
					100: 'rgb(var(--color-brand-100) / <alpha-value>)'
				},
				surface: {
					DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
					muted: 'rgb(var(--color-surface-muted) / <alpha-value>)',
					raised: 'rgb(var(--color-surface-raised) / <alpha-value>)'
				},
				content: {
					DEFAULT: 'rgb(var(--color-content) / <alpha-value>)',
					secondary: 'rgb(var(--color-content-secondary) / <alpha-value>)',
					muted: 'rgb(var(--color-content-muted) / <alpha-value>)',
					subtle: 'rgb(var(--color-content-subtle) / <alpha-value>)'
				},
				border: {
					DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
					strong: 'rgb(var(--color-border-strong) / <alpha-value>)',
					focus: 'rgb(var(--color-border-focus) / <alpha-value>)'
				},
				status: {
					success: 'rgb(var(--color-status-success) / <alpha-value>)',
					'success-bg': 'rgb(var(--color-status-success-bg) / <alpha-value>)',
					'success-border': 'rgb(var(--color-status-success-border) / <alpha-value>)',
					error: 'rgb(var(--color-status-error) / <alpha-value>)',
					'error-bg': 'rgb(var(--color-status-error-bg) / <alpha-value>)',
					'error-border': 'rgb(var(--color-status-error-border) / <alpha-value>)',
					warning: 'rgb(var(--color-status-warning) / <alpha-value>)',
					'warning-bg': 'rgb(var(--color-status-warning-bg) / <alpha-value>)',
					'warning-border': 'rgb(var(--color-status-warning-border) / <alpha-value>)',
					info: 'rgb(var(--color-status-info) / <alpha-value>)',
					'info-bg': 'rgb(var(--color-status-info-bg) / <alpha-value>)',
					'info-border': 'rgb(var(--color-status-info-border) / <alpha-value>)'
				}
			},
			zIndex: {
				'dropdown': '100',
				'sticky': '200',
				'fixed': '300',
				'modal-backdrop': '400',
				'modal': '500',
				'popover': '600',
				'toast': '700',
				'tooltip': '800'
			},
			keyframes: {
				'fade-in-up': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-in-right': {
					'0%': { opacity: '0', transform: 'translateX(100%)' },
					'100%': { opacity: '1', transform: 'translateX(0)' }
				},
				'slide-out-right': {
					'0%': { opacity: '1', transform: 'translateX(0)' },
					'100%': { opacity: '0', transform: 'translateX(100%)' }
				}
			},
			animation: {
				'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
				'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
				'slide-out-right': 'slide-out-right 0.3s ease-in forwards'
			}
		}
	},
	plugins: []
};
