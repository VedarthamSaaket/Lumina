// frontend/src/lib/orionBridge.ts
//
// Dispatch game events from memory page -> OrionCompanion listener.
// Import and call these from your memory game components.

export interface OrionGameEvent {
    game?: string           // e.g. "Digit Span", "Matrix Reasoning"
    score?: number          // raw score
    accuracy?: number       // 0-1 float
    timeMs?: number         // time taken in ms
    streak?: number         // current correct streak
    level?: number          // current difficulty level
    phase?: 'start' | 'end' | 'correct' | 'wrong' | 'hint'
    hint?: string           // Orion auto-message text (optional override)
}

/**
 * Call this from your memory game at key moments:
 * - game start
 * - each correct/wrong answer
 * - game end (with final score + accuracy)
 */
export function dispatchOrionEvent(data: OrionGameEvent) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('orion:game-event', { detail: data }))
}

// ── Convenience helpers ────────────────────────────────────────────────────

export const orion = {
    gameStart: (game: string, level?: number) =>
        dispatchOrionEvent({ game, level, phase: 'start' }),

    correct: (game: string, streak: number, score: number) =>
        dispatchOrionEvent({ game, streak, score, phase: 'correct' }),

    wrong: (game: string, score: number) =>
        dispatchOrionEvent({ game, score, phase: 'wrong' }),

    gameEnd: (game: string, score: number, accuracy: number, timeMs?: number) =>
        dispatchOrionEvent({ game, score, accuracy, timeMs, phase: 'end' }),

    sendHint: (hint: string) =>
        dispatchOrionEvent({ hint, phase: 'hint' }),
}