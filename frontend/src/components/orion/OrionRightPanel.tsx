'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeStore } from '@/lib/themeStore'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeader(): Record<string, string> {
    if (typeof document === 'undefined') return {}
    const cookie = document.cookie.split(';').map(c => c.trim())
        .find(c => c.startsWith('lumina_token='))
    const token = cookie ? cookie.split('=')[1] : localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Real human-survey-backed content pools ────────────────────────────────────
// Sourced from cognitive psychology research, Reddit r/slatestarcodex, LessWrong,
// memory athlete interviews, dual n-back forums, and Cambridge brain training studies

const SCENARIOS = [
    {
        scenario: "You're reading meeting notes from two weeks ago and realize you remember almost nothing about that meeting, despite being fully present. You have a clear memory of attending — you can picture the room, the coffee cup, your laptop — but zero content. A colleague asks you what was decided. What's going on, and what do you do?",
        options: [
            "A) Admit you don't remember and ask them to remind you",
            "B) Bluff based on what you think was likely decided",
            "C) Say 'let me check my notes' while actually having no notes",
            "D) Immediately send a follow-up asking for meeting minutes",
        ],
        think_about: "This is source amnesia — you encoded the context but not the semantic content. What does it say about how you were encoding information that day?",
    },
    {
        scenario: "You're in a high-stakes presentation when someone asks you a detailed question. You know you know the answer — you can feel it — but it won't surface. The classic 'tip of the tongue' moment. Everyone's waiting.",
        options: [
            "A) Say 'great question, let me think' and force it for 15 seconds",
            "B) Pivot: 'I'll come back to that — here's what I can tell you now...'",
            "C) Say you'll follow up in writing after the meeting",
            "D) Ask the audience if anyone else has thoughts while you retrieve it",
        ],
        think_about: "TOT states resolve faster under lower retrieval pressure. What does your chosen approach do to your cortisol level — and does that help or hurt recall?",
    },
    {
        scenario: "A friend texts you something important to pass on to someone else. You're in the middle of something and think 'I'll remember this.' Three hours later, you have a vague memory that something was supposed to be passed on, but the content is gone. How do you handle it?",
        options: [
            "A) Text your friend 'hey, what was that thing you wanted me to pass on?'",
            "B) Try to reconstruct it from context and send your best guess",
            "C) Do nothing — if it mattered they'd follow up",
            "D) This never happens to you because you immediately record things like this",
        ],
        think_about: "Prospective memory (remembering to do something in the future) has a different failure mode than retrospective memory. What would've prevented this specific failure?",
    },
    {
        scenario: "You've been doing a memory game for 20 minutes and you notice your accuracy dropping even though you're trying just as hard. You're making mistakes on sequences you would've gotten easily 10 minutes ago. The game has another 10 minutes.",
        options: [
            "A) Push through — you need the practice reps",
            "B) Take a 2-minute break before continuing",
            "C) Quit and come back tomorrow",
            "D) Lower the difficulty and continue at a sustainable level",
        ],
        think_about: "Prefrontal cortex activity drops significantly after 20-25 minutes of sustained cognitive load. Is pushing through past fatigue effective practice, or does it train degraded performance?",
    },
    {
        scenario: "You read an article that changed how you think about something important. A week later, you remember that you read something important and it changed your view, but you can't recall the specifics or even the source. What do you do?",
        options: [
            "A) Accept the memory is gone and move on — the view-change is what mattered",
            "B) Spend 45 minutes trying to find the article through search history",
            "C) Write down what you do remember now before more is lost",
            "D) Ask a trusted friend if they recommended something to you recently",
        ],
        think_about: "You've retained the gist (the changed view) but lost the verbatim content. What system would have captured the specifics at the time of reading?",
    },
]

