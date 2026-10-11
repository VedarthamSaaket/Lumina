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

const SCENARIOS = [
{
scenario: "You're in a meeting, and a colleague asks about a decision made two weeks ago. You remember attending, the room, what you wore... but nothing that was actually said. What do you do?",
options: [
"A) Admit you don't remember and ask them to fill you in",
"B) Bluff based on what probably was decided",
"C) Say 'let me check my notes' even though you don't have any",
"D) Send a quick follow-up to the group asking for a summary",
],
think_about: "You encoded the context but not the content. Were you really listening, or just physically present?",
},
{
scenario: "Someone asks you a question during a presentation. You know the answer, you can feel it right there, but it won't come out. Everyone's waiting.",
options: [
"A) Say 'great question' and try to force it for 15 seconds",
"B) Pivot: 'I'll come back to that' and continue with what you know",
"C) Say you'll send the answer in writing after the meeting",
"D) Ask if anyone else wants to jump in while you think",
],
think_about: "The harder you try to remember, the more your brain panics. Does stressing help or hurt?",
},
{
scenario: "A friend texts you something important to pass on. You're busy, so you think 'I'll remember.' Three hours later: you remember something was supposed to be passed on, but the message is gone. Now what?",
options: [
"A) Text your friend and ask them to resend",
"B) Guess based on what you think they meant",
"C) Do nothing. If it's that important, they'll follow up",
"D) This never happens to you. You always write it down immediately",
],
think_about: "Remembering to do something in the future is a different skill than remembering the past. What would actually fix this?",
},
{
scenario: "You've been doing a memory game for 20 minutes. Your accuracy is dropping, but you're trying just as hard. The game has another 10 minutes left.",
options: [
"A) Push through. You need the practice",
"B) Take a 2-minute break, then continue",
"C) Quit and come back tomorrow",
"D) Lower the difficulty and keep going",
],
think_about: "Your brain gets tired after 20-25 minutes of hard focus. Is pushing through training skill, or just training mistakes?",
},
{
scenario: "You read something that changed how you think about something. A week later, you remember it was important and it changed your view... but you can't remember what it was or who wrote it.",
options: [
"A) Let it go. The insight is what mattered, not the source",
"B) Spend time digging through your search history",
"C) Write down what you do remember right now",
"D) Ask friends if they shared anything with you recently",
],
think_about: "Your brain kept the 'gist' but lost the details. What would have saved the specifics back then?",
},
]

const EXERCISES = [
{
title: "4-object flash",
instructions: `1. Look at 4 things near you. Colors, positions, details.
2. Close your eyes and picture all 4 at once.
3. Add a 5th. Notice how it gets harder.
4. Open your eyes and check what you missed.`,
why: "Your brain can hold about 4 things at once. This builds your visual memory by pushing past that limit.",
},
{
title: "Walk it backward",
instructions: `1. Think of a short route you know well.
2. Picture it in reverse: end to start.
3. Notice which details disappear first.
4. Try the same route again tomorrow.`,
why: "Reversing a memory path makes it stronger. Your brain works harder when it can't use its normal forward flow.",
},
{
title: "Name + face sprint",
instructions: `1. Open social media. Pick someone you know a little.
2. Look at their photo for 8 seconds.
3. Close your eyes and say 3 facts about them.
4. Check your accuracy. Repeat 3 times.`,
why: "Linking names to faces is the most common memory complaint. The 3 facts force deeper encoding.",
},
{
title: "Two things at once",
instructions: `1. Hold a number in your head (like 73).
2. Recite the months out loud.
3. Did the number fade? Now reverse: hold a word while doing math.
4. Which was harder: numbers or words?`,
why: "This tests whether your brain is better at pictures or sounds. It tells you which memory games to focus on.",
},
{
title: "Room recall test",
instructions: `1. Memorize 8 things in your room. 30 seconds.
2. Move to another room and try to remember them.
3. Go back to the original room. Try again.
4. Did the original room help?`,
why: "Your brain recalls better in the same place you learned. This shows how much your environment affects memory.",
},
{
title: "Number chain",
instructions: `1. Read a 5-digit number. Close your eyes. Say it backward.
2. Do it again with 6 digits.
3. Stop when you can't do it cleanly 3 times in a row.
4. Practice this for 3 days straight.`,
why: "Reversing numbers is one of the hardest working memory tasks. It's like lifting weights for your brain.",
},
]

