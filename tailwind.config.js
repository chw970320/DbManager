/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './src/**/*.{html,js,svelte,ts}',
        './src/app.html'
    ],
    safelist: [
        // 중복 유형별 배경색 클래스
        'bg-red-100',    // 표준단어명 중복
        'bg-orange-100', // 영문약어 중복
        'bg-yellow-100', // 영문명 중복
        'bg-blue-50'     // 편집 중 배경색
    ],
    theme: {
        extend: {}
    },
    plugins: []
}; 