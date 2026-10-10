// src/lib/usePsychWarmup.ts
'use client'
import { useEffect } from 'react'
import { psychAPI, type PsychPage } from './api'

/**
 * Fire the psych-layer warmup for a page exactly once on mount.
 *
 * Why: the HF Serverless classifier cold-starts in ~10-20s and the local
 * supervisor model may not be loaded yet. Calling this in the page component means the
 * warmup runs WHILE the user reads the page / takes the test. By the time
 * they submit, both layers are warm — the cold-start hides under the user's
 * own interaction time.
 *
 * Fire-and-forget: the promise is intentionally not awaited and errors are
 * swallowed inside psychAPI. A cold or down psych layer never blocks render.
 *
 *   export default function CbtPage() {
 *     usePsychWarmup('cbt')
 *     ...
 *   }
 */
export function usePsychWarmup(page: PsychPage): void {
  useEffect(() => {
    // Guard against React 18 StrictMode double-invoke in dev: a duplicate
    // warmup is harmless (backend is idempotent + LRU-cached) but pointless.
    let cancelled = false
    void psychAPI.warmupPage(page).then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [page])
}
