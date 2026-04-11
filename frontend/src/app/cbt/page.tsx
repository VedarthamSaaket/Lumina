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
type Step = { q: string; hint?: string; placeholder?: string; type?: 'slider' | 'choice'; min?: number; max?: number; label?: string; options?: Opt[] }
type Mod = { id: string; icon: string; title: string; subtitle: string; color: string; intro: string; steps: Step[] }

const MODULES: Mod[] = [
  {
    id: 'distortion', icon: '◐', color: '#c9897a',
    title: 'Thought Patterns',
    subtitle: 'Gently explore what your mind is telling you',
    intro: 'Sometimes our minds take a small problem and make it feel enormous, or convince us things are our fault when they are not. This exercise helps you notice those patterns without judgment.',
    steps: [
      { q: 'Think of a recent moment you felt really upset or low. Write down the thought that was in your head.', hint: 'Write it exactly as it came to you, raw and unfiltered.', placeholder: 'e.g. I completely ruined everything' },
      {
        q: 'Does this thought remind you of any of these patterns? Choose all that feel right.', hint: 'Go with your gut. There is no wrong answer.', type: 'choice', options: [
          { label: 'Seeing everything as all-or-nothing', sub: 'Like "I always fail" or "this never works"' },
          { label: 'Imagining the worst possible outcome', sub: 'Like "this will ruin everything"' },
          { label: 'Assuming you know what others think', sub: 'Like "they must think I am stupid"' },
          { label: 'Letting a feeling become a fact', sub: 'Like "I feel worthless so I must be worthless"' },
          { label: 'Blaming yourself for things outside your control', sub: 'Like "this is all my fault"' },
          { label: 'None of these feel quite right', sub: '' },
        ]
      },
      { q: 'Is there any evidence, even the smallest thing, that this thought might not be completely true?', hint: 'A past success, someone who cares, one thing that went right. Anything counts.', placeholder: 'e.g. My friend texted me this morning' },
      { q: 'If a close friend felt this way about themselves, what would you say to them?', hint: 'We are often much kinder to others than we are to ourselves.', placeholder: 'Write what you would say to someone you love who felt this way' },
    ]
  },
  {
    id: 'reframing', icon: '◑', color: '#7a9e7e',
    title: 'Rewriting the Story',
    subtitle: 'Find a gentler, more accurate way to see things',
    intro: 'The way we narrate events shapes how we feel about them. This is not about forced positivity; it is about finding a version that is honest and a little kinder to you.',
    steps: [
      { q: 'Write down the thought that has been troubling you.', hint: 'Write it exactly as it sounds in your head.', placeholder: 'e.g. I am a burden to everyone around me' },
      { q: 'How strongly do you believe this thought right now?', hint: '0 means you barely believe it. 10 means you are completely certain it is true.', type: 'slider', min: 0, max: 10, label: 'Belief strength' },
      { q: 'Write three facts or real moments from your life that challenge this thought.', hint: 'Even something small like "someone asked for my help recently" counts.', placeholder: '1.\n2.\n3.' },
      { q: 'Now write a more balanced version of that thought, honest but kinder.', hint: 'Not fake positivity. Just a version a fair and caring person might offer.', placeholder: 'e.g. I am going through something hard, but people who love me are still choosing to be here' },
      { q: 'How strongly do you believe this new, balanced version?', hint: 'Even a small shift matters.', type: 'slider', min: 0, max: 10, label: 'New belief strength' },
    ]
  },
  {
    id: 'activation', icon: '◒', color: '#b8a070',
    title: 'Getting Moving Again',
    subtitle: 'Small actions that rebuild energy and meaning',
    intro: 'When we feel low, we stop doing things that used to bring joy, which deepens the low mood. Even tiny actions can interrupt this cycle.',
    steps: [
      { q: 'What is something you used to enjoy or feel good about doing, even if it feels very distant right now?', hint: 'Anything counts: cooking, walking, calling a friend, music, drawing.', placeholder: 'e.g. Going for evening walks' },
      { q: 'What would the smallest, easiest version of that look like?', hint: 'Five minutes counts. One block counts. We are not aiming for the full thing.', placeholder: 'e.g. Just put on my shoes and step outside briefly' },
      { q: 'What might get in the way of doing this?', hint: 'Being honest about obstacles helps us plan around them.', placeholder: 'e.g. I might feel too tired or talk myself out of it' },
      { q: 'When specifically will you try this?', hint: 'Naming a time increases follow-through significantly.', placeholder: 'e.g. Tomorrow at 6pm, after I finish work' },
      { q: 'After trying it, come back here and write how it felt.', hint: 'Even "it was hard and I barely enjoyed it" is valuable information.', placeholder: 'Write what you noticed or felt' },
    ]
  },
  {
    id: 'esteem', icon: '◓', color: '#d4af37',
    title: 'Finding Your Ground',
    subtitle: 'Reconnect with your own worth, gently',
    intro: 'Low self-esteem often comes from years of absorbing critical messages. This is not about inflating your ego; it is about finding honest, solid ground to stand on.',
    steps: [
      { q: 'Think of someone who genuinely cares about you. What do you think they value or appreciate about you?', hint: 'Try to see yourself through their eyes, not how you judge yourself, but how they see you.', placeholder: 'e.g. My sister would say I am always there when she needs me' },
      { q: 'Describe a time you faced something difficult and got through it.', hint: 'Getting through a hard week, a hard conversation, a loss: these all count.', placeholder: 'e.g. When I went through my breakup, I still showed up for work every day' },
      { q: 'What is something, no matter how small, that you do well or bring to the people around you?', hint: 'Being kind, making people laugh, staying calm, noticing details: anything.', placeholder: 'e.g. I am a good listener' },
      { q: 'Complete this sentence honestly: I deserve kindness because...', hint: 'If this feels difficult or hollow, that is okay. Try to mean it even partially.', placeholder: 'I deserve kindness because...' },
    ]
  },
  {
    id: 'exposure', icon: '◔', color: '#c4913a',
    title: 'Facing What Scares You',
    subtitle: 'Build courage, one small step at a time',
    intro: 'Anxiety grows when we avoid what scares us, and shrinks when we gradually face it. This is about building a ladder of small, manageable steps, not jumping into the deep end.',
    steps: [
      { q: 'What is a situation, place, or thing you have been avoiding because it makes you anxious?', hint: 'Be specific. Not "social situations" but "eating alone in a cafe" or "making a phone call".', placeholder: 'e.g. Going to events where I do not know many people' },
      { q: 'How anxious does that feel right now?', hint: '0 = completely calm. 10 = maximum anxiety.', type: 'slider', min: 0, max: 10, label: 'Anxiety level' },
      { q: 'What is a much smaller version of that, something that would feel only a 3 or 4 out of 10?', hint: 'We start here. Not the scary thing itself, just a gentle step toward it.', placeholder: 'e.g. Staying at a social event for just 20 minutes, then leaving if I need to' },
      { q: 'What is an even smaller first step, a 1 or 2 out of 10?', hint: 'Almost impossibly easy. The goal is practice, not proving yourself.', placeholder: 'e.g. Texting a friend to say I would like to hang out sometime' },
      { q: 'After trying one of these steps, come back and describe what actually happened.', hint: 'Our anxious predictions often do not come true. Or they do, and we survive anyway.', placeholder: 'Write what happened and what you noticed' },
    ]
  },
  {
    id: 'habit', icon: '◕', color: '#8b7355',
    title: 'Building Something Good',
    subtitle: 'One small habit that serves your wellbeing',
    intro: 'Small consistent actions compound into meaningful change over time. We are not building a new identity overnight; just planting one seed.',
    steps: [
      { q: 'What is one small habit you would like to build to support your wellbeing?', hint: 'Keep it specific. "Exercise more" is too big. "Stretch for 5 minutes after waking" is perfect.', placeholder: 'e.g. Write three things I am grateful for before bed' },
      { q: 'What existing habit or routine could you attach this new one to?', hint: 'This is called habit stacking; it makes new habits stick far better.', placeholder: 'e.g. Right after I make my morning tea' },
      { q: 'What might make this hard to keep up?', hint: 'Planning for obstacles makes you significantly more likely to follow through.', placeholder: 'e.g. I will probably forget after a few days' },
      { q: 'How will you gently remind yourself or make it easier?', hint: 'A phone alarm, a sticky note by your bed, or telling someone you trust.', placeholder: 'e.g. I will put the journal right next to my lamp' },
    ]
  },
  {
    id: 'values', icon: '◈', color: '#9b7fd4',
    title: 'What Matters to You',
    subtitle: 'Clarify what you want to move toward',
    intro: 'When life feels directionless or empty, it is often because we have drifted away from the things that actually matter to us. This exercise helps you name them, not the values you should have, but the ones that are genuinely yours.',
    steps: [
      {
        q: 'Which of these areas of life feels most important to you right now? Choose all that resonate.',
        hint: 'Not what you think should matter, what actually does.',
        type: 'choice',
        options: [
          { label: 'Relationships and connection', sub: 'Family, friendship, intimacy, belonging' },
          { label: 'Work and contribution', sub: 'Meaningful work, making a difference, building something' },
          { label: 'Health and vitality', sub: 'Physical wellbeing, energy, taking care of yourself' },
          { label: 'Growth and learning', sub: 'Becoming more capable, understanding yourself better' },
          { label: 'Freedom and autonomy', sub: 'Making your own choices, living on your own terms' },
          { label: 'Creativity and expression', sub: 'Making things, expressing yourself, aesthetic experience' },
        ]
      },
      {
        q: 'Think about a time you felt most alive, most yourself, even briefly. What was happening?',
        hint: 'Not necessarily a big moment. Even a small one works.',
        placeholder: 'e.g. I was helping a friend work through a problem and felt fully present...'
      },
      {
        q: 'What do you think that moment was showing you about what matters to you?',
        hint: 'What value or need was being met?',
        placeholder: 'e.g. I think connection matters to me more than I admit...'
      },
      {
        q: 'In your daily life right now, where is there the biggest gap between what matters to you and how you are actually spending your time or energy?',
        hint: 'This is not about blame. Just honest observation.',
        placeholder: 'e.g. I care about creativity but spend most evenings scrolling...'
      },
      {
        q: 'What is one small thing you could do this week that would move you even slightly in the direction of what matters?',
        hint: 'Tiny counts. A 10-minute walk, a message to a friend, 5 minutes of something you love.',
        placeholder: 'e.g. I could spend 15 minutes drawing before bed on Thursday...'
      },
    ]
  },
  {
    id: 'worrytime', icon: '◙', color: '#7ab8c9',
    title: 'Contain the Worry',
    subtitle: 'Give your anxious thoughts a time and place',
    intro: 'Worry tends to intrude all day. One of the most effective tools from CBT is giving it a container, a specific time and place, so it stops leaking into everything else. This is not about suppressing worry; it is about choosing when to engage with it.',
    steps: [
      {
        q: 'What is worrying you most right now? Write it out without editing yourself.',
        hint: 'Get it all out. This is just between you and the page.',
        placeholder: 'e.g. I am worried I made the wrong career decision and cannot undo it...'
      },
      {
        q: 'Now sort what you wrote: which parts of this are things you can actually do something about, and which parts are things outside your control?',
        hint: 'Two columns in your mind. Actionable vs unactionable.',
        placeholder: 'Things I can act on:\n\nThings outside my control:'
      },
      {
        q: 'For the parts you can act on, what is the smallest concrete next step?',
        hint: 'One thing, not a plan. One small action.',
        placeholder: 'e.g. Send one email, make one call, write one sentence of the thing I have been avoiding...'
      },
      {
        q: 'For the parts outside your control, what would it mean to genuinely let go of those for now?',
        hint: 'Not forever. Just for today, or this hour. What would that look like?',
        placeholder: 'e.g. It would mean reminding myself that I have done what I can and waiting is the only option...'
      },
      {
        q: 'Set your worry window: pick a specific 15-minute slot today or tomorrow where you will give yourself full permission to worry. Outside that window, if the worry comes, gently redirect yourself: "Not now, that is for my worry time."',
        hint: 'Name a specific time, like "Tomorrow at 5pm for 15 minutes."',
        placeholder: 'My worry window is...'
      },
    ]
  },
]