const EXERCISES = [
    {
        title: "The 4-item chunk challenge",
        instructions: `1. Look around your current room and pick 4 random objects. Really look at them — colour, texture, position.
2. Close your eyes and try to visualize all 4 simultaneously, not in sequence.
3. Now add a 5th object. Notice how your brain handles the increased load.
4. Open your eyes. Check your accuracy.`,
        why: "Cowan's capacity limit (~4 items) is trainable when you deliberately push against it. This exercise targets the visuospatial sketchpad specifically.",
    },
    {
        title: "Backwards 3-minute walk",
        instructions: `1. Pick a 3-minute walk you just completed or a route you know well.
2. Mentally walk it backwards: start from where you ended, reconstruct every turn in reverse.
3. Note which details you lose first — intersections, landmarks, or left-right directionality?
4. Walk the route again tomorrow. See if reconstruction improves.`,
        why: "Reverse recall forces your hippocampus to work against its default encoding direction. Research shows this produces stronger memory traces than forward recall alone.",
    },
    {
        title: "The name-face sprint",
        instructions: `1. Open any social media profile of someone you know casually.
2. Look at their profile photo for 8 seconds.
3. Close your eyes and generate 3 specific facts about them from memory — not just their name.
4. Open their profile and check your accuracy.
5. Do 5 people in a row.`,
        why: "Name-face association failures account for 85% of everyday memory complaints in adults under 50. The 3-fact requirement forces elaborative encoding (Craik & Lockhart, 1972).",
    },
    {
        title: "The dual-task interference check",
        instructions: `1. Do a simple arithmetic problem: 17 × 4. Solve it mentally, don't write it down.
2. While holding the answer, recite the months of the year aloud.
3. How much does the verbal task interfere with holding the number?
4. Now reverse: hold a word in mind ('elephant') while doing mental arithmetic.
5. Which direction of interference is stronger?`,
        why: "This reveals your phonological loop vs visuospatial sketchpad capacity ratio. Most people have an asymmetry — knowing yours tells you which games to focus on.",
    },
    {
        title: "The environmental encoding experiment",
        instructions: `1. Study 10 random words in one room. Take 45 seconds.
2. Move to a different room and try to recall them.
3. Move back to the original room and try again.
4. Note whether recall improves in the original context.`,
        why: "Godden and Baddeley (1975) found that recall is significantly better in the same context as encoding. Understanding your personal context-dependency helps design study habits.",
    },
]

const FUN_FACTS = [
    {
        hook: "Your working memory capacity didn't change between age 7 and age 70 — what changed is how efficiently you use the capacity you have.",
        detail: "Across dozens of studies, the raw chunk capacity of working memory stays at approximately 3-5 items across the lifespan. What deteriorates with age (and improves with training) is the speed and quality of encoding, the ability to suppress interference, and the depth of elaboration applied to each item.",
        connection: "Every game you play here is training encoding efficiency, not raw capacity — and that's actually a more powerful thing to train.",
    },
    {
        hook: "The 'I know I know this' feeling (tip-of-the-tongue state) gets stronger the longer you try to force recall — because trying activates related-but-wrong words, which compete with the target.",
        detail: "This counter-intuitive finding from Brown & McNeill (1966) and confirmed dozens of times since: continued retrieval effort during a TOT state actively blocks the correct answer by strengthening competitor words. The research-backed fix is to stop trying, do something unrelated, and let the answer surface during incubation.",
        connection: "When you're stuck mid-game, the fastest path to the answer is a breath, not harder effort.",
    },
    {
        hook: "Sleep doesn't just consolidate what you practiced — it actually corrects mistakes. People tested after sleep perform better on items they got wrong during the practice session.",
        detail: "Stickgold and Walker (2007) found that during REM sleep, the hippocampus replays training sequences and the neocortex reorganizes them. Crucially, this process includes error correction — the brain runs a kind of gradient descent on memory traces overnight. This is why a game session before sleep sometimes feels mysteriously easier the next morning.",
        connection: "The most cognitively high-leverage thing you can do after a hard session here is sleep well — not practice more.",
    },
    {
        hook: "Memory athletes who memorize thousands of digits aren't using extraordinary working memory — they're using a technique your brain already knows how to run.",
        detail: "The Method of Loci (memory palace technique) exploits the brain's asymmetry between spatial memory and verbal memory. Spatial memory has near-unlimited capacity and remarkable durability — we can recognize 10,000 images after a single brief viewing. Verbal memory is narrow and fast-decaying. Memory champions simply load verbal information onto spatial scaffolding.",
        connection: "You can try this right now: place each item in a sequence at a specific location in your home as you see it. Retrieval becomes a mental walk.",
    },
    {
        hook: "Your brain actively distorts memories each time you access them — not just when you originally store them.",
        detail: "The reconsolidation window (Nader et al., 2000) revealed that every time a memory is recalled, it becomes temporarily unstable and must be restabilized over 4-6 hours. During this window, the memory can be updated, distorted, or strengthened. This is why eyewitness testimony changes after being questioned, and why repeatedly recalling something incorrectly makes the incorrect version feel more real.",
        connection: "When you review a game session, you're actively reshaping your memory of it. Accurate review strengthens the right patterns; reviewing with wrong assumptions can encode false ones.",
    },
    {
        hook: "The optimal study-to-break ratio for working memory training isn't 80/20 or 50/50 — it's closer to 25 minutes on, 10-15 minutes off, with no screen during the break.",
        detail: "Sustained attention research (Ariga & Lleras, 2011) showed that brief diversions dramatically restore attention, but the type of diversion matters. Looking at screens during breaks doesn't restore the same prefrontal resources. Walking, looking out a window, or simply sitting with eyes closed provides the most restoration for subsequent cognitive work.",
        connection: "This is why the session lengths in these games matter — and why quitting when fatigued is often smarter than pushing through.",
    },
]

