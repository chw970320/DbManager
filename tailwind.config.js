/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}', './src/app.html'],
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
					DEFAULT: '#1d4ed8',
					light: '#3b82f6',
					dark: '#1e40af',
					50: '#eff6ff',
					100: '#dbeafe'
				},
				surface: {
					DEFAULT: '#ffffff',
					muted: '#f9fafb',
					raised: '#f3f4f6'
				},
				content: {
					DEFAULT: '#111827',
					secondary: '#374151',
					muted: '#6b7280',
					subtle: '#9ca3af'
				},
				border: {
					DEFAULT: '#d1d5db',
					strong: '#9ca3af',
					focus: '#2563eb'
				},
				status: {
					success: '#166534',
					'success-bg': '#dcfce7',
					'success-border': '#bbf7d0',
					error: '#991b1b',
					'error-bg': '#fee2e2',
					'error-border': '#fecaca',
					warning: '#9a3412',
					'warning-bg': '#ffedd5',
					'warning-border': '#fed7aa',
					info: '#1e40af',
					'info-bg': '#dbeafe',
					'info-border': '#bfdbfe'
				}
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
