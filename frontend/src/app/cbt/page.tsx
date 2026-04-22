'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import { cbtAPI } from '@/lib/api'
import toast from 'react-hot-toast'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function fetchSummary(prompt: string): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  try {
    const res = await fetch(`${API_BASE}/api/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: 'include',
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.summary ?? ''
  } catch { return '' }
}

async function saveSummaryToDashboard(moduleTitle: string, summaryText: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  if (!token || !summaryText) return
  try {
    await fetch(`${API_BASE}/api/dashboard/summaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({
        title: `Inner Work · ${moduleTitle}`,
        content: summaryText,
        source: 'cbt',
      }),
    })
  } catch { /* silent */ }
}

type Opt = { label: string; sub: string }
type Step = {
  q: string
  hint?: string
  placeholder?: string
  type?: 'slider' | 'choice'
  min?: number
  max?: number
  label?: string
  options?: Opt[]
}
type Mod = {
  id: string
  icon: string
  title: string
  subtitle: string
  use: string          // one-line purpose
  color: string
  intro: string
  steps: Step[]
}

// 8 modules (even number for grid)
const MODULES: Mod[] = [
  {
    id: 'distortion',
    icon: '◐',
    color: '#c9897a',
    title: 'Thought Patterns',
    subtitle: 'Notice what your mind tells you',
    use: 'Catch negative thinking loops before they spiral',
    intro: 'Our minds sometimes distort reality — making problems seem bigger or making us blame ourselves unfairly. This exercise helps you name the pattern so it loses its grip.',
    steps: [
      {
        q: 'Write the upsetting thought exactly as it sounded in your head.',
        hint: 'Raw and unfiltered. No editing.',
        placeholder: 'e.g. I completely ruined everything again',
      },
      {
        q: 'Which pattern does this sound like?',
        hint: 'Pick whatever feels closest.',
        type: 'choice',
        options: [
          { label: 'All-or-nothing', sub: '"I always fail" or "this never works"' },
          { label: 'Catastrophising', sub: '"This will ruin everything"' },
          { label: 'Mind-reading', sub: '"They must think I\'m stupid"' },
          { label: 'Emotional reasoning', sub: '"I feel worthless, so I must be"' },
          { label: 'Self-blame', sub: '"This is all my fault"' },
          { label: 'None of these fit', sub: '' },
        ],
      },
      {
        q: 'What evidence, even small, suggests this thought isn\'t completely true?',
        hint: 'One moment, one person, one thing that went okay.',
        placeholder: 'e.g. My friend texted me this morning',
      },
      {
        q: 'What would you say to a close friend who felt this way?',
        hint: 'We are always kinder to others than ourselves.',
        placeholder: 'Write to them as if they sent you this thought',
      },
    ],
  },
  {
    id: 'reframing',
    icon: '◑',
    color: '#7a9e7e',
    title: 'Rewriting the Story',
    subtitle: 'Find a kinder, more accurate version',
    use: 'Shift stuck narratives without forcing false positivity',
    intro: 'This is not about forcing positivity — it\'s about finding a version of the story that is honest AND a little gentler. Small shifts in how we frame things change how we feel.',
    steps: [
      {
        q: 'Write the thought that has been troubling you.',
        hint: 'Exactly as it sounds internally.',
        placeholder: 'e.g. I am a burden to everyone around me',
      },
      {
        q: 'How strongly do you believe this right now?',
        type: 'slider',
        min: 0,
        max: 10,
        label: 'Belief strength (0 = barely, 10 = completely certain)',
      },
      {
        q: 'List three real moments that challenge this thought.',
        hint: 'Small counts. "Someone asked for my advice" is enough.',
        placeholder: '1.\n2.\n3.',
      },
      {
        q: 'Write a balanced version — honest but kinder.',
        hint: 'Not fake positivity. What would a fair witness say?',
        placeholder: 'e.g. I\'m going through something hard, but people who care about me are still here',
      },
      {
        q: 'How strongly do you believe this new version?',
        type: 'slider',
        min: 0,
        max: 10,
        label: 'New belief strength',
      },
    ],
  },
  {
    id: 'activation',
    icon: '◒',
    color: '#b8a070',
    title: 'Getting Moving Again',
    subtitle: 'One small action to break the stillness',
    use: 'Interrupt low mood with tiny, manageable steps',
    intro: 'Low mood makes us stop doing things we enjoy, which deepens the low mood. Even a 5-minute action can interrupt that cycle. We start embarrassingly small — that\'s the point.',
    steps: [
      {
        q: 'Name something you used to enjoy, even if it feels distant now.',
        hint: 'Walking, cooking, calling someone, drawing — anything.',
        placeholder: 'e.g. Going for evening walks',
      },
      {
        q: 'What is the smallest possible version of that?',
        hint: 'Five minutes. One block. Just putting on shoes.',
        placeholder: 'e.g. Step outside for 3 minutes, no destination',
      },
      {
        q: 'When exactly will you try this?',
        hint: 'Naming a time makes it 3x more likely to happen.',
        placeholder: 'e.g. Tomorrow at 6pm, after I close my laptop',
      },
      {
        q: 'After doing it, come back and write what you noticed.',
        hint: 'Even "it was hard and I barely enjoyed it" is valuable data.',
        placeholder: 'Write what happened',
      },
    ],
  },
  {
    id: 'esteem',
    icon: '◓',
    color: '#d4af37',
    title: 'Finding Your Ground',
    subtitle: 'Reconnect with your own worth',
    use: 'Build a stable foundation when self-criticism is loud',
    intro: 'This isn\'t about inflating your ego — it\'s about finding honest, solid ground. Something real to stand on when your inner critic is loudest.',
    steps: [
      {
        q: 'Think of someone who genuinely cares about you. What do they value in you?',
        hint: 'See yourself through their eyes, not your own critical lens.',
        placeholder: 'e.g. My sister would say I always show up when it matters',
      },
      {
        q: 'Describe a time you got through something difficult.',
        hint: 'Surviving a hard week counts. So does a hard conversation.',
        placeholder: 'e.g. When my relationship ended I still got up and went to work',
      },
      {
        q: 'Name one thing, however small, that you bring to the people around you.',
        hint: 'Listening, steadiness, humour, care — anything real.',
        placeholder: 'e.g. I am a good listener',
      },
      {
        q: 'Complete this honestly: I deserve kindness because…',
        hint: 'Try to mean it even partially.',
        placeholder: 'I deserve kindness because…',
      },
    ],
  },
  {
    id: 'exposure',
    icon: '◔',
    color: '#c4913a',
    title: 'Facing What Scares You',
    subtitle: 'Build courage one step at a time',
    use: 'Reduce avoidance by approaching fears gradually',
    intro: 'Anxiety grows when we avoid what scares us and shrinks when we face it gradually. This exercise builds a ladder — not jumping into the deep end, just one small step closer.',
    steps: [
      {
        q: 'What situation have you been avoiding because it feels anxiety-provoking?',
        hint: 'Be specific: not "social situations" but "eating alone in a café".',
        placeholder: 'e.g. Calling someone instead of texting',
      },
      {
        q: 'How anxious does the full version feel right now?',
        type: 'slider',
        min: 0,
        max: 10,
        label: 'Anxiety level (0 = calm, 10 = maximum)',
      },
      {
        q: 'What is a version of this that feels like a 3 or 4 out of 10?',
        hint: 'We start here. Manageable, not comfortable.',
        placeholder: 'e.g. Going to an event and planning to stay just 20 minutes',
      },
      {
        q: 'After trying a step, write what actually happened.',
        hint: 'Our anxious predictions are usually wrong. Or we survive them.',
        placeholder: 'Write what happened and what you noticed',
      },
    ],
  },
  {
    id: 'values',
    icon: '◈',
    color: '#9b7fd4',
    title: 'What Matters to You',
    subtitle: 'Clarify what you actually want to move toward',
    use: 'Find direction when life feels unclear or empty',
    intro: 'When life feels directionless it\'s often because we\'ve drifted from what actually matters. This isn\'t about the values you should have — it\'s about finding the ones that are genuinely yours.',
    steps: [
      {
        q: 'Which areas of life feel most important to you right now?',
        hint: 'Not what should matter. What actually does.',
        type: 'choice',
        options: [
          { label: 'Relationships and belonging', sub: 'Family, friendship, intimacy' },
          { label: 'Meaningful work', sub: 'Purpose, contribution, building something' },
          { label: 'Health and energy', sub: 'Body, rest, taking care of yourself' },
          { label: 'Growth and learning', sub: 'Becoming more, understanding yourself' },
          { label: 'Freedom and autonomy', sub: 'Living on your own terms' },
          { label: 'Creativity and expression', sub: 'Making things, aesthetic experience' },
        ],
      },
      {
        q: 'Think of a moment you felt most alive, most yourself. What was happening?',
        hint: 'Even a small moment works.',
        placeholder: 'e.g. I was helping a friend work through something and felt fully present',
      },
      {
        q: 'Where is the biggest gap between what matters and how you spend your time?',
        hint: 'Honest observation, not self-blame.',
        placeholder: 'e.g. I care about creativity but spend most evenings scrolling',
      },
      {
        q: 'One small thing you could do this week that moves toward what matters.',
        hint: 'Tiny counts. 10 minutes, one message, 5 minutes of something you love.',
        placeholder: 'e.g. 15 minutes of drawing before bed on Thursday',
      },
    ],
  },
  {
    id: 'worrytime',
    icon: '◙',
    color: '#7ab8c9',
    title: 'Containing the Worry',
    subtitle: 'Give anxious thoughts a time and place',
    use: 'Stop worry from leaking into everything all day',
    intro: 'Worry tends to intrude constantly. One of the most effective CBT tools is giving it a container — a specific time slot — so it stops hijacking the rest of your day. This is not suppression. It\'s scheduling.',
    steps: [
      {
        q: 'Write out what is worrying you most. No editing.',
        hint: 'Get it all out.',
        placeholder: 'e.g. I\'m worried I made the wrong career decision and can\'t undo it',
      },
      {
        q: 'Sort what you wrote: what can you actually act on vs. what is outside your control?',
        hint: 'Two columns in your mind.',
        placeholder: 'Things I can act on:\n\nThings outside my control:',
      },
      {
        q: 'For what you can act on: what is the smallest concrete next step?',
        hint: 'One action, not a plan.',
        placeholder: 'e.g. Send one email, write one sentence of the thing I\'ve been avoiding',
      },
      {
        q: 'Set your worry window: pick a specific 15-minute slot for worry today or tomorrow.',
        hint: 'Outside that window, redirect: "Not now — that\'s for my worry time."',
        placeholder: 'My worry window is: e.g. Tomorrow at 5:30pm for 15 minutes',
      },
    ],
  },
  {
    id: 'habit',
    icon: '◕',
    color: '#8b7355',
    title: 'Building Something Good',
    subtitle: 'Plant one small wellbeing habit',
    use: 'Create lasting change through tiny consistent actions',
    intro: 'Small consistent actions compound into meaningful change. We are not building a new identity overnight — just planting one seed and making it as easy as possible to water.',
    steps: [
      {
        q: 'What is one small habit you would like to build for your wellbeing?',
        hint: '"Exercise more" is too big. "Stretch for 5 minutes after waking" is perfect.',
        placeholder: 'e.g. Write three things I\'m grateful for before bed',
      },
      {
        q: 'What existing routine could you attach this new habit to?',
        hint: 'This is habit stacking — it makes new habits stick far better.',
        placeholder: 'e.g. Right after I make my morning tea',
      },
      {
        q: 'What might get in the way?',
        hint: 'Planning for obstacles makes you significantly more likely to follow through.',
        placeholder: 'e.g. I\'ll probably forget after a few days',
      },
      {
        q: 'How will you make it easier or remind yourself?',
        hint: 'A phone alarm, a sticky note, telling someone you trust.',
        placeholder: 'e.g. I\'ll put the journal next to my lamp tonight',
      },
    ],
  },
]

