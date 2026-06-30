'use client'

// Full-screen "rotate to landscape" gate for surfaces whose layout is
// designed for wide viewports (journal book spread, Orion split panes).
// Renders only when the device is touch + portrait. Hidden on landscape,
// hidden on non-touch (mouse) devices entirely.
//
// Detection criteria:
//   - matchMedia("(pointer: coarse)") → user is on touch (phone / tablet)
//   - matchMedia("(orientation: portrait)") → currently held upright
// Reasoning: width-based detection misclassifies a small desktop window
// as "mobile." pointer:coarse + orientation is the orientation-tied check.
//
// Re-evaluates on resize + orientationchange so the prompt dismisses
// immediately when the user actually rotates.

import { useEffect, useState } from 'react'

interface Props {
  /** Page name shown in the prompt copy. Keep short. */
  surface: string
}

export default function LandscapePrompt({ surface }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const evaluate = () => {
      const touch    = window.matchMedia('(pointer: coarse)').matches
      const portrait = window.matchMedia('(orientation: portrait)').matches
      setShow(touch && portrait)
    }
    evaluate()
    window.addEventListener('resize', evaluate)
    window.addEventListener('orientationchange', evaluate)
    return () => {
      window.removeEventListener('resize', evaluate)
      window.removeEventListener('orientationchange', evaluate)
    }
  }, [])

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Rotate device to use ${surface}`}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         99999,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '1.5rem',
        padding:        '2rem',
        textAlign:      'center',
        backgroundColor: 'var(--bg-primary, #0f0805)',
        color:          'var(--text-primary, #fef4e4)',
        fontFamily:     'var(--font-eb-garamond), serif',
        // Cover OS chrome (iOS notch / Android nav) and respect safe areas.
        paddingTop:    'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
        paddingLeft:   'max(1.5rem, env(safe-area-inset-left))',
        paddingRight:  'max(1.5rem, env(safe-area-inset-right))',
      }}
    >
      <RotateIcon />
      <h2
        style={{
          fontFamily: 'var(--font-baskerville), var(--font-cormorant), serif',
          fontStyle:  'italic',
          fontSize:   'clamp(1.6rem, 6vw, 2.2rem)',
          margin:     0,
          color:      'var(--gold, #d4af37)',
          letterSpacing: '0.01em',
        }}
      >
        Turn your phone sideways
      </h2>
      <p
        style={{
          maxWidth:   '34ch',
          fontSize:   'clamp(0.95rem, 4vw, 1.1rem)',
          lineHeight: 1.55,
          color:      'var(--text-secondary, rgba(254,244,228,0.7))',
          margin:     0,
        }}
      >
        {surface} works best in landscape. Rotate your device to keep going.
      </p>
    </div>
  )
}

function RotateIcon() {
  return (
    <svg
      width="84"
      height="84"
      viewBox="0 0 84 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ opacity: 0.85 }}
    >
      <rect
        x="24" y="12" width="36" height="60" rx="6"
        stroke="var(--gold, #d4af37)" strokeWidth="2.4" fill="none"
        style={{
          transformOrigin: '42px 42px',
          animation: 'lumina-rotate-prompt 2.6s ease-in-out infinite',
        }}
      />
      <circle cx="42" cy="64" r="2" fill="var(--gold, #d4af37)" />
      <path
        d="M14 50 a30 30 0 0 0 56 -8"
        stroke="var(--gold, #d4af37)" strokeWidth="2" fill="none"
        strokeLinecap="round" opacity="0.65"
      />
      <path
        d="M68 38 l4 4 l4 -4"
        stroke="var(--gold, #d4af37)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.65" fill="none"
      />
      <style>{`
        @keyframes lumina-rotate-prompt {
          0%   { transform: rotate(0deg);    }
          45%  { transform: rotate(-90deg);  }
          55%  { transform: rotate(-90deg);  }
          100% { transform: rotate(0deg);    }
        }
      `}</style>
    </svg>
  )
}