const FUN_FACTS = [
{
hook: "Your working memory capacity is the same at age 8 as it is at age 80. What changes is how well you use it.",
detail: "The raw ability to hold 3-5 items doesn't change much over your lifetime. What does improve with practice is how fast you encode new information and how well you block out distractions.",
connection: "Every game you play here is practicing efficiency, not capacity. That's actually more useful.",
},
{
hook: "The harder you try to remember something, the less likely you are to recall it.",
detail: "When you're stuck on a word, forcing it actually makes it worse. Your brain activates similar-but-wrong words, and they block the right one.",
connection: "Stuck in a game? Take a breath. The answer will often surface on its own.",
},
{
hook: "Sleep doesn't just save your memories. It actually fixes your mistakes.",
detail: "During sleep, your brain replays what you practiced and corrects errors. That's why a hard session before bed can feel mysteriously easier the next morning.",
connection: "After a tough game, sleep matters more than another round.",
},
{
hook: "Memory experts don't have better memories. They use tricks.",
detail: "The memory palace technique puts information onto locations you already remember. Your spatial memory is incredibly strong - it can hold thousands of images.",
connection: "Try it: picture each item in a sequence at a different spot in your room.",
},
{
hook: "Your brain changes your memories every time you recall them.",
detail: "Each time you bring up a memory, it becomes temporary again. It needs to be stored again. This is why eyewitness accounts change after being asked questions.",
connection: "When you review your game results, try to be accurate. Thinking you did worse than you did can actually make you play worse.",
},
{
hook: "Taking breaks restores your focus. But it matters what you do.",
detail: "Looking at your phone during a break doesn't help. Walking, looking out a window, or just resting your eyes works much better.",
connection: "Use breaks wisely. Put the phone down.",
},
]

const DAILY_CHALLENGES = [
{
challenge: "The delayed-recall journalist",
task: "At 3 moments today (after a meeting, call, or anything important), write down the 3 key things that happened - from memory only, within 5 minutes. Check against any notes tonight.",
level: "Intermediate",
bonus: "Do this for a week. Most people are surprised by how much their 'sure' memories differ from reality.",
},
{
challenge: "The story structure test",
task: "Listen to a short podcast or video (5 min). Without pausing, summarize: what was the first point? The second? Third? Not the words - the sequence.",
level: "Intermediate",
bonus: "This trains the exact skill that fades fastest under stress: remembering order.",
},
{
challenge: "The backward route",
task: "Today, before your regular commute or walk, mentally walk it backward. Every turn, every landmark in reverse. Time yourself. Compare to the real walk.",
level: "Beginner",
bonus: "Do it 5 days in a row. Most people get 50% faster by day 5.",
},
{
challenge: "Learn one fact",
task: "Today, pick 4 people you see regularly but aren't close to. Learn one new thing about each beyond their name. Test yourself in 2 days.",
level: "Beginner",
bonus: "Name-face-fact skill is the highest-value memory ability for work and social life.",
},
]

const CURIOSITY_PROMPTS = [
{
question: "If your memory was perfect, would that actually help you think?",
explore: "There's a woman who remembers every day of her life in perfect detail. She says it's exhausting and she can't think broadly because she's lost in specifics.",
your_take: "Think of a strong opinion you hold. How much of it comes from forgetting details and keeping patterns?",
},
{
question: "Why do we trust a calculator but not our own brain for numbers?",
explore: "We've outsourced arithmetic completely. But the same brain parts that do math also run your working memory. We never think about internal tools the same way.",
your_take: "What 3 things do you try to hold in your head instead of writing down? Are those the right things?",
},
{
question: "When you forget something, was it ever really stored?",
explore: "Most 'bad memory' complaints are actually 'wasn't paying attention when it happened' problems. If you weren't really there cognitively, the memory never formed.",
your_take: "Think of the last thing you forgot. Were you actually focusing when it happened?",
},
{
question: "How many of your opinions are just old memories you never updated?",
explore: "Memories can feel like strong current beliefs when they're really from years ago. Your brain sometimes mistakes 'I remember believing this' for 'I still believe this.'",
your_take: "Pick one opinion you've had for years. Can you remember exactly when and why you first thought it?",
},
]

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
fun_fact: '*',
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
  onContentLoaded?: (content: { type: string; data: Record<string, any> }) => void
  onOptionSelected?: (option: string) => void
}

