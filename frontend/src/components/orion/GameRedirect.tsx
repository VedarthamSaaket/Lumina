'use client'

const GAME_TITLES: Record<string, string> = {
  digit: 'Number Sequence', letter: 'Letter Sequence', math: 'Math Patterns',
  color: 'Color Pattern', spatial: 'Pattern Memory', spatial_reverse: 'Reverse Spatial',
  word: 'Word Recall', matrix: 'Matrix Reasoning', oddoneout: 'Odd One Out',
  series: 'Series Completion', analogy: 'Visual Analogy', paperfold: 'Paper Folding',
}

export const MAX_START_LEVEL = 12

export function splitGameRedirect(text: string): { content: string; game: string | null; level: number } {
  const content = text.replace(/\s*GAME_REDIRECT[\s\S]*$/, '').replace(/\s*GAME_[A-Z]*$/, '')
  const match = text.match(/GAME_REDIRECT:(\{[^}]*\})/)
  if (!match) return { content, game: null, level: 1 }
  try {
    const parsed = JSON.parse(match[1])
    if (!GAME_TITLES[parsed.game]) return { content, game: null, level: 1 }
    const level = Math.max(1, Math.min(MAX_START_LEVEL, Math.round(Number(parsed.level)) || 1))
    return { content, game: parsed.game, level }
  } catch {
    return { content, game: null, level: 1 }
  }
}

export function OrionMessageBody({ text, color, streaming }: { text: string; color: string; streaming?: boolean }) {
  const { content, game, level } = splitGameRedirect(text)
  return (
    <>
      {content}
      {game && !streaming && (
        <a href={`/cognitive/memory?game=${game}&level=${level}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
            marginTop: '10px', padding: '9px 13px', borderRadius: '10px',
            background: `linear-gradient(135deg, ${color}26, ${color}0f)`,
            border: `1px solid ${color}55`, color, textDecoration: 'none', whiteSpace: 'normal',
          }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Play {GAME_TITLES[game]}{level > 1 ? `, level ${level}` : ''}
            </span>
            <span style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', opacity: 0.7 }}>
              Orion watches as you play
            </span>
          </span>
          <span aria-hidden="true" style={{ fontSize: '14px' }}>→</span>
        </a>
      )}
    </>
  )
}