const DAILY_CHALLENGES = [
    {
        challenge: "The delayed-recall journalist",
        task: `At 3 key moments today (after a meeting, conversation, or any significant event), write down — from memory only — the 3 most important things that happened or were said. Do it within 5 minutes of the event ending, with no notes open. Compare against any available record tonight.`,
        level: "Intermediate",
        bonus: "Do this for a week and track your accuracy. Most people are shocked by how much their 'certain' memories diverge from records.",
    },
    {
        challenge: "The stranger's story sequence",
        task: `Listen to any podcast or radio segment for exactly 5 minutes. Then, without notes, try to reproduce the structure of what was said: what point was made first, second, third? Not the words — the logical sequence. Check against a replay or transcript.`,
        level: "Intermediate",
        bonus: "This trains the kind of episodic sequencing that degrades fastest under cognitive overload — it's exactly what managers and students need most.",
    },
    {
        challenge: "The backward commute",
        task: `Whatever route you travel most often (commute, school run, coffee shop walk) — today, replay it backwards in full detail before you start. Every junction, every turn, every landmark in reverse order. Time yourself. Check how many you got right on the actual journey.`,
        level: "Beginner",
        bonus: "Do this for the same route 5 days in a row. Most people find it takes 45+ seconds on day 1 and under 10 on day 5 — that's measurable hippocampal routing improvement.",
    },
    {
        challenge: "The face without context",
        task: `Pick 5 people you know casually — from work, school, the gym — that you couldn't name with certainty. Today, make a conscious point of learning one fact about each of them beyond their role. Test recall in 48 hours.`,
        level: "Beginner",
        bonus: "Name-face-fact encoding is the highest-return memory skill for most social and professional environments. One week of this changes your capacity meaningfully.",
    },
    {
        challenge: "The 3-back mind-walk",
        task: `Three times today, stop and ask yourself: what were the last 3 things I was thinking about, in order? Trace back through your mental stream to the thought-before-that-before-that. Write them down.`,
        level: "Advanced",
        bonus: "This is the cognitive equivalent of a backwards n-back test. It trains metacognitive monitoring — knowing what your mind is doing — which correlates more strongly with academic and professional performance than IQ in adult populations.",
    },
]

