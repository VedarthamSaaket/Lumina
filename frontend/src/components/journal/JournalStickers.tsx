'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Sticker {
    id: string
    label: string
    category: string
    svgContent: string
    color: string
    accent: string
    rotation?: number
    width?: number
    height?: number
}

// ── REAL SVG STICKERS - hand-crafted to match Lumina's luxury dark/light aesthetic ──
// Each sticker is a self-contained SVG artwork piece

const STICKER_DEFS: Sticker[] = [
    // ── MOOD / FEELING ──
    {
        id: 'mood_bloom', label: 'Blooming', category: 'mood',
        color: '#c9897a', accent: '#2a0800', rotation: -3,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="bg1" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#c9897a" stop-opacity="0.18"/><stop offset="100%" stop-color="#c9897a" stop-opacity="0.04"/></radialGradient></defs>
      <circle cx="40" cy="40" r="36" fill="url(#bg1)" stroke="#c9897a" stroke-width="0.8" stroke-opacity="0.35"/>
      <g transform="translate(40,40)">
        ${[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => `<ellipse cx="${Math.cos(a * Math.PI / 180) * 14}" cy="${Math.sin(a * Math.PI / 180) * 14}" rx="7" ry="4" transform="rotate(${a})" fill="#c9897a" fill-opacity="${0.55 + i * 0.03}" stroke="#c9897a" stroke-width="0.4"/>`).join('')}
        <circle r="6" fill="#d4af37" fill-opacity="0.85" stroke="#f0d060" stroke-width="0.8"/>
        <circle r="2.5" fill="#f9e07a"/>
      </g>
      <text x="40" y="73" text-anchor="middle" font-family="'Cinzel',serif" font-size="6.5" fill="#c9897a" fill-opacity="0.8" letter-spacing="1">BLOOM</text>
    </svg>`,
    },
    {
        id: 'mood_golden', label: 'Golden Hour', category: 'mood',
        color: '#d4af37', accent: '#1a0e00', rotation: 2,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="sun1" cx="50%" cy="40%" r="55%"><stop offset="0%" stop-color="#f9e07a" stop-opacity="0.9"/><stop offset="60%" stop-color="#d4af37" stop-opacity="0.4"/><stop offset="100%" stop-color="#d4af37" stop-opacity="0"/></radialGradient></defs>
      <circle cx="40" cy="36" r="34" fill="url(#sun1)" stroke="#d4af37" stroke-width="0.6" stroke-opacity="0.3"/>
      ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => `<line x1="${40 + Math.cos(a * Math.PI / 180) * 18}" y1="${36 + Math.sin(a * Math.PI / 180) * 18}" x2="${40 + Math.cos(a * Math.PI / 180) * 26}" y2="${36 + Math.sin(a * Math.PI / 180) * 26}" stroke="#d4af37" stroke-width="1.2" stroke-opacity="0.6" stroke-linecap="round"/>`).join('')}
      <circle cx="40" cy="36" r="11" fill="#d4af37" fill-opacity="0.9" stroke="#f9e07a" stroke-width="1"/>
      <circle cx="40" cy="36" r="5.5" fill="#f9e07a"/>
      <text x="40" y="73" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#d4af37" fill-opacity="0.8" letter-spacing="1.5">GOLDEN</text>
    </svg>`,
    },
    {
        id: 'mood_heart', label: 'With Love', category: 'mood',
        color: '#c9897a', accent: '#2a0800', rotation: -2,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="hg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e8a090"/><stop offset="100%" stop-color="#c96060"/></linearGradient></defs>
      <circle cx="40" cy="40" r="35" fill="#c9897a" fill-opacity="0.08" stroke="#c9897a" stroke-width="0.7" stroke-opacity="0.3"/>
      <path d="M40 55 C20 42, 14 28, 20 22 C24 16, 34 18, 40 26 C46 18, 56 16, 60 22 C66 28, 60 42, 40 55Z" fill="url(#hg1)" fill-opacity="0.85" stroke="#e8a090" stroke-width="0.8"/>
      <path d="M40 50 C25 39, 20 28, 25 23 C28 19, 36 21, 40 27" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-linecap="round"/>
      <text x="40" y="73" text-anchor="middle" font-family="'Cinzel',serif" font-size="6" fill="#c9897a" fill-opacity="0.8" letter-spacing="1.2">LOVE</text>
    </svg>`,
    },
    {
        id: 'mood_stars', label: 'Stargazing', category: 'mood',
        color: '#9b7fd4', accent: '#100020', rotation: 1,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#9b7fd4" fill-opacity="0.07" stroke="#9b7fd4" stroke-width="0.7" stroke-opacity="0.3"/>
      ${[[40, 26, 8], [28, 38, 5], [52, 34, 6], [24, 52, 4], [54, 52, 5], [40, 56, 3.5]].map(([cx, cy, r], i) => `
        <g transform="translate(${cx},${cy})">
          <path d="M0,${-r} L${r * 0.35},${-r * 0.35} L${r},0 L${r * 0.35},${r * 0.35} L0,${r} L${-r * 0.35},${r * 0.35} L${-r},0 L${-r * 0.35},${-r * 0.35}Z" fill="#9b7fd4" fill-opacity="${0.6 + i * 0.05}" stroke="#c4b0f8" stroke-width="0.4"/>
        </g>`).join('')}
      <text x="40" y="73" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#9b7fd4" fill-opacity="0.8" letter-spacing="1.2">STARDUST</text>
    </svg>`,
    },
    {
        id: 'mood_moon', label: 'Night Mode', category: 'mood',
        color: '#7a9e9e', accent: '#001414', rotation: -1,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="mg1" cx="45%" cy="45%" r="50%"><stop offset="0%" stop-color="#a0d4d4" stop-opacity="0.25"/><stop offset="100%" stop-color="#7a9e9e" stop-opacity="0.06"/></radialGradient></defs>
      <circle cx="40" cy="40" r="35" fill="url(#mg1)" stroke="#7a9e9e" stroke-width="0.7" stroke-opacity="0.3"/>
      <path d="M48 20 C34 22 26 32 28 44 C30 56 42 62 52 58 C38 62 24 52 24 38 C24 24 36 16 48 20Z" fill="#a0d4d4" fill-opacity="0.75" stroke="#c8e8e8" stroke-width="0.8"/>
      <circle cx="44" cy="32" r="2" fill="#7a9e9e" fill-opacity="0.4"/>
      <circle cx="50" cy="44" r="1.4" fill="#7a9e9e" fill-opacity="0.35"/>
      <circle cx="38" cy="50" r="1.2" fill="#7a9e9e" fill-opacity="0.3"/>
      <text x="40" y="73" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#7a9e9e" fill-opacity="0.8" letter-spacing="1.2">LUNA</text>
    </svg>`,
    },
    {
        id: 'mood_peace', label: 'At Peace', category: 'mood',
        color: '#7a9e7e', accent: '#0a1800', rotation: 2,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#7a9e7e" fill-opacity="0.08" stroke="#7a9e7e" stroke-width="0.7" stroke-opacity="0.3"/>
      <path d="M40 18 C26 20 18 30 18 40 C18 52 28 62 40 62 C52 62 62 52 62 40 C62 28 54 20 40 18Z" fill="none" stroke="#7a9e7e" stroke-width="1.5" stroke-opacity="0.7"/>
      <line x1="40" y1="18" x2="40" y2="62" stroke="#7a9e7e" stroke-width="1.5" stroke-opacity="0.7"/>
      <line x1="40" y1="40" x2="18" y2="40" stroke="#7a9e7e" stroke-width="1.5" stroke-opacity="0.7"/>
      <line x1="40" y1="40" x2="28" y2="56" stroke="#7a9e7e" stroke-width="1.5" stroke-opacity="0.7"/>
      <line x1="40" y1="40" x2="52" y2="56" stroke="#7a9e7e" stroke-width="1.5" stroke-opacity="0.7"/>
      <text x="40" y="74" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#7a9e7e" fill-opacity="0.8" letter-spacing="1.5">PEACE</text>
    </svg>`,
    },

    // ── NATURE / BOTANICAL ──
    {
        id: 'nature_leaf', label: 'Grounded', category: 'nature',
        color: '#7a9e7e', accent: '#0a1800', rotation: -3,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#7a9e7e" fill-opacity="0.07" stroke="#7a9e7e" stroke-width="0.7" stroke-opacity="0.25"/>
      <path d="M42 60 C42 60 20 52 18 30 C18 30 36 14 58 24 C58 24 52 48 42 60Z" fill="#7a9e7e" fill-opacity="0.65" stroke="#8ab88a" stroke-width="0.9"/>
      <path d="M42 60 L38 38" stroke="#5a7e5a" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
      <path d="M38 50 C34 44 24 40 20 36" fill="none" stroke="#5a7e5a" stroke-width="0.7" stroke-linecap="round" opacity="0.5"/>
      <path d="M40 44 C44 40 52 36 54 30" fill="none" stroke="#5a7e5a" stroke-width="0.7" stroke-linecap="round" opacity="0.5"/>
      <text x="40" y="73" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#7a9e7e" fill-opacity="0.8" letter-spacing="1.2">GROWTH</text>
    </svg>`,
    },
    {
        id: 'nature_waves', label: 'Flow State', category: 'nature',
        color: '#5b9bd5', accent: '#001020', rotation: 1,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#5b9bd5" fill-opacity="0.07" stroke="#5b9bd5" stroke-width="0.7" stroke-opacity="0.25"/>
      ${[28, 36, 44, 52].map((y, i) => `<path d="M14,${y} C20,${y - 5} 26,${y + 5} 32,${y} C38,${y - 5} 44,${y + 5} 50,${y} C56,${y - 5} 62,${y + 5} 66,${y}" fill="none" stroke="#5b9bd5" stroke-width="${1.4 - i * 0.15}" stroke-opacity="${0.6 - i * 0.08}" stroke-linecap="round"/>`).join('')}
      <text x="40" y="66" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#5b9bd5" fill-opacity="0.8" letter-spacing="1.2">FLOW</text>
    </svg>`,
    },
    {
        id: 'nature_crystal', label: 'Clarity', category: 'nature',
        color: '#b8d4e8', accent: '#001020', rotation: -2,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="cg1" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#d0e8f8" stop-opacity="0.8"/><stop offset="50%" stop-color="#a0c8e8" stop-opacity="0.6"/><stop offset="100%" stop-color="#80a8c8" stop-opacity="0.8"/></linearGradient></defs>
      <circle cx="40" cy="40" r="35" fill="#b8d4e8" fill-opacity="0.06" stroke="#b8d4e8" stroke-width="0.7" stroke-opacity="0.25"/>
      <path d="M40 16 L54 36 L48 60 L32 60 L26 36Z" fill="url(#cg1)" stroke="#c8e4f8" stroke-width="0.9"/>
      <path d="M40 16 L54 36 L40 32Z" fill="rgba(255,255,255,0.25)"/>
      <path d="M40 16 L26 36 L40 32Z" fill="rgba(0,0,0,0.08)"/>
      <line x1="40" y1="16" x2="40" y2="60" stroke="rgba(255,255,255,0.2)" stroke-width="0.6"/>
      <line x1="26" y1="36" x2="54" y2="36" stroke="rgba(255,255,255,0.15)" stroke-width="0.6"/>
      <text x="40" y="73" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#b8d4e8" fill-opacity="0.8" letter-spacing="1.2">CLARITY</text>
    </svg>`,
    },

    // ── STUDY / FOCUS ──
    {
        id: 'study_flame', label: 'On Fire', category: 'study',
        color: '#c4913a', accent: '#1a0800', rotation: -2,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="fg1" cx="50%" cy="80%" r="70%"><stop offset="0%" stop-color="#f0a030" stop-opacity="0.25"/><stop offset="100%" stop-color="#c4913a" stop-opacity="0.04"/></radialGradient></defs>
      <circle cx="40" cy="40" r="35" fill="url(#fg1)" stroke="#c4913a" stroke-width="0.7" stroke-opacity="0.3"/>
      <path d="M40 58 C28 58 22 50 24 42 C26 36 30 34 32 28 C33 36 36 38 36 38 C34 32 36 22 40 18 C42 26 44 28 46 24 C48 32 44 36 44 40 C46 36 50 34 50 40 C52 46 48 58 40 58Z" fill="#c4913a" fill-opacity="0.75" stroke="#e8b050" stroke-width="0.8"/>
      <path d="M40 52 C34 52 32 46 34 42 C35 45 38 46 38 46 C37 42 39 36 40 32 C41 36 42 42 42 42 C42 42 44 44 44 46 C46 48 44 52 40 52Z" fill="#f0c060" fill-opacity="0.7"/>
      <circle cx="40" cy="47" r="3" fill="#f9e070" fill-opacity="0.6"/>
      <text x="40" y="72" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#c4913a" fill-opacity="0.8" letter-spacing="1.2">IGNITE</text>
    </svg>`,
    },
    {
        id: 'study_compass', label: 'Finding Way', category: 'study',
        color: '#b8a070', accent: '#180c00', rotation: 3,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#b8a070" fill-opacity="0.07" stroke="#b8a070" stroke-width="0.7" stroke-opacity="0.3"/>
      <circle cx="40" cy="40" r="22" fill="none" stroke="#b8a070" stroke-width="1.2" stroke-opacity="0.55"/>
      <circle cx="40" cy="40" r="16" fill="none" stroke="#b8a070" stroke-width="0.6" stroke-opacity="0.3"/>
      <text x="40" y="24" text-anchor="middle" font-family="'Cinzel',serif" font-size="6" fill="#b8a070" fill-opacity="0.75">N</text>
      <text x="40" y="60" text-anchor="middle" font-family="'Cinzel',serif" font-size="6" fill="#b8a070" fill-opacity="0.55">S</text>
      <text x="58" y="43" text-anchor="middle" font-family="'Cinzel',serif" font-size="6" fill="#b8a070" fill-opacity="0.55">E</text>
      <text x="22" y="43" text-anchor="middle" font-family="'Cinzel',serif" font-size="6" fill="#b8a070" fill-opacity="0.55">W</text>
      <polygon points="40,24 43,40 40,36 37,40" fill="#d4af37" fill-opacity="0.85"/>
      <polygon points="40,56 43,40 40,44 37,40" fill="#b8a070" fill-opacity="0.65"/>
      <circle cx="40" cy="40" r="2.8" fill="#d4af37" fill-opacity="0.85" stroke="#f0d060" stroke-width="0.8"/>
      <text x="40" y="72" text-anchor="middle" font-family="'Cinzel',serif" font-size="5" fill="#b8a070" fill-opacity="0.75" letter-spacing="1">COMPASS</text>
    </svg>`,
    },
    {
        id: 'study_quill', label: 'Deep Work', category: 'study',
        color: '#8b7355', accent: '#120800', rotation: -1,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#8b7355" fill-opacity="0.07" stroke="#8b7355" stroke-width="0.7" stroke-opacity="0.25"/>
      <path d="M56 16 C52 20 44 32 38 54 L36 56 L34 52 C36 48 40 38 44 28 C40 30 36 34 34 38 C30 28 38 18 56 16Z" fill="#8b7355" fill-opacity="0.7" stroke="#a89070" stroke-width="0.8"/>
      <path d="M38 54 L34 56 L36 52Z" fill="#d4af37" fill-opacity="0.75"/>
      <line x1="20" y1="58" x2="46" y2="58" stroke="#8b7355" stroke-width="0.8" stroke-opacity="0.4"/>
      <line x1="20" y1="62" x2="42" y2="62" stroke="#8b7355" stroke-width="0.6" stroke-opacity="0.3"/>
      <text x="40" y="73" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#8b7355" fill-opacity="0.75" letter-spacing="1.2">WRITE</text>
    </svg>`,
    },

    // ── GRATITUDE / MINDFUL ──
    {
        id: 'mind_lotus', label: 'Present', category: 'mindful',
        color: '#c9897a', accent: '#2a0800', rotation: -1,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#c9897a" fill-opacity="0.06" stroke="#c9897a" stroke-width="0.7" stroke-opacity="0.25"/>
      <path d="M40 52 C30 48 24 38 28 30 C32 24 40 28 40 28 C40 28 48 24 52 30 C56 38 50 48 40 52Z" fill="#c9897a" fill-opacity="0.55" stroke="#e0a898" stroke-width="0.8"/>
      <path d="M40 52 C26 52 18 42 22 34 C24 30 28 30 28 30 C26 38 30 46 40 50" fill="#c9897a" fill-opacity="0.35"/>
      <path d="M40 52 C54 52 62 42 58 34 C56 30 52 30 52 30 C54 38 50 46 40 50" fill="#c9897a" fill-opacity="0.35"/>
      <path d="M40 52 C36 42 38 30 40 24 C42 30 44 42 40 52Z" fill="#e8b0a0" fill-opacity="0.6"/>
      <text x="40" y="66" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#c9897a" fill-opacity="0.8" letter-spacing="1.2">LOTUS</text>
    </svg>`,
    },
    {
        id: 'mind_diamond', label: 'Inner Strength', category: 'mindful',
        color: '#d4af37', accent: '#1a0e00', rotation: 2,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="dg1" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#f9e07a"/><stop offset="40%" stop-color="#d4af37"/><stop offset="100%" stop-color="#b8860b"/></linearGradient></defs>
      <circle cx="40" cy="40" r="35" fill="#d4af37" fill-opacity="0.07" stroke="#d4af37" stroke-width="0.7" stroke-opacity="0.25"/>
      <path d="M40 18 L58 36 L40 62 L22 36Z" fill="url(#dg1)" fill-opacity="0.8" stroke="#f0d060" stroke-width="0.9"/>
      <path d="M22 36 L32 28 L40 18 L48 28 L58 36 L40 36Z" fill="rgba(255,240,140,0.25)"/>
      <line x1="22" y1="36" x2="58" y2="36" stroke="rgba(255,255,255,0.2)" stroke-width="0.7"/>
      <line x1="40" y1="18" x2="40" y2="62" stroke="rgba(255,255,255,0.15)" stroke-width="0.6"/>
      <text x="40" y="73" text-anchor="middle" font-family="'Cinzel',serif" font-size="5" fill="#d4af37" fill-opacity="0.8" letter-spacing="1.2">RESILIENT</text>
    </svg>`,
    },
    {
        id: 'mind_anchor', label: 'Grounded', category: 'mindful',
        color: '#5b9bd5', accent: '#001020', rotation: -2,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#5b9bd5" fill-opacity="0.07" stroke="#5b9bd5" stroke-width="0.7" stroke-opacity="0.25"/>
      <circle cx="40" cy="26" r="5" fill="none" stroke="#5b9bd5" stroke-width="1.5" stroke-opacity="0.7"/>
      <line x1="40" y1="31" x2="40" y2="58" stroke="#5b9bd5" stroke-width="1.5" stroke-opacity="0.7" stroke-linecap="round"/>
      <path d="M26 42 C26 52 32 58 40 58 C48 58 54 52 54 42" fill="none" stroke="#5b9bd5" stroke-width="1.5" stroke-opacity="0.7"/>
      <line x1="28" y1="40" x2="52" y2="40" stroke="#5b9bd5" stroke-width="1.5" stroke-opacity="0.7" stroke-linecap="round"/>
      <text x="40" y="72" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#5b9bd5" fill-opacity="0.8" letter-spacing="1.2">ANCHOR</text>
    </svg>`,
    },

    // ── CELEBRATION / MILESTONE ──
    {
        id: 'cel_star', label: 'Stellar Day', category: 'celebrate',
        color: '#d4af37', accent: '#1a0e00', rotation: 3,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="sg1" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#f9e07a" stop-opacity="0.3"/><stop offset="100%" stop-color="#d4af37" stop-opacity="0.05"/></radialGradient></defs>
      <circle cx="40" cy="40" r="35" fill="url(#sg1)" stroke="#d4af37" stroke-width="0.7" stroke-opacity="0.3"/>
      <path d="M40 16 L44.5 30.5 L60 30.5 L48 39.5 L52 54 L40 45 L28 54 L32 39.5 L20 30.5 L35.5 30.5Z" fill="#d4af37" fill-opacity="0.85" stroke="#f0d060" stroke-width="0.8"/>
      <path d="M40 16 L44.5 30.5 L40 28Z" fill="rgba(255,250,200,0.3)"/>
      <text x="40" y="70" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#d4af37" fill-opacity="0.8" letter-spacing="1.2">STELLAR</text>
    </svg>`,
    },
    {
        id: 'cel_ribbon', label: 'Achievement', category: 'celebrate',
        color: '#c4913a', accent: '#1a0800', rotation: -2,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="34" r="20" fill="#c4913a" fill-opacity="0.12" stroke="#c4913a" stroke-width="1.2" stroke-opacity="0.6"/>
      <circle cx="40" cy="34" r="14" fill="none" stroke="#c4913a" stroke-width="0.7" stroke-opacity="0.4"/>
      <text x="40" y="38" text-anchor="middle" font-family="'Cinzel',serif" font-size="9" fill="#c4913a" fill-opacity="0.85">★</text>
      <path d="M32 52 L24 66 L36 60 L40 64 L44 60 L56 66 L48 52" fill="#c4913a" fill-opacity="0.65" stroke="#d4af37" stroke-width="0.8"/>
      <text x="40" y="76" text-anchor="middle" font-family="'Cinzel',serif" font-size="5" fill="#c4913a" fill-opacity="0.75" letter-spacing="1.2">MILESTONE</text>
    </svg>`,
    },
    {
        id: 'cel_spark', label: 'Inspired', category: 'celebrate',
        color: '#f0d060', accent: '#1a0e00', rotation: 1,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#d4af37" fill-opacity="0.06" stroke="#d4af37" stroke-width="0.6" stroke-opacity="0.2"/>
      ${[[40, 22, 10], [22, 38, 6], [58, 30, 7], [28, 55, 5], [52, 52, 6], [34, 34, 8]].map(([cx, cy, r]) => `
        <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="#d4af37" stroke-width="${r * 0.18}" stroke-opacity="0.7" stroke-linecap="round"/>
        <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#d4af37" stroke-width="${r * 0.18}" stroke-opacity="0.7" stroke-linecap="round"/>
        <line x1="${cx - r * 0.7}" y1="${cy - r * 0.7}" x2="${cx + r * 0.7}" y2="${cy + r * 0.7}" stroke="#d4af37" stroke-width="${r * 0.13}" stroke-opacity="0.5" stroke-linecap="round"/>
        <line x1="${cx + r * 0.7}" y1="${cy - r * 0.7}" x2="${cx - r * 0.7}" y2="${cy + r * 0.7}" stroke="#d4af37" stroke-width="${r * 0.13}" stroke-opacity="0.5" stroke-linecap="round"/>
        <circle cx="${cx}" cy="${cy}" r="${r * 0.25}" fill="#f9e07a" fill-opacity="0.9"/>
      `).join('')}
      <text x="40" y="73" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#d4af37" fill-opacity="0.8" letter-spacing="1.5">SPARK</text>
    </svg>`,
    },

    // ── DARK LUXE ──
    {
        id: 'dark_crown', label: 'Royalty', category: 'luxe',
        color: '#d4af37', accent: '#0a0800', rotation: -1,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#d4af37" fill-opacity="0.07" stroke="#d4af37" stroke-width="0.7" stroke-opacity="0.3"/>
      <path d="M18 50 L22 30 L32 42 L40 22 L48 42 L58 30 L62 50Z" fill="#d4af37" fill-opacity="0.75" stroke="#f0d060" stroke-width="0.9"/>
      <rect x="18" y="50" width="44" height="8" rx="2" fill="#d4af37" fill-opacity="0.65" stroke="#f0d060" stroke-width="0.7"/>
      <circle cx="40" cy="22" r="3.5" fill="#f9e07a" fill-opacity="0.9" stroke="#f0d060" stroke-width="0.8"/>
      <circle cx="22" cy="30" r="2.5" fill="#c9897a" fill-opacity="0.8" stroke="#e0a888" stroke-width="0.7"/>
      <circle cx="58" cy="30" r="2.5" fill="#9b7fd4" fill-opacity="0.8" stroke="#b89af8" stroke-width="0.7"/>
      <text x="40" y="70" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#d4af37" fill-opacity="0.8" letter-spacing="1.5">REIGN</text>
    </svg>`,
    },
    {
        id: 'dark_key', label: 'Unlock It', category: 'luxe',
        color: '#b8860b', accent: '#0e0a00', rotation: -3,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#b8860b" fill-opacity="0.07" stroke="#b8860b" stroke-width="0.7" stroke-opacity="0.3"/>
      <circle cx="34" cy="32" r="12" fill="none" stroke="#b8860b" stroke-width="2" stroke-opacity="0.75"/>
      <circle cx="34" cy="32" r="6" fill="none" stroke="#b8860b" stroke-width="1.4" stroke-opacity="0.5"/>
      <line x1="46" y1="38" x2="64" y2="56" stroke="#b8860b" stroke-width="2.5" stroke-opacity="0.7" stroke-linecap="round"/>
      <line x1="56" y1="52" x2="56" y2="60" stroke="#b8860b" stroke-width="2" stroke-opacity="0.65" stroke-linecap="round"/>
      <line x1="60" y1="56" x2="64" y2="56" stroke="#b8860b" stroke-width="2" stroke-opacity="0.65" stroke-linecap="round"/>
      <circle cx="34" cy="32" r="3.5" fill="#d4af37" fill-opacity="0.7"/>
      <text x="40" y="72" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#b8860b" fill-opacity="0.8" letter-spacing="1.2">UNLOCK</text>
    </svg>`,
    },
    {
        id: 'dark_hourglass', label: 'In Time', category: 'luxe',
        color: '#8b7355', accent: '#100800', rotation: 2,
        svgContent: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="#8b7355" fill-opacity="0.07" stroke="#8b7355" stroke-width="0.7" stroke-opacity="0.25"/>
      <rect x="26" y="18" width="28" height="5" rx="2" fill="#8b7355" fill-opacity="0.6" stroke="#a89070" stroke-width="0.7"/>
      <rect x="26" y="57" width="28" height="5" rx="2" fill="#8b7355" fill-opacity="0.6" stroke="#a89070" stroke-width="0.7"/>
      <path d="M28 23 L40 40 L52 23Z" fill="#8b7355" fill-opacity="0.45" stroke="#a89070" stroke-width="0.8"/>
      <path d="M28 57 L40 40 L52 57Z" fill="#d4af37" fill-opacity="0.4" stroke="#e0c060" stroke-width="0.8"/>
      <ellipse cx="40" cy="50" rx="7" ry="5" fill="#d4af37" fill-opacity="0.55"/>
      <text x="40" y="72" text-anchor="middle" font-family="'Cinzel',serif" font-size="5.5" fill="#8b7355" fill-opacity="0.8" letter-spacing="1.2">TIMELESS</text>
    </svg>`,
    },
]

const CATEGORIES: { key: string; label: string; svgIcon: string }[] = [
    {
        key: 'mood', label: 'Mood',
        svgIcon: `<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5.5 10 C6.5 11.5 9.5 11.5 10.5 10" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="5.5" cy="7" r="0.8" fill="currentColor"/><circle cx="10.5" cy="7" r="0.8" fill="currentColor"/></svg>`,
    },
    {
        key: 'nature', label: 'Nature',
        svgIcon: `<svg viewBox="0 0 16 16"><path d="M8 14 C8 14 2 10 2 6 C2 3.8 4 2 6 3 C7 2 9 2 10 3 C12 2 14 3.8 14 6 C14 10 8 14 8 14Z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    },
    {
        key: 'study', label: 'Focus',
        svgIcon: `<svg viewBox="0 0 16 16"><path d="M3 13 L3 4 L10 2 L13 4 L13 13" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M7 13 L7 9 L9 9 L9 13" fill="none" stroke="currentColor" stroke-width="1"/><line x1="5" y1="6" x2="8" y2="5" stroke="currentColor" stroke-width="0.9"/><line x1="9" y1="5" x2="11" y2="5.5" stroke="currentColor" stroke-width="0.9"/></svg>`,
    },
    {
        key: 'mindful', label: 'Mindful',
        svgIcon: `<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8 3 L8 5 M8 11 L8 13 M3 8 L5 8 M11 8 L13 8" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>`,
    },
    {
        key: 'celebrate', label: 'Celebrate',
        svgIcon: `<svg viewBox="0 0 16 16"><path d="M8 2 L9.2 6 L13.5 6 L10 8.5 L11.2 12.5 L8 10 L4.8 12.5 L6 8.5 L2.5 6 L6.8 6Z" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>`,
    },
    {
        key: 'luxe', label: 'Luxe',
        svgIcon: `<svg viewBox="0 0 16 16"><path d="M3 11 L5 5 L8 8.5 L11 5 L13 11Z" fill="none" stroke="currentColor" stroke-width="1.1"/><rect x="3" y="11" width="10" height="2.5" rx="0.8" fill="none" stroke="currentColor" stroke-width="1"/></svg>`,
    },
]

