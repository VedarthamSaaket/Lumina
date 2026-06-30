'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { GoldHeading } from '@/components/ui/GoldHeading'
import Grainient from '@/components/ui/Grainient'
import { cbtAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { useThemeStore } from '@/lib/themeStore'
import { usePsychWarmup } from '@/lib/usePsychWarmup'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function fetchContextualSummary(opts: {
  surface: string
  reference_id?: string
  base_prompt: string
  structured_data?: Record<string, unknown>
  save_to_dashboard?: boolean
  summary_title?: string
}): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  try {
    const res = await fetch(`${API_BASE}/api/summary/contextual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: 'include',
      body: JSON.stringify(opts),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.summary ?? ''
  } catch { return '' }
}

type StepType = 'text' | 'slider' | 'choice' | 'split'

type Step = {
  q: string
  hint?: string
  placeholder?: string
  type?: StepType
  min?: number
  max?: number
  label?: string
  options?: { label: string; sub: string }[]
  splitLeft?: string
  splitRight?: string
  splitPlaceholderLeft?: string
  splitPlaceholderRight?: string
  /** Plain-language explanation shown when the user clicks "Need help understanding this?".
   *  Optional, falls back to a type-aware generic tip. */
  tip?: string
}

// Generic plain-language tip used when a step has no explicit `tip`. Keeps the
// help affordance available everywhere without forcing a per-step copy edit.
function fallbackTip(s: Step): string {
  if (s.type === 'slider') {
    return "Just slide to a number that feels right today. A rough guess is fine, there is no correct answer. If you are not sure, pick the middle."
  }
  if (s.type === 'choice') {
    return "Pick whichever feels most like you. There is no wrong answer. If two options feel right, choose the one that is closer to your gut reaction."
  }
  if (s.type === 'split') {
    return "Sort your worries into two boxes. On the left, things you could actually do something about. On the right, things outside your control. It is okay if one side is empty."
  }
  const example = (s.placeholder || "").replace(/^e\.g\.\s*/i, "").trim()
  return (
    "Write whatever comes to mind, even if it feels messy. Do not try to sound smart or right. "
    + (example ? `Something like: "${example}"` : "A sentence or two is plenty.")
  )
}

type Mod = {
  id: string
  icon: string
  title: string
  subtitle: string
  use: string
  color: string
  intro: string
  steps: Step[]
}

// ─── Modules ───────────────────────────────────────────────────────────────
const MODULES: Mod[] = [
  {
    id: 'distortion',
    icon: '◐',
    color: '#c9897a',
    title: 'Thought Patterns',
    subtitle: 'Notice what your mind tells you',
    use: 'Catch loops that pull you down before they spiral',
    intro: 'Sometimes our minds run familiar scripts that feel true but might not be the whole picture. This exercise is about noticing, not fixing. You do not need to do anything with what comes up, just see it clearly.',
    steps: [
      {
        q: 'Write down a thought that has been bothering you. Exactly as it sounds internally, not the polished version.',
        hint: 'The rawer the better. What does the voice actually say?',
        placeholder: 'e.g. I always end up messing things up',
      },
      {
        q: 'How does this thought tend to arrive? Pick what feels closest.',
        hint: 'There is no right answer here.',
        type: 'choice',
        options: [
          { label: 'It shows up at night or when things are quiet', sub: 'Usually when there is space to think' },
          { label: 'It arrives right after something goes wrong', sub: 'A trigger-and-response kind of pattern' },
          { label: 'It is just always there, in the background', sub: 'More like a low hum than a sudden arrival' },
          { label: 'It comes when I compare myself to others', sub: 'Social situations tend to bring it out' },
          { label: 'It shows up when I am tired or depleted', sub: 'Harder to keep at bay when resources are low' },
          { label: 'I am not sure when it arrives, it just does', sub: '' },
        ],
      },
      {
        q: 'If this thought is a story your mind is telling, what is the story really about underneath it?',
        hint: 'Not whether it is true or false. Just what fear or need it might be pointing to.',
        placeholder: 'e.g. It might be about needing to feel capable and safe',
      },
      {
        q: 'What is one small thing that does not quite fit the story? Even a moment, even a tiny exception.',
        hint: 'It does not have to disprove anything. Just something that coexists with the thought.',
        placeholder: 'e.g. Last week my friend actually asked for my advice',
      },
    ],
  },
  {
    id: 'reframing',
    icon: '◑',
    color: '#7a9e7e',
    title: 'Rewriting the Story',
    subtitle: 'Find a kinder and more accurate version',
    use: 'Shift stuck narratives without forcing false positivity',
    intro: 'This is not about talking yourself into feeling better. It is about checking whether the story you are carrying is fully accurate or whether it has been written under pressure. A story can be dark and still be missing something.',
    steps: [
      {
        q: 'Write the thought or belief that has been taking up space lately.',
        hint: 'As it actually sounds, not the softened version.',
        placeholder: 'e.g. I am a burden to the people around me',
      },
      {
        q: 'How much does this feel true right now, in your gut?',
        type: 'slider',
        min: 0,
        max: 10,
        label: 'How strongly it feels true (0 = barely, 10 = completely)',
      },
      {
        q: 'Describe three real moments that sit alongside this belief without matching it.',
        hint: 'Not proof it is wrong. Just things that coexist with it.',
        placeholder: '1.\n2.\n3.',
      },
      {
        q: 'Write a version of this belief that includes what you just noticed. Honest, not cheerful.',
        hint: 'What would a fair and caring witness say about you right now?',
        placeholder: 'e.g. I am going through something hard, and people who care about me have not left',
      },
      {
        q: 'How much does the new version feel true, in your gut?',
        type: 'slider',
        min: 0,
        max: 10,
        label: 'How true the new version feels now',
      },
    ],
  },
  {
    id: 'activation',
    icon: '◒',
    color: '#b8a070',
    title: 'Getting Moving Again',
    subtitle: 'One small action to interrupt the stillness',
    use: 'Break out of low-energy loops with tiny, manageable steps',
    intro: 'When everything feels heavy, we tend to stop doing the things that used to feel good, which makes the heaviness worse. This is a loop, not a character flaw. We break it with something embarrassingly small. That is the whole idea.',
    steps: [
      {
        q: 'Name something that used to bring you something, even a little. Joy, calm, connection, satisfaction, anything.',
        hint: 'It does not need to sound impressive. Walking, cooking, drawing, calling someone.',
        placeholder: 'e.g. Going for a walk in the evening',
      },
      {
        q: 'Right now, how much energy does even thinking about it take?',
        type: 'slider',
        min: 0,
        max: 10,
        label: 'Energy cost (0 = effortless, 10 = nearly impossible today)',
      },
      {
        q: 'What is a version of this that would cost almost nothing? Five minutes. One step. Just putting on shoes.',
        hint: 'Make it so small it would feel silly to say no.',
        placeholder: 'e.g. Step outside the front door for three minutes',
      },
      {
        q: 'When specifically could this happen? A day, a rough time, an existing routine it could attach to.',
        hint: 'A specific time makes it three times more likely to happen.',
        placeholder: 'e.g. Tomorrow after I close my laptop, around 6pm',
      },
    ],
  },
  {
    id: 'esteem',
    icon: '◓',
    color: '#d4af37',
    title: 'Finding Your Ground',
    subtitle: 'Reconnect with something real in yourself',
    use: 'Build something stable when your inner critic is loudest',
    intro: 'This is not about building confidence or inflating your sense of self. It is about finding something honest to stand on when your inner critic has been very loud. Real ground, not a performance.',
    steps: [
      {
        q: 'Think of someone who genuinely knows you and cares about you. What do you think they actually value in you?',
        hint: 'Try to see yourself through their eyes rather than your own, just for a moment.',
        placeholder: 'e.g. My sister would probably say I show up when it matters, even when it is hard for me',
      },
      {
        q: 'Describe something you got through that you did not think you could handle at the time.',
        hint: 'It does not need to be dramatic. A hard week counts. A hard conversation counts.',
        placeholder: 'e.g. When my relationship ended I still got up and went to work every day',
      },
      {
        q: 'Name one quality you have that genuinely helps the people around you, even in a small way.',
        hint: 'Listening, steadiness, humour, honesty, reliability, care. Anything real.',
        placeholder: 'e.g. I am a good listener, people tend to open up to me',
      },
      {
        q: 'Finish this honestly: I deserve kindness because...',
        hint: 'Try to mean it even a little. You do not need to fully believe it yet.',
        placeholder: 'I deserve kindness because...',
      },
    ],
  },
  {
    id: 'exposure',
    icon: '◔',
    color: '#c4913a',
    title: 'Facing What Scares You',
    subtitle: 'Build courage one small step at a time',
    use: 'Gently reduce the power that avoidance has over your life',
    intro: 'The more we avoid something that frightens us, the bigger it tends to grow in our minds. Facing it gradually, at a pace that feels manageable rather than comfortable, is how we reclaim ground. We do not start with the hard thing. We start somewhere.',
    steps: [
      {
        q: 'What is something you have been steering around because it feels anxiety-provoking?',
        hint: 'Be specific. Not "social situations" but "making a phone call instead of texting".',
        placeholder: 'e.g. Walking into a room where I do not know anyone',
      },
      {
        q: 'How anxious does the full version of this feel right now?',
        type: 'slider',
        min: 0,
        max: 10,
        label: 'Anxiety level if you had to do the full version today (0 = calm, 10 = maximum)',
      },
      {
        q: 'What would a version of this look and feel like that sits around a 3 or 4 out of 10?',
        hint: 'Manageable, not comfortable. That is where we start.',
        placeholder: 'e.g. Going to an event with a friend, staying 20 minutes, leaving whenever I need to',
      },
      {
        q: 'What do you imagine will happen if you try the smaller version? Be honest about what your mind predicts.',
        hint: 'Our anxious predictions are worth naming. They are usually far worse than reality.',
        placeholder: 'e.g. I will freeze up and people will notice and think I am strange',
      },
    ],
  },
  {
    id: 'values',
    icon: '◈',
    color: '#9b7fd4',
    title: 'What Matters to You',
    subtitle: 'Clarify what you actually want to move toward',
    use: 'Find direction when life feels unclear or hollow',
    intro: 'When things feel directionless, it is often because we have drifted from what actually matters to us, not what we are supposed to value, but what genuinely does. This is about finding that, quietly.',
    steps: [
      {
        q: 'Which of these feels most alive right now, most like something you actually care about?',
        hint: 'Not what should matter. What honestly does.',
        type: 'choice',
        options: [
          { label: 'Being close to people I love', sub: 'Belonging, intimacy, real connection' },
          { label: 'Building or creating something', sub: 'Work that means something, contribution' },
          { label: 'Taking care of myself', sub: 'Rest, health, feeling present in my body' },
          { label: 'Growing and understanding myself', sub: 'Becoming more, seeing things clearly' },
          { label: 'Living on my own terms', sub: 'Freedom, authenticity, not performing' },
          { label: 'Making things, expressing myself', sub: 'Creativity, beauty, aesthetic experience' },
        ],
      },
      {
        q: 'Think of a moment in the last year when you felt most like yourself. What was happening?',
        hint: 'Any size of moment. What was present in it?',
        placeholder: 'e.g. I was helping a friend untangle something difficult and I felt completely present',
      },
      {
        q: 'Where do you notice the biggest gap between what you just said matters and how your days actually go?',
        hint: 'Not a judgment. Just an honest look.',
        placeholder: 'e.g. I care about connection but I have not reached out to anyone properly in weeks',
      },
      {
        q: 'What is one small thing you could do this week that moves even slightly toward what matters?',
        hint: 'Ten minutes counts. One message counts. One small thing you actually do beats a big plan you do not.',
        placeholder: 'e.g. Message one person I have been meaning to reach out to',
      },
    ],
  },
  {
    id: 'worrytime',
    icon: '◴',
    color: '#7ab8c9',
    title: 'Containing the Worry',
    subtitle: 'Give anxious thoughts a specific time and place',
    use: 'Stop worry from bleeding into everything all day',
    intro: 'Worry has a way of arriving uninvited and refusing to leave. One of the most effective approaches is giving it a container, a specific window where it gets your full attention, so the rest of the day can breathe. This is not about suppressing it. It is about scheduling it.',
    steps: [
      {
        q: 'Write out whatever has been worrying you most. No editing, just get it on the page.',
        hint: 'Everything you have been carrying around.',
        placeholder: 'e.g. I keep wondering if I made the wrong choice with my career and whether there is a way back',
      },
      {
        q: 'Looking at what you wrote, sort it into two sides.',
        hint: 'Left: things you could actually do something about. Right: things outside your control for now.',
        type: 'split',
        splitLeft: 'Things I can act on',
        splitRight: 'Things outside my control right now',
        splitPlaceholderLeft: 'e.g. Research alternative paths, talk to someone in that field...',
        splitPlaceholderRight: 'e.g. The economy, other people\'s decisions, how things went in the past...',
      },
      {
        q: 'For what you can act on: what is the single smallest concrete next step?',
        hint: 'One action. Not a plan. The smallest thing that counts as moving.',
        placeholder: 'e.g. Send one email, write one paragraph, make one phone call',
      },
      {
        q: 'Choose a specific 15-minute window today or tomorrow that becomes your designated worry time.',
        hint: 'When worry shows up outside that window, you can tell it: not now, I have time set aside for you.',
        placeholder: 'e.g. Tomorrow at 5:30pm I will sit with this for exactly 15 minutes',
      },
    ],
  },
  {
    id: 'habit',
    icon: '◕',
    color: '#8b7355',
    title: 'Building Something Good',
    subtitle: 'Plant one small wellbeing habit',
    use: 'Create lasting change through consistent tiny actions',
    intro: 'The research on habit formation is clear: small and consistent outperforms big and intense every time. We are not building a new identity overnight. We are planting one seed and making it as easy as possible to water it.',
    steps: [
      {
        q: 'What is one small habit you would like to build for yourself?',
        hint: '"Exercise more" is too vague. "Stretch for five minutes after I wake up" is just right.',
        placeholder: 'e.g. Write three things I am grateful for before I go to sleep',
      },
      {
        q: 'What already existing part of your routine could this attach to?',
        hint: 'Attaching a new habit to an existing one makes it dramatically more likely to stick.',
        placeholder: 'e.g. Right after I make my morning tea, before I look at my phone',
      },
      {
        q: 'What is most likely to get in the way?',
        hint: 'Naming the obstacle now means you are not surprised when it shows up.',
        placeholder: 'e.g. I will probably forget after a couple of days when the novelty wears off',
      },
      {
        q: 'How will you make it easier or remind yourself?',
        hint: 'A phone reminder, a sticky note, placing something visible, telling someone you trust.',
        placeholder: 'e.g. I will put my journal on my pillow tonight so it is there when I get into bed',
      },
    ],
  },
]

const MODULE_SUMMARY_PROMPTS: Record<string, string> = {
  distortion: `You are a deep psychological guide, not a reporter. Someone just worked through a thought pattern exercise. Do NOT repeat what they wrote. Instead, use their responses to generate action-oriented insights. Based on their responses, write 3-4 bullet points that:
• Name the specific cognitive pattern they seem caught in (give it a vivid name, e.g. "the mind-reader script" or "the all-or-nothing lens")
• Reveal something they likely haven't noticed about how this pattern operates
• Give one specific, actionable practice they can do when this pattern next activates
Under 100 words. Speak as "you". Warm but incisive. No em dashes. No clinical labels.`,

  reframing: `You are a psychological guide. Someone completed a story-rewriting exercise. Based on their responses, generate 3 action-oriented bullet points that:
• Identify the core narrative they were carrying and what it reveals about their self-concept
• Highlight what shifted (or began to) through their own exceptions
• Give one concrete, one-sentence belief-rehearsal phrase they can use when the old story resurfaces
Under 100 words. No em dashes. Speak as "you".`,

  activation: `Someone planned a small reactivation step. Generate 3 bullet points:
• What underlying need or value the chosen activity connects to
• One insight about why this specific action (not the general idea) matters for their momentum
• One specific way to lower the barrier even further if resistance shows up
Under 80 words. Speak as "you". No em dashes.`,

  esteem: `Someone explored their sense of self-worth. Generate actionable insights:
• One pattern in how they diminish themselves that the exercise surface
• One genuine quality they possess that their inner critic hides from them
• One specific sentence they can say to themselves when the critic gets loud
Under 80 words. Speak as "you". No em dashes.`,

  exposure: `Someone mapped out facing something they avoid. Generate 3 bullet points:
• What underlying fear the avoidance is protecting
• What their chosen first step reveals about their courage
• One specific in-the-moment strategy for when anxiety spikes during the step
Under 80 words. Speak as "you". No em dashes.`,

  values: `Someone worked through values. Generate 3 actionable bullet points:
• The deeper need their chosen value reveals about this season of their life
• The specific cost of the gap between their value and their current days
• One measurable action they can take this week to close the gap by 10%
Under 80 words. Speak as "you". No em dashes.`,

  worrytime: `Someone contained their worry. Generate 3 bullet points:
• What the worry is ultimately protecting (what matters to them that feels threatened)
• One specific release practice for the things outside their control
• How to handle the worry when it arrives outside their scheduled window
Under 80 words. Speak as "you". No em dashes.`,

  habit: `Someone planned a small habit. Generate 3 bullet points:
• What deeper desire this habit actually serves (not just the surface behavior)
• Insight about why anchoring matters more than motivation
• One specific commitment device they can use to follow through
Under 80 words. Speak as "you". No em dashes.`,
}

export default function InnerWorkPage() {
  usePsychWarmup('cbt')
  const { theme } = useThemeStore()
  const isLight = theme === 'light'
  const [active, setActive] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [started, setStarted] = useState(false)
  const [resps, setResps] = useState<Record<string, any[]>>({})
  const [slider, setSlider] = useState(5)
  const [choices, setChoices] = useState<string[]>([])
  const [splitLeft, setSplitLeft] = useState('')
  const [splitRight, setSplitRight] = useState('')
  const [saving, setSaving] = useState(false)
  const [completedMod, setCompletedMod] = useState<Mod | null>(null)
  const [completionSummary, setCompletionSummary] = useState<string>('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  // ── Confusion-help tracking ────────────────────────────────────────────────
  // Per-step: time on step, response length. Help toggle count across the
  // session. After completion we use these to decide whether to suggest a
  // simpler retake or a different module (no LLM round-trip needed).
  const [helpOpen, setHelpOpen] = useState(false)            // current step
  const [simplerMode, setSimplerMode] = useState(false)      // expand tips by default on retake
  const stepStartRef = useRef<number>(Date.now())
  const stepTimingsRef = useRef<{ ms: number; chars: number }[]>([])
  const helpClicksRef = useRef(0)
  const [confused, setConfused] = useState(false)

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

  const open = (id: string, opts?: { simpler?: boolean }) => {
    const m = MODULES.find(x => x.id === id)!
    setActive(id); setStep(0); setStarted(false); setChoices([]); setSlider(5)
    setSplitLeft(''); setSplitRight('')
    setResps(p => ({ ...p, [id]: Array(m.steps.length).fill('') }))
    setCompletedMod(null); setCompletionSummary('')
    // Reset confusion state for the new attempt
    stepTimingsRef.current = []
    helpClicksRef.current = 0
    setConfused(false)
    setSimplerMode(opts?.simpler === true)
    setHelpOpen(opts?.simpler === true) // simpler retake: tips expanded by default
    stepStartRef.current = Date.now()
  }

  const toggleChoice = (l: string) => setChoices(p => p.includes(l) ? p.filter(c => c !== l) : [...p, l])

  const ok = () => {
    if (!cur) return false
    if (cur.type === 'slider') return true
    if (cur.type === 'choice') return choices.length > 0
    if (cur.type === 'split') return splitLeft.trim().length > 0 || splitRight.trim().length > 0
    return txt.trim().length > 0
  }

  const generateCompletionSummary = async (modId: string, modTitle: string, responses: any[]) => {
    setSummaryLoading(true)
    const promptNote = MODULE_SUMMARY_PROMPTS[modId] || `Someone completed an inner work exercise called ${modTitle}. Based on their responses, generate 3 actionable insights that help them see something new about themselves. Do NOT restate their answers. Tell them something they likely didn't notice. Under 80 words. Bullet points. Speak as "you".`
    const responseSummary = responses
      .map((r, i) => `Step ${i + 1}: ${typeof r === 'string' ? r : JSON.stringify(r)}`)
      .filter(r => r.length > 10)
      .join('\n')

    const base_prompt = `${promptNote}

Person's responses:
${responseSummary}

Rules:
- Start each line with a bullet point character
- No prose paragraphs
- No em dashes
- No clinical jargon
- DO NOT restate what they told you. Give them NEW insight.
- Under 100 words total
- Each bullet should be an actionable insight or practice they can use`

    try {
      const text = await fetchContextualSummary({
        surface: 'cbt',
        reference_id: modId,
        base_prompt,
        structured_data: { responses, module_title: modTitle },
        save_to_dashboard: true,
        summary_title: `Inner Work · ${modTitle}`,
      })
      if (text) setCompletionSummary(text)
    } catch { /* silent */ } finally {
      setSummaryLoading(false)
    }
  }

  const next = async () => {
    if (!mod || !cur || !active) return
    let v: any = txt
    if (cur.type === 'slider') v = slider
    else if (cur.type === 'choice') v = choices.join(', ') || 'No selection'
    else if (cur.type === 'split') v = `Left: ${splitLeft} | Right: ${splitRight}`
    const updated = Object.assign([...(resps[active] ?? Array(mod.steps.length).fill(''))], { [step]: v })
    setResps(p => ({ ...p, [active]: updated }))

    // Record timing + response length for this step before advancing.
    const elapsed = Date.now() - stepStartRef.current
    const chars = typeof v === 'string' ? v.trim().length : (typeof v === 'number' ? 1 : String(v).length)
    stepTimingsRef.current.push({ ms: elapsed, chars })

    setChoices([]); setSlider(5); setSplitLeft(''); setSplitRight('')
    if (step < mod.steps.length - 1) {
      setStep(s => s + 1)
      stepStartRef.current = Date.now()
      setHelpOpen(simplerMode) // collapse help on next step unless simpler-mode is on
      return
    }

    // ── Final step. Compute confusion signal BEFORE leaving the module. ─────
    const timings = stepTimingsRef.current
    const textSteps = mod.steps.filter(s => !s.type || s.type === 'text').length
    const textChars = timings
      .map((t, i) => ({ chars: t.chars, type: mod.steps[i]?.type }))
      .filter(t => !t.type || t.type === 'text')
      .reduce((sum, t) => sum + t.chars, 0)
    const avgChars = textSteps > 0 ? textChars / textSteps : 100
    const avgMs = timings.reduce((s, t) => s + t.ms, 0) / Math.max(timings.length, 1)
    const confusionScore =
      (textSteps > 0 && avgChars < 14)
      || avgMs > 60_000
      || helpClicksRef.current >= 2
    setConfused(confusionScore)

    setSaving(true)
    try {
      await cbtAPI.saveProgress(active, { responses: updated })
      toast.success('Saved.')
      setCompletedMod(mod)
      setActive(null)
      setStarted(false)
      generateCompletionSummary(mod.id, mod.title, updated)
    } catch {
      toast.error('Could not save. Check your connection.')
    } finally { setSaving(false) }
  }

  // ── COMPLETION SCREEN ────────────────────────────────────────────────────────
  if (completedMod) {
    return (
      <main className="bg-chat min-h-screen relative overflow-hidden">
        <ParticleCanvas colors={['#d4af37', '#f5ead8', '#b8860b']} count={18} />
        {isLight && <Grainient color1="#c4a882" color2="#f5e6c8" color3="#7a5c38" timeSpeed={0.12} grainAmount={0.07} contrast={1.3} saturation={0.8} className="grainient-background" />}
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
                Session complete
              </p>
            </div>

            {confused && (
              <div
                className="rounded-xl p-5 mb-4"
                style={{
                  background: `${completedMod.color}0d`,
                  border: `1px solid ${completedMod.color}28`,
                }}
              >
                <p
                  className="font-jost text-xs tracking-widest uppercase mb-2"
                  style={{ color: completedMod.color }}
                >
                  Did that feel hard to follow?
                </p>
                <p
                  className="font-body text-sm leading-relaxed mb-4"
                  style={{ color: 'var(--text-primary)' }}
                >
                  The wording in some exercises can feel abstract. Try this same module again with simpler language and tips visible by default, or try a different exercise that may land easier today.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => open(completedMod.id, { simpler: true })}
                    className="px-4 py-2 rounded-lg font-jost text-xs tracking-widest uppercase"
                    style={{
                      background: `${completedMod.color}1c`,
                      border: `1px solid ${completedMod.color}45`,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    Retake with simpler wording
                  </button>
                  {(() => {
                    const others = MODULES.filter(m => m.id !== completedMod.id).slice(0, 2)
                    return others.map(other => (
                      <button
                        key={other.id}
                        onClick={() => { setCompletedMod(null); setCompletionSummary(''); open(other.id) }}
                        className="px-4 py-2 rounded-lg font-jost text-xs tracking-widest uppercase glass"
                        style={{
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        Try {other.title}
                      </button>
                    ))
                  })()}
                </div>
              </div>
            )}

            <div className="rounded-xl p-5 mb-6" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
              <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
                Actionable Insights
              </p>
              {summaryLoading ? (
                <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                    style={{ borderColor: `${completedMod.color} transparent transparent transparent` }} />
                  <span className="font-body text-sm">Generating actionable insights...</span>
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
                  Your responses have been saved and will generate insights.
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
    <main className="bg-chat min-h-screen relative overflow-hidden">
      <ParticleCanvas colors={['#d4af37', '#f5ead8', '#b8860b']} count={18} />
      {isLight && <Grainient color1="#c4a882" color2="#f5e6c8" color3="#7a5c38" timeSpeed={0.12} grainAmount={0.07} contrast={1.3} saturation={0.8} className="grainient-background" />}
      <Navigation />
      <div className="relative z-10 pt-24 pb-20 px-5 max-w-3xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-12">
          <GoldHeading prefix="Inner" gold="Work" />
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '1.15rem', color: 'var(--text-secondary)' }}>
            Guided exercises for real change. Use when you need it.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* GRID */}
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
                      {m.steps.length} steps . Begin →
                    </span>
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
                style={{ color: 'var(--text-primary)' }}>Back</button>

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
                  <span>{mod.steps.length} steps</span><span>.</span>
                  <span>Take your time</span><span>.</span>
                  <span>Saved privately</span>
                </div>

                <motion.button onClick={() => { setStarted(true); stepStartRef.current = Date.now() }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-xl font-jost font-semibold text-sm tracking-widest uppercase"
                  style={{
                    background: `linear-gradient(135deg,${mod.color}22,${mod.color}0d)`,
                    border: `1px solid ${mod.color}38`, color: 'var(--text-primary)',
                  }}>
                  Begin this exercise →
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
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    {cur.hint}
                  </p>
                )}

                {/* "Need help understanding this?" — pre-baked plain-language tip.
                    No LLM call, instant. Helps users who feel the question wording
                    is too abstract or clinical-sounding. */}
                <div style={{ marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !helpOpen
                      setHelpOpen(next)
                      if (next) helpClicksRef.current += 1
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      fontFamily: 'var(--font-jost)',
                      fontSize: '11px',
                      letterSpacing: '0.05em',
                      color: mod.color,
                      cursor: 'pointer',
                      opacity: 0.85,
                    }}
                  >
                    {helpOpen ? '− Hide help' : '+ Need help understanding this?'}
                  </button>
                  {helpOpen && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: `${mod.color}0c`,
                        border: `1px solid ${mod.color}1f`,
                        fontFamily: "'Cormorant Garamond', serif",
                        fontStyle: 'italic',
                        fontWeight: 300,
                        fontSize: '0.92rem',
                        lineHeight: 1.55,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {cur.tip || fallbackTip(cur)}
                    </div>
                  )}
                </div>

                {/* Text input */}
                {(!cur.type || cur.type === 'text') && (
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

                {/* Split input */}
                {cur.type === 'split' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="font-jost text-xs tracking-widest uppercase mb-2" style={{ color: mod.color, opacity: 0.8 }}>
                        {cur.splitLeft}
                      </p>
                      <textarea rows={5} value={splitLeft}
                        onChange={e => setSplitLeft(e.target.value)}
                        placeholder={cur.splitPlaceholderLeft || 'Things I can act on...'}
                        className="w-full p-4 rounded-xl resize-none font-body text-sm focus:outline-none"
                        style={{
                          background: `${mod.color}08`,
                          border: `1px solid ${mod.color}22`,
                          color: 'var(--text-primary)', lineHeight: '1.6',
                        }} />
                    </div>
                    <div>
                      <p className="font-jost text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                        {cur.splitRight}
                      </p>
                      <textarea rows={5} value={splitRight}
                        onChange={e => setSplitRight(e.target.value)}
                        placeholder={cur.splitPlaceholderRight || 'Things outside my control...'}
                        className="w-full p-4 rounded-xl resize-none font-body text-sm focus:outline-none"
                        style={{
                          background: 'var(--bg-glass)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)', lineHeight: '1.6',
                        }} />
                    </div>
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