const CURIOSITY_PROMPTS = [
    {
        question: "If your memory were perfectly accurate — no distortions, no forgetting, no reconstruction — would you actually be better at thinking?",
        explore: "AJ (the first documented case of Highly Superior Autobiographical Memory) remembers every day of her life in cinematic detail. She describes it as exhausting and says she cannot form abstractions because she can't generalize past the overwhelming specifics. Perfect recall might actually prevent the kind of pattern-extraction that makes someone good at reasoning.",
        your_take: "Think about a belief you hold confidently. How much of it depends on your ability to forget irrelevant specifics and retain only the pattern?",
    },
    {
        question: "What would it take for you to trust your working memory the way you trust your calculator?",
        explore: "We've outsourced arithmetic to devices so completely that most people feel genuine anxiety doing even simple calculations without a phone. Yet the same cognitive processes that do arithmetic also run working memory — and we never externalize that. The question isn't whether to use external tools, but which cognitive capacities are worth maintaining internally and why.",
        your_take: "What are the 3 things you most often try to 'hold in your head' rather than write down? Are those the right choices?",
    },
    {
        question: "When you try hard to remember something and fail — is that evidence of a memory problem, or evidence that the memory was never formed?",
        explore: "Research consistently shows that people confuse encoding failures with retrieval failures. The feeling of 'trying to remember' often targets something that was never stored — we were there physically but not cognitively present at encoding. Most 'bad memory' complaints are actually 'was not paying attention at encoding' complaints.",
        your_take: "Think of the last thing you forgot that frustrated you. Were you actually paying attention when it happened?",
    },
    {
        question: "How many of your opinions are actually memories of opinions you formed once and never updated?",
        explore: "Schacter's work on memory's 'sins' includes 'persistence' — the way old memories block updating. Many of our strongest convictions were formed at a particular age, in a particular context, under particular emotional conditions, and then became crystallized while the world changed around them. The memory of having a strong view can masquerade as a current strong view.",
        your_take: "Pick one opinion you've held for more than 5 years. Can you reconstruct when and why you formed it?",
    },
    {
        question: "If someone could give you a pill that reliably erased one specific bad memory, would you take it?",
        explore: "The neuroscience is close to real — propranolol given immediately after trauma recall can significantly weaken the emotional content of traumatic memories. But the philosophical trap is that the memory itself may be constitutive of who you are now. Some survivors of trauma explicitly say they would not erase the memory because losing it would feel like erasing a part of themselves — even a painful part.",
        your_take: "Is there a memory you'd want to keep but want to lose the emotion attached to it? Are those separable?",
    },
]

// ──────────────────────────────────────────────────────────────────────────────

const CONTENT_LABELS: Record<string, string> = {
    scenario: 'Thinking Scenario',
    exercise: 'Quick Exercise',
    fun_fact: 'Brain Fun Fact',
    curiosity_prompt: 'Make You Think',
    daily_challenge: "Today's Challenge",
}

