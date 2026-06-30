// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Toaster } from 'react-hot-toast'
import {
  Cormorant_Garamond,
  EB_Garamond,
  Cinzel,
  Playfair_Display,
  Rajdhani,
  Space_Mono,
  Libre_Baskerville,
  Philosopher,
  Jost,
  Crimson_Pro,
  DM_Sans,
  Fraunces,
} from 'next/font/google'

// ─── Self-hosted Google Fonts (build-time bundled, no runtime CDN call) ───────
// Each font keeps the same CSS-variable name the rest of the app already uses
// via tailwind.config + globals.css, so no downstream class/utility changes.

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  weight:   ['300', '400', '600', '700'],
  style:    ['normal', 'italic'],
  subsets:  ['latin'],
  display:  'swap',
})

const ebGaramond = EB_Garamond({
  variable: '--font-eb-garamond',
  weight:   ['400', '500', '600'],
  style:    ['normal', 'italic'],
  subsets:  ['latin'],
  display:  'swap',
})

const cinzel = Cinzel({
  variable: '--font-cinzel',
  weight:   ['400', '600', '700', '900'],
  subsets:  ['latin'],
  display:  'swap',
})

const playfair = Playfair_Display({
  variable: '--font-playfair',
  weight:   ['400', '700', '900'],
  style:    ['normal', 'italic'],
  subsets:  ['latin'],
  display:  'swap',
})

const rajdhani = Rajdhani({
  variable: '--font-rajdhani',
  weight:   ['300', '400', '500', '600', '700'],
  subsets:  ['latin'],
  display:  'swap',
})

const spaceMono = Space_Mono({
  variable: '--font-space-mono',
  weight:   ['400', '700'],
  style:    ['normal', 'italic'],
  subsets:  ['latin'],
  display:  'swap',
})

const libreBaskerville = Libre_Baskerville({
  variable: '--font-baskerville',
  weight:   ['400'],
  style:    ['italic'],
  subsets:  ['latin'],
  display:  'swap',
})

const philosopher = Philosopher({
  variable: '--font-philosopher',
  weight:   ['400', '700'],
  style:    ['normal', 'italic'],
  subsets:  ['latin'],
  display:  'swap',
})

const jost = Jost({
  variable: '--font-jost',
  weight:   ['300', '400', '500'],
  subsets:  ['latin'],
  display:  'swap',
})

const crimson = Crimson_Pro({
  variable: '--font-crimson',
  weight:   ['300', '400', '500'],
  style:    ['normal', 'italic'],
  subsets:  ['latin'],
  display:  'swap',
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  weight:   ['300', '400', '500'],
  style:    ['normal', 'italic'],
  subsets:  ['latin'],
  display:  'swap',
})

const fraunces = Fraunces({
  variable: '--font-fraunces',
  weight:   ['300', '400'],
  style:    ['normal', 'italic'],
  subsets:  ['latin'],
  display:  'swap',
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
