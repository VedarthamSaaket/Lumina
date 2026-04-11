'use client'
// src/components/crisis/CrisisBanner.tsx
import { motion } from 'framer-motion'
import type { RiskLevel } from '@/types'

const resources = [
  { name: 'iCall (India)', number: '9152987821', url: 'https://icallhelpline.org' },
  { name: 'Vandrevala Foundation', number: '1860-2662-345', url: 'https://www.vandrevalafoundation.com' },
  { name: 'Crisis Text Line (Global)', number: 'Text HOME to 741741', url: 'https://www.crisistextline.org' },
  { name: 'International Assoc. for Suicide Prevention', number: '', url: 'https://www.iasp.info/resources/Crisis_Centres/' },
]

export function CrisisBanner({ level }: { level: RiskLevel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-[9999] crisis-banner px-6 py-4"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <motion.div
            className="w-3 h-3 rounded-full bg-white"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <h2 className="font-gothic text-lg tracking-widest text-white">
            {level >= 3 ? 'IMMEDIATE SUPPORT NEEDED' : 'YOU ARE NOT ALONE'}
          </h2>
        </div>

        <p className="font-body text-sm text-white/90 mb-4">
          {level >= 3
            ? 'Please contact emergency services (112 / 911) or reach out to a crisis line immediately.'
            : 'It sounds like you may be having some difficult thoughts. Please reach out to one of these free, confidential resources:'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {resources.map(r => (
            <a
              key={r.name}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-4 py-3"
            >
              <div className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
              <div>
                <div className="text-white font-future text-xs font-semibold tracking-wider">{r.name}</div>
                {r.number && <div className="text-white/70 text-xs font-mono">{r.number}</div>}
              </div>
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