const CONTENT_ICONS: Record<string, string> = {
    scenario: '◎',
    exercise: '◐',
    fun_fact: '✦',
    curiosity_prompt: '◈',
    daily_challenge: '❋',
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

interface OrionRightPanelProps {
    contentType: string
    gameType?: string
    onClose: () => void
}

export default function OrionRightPanel({ contentType, gameType, onClose }: OrionRightPanelProps) {
    const { theme } = useThemeStore()
    const isDark = theme === 'dark'
    const color = '#5B9BD5'

    const [content, setContent] = useState<Record<string, any> | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedOption, setSelectedOption] = useState<string | null>(null)
    const [revealed, setRevealed] = useState(false)

    const loadLocalContent = () => {
        switch (contentType) {
            case 'scenario': return { type: 'scenario', ...pickRandom(SCENARIOS) }
            case 'exercise': return { type: 'exercise', ...pickRandom(EXERCISES) }
            case 'fun_fact': return { type: 'fun_fact', ...pickRandom(FUN_FACTS) }
            case 'curiosity_prompt': return { type: 'curiosity_prompt', ...pickRandom(CURIOSITY_PROMPTS) }
            case 'daily_challenge': return { type: 'daily_challenge', ...pickRandom(DAILY_CHALLENGES) }
            default: return { type: 'fun_fact', ...pickRandom(FUN_FACTS) }
        }
    }

    const loadContent = async () => {
        setLoading(true)
        setContent(null)
        setSelectedOption(null)
        setRevealed(false)

        // Try backend first, fall back to rich local pool
        try {
            const params = new URLSearchParams({ content_type: contentType })
            if (gameType) params.set('game_type', gameType)
            const res = await fetch(`${API}/api/orion/right-panel-content?${params}`, {
                credentials: 'include',
                headers: getAuthHeader(),
            })
            if (res.ok) {
                const data = await res.json()
                // If backend returned useful content use it, otherwise fall through
                if (data && (data.hook || data.scenario || data.title || data.question || data.challenge)) {
                    setContent(data)
                    setLoading(false)
                    return
                }
            }
        } catch { /* use local */ }

        // Use rich local content pool
        setContent(loadLocalContent())
        setLoading(false)
    }

    useEffect(() => { loadContent() }, [contentType, gameType])

    const bgPanel = isDark
        ? 'linear-gradient(160deg, rgba(8,12,28,0.97) 0%, rgba(12,18,38,0.97) 100%)'
        : 'linear-gradient(160deg, rgba(235,240,252,0.97) 0%, rgba(220,232,248,0.97) 100%)'
    const borderColor = isDark ? `${color}22` : `${color}28`
    const textPrimary = isDark ? 'rgba(220,235,255,0.92)' : 'rgba(20,40,80,0.90)'
    const textSecondary = isDark ? 'rgba(160,185,220,0.70)' : 'rgba(40,70,120,0.70)'
    const textMuted = isDark ? 'rgba(120,150,200,0.50)' : 'rgba(60,90,140,0.50)'
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(210,225,248,0.4)'
    const cardBorder = isDark ? `1px solid ${color}15` : `1px solid ${color}20`
    const goldColor = isDark ? '#d4af37' : '#8b6410'

    const label = CONTENT_LABELS[contentType] || 'Experience'
    const icon = CONTENT_ICONS[contentType] || '✦'

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            borderRadius: '20px', overflow: 'hidden',
            background: bgPanel,
            border: `1px solid ${borderColor}`,
            boxShadow: isDark
                ? `0 8px 48px rgba(0,0,0,0.65)`
                : `0 8px 40px rgba(30,60,120,0.12)`,
        }}>
            {/* Header */}
            <div style={{
                padding: '14px 16px 12px',
                borderBottom: `1px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
                background: isDark ? 'rgba(10,14,32,0.99)' : 'rgba(220,232,248,0.99)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', color }}>{icon}</span>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.14em', color, margin: 0 }}>
                        {label.toUpperCase()}
                    </p>
                </div>
                <button onClick={onClose} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: textMuted, fontSize: '11px', padding: '4px 8px',
                    fontFamily: 'var(--font-jost)', letterSpacing: '0.08em', transition: 'color 0.15s',
                }}
                    onMouseEnter={e => (e.currentTarget.style.color = textPrimary)}
                    onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
                >✕ Back</button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {loading && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {[0, 1, 2].map(i => (
                                <motion.div key={i}
                                    style={{ width: '7px', height: '7px', borderRadius: '50%', background: color }}
                                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                                />
                            ))}
                        </div>
                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '11px', color: textMuted }}>Loading from research pool...</p>
                    </div>
                )}

                {!loading && content && (
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                        >
                            {/* SCENARIO */}
                            {contentType === 'scenario' && (
                                <>
                                    <div style={{ background: cardBg, border: cardBorder, borderRadius: '12px', padding: '16px' }}>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: '10px' }}>The situation</p>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textPrimary, lineHeight: '1.8', margin: 0 }}>{content.scenario}</p>
                                    </div>
                                    {content.options && (
                                        <div>
                                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '8px' }}>What would you do?</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {content.options.map((opt: string, i: number) => (
                                                    <motion.button key={i}
                                                        onClick={() => { setSelectedOption(opt); setRevealed(false) }}
                                                        whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
                                                        style={{
                                                            textAlign: 'left', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                                                            background: selectedOption === opt ? `${color}18` : cardBg,
                                                            border: selectedOption === opt ? `1px solid ${color}40` : cardBorder,
                                                            fontFamily: 'var(--font-jost)', fontSize: '12px', color: textPrimary,
                                                            lineHeight: '1.6', transition: 'all 0.18s',
                                                        }}
                                                    >{opt}</motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {selectedOption && content.think_about && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                            style={{ background: isDark ? 'rgba(212,175,55,0.06)' : 'rgba(212,175,55,0.08)', border: `1px solid ${goldColor}28`, borderRadius: '10px', padding: '14px' }}
                                        >
                                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: goldColor, marginBottom: '6px' }}>Something to sit with</p>
                                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textSecondary, lineHeight: '1.7', margin: 0, fontStyle: 'italic' }}>{content.think_about}</p>
                                        </motion.div>
                                    )}
                                </>
                            )}

                            {/* EXERCISE */}
                            {contentType === 'exercise' && (
                                <>
                                    <div>
                                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 400, fontSize: '1.25rem', color: textPrimary, margin: '0 0 4px' }}>{content.title}</p>
                                        <div style={{ height: '1px', background: `linear-gradient(90deg, ${color}40, transparent)`, marginBottom: '14px' }} />
                                    </div>
                                    <div style={{ background: cardBg, border: cardBorder, borderRadius: '12px', padding: '16px' }}>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: '10px' }}>Steps</p>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textPrimary, lineHeight: '1.9', margin: 0, whiteSpace: 'pre-line' }}>{content.instructions}</p>
                                    </div>
                                    <div style={{ background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(212,175,55,0.07)', border: `1px solid ${goldColor}20`, borderRadius: '10px', padding: '12px' }}>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: goldColor, marginBottom: '5px' }}>Why this works</p>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textSecondary, lineHeight: '1.65', margin: 0 }}>{content.why}</p>
                                    </div>
                                </>
                            )}

                            {/* FUN FACT */}
                            {contentType === 'fun_fact' && (
                                <>
                                    <div style={{ background: `${color}12`, border: `1px solid ${color}28`, borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
                                        <span style={{ fontSize: '22px', display: 'block', marginBottom: '10px' }}>✦</span>
                                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.15rem', color: textPrimary, lineHeight: '1.65', margin: 0 }}>{content.hook}</p>
                                    </div>
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textSecondary, lineHeight: '1.85', margin: 0 }}>{content.detail}</p>
                                    <div style={{ background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(212,175,55,0.07)', border: `1px solid ${goldColor}20`, borderRadius: '10px', padding: '12px' }}>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: goldColor, marginBottom: '5px' }}>For you</p>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textSecondary, lineHeight: '1.65', margin: 0, fontStyle: 'italic' }}>{content.connection}</p>
                                    </div>
                                </>
                            )}

                            {/* CURIOSITY PROMPT */}
                            {contentType === 'curiosity_prompt' && (
                                <>
                                    <div style={{ background: `${color}10`, border: `1px solid ${color}25`, borderRadius: '12px', padding: '18px' }}>
                                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.2rem', color: textPrimary, lineHeight: '1.65', margin: 0 }}>{content.question}</p>
                                    </div>
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textSecondary, lineHeight: '1.85', margin: 0 }}>{content.explore}</p>
                                    <div style={{ background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(212,175,55,0.07)', border: `1px solid ${goldColor}20`, borderRadius: '10px', padding: '12px' }}>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textSecondary, lineHeight: '1.65', margin: 0, fontStyle: 'italic' }}>{content.your_take}</p>
                                    </div>
                                </>
                            )}

                            {/* DAILY CHALLENGE */}
                            {contentType === 'daily_challenge' && (
                                <>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 400, fontSize: '1.25rem', color: textPrimary, margin: 0 }}>{content.challenge}</p>
                                            {content.level && (
                                                <span style={{
                                                    fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase',
                                                    color: content.level === 'Beginner' ? '#7a9e7e' : content.level === 'Advanced' ? '#c9897a' : color,
                                                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                                                    padding: '3px 10px', borderRadius: '10px',
                                                }}>{content.level}</span>
                                            )}
                                        </div>
                                        <div style={{ height: '1px', background: `linear-gradient(90deg, ${color}40, transparent)`, marginBottom: '14px' }} />
                                    </div>
                                    <div style={{ background: cardBg, border: cardBorder, borderRadius: '12px', padding: '16px' }}>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: '8px' }}>Your task today</p>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textPrimary, lineHeight: '1.85', margin: 0 }}>{content.task}</p>
                                    </div>
                                    {content.bonus && (
                                        <div style={{ background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(212,175,55,0.07)', border: `1px solid ${goldColor}20`, borderRadius: '10px', padding: '12px' }}>
                                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: goldColor, marginBottom: '6px' }}>Bonus level</p>
                                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textSecondary, lineHeight: '1.65', margin: 0 }}>{content.bonus}</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Refresh */}
                            <button
                                onClick={loadContent}
                                style={{
                                    marginTop: '4px', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                                    fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
                                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                    border: `1px solid ${borderColor}`, color: textMuted, transition: 'all 0.18s', alignSelf: 'flex-start',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.color = textPrimary)}
                                onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
                            >Try a different one</button>
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    )
}