// Summary prompts per module - tells the LLM how to frame the reflection
const MODULE_SUMMARY_PROMPTS: Record<string, string> = {
  distortion: 'The person just completed a Thought Patterns exercise exploring a cognitive distortion. Use a memorable term for the pattern they identified (e.g. "all-or-nothing lens", "fault magnet", "catastrophe projector"). Reflect what the exercise revealed about their thinking pattern. Under 180 words, warm and non-clinical.',
  reframing: 'The person just completed a Rewriting the Story exercise. Note any shift in belief strength if visible in their responses. Use a memorable phrase for the reframing they did. Under 180 words, warm and honest.',
  activation: 'The person just completed a Behavioural Activation exercise. Use a phrase like "momentum seed" or "re-entry point" to name what they planned. Reflect what they are reconnecting with. Under 180 words.',
  esteem: 'The person just completed a self-esteem grounding exercise. Use a term like "floor of worth" or "borrowed mirror" if it fits naturally. Reflect what they uncovered about how they see themselves. Under 180 words.',
  exposure: 'The person completed an exposure ladder exercise. Name the thing they identified as scary and their first step. Use a phrase like "courage ladder" or "anxiety gradient". Under 180 words.',
  habit: 'The person completed a habit-building exercise. Use a phrase like "keystone seed" or "anchor habit" for what they planned. Under 180 words.',
  values: 'The person completed a values clarification exercise. Use a memorable phrase for their core value theme (e.g. "connection-led life", "autonomy core", "maker\'s identity"). Reflect the gap they named and the step they planned. Under 200 words.',
  worrytime: 'The person completed a worry containment exercise. Use a phrase like "worry window protocol" or "controlled concern" for what they set up. Reflect what was actionable vs what they are learning to release. Under 200 words.',
}

