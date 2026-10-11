// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Toaster } from 'react-hot-toast'
import localFont from 'next/font/local'

const cormorant = localFont({
  variable: '--font-cormorant',
  display: 'block',
  adjustFontFallback: false,
  src: [
    { path: '../fonts/cormorant-garamond-italic-300-700.woff2', weight: '300 700', style: 'italic' },
    { path: '../fonts/cormorant-garamond-normal-300-700.woff2', weight: '300 700', style: 'normal' },
  ],
})

const ebGaramond = localFont({
  variable: '--font-eb-garamond',
  display: 'block',
  adjustFontFallback: false,
  src: [
    { path: '../fonts/eb-garamond-italic-400-600.woff2', weight: '400 600', style: 'italic' },
    { path: '../fonts/eb-garamond-normal-400-600.woff2', weight: '400 600', style: 'normal' },
  ],
})

const cinzel = localFont({
  variable: '--font-cinzel',
  display: 'block',
  adjustFontFallback: false,
  src: [
    { path: '../fonts/cinzel-normal-400-900.woff2', weight: '400 900', style: 'normal' },
  ],
})

const playfair = localFont({
  variable: '--font-playfair',
  display: 'block',
  adjustFontFallback: false,
  src: [
    { path: '../fonts/playfair-display-italic-400-900.woff2', weight: '400 900', style: 'italic' },
    { path: '../fonts/playfair-display-normal-400-900.woff2', weight: '400 900', style: 'normal' },
  ],
})

const rajdhani = localFont({
  variable: '--font-rajdhani',
  display: 'block',
  adjustFontFallback: false,
  src: [
    { path: '../fonts/rajdhani-normal-300.woff2', weight: '300', style: 'normal' },
    { path: '../fonts/rajdhani-normal-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/rajdhani-normal-500.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/rajdhani-normal-600.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/rajdhani-normal-700.woff2', weight: '700', style: 'normal' },
  ],
})

const spaceMono = localFont({
  variable: '--font-space-mono',
  display: 'block',
  adjustFontFallback: false,
  src: [
    { path: '../fonts/space-mono-italic-400.woff2', weight: '400', style: 'italic' },
    { path: '../fonts/space-mono-italic-700.woff2', weight: '700', style: 'italic' },
    { path: '../fonts/space-mono-normal-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/space-mono-normal-700.woff2', weight: '700', style: 'normal' },
  ],
})

const libreBaskerville = localFont({
  variable: '--font-baskerville',
  display: 'block',
  adjustFontFallback: false,
  src: [
    { path: '../fonts/libre-baskerville-italic-400.woff2', weight: '400', style: 'italic' },
  ],
})

const philosopher = localFont({
  variable: '--font-philosopher',
  display: 'block',
  adjustFontFallback: false,
  src: [
    { path: '../fonts/philosopher-italic-400.woff2', weight: '400', style: 'italic' },
    { path: '../fonts/philosopher-italic-700.woff2', weight: '700', style: 'italic' },
    { path: '../fonts/philosopher-normal-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/philosopher-normal-700.woff2', weight: '700', style: 'normal' },
  ],
})

const jost = localFont({
  variable: '--font-jost',
  display: 'block',
  adjustFontFallback: false,
  src: [
    { path: '../fonts/jost-normal-300-500.woff2', weight: '300 500', style: 'normal' },
  ],
})

const crimson = localFont({
  variable: '--font-crimson',
  display: 'block',
  adjustFontFallback: false,
  src: [
    { path: '../fonts/crimson-pro-italic-300-500.woff2', weight: '300 500', style: 'italic' },
    { path: '../fonts/crimson-pro-normal-300-500.woff2', weight: '300 500', style: 'normal' },
  ],
})

const dmSans = localFont({
  variable: '--font-dm-sans',
  display: 'block',
  adjustFontFallback: false,
  src: [
    { path: '../fonts/dm-sans-italic-300-500.woff2', weight: '300 500', style: 'italic' },
    { path: '../fonts/dm-sans-normal-300-500.woff2', weight: '300 500', style: 'normal' },
  ],
})

const fraunces = localFont({
  variable: '--font-fraunces',
  display: 'block',
  adjustFontFallback: false,
  src: [
    { path: '../fonts/fraunces-italic-300-400.woff2', weight: '300 400', style: 'italic' },
    { path: '../fonts/fraunces-normal-300-400.woff2', weight: '300 400', style: 'normal' },
  ],
})

const FONT_VARS = [
  cormorant.variable,
  ebGaramond.variable,
  cinzel.variable,
  playfair.variable,
  rajdhani.variable,
  spaceMono.variable,
  libreBaskerville.variable,
  philosopher.variable,
  jost.variable,
  crimson.variable,
  dmSans.variable,
  fraunces.variable,
].join(' ')

export const metadata: Metadata = {
  title: 'Lumina: Personal Guidance',
  description: 'Structured emotional guidance and compassionate support for your inner journey.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0f0805' },
    { media: '(prefers-color-scheme: light)', color: '#f0e6cc' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={FONT_VARS} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="grain-overlay" aria-hidden="true" />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'rgba(20,20,30,0.95)',
                color: '#f0ede8',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                fontFamily: 'var(--font-eb-garamond)',
                fontSize: '1rem',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
