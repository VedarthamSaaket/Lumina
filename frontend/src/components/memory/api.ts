import { BaseRound, PuzzleGameId } from './types'
import { GAMES, PUZZLE_GAMES, isPuzzleId } from './constants'
import { apiFetch } from './utils'

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
    const anyR = r as unknown as Record<string, unknown>
    if ('mode' in anyR && 'sequence' in anyR) return `${base} | mode: ${anyR.mode} | shown: [${(anyR.sequence as unknown[]).join(', ')}] | given: [${(anyR.given as unknown[]).join(', ')}]`
    if ('words' in anyR) return `${base} | words shown: [${(anyR.words as string[]).join(', ')}] | recalled: [${(anyR.recalled as string[]).join(', ')}]`
    if ('shown' in anyR) return `${base} | pattern length: ${(anyR.shown as number[]).length} | correct cells: ${(anyR.shown as number[]).join(',')} | tapped: ${(anyR.selected as number[]).join(',')}`
    if ('answer' in anyR) return `${base} | rule: ${anyR.rule} | answer: ${anyR.answer} | given: ${anyR.given}`
    if ('sequence' in anyR && Array.isArray(anyR.sequence)) return `${base} | length: ${(anyR.sequence as unknown[]).length} | given: [${(anyR.given as unknown[]).join(', ')}]`
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
  } catch {
    return ''
  }
}

export async function saveMemoryResult(
  gameId: string,
  stats: Record<string, number | string>,
  roundsData: unknown[],
  aiSummary?: string
) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const solutions = roundsData.map((r, i) => {
    const round = r as unknown as Record<string, unknown>
    const base = { round: i + 1, level: (round.level as number), correct: (round.correct as boolean) }
    if ('sequence' in round && 'mode' in round) return { ...base, type: 'sequence', sequence: round.sequence, mode: round.mode, given: round.given }
    if ('sequence' in round && 'answer' in round) return { ...base, type: 'math', sequence: round.sequence, rule: round.rule, answer: round.answer, given: round.given }
    if ('sequence' in round && Array.isArray(round.sequence)) return { ...base, type: 'color', sequence: round.sequence, given: round.given }
    if ('shown' in round) return { ...base, type: 'spatial', shown: round.shown, selected: round.selected }
    if ('words' in round) return { ...base, type: 'word', words: round.words, recalled: round.recalled }
    return base
  })

  try {
    await apiFetch('/api/cognitive/memory', {
      method: 'POST',
      body: JSON.stringify({
        game_type: gameId,
        stats,
        rounds_data: roundsData,
        solutions,
        ai_summary: aiSummary || null,
        completed_at: new Date().toISOString(),
      }),
    })
  } catch {
    // Silent fail for session save
  }

  if (aiSummary && token) {
    try {
      const isPuzzle = ['matrix', 'oddoneout', 'series', 'analogy', 'paperfold'].includes(gameId)
      const game = isPuzzle ? PUZZLE_GAMES[gameId as PuzzleGameId] : (GAMES as Record<string, unknown>)[gameId as string]
      const topStat = Object.entries(stats)[0]
      const statLine = topStat ? ` · ${topStat[0]}: ${topStat[1]}` : ''
      await apiFetch('/api/dashboard/summaries', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `${(game as { title?: string })?.title || gameId} - Level ${Math.max(...(roundsData as { level: number }[]).map(r => r.level), 0)}${statLine}`,
          content: aiSummary,
          source: isPuzzle ? 'puzzle' : 'cognitive',
        }),
      })
    } catch {
      // Silent fail for summary
    }
  }
}