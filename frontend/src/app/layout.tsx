// src/app/layout.tsx
import type { Metadata } from 'next'
import '@/styles/globals.css'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Lumina: AI Psychological Guidance',
  description: 'Structured emotional guidance, CBT tools, and compassionate AI support.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
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
