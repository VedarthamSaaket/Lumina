import { AnyRound, BaseRound, GAMES, GameId, PUZZLE_GAMES, PuzzleGameId } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  })
}

export async function generateGptSummary(
  gameId: string,
  gameTitle: string,
  psych: string,
  stats: Record<string, number | string>,
  rounds: BaseRound[],
  type: 'memory' | 'puzzle'
): Promise<string> {
  const roundDetails = rounds.map((r, i) => {
    const base = `Round ${i + 1} (Lv${r.level}): ${r.correct ? 'CORRECT' : 'WRONG'}`
    const anyR = r as any
    if (type === 'memory') {
      if ('mode' in r && 'sequence' in r) return `${base} | mode: ${anyR.mode} | shown: [${anyR.sequence.join(', ')}] | given: [${anyR.given.join(', ')}]`
      if ('words' in r) return `${base} | words shown: [${anyR.words.join(', ')}] | recalled: [${anyR.recalled.join(', ')}]`
      if ('shown' in r) return `${base} | pattern length: ${anyR.shown.length} | correct cells: ${anyR.shown.join(',')} | tapped: ${anyR.selected.join(',')}`
      if ('answer' in r) return `${base} | rule: ${anyR.rule} | answer: ${anyR.answer} | given: ${anyR.given}`
      if ('sequence' in r && Array.isArray(anyR.sequence)) return `${base} | length: ${anyR.sequence.length} | given: [${anyR.given.join(', ')}]`
    }
    return base
  }).join('\n')

  const prompt = `Write a SHORT cognitive reflection in this exact format:

**What your results show**
- [One specific observation referencing their level progression or accuracy]
- [One observation about what this pattern suggests about their reasoning style]

**One thing to try**
- [One concrete, specific suggestion based on what you observed]

Rules: Each bullet under 20 words. No intro sentence. No em dashes. No clinical labels. Speak as "you". Warm tone.

Game: ${gameTitle}
What it measures: ${psych}
Aggregate stats:
${Object.entries(stats).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

${roundDetails ? `Round-by-round:\n${roundDetails}\n` : ''}

Write a warm, specific 2-paragraph reflection (under 160 words total):
Paragraph 1: Interpret the patterns in the results. Reference specific numbers. Use a metaphor if it fits.
Paragraph 2: One concrete, practical suggestion.

Rules: Speak as "you". No clinical labels. No em dashes. Warm and human tone.`

  try {
    const res = await apiFetch('/api/summary', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.summary ?? ''
  } catch { return '' }
}

export async function saveMemoryResult(
  gameId: string,
  stats: Record<string, number | string>,
  roundsData: any[],
  aiSummary?: string
) {
  const token = getToken()
  const solutions = roundsData.map((r, i) => {
    const base = { round: i + 1, level: r.level, correct: r.correct }
    if ('sequence' in r && 'mode' in r) return { ...base, type: 'sequence', sequence: r.sequence, mode: r.mode, given: r.given }
    if ('sequence' in r && 'answer' in r) return { ...base, type: 'math', sequence: r.sequence, rule: r.rule, answer: r.answer, given: r.given }
    if ('sequence' in r && Array.isArray(r.sequence)) return { ...base, type: 'color', sequence: r.sequence, given: r.given }
    if ('shown' in r) return { ...base, type: 'spatial', shown: r.shown, selected: r.selected }
    if ('words' in r) return { ...base, type: 'word', words: r.words, recalled: r.recalled }
    return base
  })

  try {
    await apiFetch('/api/cognitive/memory', {
      method: 'POST',
      body: JSON.stringify({ game_type: gameId, stats, rounds_data: roundsData, solutions, ai_summary: aiSummary || null, completed_at: new Date().toISOString() }),
    })
  } catch { }

  if (aiSummary && token) {
    try {
      const isPuzzle = ['matrix', 'oddoneout', 'series', 'analogy', 'paperfold'].includes(gameId)
      const game = isPuzzle ? PUZZLE_GAMES[gameId as PuzzleGameId] : (GAMES as any)[gameId as any]
      const topStat = Object.entries(stats)[0]
      const statLine = topStat ? ` · ${topStat[0]}: ${topStat[1]}` : ''
      await apiFetch('/api/dashboard/summaries', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `${game?.title || gameId} - Level ${Math.max(...roundsData.map(r => r.level), 0)}${statLine}`,
          content: aiSummary,
          source: isPuzzle ? 'puzzle' : 'cognitive',
        }),
      })
    } catch { }
  }
}

export async function generateMemorySummary(gameId: GameId, stats: Record<string, number | string>, rounds: AnyRound[]): Promise<string> {
  const game = (GAMES as any)[gameId]
  return generateGptSummary(gameId, game.title, game.psych, stats, rounds, 'memory')
}
