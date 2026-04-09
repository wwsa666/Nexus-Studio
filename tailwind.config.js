/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                // 背景色阶
                'app': '#09090b',
                'panel': '#18181b',
                'elevated': '#27272a',

                // 边框
                'border-subtle': '#27272a',
                'border-default': '#3f3f46',

                // 主色
                'primary': {
                    DEFAULT: '#8b5cf6',
                    hover: '#7c3aed',
                    active: '#6d28d9',
                },

                // 文字
                'text-main': '#e4e4e7',
                'text-muted': '#a1a1aa',
                'text-dim': '#71717a',

                // 状态色
                'success': '#22c55e',
                'error': '#ef4444',
                'warning': '#f59e0b',
            },
            borderRadius: {
                'DEFAULT': '8px',
                'lg': '12px',
                'xl': '16px',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(139, 92, 246, 0.5)' },
                    '100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.8)' },
                }
            }
        },
    },
    plugins: [],
}
