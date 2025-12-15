import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 与营销首页一致的色彩系统
      colors: {
        // 主背景 - 纯黑
        bg: {
          DEFAULT: '#000000',
          secondary: '#0a0a0a',
          tertiary: '#111111',
          card: 'rgba(30, 30, 30, 0.9)',
          glass: 'rgba(30, 30, 30, 0.5)',
        },
        // 文字色 - 米白
        text: {
          DEFAULT: '#faf9f6',
          secondary: '#888888',
          muted: '#666666',
        },
        // 边框
        border: {
          DEFAULT: '#333333',
          light: '#444444',
        },
        // 强调色 - 与文字相同 (无彩色)
        accent: {
          DEFAULT: '#faf9f6',
          muted: 'rgba(250, 249, 246, 0.1)',
        },
        // 状态色
        success: '#4ade80',
        warning: '#fbbf24',
        error: '#ef4444',
      },
      // 字体 - 与营销首页一致
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        'serif-sc': ['Noto Serif SC', 'Songti SC', 'serif'],
      },
      // 圆角 - 大圆角胶囊风格
      borderRadius: {
        'pill': '50px',
        'card': '16px',
        'button': '12px',
      },
      // 过渡
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        'fast': '300ms',
        'medium': '600ms',
        'slow': '1000ms',
      },
      // 动画
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-subtle': 'bounceSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSubtle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(5px)' },
          '60%': { transform: 'translateY(3px)' },
        },
      },
      // 背景模糊
      backdropBlur: {
        'glass': '20px',
      },
    },
  },
  plugins: [],
}
export default config