// Summary prompts per module — structured for bullet-point output
const MODULE_SUMMARY_PROMPTS: Record<string, string> = {
  distortion: `The person just completed a Thought Patterns CBT exercise. Write a SHORT reflection as bullet points ONLY — no paragraphs, no prose. Format:
• What pattern they were caught in (use a vivid memorable name like "all-or-nothing lens" or "fault magnet")
• What the exercise revealed about their thinking
• One concrete suggestion they can use next time the pattern appears
Under 80 words total. Warm, non-clinical. Direct address as "you".`,

  reframing: `The person completed a Rewriting the Story exercise. Write as bullet points ONLY:
• What belief they started with and how strong it was
• What shift happened (or didn't) in their belief strength
• One actionable next step
Under 80 words. Warm tone. No prose paragraphs.`,

  activation: `The person completed a Behavioural Activation exercise. Write as bullet points ONLY:
• What they are reconnecting with
• The small step they planned
• Why this matters (briefly, warmly)
Under 70 words. Speak as "you".`,

  esteem: `The person completed a self-esteem grounding exercise. Write as bullet points ONLY:
• What they uncovered about how others see them
• One honest strength they named
• A reminder about their relationship with self-criticism
Under 70 words. Warm, grounded tone.`,

  exposure: `The person completed an exposure ladder exercise. Write as bullet points ONLY:
• What they identified as the thing they've been avoiding
• Their first manageable step
• What facing it (even slightly) does for anxiety over time
Under 70 words.`,

  values: `The person completed a values clarification exercise. Write as bullet points ONLY:
• The core value area they identified as most important
• The gap they noticed between values and current life
• The one small action they planned
Under 75 words.`,

  worrytime: `The person completed a worry containment exercise. Write as bullet points ONLY:
• What the worry was about
• What was actionable vs. what they are learning to release
• Their worry window and what it gives them
Under 75 words.`,

  habit: `The person completed a habit-building exercise. Write as bullet points ONLY:
• The habit they chose and why it serves their wellbeing
• How they plan to anchor it (habit stacking)
• The main obstacle and their plan around it
Under 70 words.`,
}