interface JournalStickersProps {
    onSelect: (sticker: Sticker) => void
    onClose: () => void
}

export default function JournalStickers({ onSelect, onClose }: JournalStickersProps) {
    const [activeCategory, setActiveCategory] = useState('mood')
    const [recentlyUsed, setRecentlyUsed] = useState<Sticker[]>([])

    const filtered = STICKER_DEFS.filter(s => s.category === activeCategory)

    const handleSelect = (sticker: Sticker) => {
        setRecentlyUsed(prev => {
            const without = prev.filter(s => s.id !== sticker.id)
            return [sticker, ...without].slice(0, 6)
        })
        onSelect(sticker)
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
                position: 'absolute',
                right: '52px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '260px',
                background: 'rgba(8, 3, 0, 0.96)',
                border: '1px solid rgba(212,175,55,0.28)',
                borderRadius: '18px',
                backdropFilter: 'blur(40px)',
                zIndex: 50,
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,175,55,0.08)',
            }}
        >
            {/* Header */}
            <div style={{
                padding: '14px 16px 10px',
                borderBottom: '1px solid rgba(212,175,55,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <span style={{
                    fontFamily: 'var(--font-cinzel)', fontSize: '10px',
                    letterSpacing: '0.18em', color: 'rgba(212,175,55,0.85)',
                    textTransform: 'uppercase',
                }}>
                    Stickers
                </span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(212,175,55,0.08)',
                        border: '1px solid rgba(212,175,55,0.2)',
                        borderRadius: '6px', cursor: 'pointer',
                        width: '22px', height: '22px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(212,175,55,0.6)', fontSize: '11px',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.18)'; (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.9)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.6)' }}
                >
                    ✕
                </button>
            </div>

            {/* Category tabs */}
            <div style={{
                display: 'flex', gap: '4px', padding: '10px 12px 8px',
                overflowX: 'auto', borderBottom: '1px solid rgba(212,175,55,0.08)',
            }}>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        style={{
                            flexShrink: 0,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                            padding: '6px 8px', borderRadius: '10px', cursor: 'pointer',
                            background: activeCategory === cat.key ? 'rgba(212,175,55,0.14)' : 'transparent',
                            border: activeCategory === cat.key ? '1px solid rgba(212,175,55,0.38)' : '1px solid transparent',
                            transition: 'all 0.15s',
                        }}
                    >
                        <span
                            style={{
                                width: '18px', height: '18px',
                                color: activeCategory === cat.key ? 'rgba(212,175,55,0.95)' : 'rgba(212,175,55,0.4)',
                            }}
                            dangerouslySetInnerHTML={{ __html: cat.svgIcon }}
                        />
                        <span style={{
                            fontFamily: 'var(--font-jost)', fontSize: '8px',
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                            color: activeCategory === cat.key ? 'rgba(212,175,55,0.85)' : 'rgba(212,175,55,0.35)',
                        }}>
                            {cat.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Recently used */}
            <AnimatePresence>
                {recentlyUsed.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        style={{ padding: '8px 12px', borderBottom: '1px solid rgba(212,175,55,0.06)' }}
                    >
                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.4)', marginBottom: '6px' }}>
                            Recent
                        </p>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {recentlyUsed.map(s => (
                                <motion.button
                                    key={s.id}
                                    onClick={() => handleSelect(s)}
                                    whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
                                    style={{
                                        width: '36px', height: '36px', padding: '3px',
                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                    }}
                                    dangerouslySetInnerHTML={{ __html: s.svgContent }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sticker grid */}
            <div style={{ padding: '10px 12px 14px', maxHeight: '300px', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {filtered.map((sticker, i) => (
                        <motion.button
                            key={sticker.id}
                            onClick={() => handleSelect(sticker)}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.04 }}
                            whileHover={{ scale: 1.08, y: -2 }}
                            whileTap={{ scale: 0.94 }}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                                padding: '8px 4px',
                                borderRadius: '12px',
                                background: `${sticker.color}0e`,
                                border: `1px solid ${sticker.color}28`,
                                cursor: 'pointer',
                                transform: `rotate(${sticker.rotation || 0}deg)`,
                                transition: 'background 0.15s, border-color 0.15s',
                            }}
                            onMouseEnter={e => {
                                const el = e.currentTarget as HTMLElement
                                el.style.background = `${sticker.color}1e`
                                el.style.borderColor = `${sticker.color}45`
                            }}
                            onMouseLeave={e => {
                                const el = e.currentTarget as HTMLElement
                                el.style.background = `${sticker.color}0e`
                                el.style.borderColor = `${sticker.color}28`
                            }}
                        >
                            <div
                                style={{ width: '54px', height: '54px' }}
                                dangerouslySetInnerHTML={{ __html: sticker.svgContent }}
                            />
                        </motion.button>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}