export default function OrionRightPanel({ contentType, gameType, onClose, onContentLoaded, onOptionSelected }: OrionRightPanelProps) {
const { theme } = useThemeStore()
const isDark = theme === 'dark'
const color = '#5B9BD5'

const [content, setContent] = useState<Record<string, any> | null>(null)
const [loading, setLoading] = useState(true)
const [selectedOption, setSelectedOption] = useState<string | null>(null)

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

try {
const params = new URLSearchParams({ content_type: contentType })
if (gameType) params.set('game_type', gameType)
const res = await fetch(`${API}/api/orion/right-panel-content?${params}`, {
credentials: 'include',
headers: getAuthHeader(),
})
if (res.ok) {
const data = await res.json()
if (data && (data.hook || data.scenario || data.title || data.question || data.challenge)) {
          setContent(data)
          setLoading(false)
          if (onContentLoaded) onContentLoaded({ type: contentType, data })
          return
        }
}
} catch { /* use local */ }

const localContent = loadLocalContent()
setContent(localContent)
setLoading(false)
if (onContentLoaded) onContentLoaded({ type: contentType, data: localContent })
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
const icon = CONTENT_ICONS[contentType] || '*'

return (
<div style={{
display: 'flex', flexDirection: 'column', height: '100%', borderRadius: '20px',
overflow: 'hidden', background: bgPanel, border: `1px solid ${borderColor}`,
boxShadow: isDark ? `0 8px 48px rgba(0,0,0,0.65)` : `0 8px 40px rgba(30,60,120,0.12)`,
}}>
<div style={{
padding: '14px 16px 12px', borderBottom: `1px solid ${borderColor}`,
display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
background: isDark ? 'rgba(10,14,32,0.99)' : 'rgba(220,232,248,0.99)',
}}>
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
<span style={{ fontSize: '14px', color }}>{icon}</span>
<p style={{ fontFamily: "var(--font-cinzel), serif", fontSize: '10px', letterSpacing: '0.14em', color, margin: 0 }}>
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
>x Back</button>
</div>

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
<p style={{ fontFamily: 'var(--font-jost)', fontSize: '11px', color: textMuted }}>Loading...</p>
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
{contentType === 'scenario' && (
<>
<div style={{ background: cardBg, border: cardBorder, borderRadius: '12px', padding: '16px' }}>
<p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: '10px' }}>The situation</p>
<p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textPrimary, lineHeight: '1.8', margin: 0 }}>{content.scenario}</p>
</div>
{content.options && (
<div>
<p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '8px' }}>Pick one</p>
<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
{content.options.map((opt: string, i: number) => (
<motion.button key={i}
onClick={() => { setSelectedOption(opt); if (onOptionSelected) onOptionSelected(opt); }}
whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
style={{
textAlign: 'left', padding: '14px 18px', borderRadius: '14px', cursor: 'pointer',
background: selectedOption === opt ? `${color}18` : cardBg,
border: selectedOption === opt ? `2px solid ${color}75` : `1px solid ${color}30`,
fontFamily: 'var(--font-jost)', fontSize: '12px', color: textPrimary,
lineHeight: '1.6', transition: 'all 0.25s', boxShadow: selectedOption === opt ? `0 4px 20px ${color}30` : '0 2px 8px rgba(0,0,0,0.12)',
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

{contentType === 'exercise' && (
<>
<div>
<p style={{ fontFamily: "var(--font-cormorant), serif", fontStyle: 'italic', fontWeight: 400, fontSize: '1.25rem', color: textPrimary, margin: '0 0 4px' }}>{content.title}</p>
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

{contentType === 'fun_fact' && (
<>
<div style={{ background: `${color}12`, border: `1px solid ${color}28`, borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
<span style={{ fontSize: '22px', display: 'block', marginBottom: '10px' }}>*</span>
<p style={{ fontFamily: "var(--font-cormorant), serif", fontStyle: 'italic', fontSize: '1.15rem', color: textPrimary, lineHeight: '1.65', margin: 0 }}>{content.hook}</p>
</div>
<p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textSecondary, lineHeight: '1.85', margin: 0 }}>{content.detail}</p>
<div style={{ background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(212,175,55,0.07)', border: `1px solid ${goldColor}20`, borderRadius: '10px', padding: '12px' }}>
<p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: goldColor, marginBottom: '5px' }}>For you</p>
<p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textSecondary, lineHeight: '1.65', margin: 0, fontStyle: 'italic' }}>{content.connection}</p>
</div>
</>
)}

{contentType === 'curiosity_prompt' && (
<>
<div style={{ background: `${color}10`, border: `1px solid ${color}25`, borderRadius: '12px', padding: '18px' }}>
<p style={{ fontFamily: "var(--font-cormorant), serif", fontStyle: 'italic', fontSize: '1.2rem', color: textPrimary, lineHeight: '1.65', margin: 0 }}>{content.question}</p>
</div>
<p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textSecondary, lineHeight: '1.85', margin: 0 }}>{content.explore}</p>
<div style={{ background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(212,175,55,0.07)', border: `1px solid ${goldColor}20`, borderRadius: '10px', padding: '12px' }}>
<p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textSecondary, lineHeight: '1.65', margin: 0, fontStyle: 'italic' }}>{content.your_take}</p>
</div>
</>
)}

{contentType === 'daily_challenge' && (
<>
<div>
<div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
<p style={{ fontFamily: "var(--font-cormorant), serif", fontStyle: 'italic', fontWeight: 400, fontSize: '1.25rem', color: textPrimary, margin: 0 }}>{content.challenge}</p>
{content.level && (
<span style={{
fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase',
color: content.level === 'Beginner' ? '#7a9e7e' : color,
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
<p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: goldColor, marginBottom: '6px' }}>Bonus</p>
<p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textSecondary, lineHeight: '1.65', margin: 0 }}>{content.bonus}</p>
</div>
)}
</>
)}

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