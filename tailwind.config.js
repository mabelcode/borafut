/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                background: '#F3F4F6',
                surface: '#FFFFFF',
                'primary-text': '#111827',
                'secondary-text': '#6B7280',
                'brand-green': '#10B981',
                'brand-red': '#EF4444',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
