// components/ui/GoldHeading.tsx
// Use this across all pages for the "word glimmers in gold" heading pattern

import React from 'react'

interface GoldHeadingProps {
    prefix: string
    gold: string
    suffix?: string
    size?: string
    className?: string
}

const shimmerStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, #b8860b 0%, #d4af37 25%, #f9e07a 50%, #d4af37 75%, #b8860b 100%)',
    backgroundSize: '220% auto',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'textShimmer 4s linear infinite',
    display: 'inline',
}

export function GoldHeading({ prefix, gold, suffix, size, className }: GoldHeadingProps) {
    return (
        <h1
            className={className}
            style={{
                fontFamily: "'Libre Baskerville', 'Baskerville Old Face', Baskerville, Georgia, serif",
                fontWeight: 400,
                fontStyle: 'italic',
                fontSize: size || 'clamp(2.2rem, 5vw, 4rem)',
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
                lineHeight: 1.15,
                margin: 0,
            }}
        >
            {prefix}{prefix ? ' ' : ''}<span style={shimmerStyle}>{gold}</span>{suffix ? ` ${suffix}` : ''}
        </h1>
    )
}

// ─── USAGE EXAMPLES ──────────────────────────────────────────────────────────
// Chat page:       <GoldHeading prefix="The" gold="Lumina" />
// Journal page:    <GoldHeading prefix="The Inner" gold="Ledger" />
// CBT page:        <GoldHeading prefix="Inner" gold="Work" />
// Screening:       <GoldHeading prefix="Self" gold="Reflection" />
// Memory/Cognitive:<GoldHeading prefix="Memory" gold="Games" />
// Dashboard:       <GoldHeading prefix="Your" gold="Profile" />
// Crisis:          <GoldHeading prefix="You Are Not" gold="Alone" />
//
// ─── HOW TO APPLY ACROSS EXISTING PAGES ─────────────────────────────────────
// In chat/page.tsx, find the Lumina heading and replace with:
//   <GoldHeading prefix="" gold="Lumina" size="48px" />
//
// In screening/page.tsx, the heading reads "Self Reflection" - use:
//   <GoldHeading prefix="Self" gold="Reflection" />
//
// In cbt/page.tsx, "Inner Work":
//   <GoldHeading prefix="Inner" gold="Work" />
//
// In cognitive/memory/page.tsx, "Memory Games":
//   <GoldHeading prefix="Memory" gold="Games" />
//
// In dashboard/page.tsx, "Your Profile":
//   <GoldHeading prefix="Your" gold="Profile" />
//
// ─── INLINE VERSION (no component needed) ───────────────────────────────────
// Just copy-paste this pattern anywhere:
/*
<h1 style={{
  fontFamily: "'Libre Baskerville', 'Baskerville Old Face', Baskerville, Georgia, serif",
  fontWeight: 400, fontStyle: 'italic',
  fontSize: 'clamp(2.2rem, 5vw, 4rem)',
  color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.15,
}}>
  Your {' '}
  <span style={{
    background: 'linear-gradient(90deg, #b8860b 0%, #d4af37 25%, #f9e07a 50%, #d4af37 75%, #b8860b 100%)',
    backgroundSize: '220% auto',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
    animation: 'textShimmer 4s linear infinite',
  }}>Profile</span>
</h1>
*/

export default GoldHeading