export default function CBTPage() {
  const [active, setActive] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [started, setStarted] = useState(false)
  const [resps, setResps] = useState<Record<string, any[]>>({})
  const [slider, setSlider] = useState(5)
  const [choices, setChoices] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [completedMod, setCompletedMod] = useState<Mod | null>(null)
  const [completionSummary, setCompletionSummary] = useState<string>('')
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const moduleId = params.get('module')
    if (moduleId && MODULES.find(m => m.id === moduleId)) {
      open(moduleId)
    }
  }, [])

  const mod = MODULES.find(m => m.id === active)
  const cur = mod?.steps[step] as Step | undefined
  const vals = resps[active ?? ''] ?? []
  const txt = (vals[step] as string) ?? ''

  const setTxt = (v: string) => {
    if (!active || !mod) return
    setResps(p => ({ ...p, [active]: Object.assign([...(p[active] ?? Array(mod.steps.length).fill(''))], { [step]: v }) }))
  }

  const open = (id: string) => {
    const m = MODULES.find(x => x.id === id)!
    setActive(id); setStep(0); setStarted(false); setChoices([]); setSlider(5)
    setResps(p => ({ ...p, [id]: Array(m.steps.length).fill('') }))
    setCompletedMod(null); setCompletionSummary('')
  }

  const toggleChoice = (l: string) => setChoices(p => p.includes(l) ? p.filter(c => c !== l) : [...p, l])

  const ok = () => {
    if (!cur) return false
    if (cur.type === 'slider') return true
    if (cur.type === 'choice') return choices.length > 0
    return txt.trim().length > 0
  }

  const generateCompletionSummary = async (modId: string, modTitle: string, responses: any[]) => {
    setSummaryLoading(true)
    const promptNote = MODULE_SUMMARY_PROMPTS[modId] || `The person completed a CBT inner work exercise called ${modTitle}. Write bullet points ONLY (3-4 bullets). Under 80 words. Warm, direct.`
    const responseSummary = responses
      .map((r, i) => `Step ${i + 1}: ${typeof r === 'string' ? r : JSON.stringify(r)}`)
      .filter(r => r.length > 10)
      .join('\n')

    const prompt = `${promptNote}

Person's responses:
${responseSummary}

Additional rules:
- Start each line with •
- No prose paragraphs whatsoever
- No em dashes
- No clinical jargon
- Under 80 words total`

    try {
      const text = await fetchSummary(prompt)
      if (text) {
        setCompletionSummary(text)
        await saveSummaryToDashboard(modTitle, text)
      }
    } catch { /* silent */ } finally {
      setSummaryLoading(false)
    }
  }

  const next = async () => {
    if (!mod || !cur || !active) return
    let v: any = txt
    if (cur.type === 'slider') v = slider
    else if (cur.type === 'choice') v = choices.join(', ') || 'No selection'
    const updated = Object.assign([...(resps[active] ?? Array(mod.steps.length).fill(''))], { [step]: v })
    setResps(p => ({ ...p, [active]: updated })); setChoices([]); setSlider(5)
    if (step < mod.steps.length - 1) { setStep(s => s + 1); return }

    setSaving(true)
    try {
      await cbtAPI.saveProgress(active, { responses: updated })
      toast.success('Exercise complete.')
      setCompletedMod(mod)
      setActive(null)
      setStarted(false)
      generateCompletionSummary(mod.id, mod.title, updated)
    } catch {
      toast.error('Could not save. Check your connection.')
    } finally { setSaving(false) }
  }

  // ── COMPLETION SCREEN ──
  if (completedMod) {
    return (
      <main className="bg-cbt min-h-screen relative overflow-hidden">
        <ParticleCanvas colors={['#d4af37', '#c9897a', '#b8860b', '#fef4e4']} count={18} />
        <Navigation />
        <div className="relative z-10 pt-24 pb-20 px-5 max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-strong rounded-2xl p-8" style={{ border: `1px solid ${completedMod.color}28` }}>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3" style={{ color: completedMod.color }}>{completedMod.icon}</div>
              <h2 style={{
                fontFamily: "'Libre Baskerville', Baskerville, Georgia, serif",
                fontWeight: 400, fontStyle: 'italic',
                fontSize: '1.6rem', color: 'var(--text-primary)',
                letterSpacing: '-0.01em', marginBottom: '4px',
              }}>
                {completedMod.title}
              </h2>
              <p style={{ fontFamily: 'var(--font-jost)', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: completedMod.color, opacity: 0.7 }}>
                Exercise complete
              </p>
            </div>

            <div className="rounded-xl p-5 mb-6" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
              <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
                Your Reflection
              </p>
              {summaryLoading ? (
                <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                    style={{ borderColor: `${completedMod.color} transparent transparent transparent` }} />
                  <span className="font-body text-sm">Writing your reflection...</span>
                </div>
              ) : completionSummary ? (
                <div className="space-y-2">
                  {completionSummary.split('\n').filter(l => l.trim()).map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span style={{ color: completedMod.color, flexShrink: 0, marginTop: '2px', fontSize: '12px' }}>
                        {line.startsWith('•') ? '' : '•'}
                      </span>
                      <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text-primary)', margin: 0 }}>
                        {line.replace(/^[•\-]\s*/, '')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-body text-sm" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Your responses have been saved.
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <motion.button onClick={() => { setCompletedMod(null); setCompletionSummary('') }}
                whileHover={{ scale: 1.03 }}
                className="px-6 py-3 rounded-xl font-jost text-sm tracking-widest uppercase glass"
                style={{ border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                All exercises
              </motion.button>
              <motion.button onClick={() => window.location.href = '/chat'}
                whileHover={{ scale: 1.03 }}
                className="px-6 py-3 rounded-xl font-jost text-sm tracking-widest uppercase"
                style={{ background: `${completedMod.color}18`, border: `1px solid ${completedMod.color}38`, color: 'var(--text-primary)' }}>
                Talk it through
              </motion.button>
              <motion.button onClick={() => window.location.href = '/dashboard'}
                whileHover={{ scale: 1.03 }}
                className="px-6 py-3 rounded-xl font-jost text-sm tracking-widest uppercase glass"
                style={{ border: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                View profile
              </motion.button>
            </div>
          </motion.div>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-cbt min-h-screen relative overflow-hidden">
      <ParticleCanvas colors={['#d4af37', '#c9897a', '#b8860b', '#fef4e4']} count={18} />
      <Navigation />
      <div className="relative z-10 pt-24 pb-20 px-5 max-w-3xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-12">
          <h1 style={{
            fontFamily: "'Libre Baskerville', 'Baskerville Old Face', Baskerville, Georgia, serif",
            fontWeight: 400, fontStyle: 'italic',
            fontSize: 'clamp(2.8rem, 6vw, 5rem)',
            color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '10px',
          }}>
            Inner{' '}
            <span style={{
              background: 'linear-gradient(90deg, #b8860b 0%, #d4af37 30%, #f9e07a 55%, #d4af37 78%, #b8860b 100%)',
              backgroundSize: '220% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent', animation: 'textShimmer 4s linear infinite',
            }}>Work</span>
          </h1>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.15rem', color: 'var(--text-secondary)' }}>
            Guided CBT exercises for real change. Use when you need it.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* GRID — 2 columns, 8 cards */}
          {!active && (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MODULES.map((m, i) => (
                <motion.button key={m.id}
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -4, scale: 1.012 }} whileTap={{ scale: 0.98 }}
                  onClick={() => open(m.id)}
                  className="glass rounded-xl p-5 text-left"
                  style={{ border: `1px solid ${m.color}28` }}>
                  <div className="flex items-start gap-4">
                    <div className="text-2xl flex-shrink-0 mt-0.5" style={{ color: m.color, filter: `drop-shadow(0 0 5px ${m.color}45)` }}>
                      {m.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 style={{
                        fontFamily: "'Libre Baskerville', Baskerville, Georgia, serif",
                        fontWeight: 400, fontStyle: 'italic',
                        fontSize: '1.05rem', color: 'var(--text-primary)',
                        letterSpacing: '-0.01em', marginBottom: '3px',
                      }}>
                        {m.title}
                      </h3>
                      <p className="font-jost text-xs mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
                        {m.subtitle}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span style={{ fontSize: '9px', color: m.color, opacity: 0.5 }}>●</span>
                        <p className="font-jost text-xs" style={{ color: m.color, opacity: 0.8, letterSpacing: '0.04em' }}>
                          {m.use}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 h-px" style={{ background: `linear-gradient(90deg,${m.color}40,transparent)` }} />
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="font-jost text-xs tracking-widest uppercase" style={{ color: m.color, opacity: 0.65 }}>
                      {m.steps.length} steps · Begin
                    </span>
                    <span style={{ color: m.color, opacity: 0.5, fontSize: '10px' }}>→</span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* INTRO */}
          {active && mod && !started && (
            <motion.div key="intro" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <button onClick={() => setActive(null)}
                className="mb-6 text-sm font-jost tracking-widest uppercase opacity-55 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-primary)' }}>← Back</button>

              <div className="glass-strong rounded-2xl p-7" style={{ border: `1px solid ${mod.color}28` }}>
                <div className="flex items-center gap-4 mb-5">
                  <div className="text-4xl" style={{ color: mod.color, filter: `drop-shadow(0 0 10px ${mod.color}55)` }}>
                    {mod.icon}
                  </div>
                  <div>
                    <h2 style={{
                      fontFamily: "'Libre Baskerville', Baskerville, Georgia, serif",
                      fontWeight: 400, fontStyle: 'italic',
                      fontSize: '1.5rem', color: 'var(--text-primary)', letterSpacing: '-0.01em',
                    }}>
                      {mod.title}
                    </h2>
                    <p className="font-jost text-xs mt-0.5" style={{ color: mod.color, opacity: 0.8, letterSpacing: '0.04em' }}>
                      {mod.use}
                    </p>
                  </div>
                </div>

                <div className="mb-6 p-4 rounded-xl" style={{ background: `${mod.color}08`, border: `1px solid ${mod.color}18` }}>
                  <p className="font-body text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {mod.intro}
                  </p>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-xs font-jost" style={{ color: 'var(--text-muted)' }}>
                  <span>{mod.steps.length} steps</span><span>·</span>
                  <span>Take your time</span><span>·</span>
                  <span>Saved privately</span>
                </div>

                <motion.button onClick={() => setStarted(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-xl font-jost font-semibold text-sm tracking-widest uppercase"
                  style={{
                    background: `linear-gradient(135deg,${mod.color}22,${mod.color}0d)`,
                    border: `1px solid ${mod.color}38`, color: 'var(--text-primary)',
                  }}>
                  Begin this exercise
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP */}
          {active && mod && started && cur && (
            <motion.div key={`s${step}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => step > 0 ? setStep(s => s - 1) : setStarted(false)}
                  className="text-sm font-jost tracking-widest uppercase opacity-55 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-primary)' }}>Back</button>
                <div className="flex gap-1.5">
                  {mod.steps.map((_, i) => (
                    <div key={i} className="h-1.5 rounded-full transition-all duration-300"
                      style={{ width: i === step ? '22px' : '7px', background: i <= step ? mod.color : 'rgba(212,175,55,0.14)' }} />
                  ))}
                </div>
                <span className="text-xs font-jost" style={{ color: 'var(--text-muted)' }}>
                  {step + 1} / {mod.steps.length}
                </span>
              </div>

              <div className="glass-strong rounded-2xl p-7" style={{ border: `1px solid ${mod.color}18` }}>
                <span className="text-xs font-jost tracking-widest uppercase" style={{ color: mod.color }}>Step {step + 1}</span>
                <h3 className="font-body text-xl leading-relaxed mt-2 mb-2" style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                  {cur.q}
                </h3>
                {cur.hint && (
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    {cur.hint}
                  </p>
                )}

                {/* Text input */}
                {(!cur.type || cur.type === 'text' as any) && (
                  <textarea rows={4} value={txt}
                    onChange={e => { setTxt(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px' }}
                    className="w-full p-4 rounded-xl resize-none font-body text-base focus:outline-none"
                    placeholder={cur.placeholder || 'Write freely...'}
                    style={{
                      background: 'var(--bg-glass)',
                      border: `1px solid ${mod.color}22`,
                      color: 'var(--text-primary)',
                      backdropFilter: 'blur(10px)',
                      lineHeight: '1.65',
                      fontSize: '15px',
                    }} />
                )}

                {/* Slider */}
                {cur.type === 'slider' && (
                  <div className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{cur.min ?? 0}</span>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: '3.5rem', color: mod.color, lineHeight: 1 }}>{slider}</span>
                      <span className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{cur.max ?? 10}</span>
                    </div>
                    <input type="range" min={cur.min ?? 0} max={cur.max ?? 10} value={slider}
                      onChange={e => setSlider(+e.target.value)}
                      className="mood-slider w-full" />
                    <p className="text-center mt-2 text-xs font-jost" style={{ color: 'var(--text-muted)' }}>
                      {cur.label}: {slider} / {cur.max ?? 10}
                    </p>
                  </div>
                )}

                {/* Choice */}
                {cur.type === 'choice' && cur.options && (
                  <div className="space-y-2.5">
                    {cur.options.map(opt => {
                      const sel = choices.includes(opt.label)
                      return (
                        <button key={opt.label} onClick={() => toggleChoice(opt.label)}
                          className="w-full text-left p-4 rounded-xl transition-all duration-200"
                          style={{
                            background: sel ? `${mod.color}13` : 'var(--bg-glass)',
                            border: sel ? `1px solid ${mod.color}45` : '1px solid var(--border-subtle)',
                          }}>
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
                              style={{
                                background: sel ? mod.color : 'transparent',
                                border: sel ? `2px solid ${mod.color}` : '2px solid rgba(212,175,55,0.2)',
                              }}>
                              {sel && <span className="text-xs font-bold" style={{ color: '#1a0e04', lineHeight: 1 }}>v</span>}
                            </div>
                            <div>
                              <div className="font-body text-sm" style={{ color: 'var(--text-primary)' }}>{opt.label}</div>
                              {opt.sub && (
                                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {opt.sub}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                <motion.button onClick={next} disabled={saving || !ok()}
                  className="mt-7 w-full py-4 rounded-xl font-jost font-semibold text-sm tracking-widest uppercase disabled:opacity-40"
                  style={{
                    background: `linear-gradient(135deg,${mod.color}22,${mod.color}0d)`,
                    border: `1px solid ${mod.color}38`,
                    color: 'var(--text-primary)',
                  }}
                  whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.97 }}>
                  {saving ? 'Saving...' : step < mod.steps.length - 1 ? 'Continue' : 'Complete'}
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  )
}