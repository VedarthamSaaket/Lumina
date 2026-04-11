/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-cormorant)', 'serif'],
        body: ['var(--font-eb-garamond)', 'serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
        gothic: ['var(--font-cinzel)', 'serif'],
        editorial: ['var(--font-playfair)', 'serif'],
        future: ['var(--font-rajdhani)', 'sans-serif'],
      },
      colors: {
        lumina: {
          aurora1: '#2bd2ff',
          aurora2: '#2E3192',
          aurora3: '#2bff88',
          dusk1: '#1d2671',
          dusk2: '#c33764',
          ocean1: '#2E3192',
          ocean2: '#1BFFFF',
          dream1: '#0f0c29',
          dream2: '#302b63',
          dream3: '#24243e',
          crisis: '#dc2626',
          gold: '#d4af37',
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'text-shimmer': 'textShimmer 3s ease-in-out infinite',
        'particle-drift': 'particleDrift 15s linear infinite',
        'ripple': 'ripple 2s linear infinite',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.8s ease forwards',
        'crisis-pulse': 'crisisPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(43, 210, 255, 0.3)' },
          '50%': { boxShadow: '0 0 60px rgba(43, 210, 255, 0.8)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        textShimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        particleDrift: {
          '0%': { transform: 'translateY(100vh) translateX(0)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(-100px) translateX(100px)', opacity: '0' },
        },
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(40px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-40px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        crisisPulse: {
          '0%, 100%': { borderColor: '#dc2626', boxShadow: '0 0 20px rgba(220,38,38,0.5)' },
          '50%': { borderColor: '#ff0000', boxShadow: '0 0 60px rgba(255,0,0,0.9)' },
        },
      },
    },
  },
  plugins: [],
}