export default function CBTPage() {
  const [active, setActive] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [started, setStarted] = useState(false)
  const [resps, setResps] = useState<Record<string, any[]>>({})
  const [slider, setSlider] = useState(5)
  const [choices, setChoices] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  // Completion summary state
  const [completedMod, setCompletedMod] = useState<Mod | null>(null)
  const [completionSummary, setCompletionSummary] = useState<string>('')
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Read ?module= from URL and auto-open that module
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
    const promptNote = MODULE_SUMMARY_PROMPTS[modId] || 'The person completed a CBT inner work exercise. Write a warm 2-paragraph reflection on what they worked through. Under 180 words.'
    const responseSummary = responses
      .map((r, i) => `Step ${i + 1}: ${typeof r === 'string' ? r : JSON.stringify(r)}`)
      .filter(r => r.length > 10)
      .join('\n')

    const prompt = `${promptNote}

Here is what the person wrote during the exercise:
${responseSummary}

Rules:
- Do not use em dashes
- No clinical labels or diagnostic language
- Speak directly to them as "you"
- Explain in simple terms that native English speakers understand and relate to. Do not use overtechnical jargon.
- Warm, slightly literary tone
- End on a note of agency and self-compassion
- No section headers or bullet points`

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

    // Final step - save and generate summary
    setSaving(true)
    try {
      await cbtAPI.saveProgress(active, { responses: updated })
      toast.success('Exercise complete. Well done for doing this work.')
      setCompletedMod(mod)
      setActive(null)
      setStarted(false)
      // Generate completion summary
      generateCompletionSummary(mod.id, mod.title, updated)
    } catch {
      toast.error('Could not save right now. Check your connection.')
    } finally { setSaving(false) }
  }

  // ── COMPLETION SCREEN ──
  if (completedMod) {
    return (
      <main className="bg-cbt min-h-screen relative overflow-hidden">
        <ParticleCanvas colors={['#d4af37', '#c9897a', '#b8860b', '#fef4e4']} count={28} />
        <Navigation />
        <div className="relative z-10 pt-24 pb-20 px-5 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-strong rounded-2xl p-8" style={{ border: `1px solid ${completedMod.color}28` }}>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3" style={{ color: completedMod.color }}>{completedMod.icon}</div>
              <h2 className="font-gothic text-xl mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '0.07em' }}>
                {completedMod.title}
              </h2>
              <p className="font-display italic text-sm" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>
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
                <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
                  {completionSummary}
                </p>
              ) : (
                <p className="font-body text-sm" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Your responses have been saved to your profile.
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
      <ParticleCanvas colors={['#d4af37', '#c9897a', '#b8860b', '#fef4e4']} count={28} />
      <Navigation />
      <div className="relative z-10 pt-24 pb-20 px-5 max-w-3xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-12">
          <h1 className="font-display font-light mb-3" style={{ fontSize: 'clamp(2.5rem,6vw,5rem)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Inner Work</h1>
          <p className="font-display italic text-lg" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>Guided tools for understanding your mind, at your own pace.</p>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* GRID */}
          {!active && (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MODULES.map((m, i) => (
                <motion.button key={m.id} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  whileHover={{ y: -5, scale: 1.015 }} whileTap={{ scale: 0.98 }} onClick={() => open(m.id)}
                  className="glass rounded-xl p-5 text-left" style={{ border: `1px solid ${m.color}28` }}>
                  <div className="text-3xl mb-3" style={{ color: m.color, filter: `drop-shadow(0 0 6px ${m.color}50)` }}>{m.icon}</div>
                  <h3 className="font-gothic text-sm mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}>{m.title}</h3>
                  <p className="font-display italic text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 300 }}>{m.subtitle}</p>
                  <div className="h-px" style={{ background: `linear-gradient(90deg,${m.color}45,transparent)` }} />
                  <div className="mt-3 flex items-center gap-2 text-xs font-jost tracking-widest" style={{ color: m.color }}>BEGIN</div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* INTRO */}
          {active && mod && !started && (
            <motion.div key="intro" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <button onClick={() => setActive(null)} className="mb-6 text-sm font-jost tracking-widest uppercase opacity-55 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-primary)' }}>Back to exercises</button>
              <div className="glass-strong rounded-2xl p-7" style={{ border: `1px solid ${mod.color}28` }}>
                <div className="flex items-center gap-4 mb-5">
                  <div className="text-4xl" style={{ color: mod.color, filter: `drop-shadow(0 0 10px ${mod.color}55)` }}>{mod.icon}</div>
                  <div>
                    <h2 className="font-gothic text-xl" style={{ color: 'var(--text-primary)', letterSpacing: '0.07em' }}>{mod.title}</h2>
                    <p className="font-display italic text-sm" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>{mod.subtitle}</p>
                  </div>
                </div>
                <div className="mb-7 p-4 rounded-xl" style={{ background: `${mod.color}08`, border: `1px solid ${mod.color}18` }}>
                  <p className="font-body text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{mod.intro}</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-xs font-jost" style={{ color: 'var(--text-muted)' }}>
                  <span>{mod.steps.length} guided steps</span><span>·</span><span>Take your time</span><span>·</span><span>Responses saved privately</span>
                </div>
                <motion.button onClick={() => setStarted(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-xl font-jost font-semibold text-sm tracking-widest uppercase"
                  style={{ background: `linear-gradient(135deg,${mod.color}22,${mod.color}0d)`, border: `1px solid ${mod.color}38`, color: 'var(--text-primary)' }}>
                  Begin this exercise
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP */}
          {active && mod && started && cur && (
            <motion.div key={`s${step}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => step > 0 ? setStep(s => s - 1) : setStarted(false)} className="text-sm font-jost tracking-widest uppercase opacity-55 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-primary)' }}>Back</button>
                <div className="flex gap-1.5">{mod.steps.map((_, i) => <div key={i} className="h-1.5 rounded-full transition-all duration-300" style={{ width: i === step ? '22px' : '7px', background: i <= step ? mod.color : 'rgba(212,175,55,0.14)' }} />)}</div>
                <span className="text-xs font-jost" style={{ color: 'var(--text-muted)' }}>{step + 1} / {mod.steps.length}</span>
              </div>

              <div className="glass-strong rounded-2xl p-7" style={{ border: `1px solid ${mod.color}18` }}>
                <span className="text-xs font-jost tracking-widest uppercase" style={{ color: mod.color }}>Step {step + 1}</span>
                <h3 className="font-body text-xl leading-relaxed mt-2 mb-2" style={{ color: 'var(--text-primary)', fontSize: '1.18rem' }}>{cur.q}</h3>
                {cur.hint && <p className="font-display italic text-sm mb-5" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>{cur.hint}</p>}

                {(!cur.type || cur.type === 'text' as any) && (
                  <textarea rows={4} value={txt}
                    onChange={e => { setTxt(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 190) + 'px' }}
                    className="w-full p-4 rounded-xl resize-none font-body text-base focus:outline-none"
                    placeholder={cur.placeholder || 'Write freely...'}
                    style={{ background: 'var(--bg-glass)', border: `1px solid ${mod.color}22`, color: 'var(--text-primary)', backdropFilter: 'blur(10px)', lineHeight: '1.65' }} />
                )}

                {cur.type === 'slider' && (
                  <div className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{cur.min ?? 0}</span>
                      <span className="font-display font-light" style={{ fontSize: '3.5rem', color: mod.color, lineHeight: 1 }}>{slider}</span>
                      <span className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{cur.max ?? 10}</span>
                    </div>
                    <input type="range" min={cur.min ?? 0} max={cur.max ?? 10} value={slider} onChange={e => setSlider(+e.target.value)} className="mood-slider w-full" />
                    <p className="text-center mt-3 text-sm font-display italic" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>{cur.label}: {slider} / {cur.max ?? 10}</p>
                  </div>
                )}

                {cur.type === 'choice' && cur.options && (
                  <div className="space-y-2.5">
                    {cur.options.map(opt => {
                      const sel = choices.includes(opt.label)
                      return (
                        <button key={opt.label} onClick={() => toggleChoice(opt.label)}
                          className="w-full text-left p-4 rounded-xl transition-all duration-200"
                          style={{ background: sel ? `${mod.color}13` : 'var(--bg-glass)', border: sel ? `1px solid ${mod.color}45` : '1px solid var(--border-subtle)' }}>
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
                              style={{ background: sel ? mod.color : 'transparent', border: sel ? `2px solid ${mod.color}` : '2px solid rgba(212,175,55,0.2)' }}>
                              {sel && <span className="text-xs font-bold" style={{ color: '#1a0e04', lineHeight: 1 }}>v</span>}
                            </div>
                            <div>
                              <div className="font-body text-sm" style={{ color: 'var(--text-primary)' }}>{opt.label}</div>
                              {opt.sub && <div className="text-xs mt-0.5 font-display italic" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>{opt.sub}</div>}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                <motion.button onClick={next} disabled={saving || !ok()}
                  className="mt-7 w-full py-4 rounded-xl font-jost font-semibold text-sm tracking-widest uppercase disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg,${mod.color}22,${mod.color}0d)`, border: `1px solid ${mod.color}38`, color: 'var(--text-primary)' }}
                  whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.97 }}>
                  {saving ? 'Saving...' : step < mod.steps.length - 1 ? 'Continue' : 'Complete this exercise'}
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  )
}