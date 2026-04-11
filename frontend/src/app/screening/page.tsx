'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import { screeningAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import DarkVeil from '@/components/DarkVeil'
import '@/components/DarkVeil.css'

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

async function saveSummaryToDashboard(testName: string, scoreLabel: string, summaryText: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  if (!token || !summaryText) return
  try {
    await fetch(`${API_BASE}/api/dashboard/summaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({ title: `${testName} · ${scoreLabel}`, content: summaryText, source: 'screening' }),
    })
  } catch { /* silent */ }
}

const RSES_REVERSED = new Set([2, 4, 7, 8, 9])

// ─── SOCIALLY SAFE ANSWER DETECTION ───────────────────────────────────────────
// Maps [testKey][questionIndex] → the "safe-sounding" answer index that might
// be under-reported. When user picks it on a flagged question, we show a gentle nudge.
const SAFE_ANSWER_FLAGS: Record<string, Record<number, { safeIdx: number; nudge: string }>> = {
  MOOD: {
    5: { safeIdx: 0, nudge: "Most of us are harder on ourselves than we'd admit to others. Even occasional self-blame counts here." },
    8: { safeIdx: 0, nudge: "These thoughts can feel too small to mention. If they show up at all, even briefly, it's worth noting." },
  },
  WORRY: {
    1: { safeIdx: 0, nudge: "Worry spirals often feel normal because they're familiar. If your mind circles back to things often, that counts." },
    6: { safeIdx: 0, nudge: "Background unease is easy to dismiss as 'just how I am'. If it's there at all, it's real." },
  },
  SELFWORTH: {
    2: { safeIdx: 0, nudge: "It's common to answer 'not really like me' here because naming what we like about ourselves feels uncomfortable, not because it's untrue." },
    9: { safeIdx: 0, nudge: "This one is easy to underreport. The feeling of not pulling your weight can be quiet but persistent." },
  },
  BIGFIVE: {
    8: { safeIdx: 0, nudge: "We often minimise how much small things affect us. If setbacks sit with you for a while, even privately, that counts." },
  },
  ATTACHMENT: {
    6: { safeIdx: 0, nudge: "Preferring to handle things alone is often framed as strength. But discomfort with depending on others is worth noting honestly." },
    9: { safeIdx: 0, nudge: "Keeping a deeper layer private is often so habitual it doesn't feel like a pattern. If it's there, it belongs here." },
  },
  EQ: {
    2: { safeIdx: 2, nudge: "Most people say 'often true' for regulation questions. Think about your last really hard week, did you have reliable ways to settle yourself?" },
  },
  STRESS: {
    7: { safeIdx: 0, nudge: "Avoidant coping (screens, food, alcohol, busyness) is very common and easy to not connect to stress. If it shows up even occasionally, it counts." },
  },
  BURNOUT: {
    1: { safeIdx: 0, nudge: "There's a difference between 'tired from a full week' and 'genuinely depleted'. If it's hard to remember when you weren't tired, lean toward the higher answer." },
    5: { safeIdx: 0, nudge: "Feeling perpetually behind but managing to keep up externally is still a gap between demand and resource. It counts." },
  },
}

const Qs = {

  MOOD: {
    name: 'Mood Check',
    full: 'How have you been feeling lately?',
    color: '#d4af37',
    category: 'wellbeing',
    desc: 'Think back over the past two weeks. Go with your first honest feeling for each one, not the most flattering answer.',
    options: ['Rarely or not at all', 'Some of the time', 'A good part of the time', 'Almost all the time'],
    questions: [
      'You have found yourself going through the motions without really feeling present or engaged.',
      'A heaviness or sense of flatness has been following you around.',
      'Your sleep has felt off, whether that means too much, too little, or just not restful.',
      'Getting through the day has felt like it takes more out of you than it should.',
      'Your relationship with food has felt a little off or inconsistent.',
      'You have been harder on yourself than usual, replaying things or second-guessing decisions.',
      'Staying focused on something, even something you normally enjoy, has been a struggle.',
      'People close to you may have noticed a shift in your pace or energy.',
      'Thoughts about not wanting to be here, or about hurting yourself, have crossed your mind.',
      'Small things that would not have bothered you before are leaving a bigger mark lately.',
      'You have felt more disconnected from the things and people you usually care about.',
      'Getting started on something, even a simple task, feels heavier than it used to.',
    ],
    contextHints: [
      'e.g. I go through my day but feel strangely disconnected from it...',
      'e.g. Even good moments feel muted lately...',
      'e.g. My mind races at night or I sleep through alarms...',
      'e.g. Even after a full night of sleep, I wake up tired...',
      'e.g. I either forget to eat or find myself eating past the point of fullness...',
      'e.g. Something that happened weeks ago still plays on a loop...',
      'e.g. I re-read the same paragraph several times and it still does not sink in...',
      'e.g. My partner or a friend said I seem slower or quieter than usual...',
      'e.g. These feel more like fleeting thoughts than anything I am acting on...',
      'e.g. A comment I would have shrugged off is staying with me...',
      'e.g. I am spending more time alone or going quiet in conversations...',
      'e.g. Even replying to messages feels like a lot right now...',
    ],
    scoring: [
      { max: 5, label: 'Doing well', color: '#7a9e7e' },
      { max: 11, label: 'Mild dip', color: '#b8a070' },
      { max: 18, label: 'Noticeable strain', color: '#c4913a' },
      { max: 25, label: 'Significant weight', color: '#c9897a' },
      { max: 36, label: 'Feeling quite heavy', color: '#c17a5a' },
    ],
    note: 'This check is based on the PHQ-9, a widely used wellbeing tool. A score is not a diagnosis.',
    traits: ['sense of presence', 'emotional tone', 'sleep quality', 'energy levels', 'relationship with food', 'self-compassion', 'focus and concentration', 'psychomotor pace', 'safety and self-regard', 'emotional reactivity', 'social connection', 'task initiation'],
    intro: 'This reflects your emotional and physical wellbeing over the past two weeks.',
  },

  WORRY: {
    name: 'Mind and Worry',
    full: 'How has your mind been treating you?',
    color: '#c9897a',
    category: 'wellbeing',
    desc: 'Think about the past two weeks. There are no right answers, go with what is actually true, not what sounds okay.',
    options: ['Rarely or not at all', 'Some of the time', 'A good part of the time', 'Almost all the time'],
    questions: [
      'A feeling of being on edge or keyed up has been hard to shake.',
      'Your mind has been pulling you into worry spirals that are difficult to step out of.',
      'You have found yourself worrying across several different areas of your life at once.',
      'Truly switching off and resting feels harder than it used to.',
      'There is a physical restlessness you cannot quite settle, fidgeting, pacing, or tension.',
      'Small things have been setting you off more than you would like.',
      'A low-level sense of dread about something going wrong has been in the background.',
      'You have been replaying conversations or situations to check if you handled them right.',
      'Uncertainty, not knowing how something will turn out, sits heavily with you.',
      'Your body has been carrying tension that does not fully release, even when things are calm.',
    ],
    contextHints: [
      'e.g. Mostly around work or social situations...',
      'e.g. It usually starts at night when things go quiet...',
      'e.g. My health, my relationships, my finances - it jumps between all of them...',
      'e.g. Even weekends feel like I am just waiting for the week to start again...',
      'e.g. I tap my feet constantly or cannot sit through a whole film...',
      'e.g. A small inconvenience can spiral into a bad hour...',
      'e.g. Before events or even ordinary days, there is a background unease...',
      'e.g. I keep asking if I said something wrong or gave the wrong impression...',
      'e.g. Waiting for results, replies, or decisions is particularly hard...',
      'e.g. I notice it in my jaw, shoulders, or stomach most...',
    ],
    scoring: [
      { max: 5, label: 'Calm and grounded', color: '#7a9e7e' },
      { max: 12, label: 'Mild tension', color: '#b8a070' },
      { max: 19, label: 'Moderate worry', color: '#c4913a' },
      { max: 30, label: 'High anxiety', color: '#c17a5a' },
    ],
    note: 'Based on the GAD-7, developed and validated by Spitzer et al. (2006).',
    traits: ['baseline calm', 'worry controllability', 'scope of worry', 'ability to rest', 'physical restlessness', 'emotional reactivity', 'anticipatory dread', 'post-event processing', 'intolerance of uncertainty', 'somatic tension'],
    intro: 'This reflects how your nervous system and thought patterns have been running lately.',
  },

  SELFWORTH: {
    name: 'How You See Yourself',
    full: 'Your relationship with yourself',
    color: '#c4913a',
    category: 'wellbeing',
    desc: 'Read each statement and go with whatever feels most true right now, not the version of yourself you are working toward.',
    options: ['This feels very true', 'This feels mostly true', 'This does not feel like me', 'This is the opposite of how I feel'],
    questions: [
      'I feel like I bring something real and worthwhile to the world.',
      'When I think honestly about myself, I can name things I genuinely like.',
      'When things go wrong, my first instinct is to blame myself.',
      'In most situations, I trust that I am capable of handling what comes up.',
      'I find it hard to point to things about myself that make me proud.',
      'My overall attitude toward myself tends to be kind rather than critical.',
      'At the end of most days, I feel okay about who I am.',
      'I sometimes wish I could see myself the way others seem to see me.',
      'There are times when I feel like I am not contributing or pulling my weight.',
      'A quiet voice in my head tells me I am not quite good enough.',
      'When I receive a compliment, my first instinct is to deflect or dismiss it.',
      'I often hold myself to a standard I would never apply to someone I care about.',
    ],
    contextHints: [
      'e.g. I tend to compare myself a lot to people around me...',
      'e.g. I struggle to answer "what are you good at" without deflecting...',
      'e.g. This tends to spike after setbacks at work or in relationships...',
      'e.g. I often feel like people will find out I am less capable than they think...',
      'e.g. I downplay achievements even when others praise them...',
      'e.g. My self-image shifts depending on who I am around...',
      'e.g. I feel most settled in myself when I have been productive...',
      'e.g. People seem to hold me in higher regard than I hold myself...',
      'e.g. This surfaces most when I make a mistake or feel overlooked...',
      'e.g. It gets louder when I am tired, stressed, or alone...',
      'e.g. "Thanks, but it was nothing" is my default...',
      'e.g. I would never say to a friend what I say to myself...',
    ],
    scoring: [
      { max: 17, label: 'Quite self-critical', color: '#c17a5a' },
      { max: 30, label: 'Balanced self-view', color: '#7a9e7e' },
      { max: 36, label: 'Strong self-regard', color: '#d4af37' },
    ],
    note: 'Based on the Rosenberg Self-Esteem Scale (1965). Some statements score in reverse.',
    traits: ['sense of personal worth', 'recognition of positive qualities', 'self-critical tendency', 'perceived capability', 'self-pride', 'internal self-attitude', 'daily self-acceptance', 'desire for external validation', 'sense of contribution', 'inner critic volume', 'receptivity to praise', 'self-compassion standard'],
    intro: 'This reflects how you have been relating to yourself and what kind of voice you turn inward.',
    reversed: RSES_REVERSED,
  },

  BIGFIVE: {
    name: 'Who You Are',
    full: 'Your personality at a glance',
    color: '#b8860b',
    category: 'personality',
    desc: 'Rate how much each statement sounds like you in general, not on your best day or worst day, but most days.',
    options: ['Not like me at all', 'Not really like me', 'Somewhat like me', 'Very much like me'],
    questions: [
      'You tend to notice things in your environment that others walk straight past.',
      'You often have ideas or creative urges that pull you away from routine.',
      'Your plans tend to follow through - you rarely leave things half-finished.',
      'You stick to systems and schedules even when it requires effort to do so.',
      'Talking to new people energises you rather than draining you.',
      'You find group settings or social situations easy to navigate.',
      'You find it genuinely easy to trust the people around you.',
      'When someone is struggling, your instinct is to step in and help.',
      'Small setbacks can sit with you for longer than you would like.',
      'Your mood can shift noticeably depending on what is happening around you.',
      'You tend to think through decisions carefully rather than going with your gut.',
      'You are usually the last person to leave a social gathering, not the first.',
    ],
    contextHints: [
      'e.g. I notice the texture of things, background sounds, colours in a room...',
      'e.g. I get restless doing the same thing for too long...',
      'e.g. I have a to-do list and I actually use it...',
      'e.g. I find it hard to relax until the task is done...',
      'e.g. I feel recharged after a good conversation with a stranger...',
      'e.g. I tend to be one of the more talkative people in a room...',
      'e.g. I give people the benefit of the doubt more often than not...',
      'e.g. If a friend is having a hard week, I want to fix it for them...',
      'e.g. A critical comment can affect my whole day...',
      'e.g. A bad morning has a way of colouring the rest of the day...',
      'e.g. I like to sit with a decision before committing...',
      'e.g. I tend to be the one suggesting we stay out a bit longer...',
    ],
    scoring: [
      { max: 18, label: 'Reflective and measured', color: '#7a9e7e' },
      { max: 30, label: 'Balanced blend', color: '#b8a070' },
      { max: 36, label: 'Highly expressive', color: '#b8860b' },
    ],
    note: 'Inspired by Big Five personality research. Not a clinical assessment.',
    traits: ['perceptual sensitivity', 'openness to novelty', 'follow-through', 'orderliness', 'social energy', 'extroversion', 'trust in others', 'agreeableness', 'emotional sensitivity', 'mood reactivity', 'deliberateness', 'social endurance'],
    intro: 'This gives a picture of how you tend to move through the world and relate to others.',
  },

  ATTACHMENT: {
    name: 'How You Connect',
    full: 'Your patterns in close relationships',
    color: '#c9897a',
    category: 'personality',
    desc: 'Think about your close relationships, romantic, friendships, or both. Answer honestly, not aspirationally.',
    options: ['This does not sound like me', 'A little bit like me', 'Quite like me', 'Very much like me'],
    questions: [
      'You feel comfortable leaning on people you are close to when you need support.',
      'You do not tend to worry much about whether people in your life will be there for you.',
      'When someone is a little distant or quiet, you tend not to read into it.',
      'After a conflict, you are generally able to reconnect without too much difficulty.',
      'You sometimes feel the urge to pull back in relationships even when things are going well.',
      'Depending on someone too much feels uncomfortable, even if you care about them.',
      'You tend to feel anxious if someone important to you does not respond for a while.',
      'You can find yourself wanting more closeness or reassurance than feels easy to ask for.',
      'In relationships, you tend to keep a part of yourself private or hard to reach.',
      'You sometimes wonder whether the people you care about feel the same way about you.',
      'You tend to work through difficult emotions on your own rather than bringing them to the relationship.',
      'The idea of someone getting truly close, knowing all of you, brings up some discomfort.',
    ],
    contextHints: [
      'e.g. I can ask for help without feeling like a burden...',
      'e.g. I do not lie awake worrying that friendships are falling apart...',
      'e.g. If someone takes a while to reply, I assume they are just busy...',
      'e.g. After a disagreement, I can usually move forward without too much damage...',
      'e.g. Sometimes I create distance before the other person can...',
      'e.g. I prefer to handle difficult emotions on my own...',
      'e.g. Being left on read for a few hours can spiral into a whole story in my head...',
      'e.g. I want more closeness but bringing it up feels too vulnerable...',
      'e.g. I share a lot but there is a deeper layer most people never reach...',
      'e.g. I second-guess whether people actually want me around...',
      'e.g. I tend to process things internally before, or instead of, talking about them...',
      'e.g. Full transparency with another person feels exposing rather than safe...',
    ],
    scoring: [
      { max: 18, label: 'More avoidant tendencies', color: '#c4913a' },
      { max: 30, label: 'Mixed or earned security', color: '#7a9e7e' },
      { max: 36, label: 'More anxious tendencies', color: '#c9897a' },
    ],
    note: 'Inspired by attachment theory research (Bowlby, Ainsworth). Not a clinical tool.',
    traits: ['comfort with vulnerability', 'relationship security', 'interpretation of distance', 'repair after conflict', 'emotional withdrawal tendency', 'comfort with dependence', 'anxiety about availability', 'need for reassurance', 'emotional openness', 'relationship confidence', 'solo processing tendency', 'comfort with full intimacy'],
    intro: 'This looks at the patterns and tendencies that show up for you in close relationships.',
  },

  EQ: {
    name: 'Your Emotional Intelligence',
    full: 'How you navigate feelings, yours and others\'',
    color: '#8b9e7a',
    category: 'personality',
    desc: 'Think about how you actually tend to be, not how you wish you were. The most useful data is the honest kind.',
    options: ['Rarely true for me', 'Sometimes true', 'Often true', 'Almost always true'],
    questions: [
      'You are usually aware of what you are feeling as it is happening, not just after the fact.',
      'When you are in a difficult emotional state, you have ways of settling yourself down.',
      'Strong feelings rarely push you into decisions you later regret.',
      'You stay focused and productive even when something emotional is weighing on you.',
      'Reading how someone else is feeling, even without them saying it, comes naturally to you.',
      'You notice when someone in a group or room is feeling left out or uncomfortable.',
      'When others are upset, you find it easy to understand their perspective, even if you disagree.',
      'You tend to bring steadiness to tense or difficult situations rather than adding to them.',
      'Working with or alongside other people tends to go smoothly for you.',
      'Building genuine trust with people does not take very long for you.',
      'After a disagreement, you are usually able to name your part in it without excessive self-blame.',
      'You can sit with someone else\'s difficult emotion without immediately trying to fix or dismiss it.',
    ],
    contextHints: [
      'e.g. I notice shifts in my own mood and can usually name them...',
      'e.g. I have a go-to practice when I feel overwhelmed - breathing, walking, writing...',
      'e.g. I rarely say things in the heat of the moment that I deeply regret...',
      'e.g. I can compartmentalise reasonably well when I need to...',
      'e.g. People say I pick up on the mood in a room quickly...',
      'e.g. I gravitate toward the quiet person at a party...',
      'e.g. I try to understand why someone feels the way they do before I respond...',
      'e.g. People tend to come to me when things get tense or complicated...',
      'e.g. I am a fairly easy person to collaborate with...',
      'e.g. People tend to open up to me fairly quickly...',
      'e.g. I can look at my role in a conflict honestly without spiralling...',
      'e.g. I do not rush to reassure people or change the subject when they are struggling...',
    ],
    scoring: [
      { max: 18, label: 'Still developing', color: '#c4913a' },
      { max: 30, label: 'Emotionally aware', color: '#b8a070' },
      { max: 36, label: 'Highly emotionally intelligent', color: '#8b9e7a' },
    ],
    note: 'Inspired by Goleman and Mayer-Salovey models of emotional intelligence.',
    traits: ['emotional awareness', 'self-regulation', 'impulse control', 'focus under pressure', 'reading others', 'social sensitivity', 'empathy', 'steadiness in conflict', 'collaborative ease', 'trust-building', 'accountability without shame', 'tolerance for others\' distress'],
    intro: 'This explores how you read, manage, and move through emotional experiences - your own and the people around you.',
  },

  STRESS: {
    name: 'Stress and Coping',
    full: 'How you handle pressure and difficulty',
    color: '#8b7355',
    category: 'personality',
    desc: 'Think about how you actually respond when things get hard, not the version of yourself you aspire to be.',
    options: ['Rarely or never like me', 'Sometimes like me', 'Often like me', 'Very much like me'],
    questions: [
      'When something stressful happens, your first instinct is to take some kind of action rather than sit with it.',
      'You tend to look for something useful or instructive even in difficult situations.',
      'Talking to someone you trust is one of the first things you do when you are overwhelmed.',
      'When you cannot change a situation, you find ways to change how you think about it.',
      'Under pressure, you tend to push feelings aside and just get through what needs doing.',
      'Stress often shows up physically for you - as tension, headaches, stomach issues, or fatigue.',
      'When things pile up, you find yourself pulling away from people rather than reaching out.',
      'You use things like food, screens, alcohol, or busyness to take the edge off when stressed.',
      'After a stressful period passes, you find it relatively easy to recover and feel like yourself again.',
      'You are generally able to keep perspective when you are under pressure, even if it takes effort.',
      'When you are under stress, your sleep, appetite, or daily rhythms tend to shift noticeably.',
      'You find it difficult to ask for help even when you genuinely need it.',
    ],
    contextHints: [
      'e.g. I tend to make lists or start problem-solving immediately...',
      'e.g. I ask myself what I can learn from this even when it hurts...',
      'e.g. A good conversation with a friend can completely shift my state...',
      'e.g. I tell myself it could be worse or that it will pass...',
      'e.g. I go quiet and focused and deal with feelings later...',
      'e.g. Stress tends to land in my shoulders, jaw, or gut...',
      'e.g. I cancel plans and want to be left alone when I am overwhelmed...',
      'e.g. I notice I scroll more or snack more when I am stressed...',
      'e.g. A good weekend is usually enough to reset me...',
      'e.g. I remind myself that most things feel bigger in the moment than they are...',
      'e.g. Stress-related insomnia or forgetting to eat is common for me...',
      'e.g. I would rather struggle quietly than ask someone to carry it with me...',
    ],
    scoring: [
      { max: 18, label: 'Still finding your footing', color: '#c4913a' },
      { max: 30, label: 'Developing resilience', color: '#b8a070' },
      { max: 36, label: 'Resourceful under pressure', color: '#8b7355' },
    ],
    note: "Inspired by coping style research including Lazarus and Folkman's transactional model of stress.",
    traits: ['problem-focused coping', 'meaning-making', 'social support use', 'cognitive reframing', 'emotional suppression', 'somatic stress response', 'social withdrawal tendency', 'avoidant coping', 'recovery speed', 'stress perspective', 'physiological impact', 'help-seeking'],
    intro: 'This explores how you tend to respond when life gets heavy and what your default coping patterns look like.',
  },

  CAREERVALUES: {
    name: 'What Work Means to You',
    full: 'Your values and motivations at work',
    color: '#7a9e7e',
    category: 'career',
    desc: 'Think about what makes you feel genuinely fulfilled at work, not what sounds impressive, not what you think you should value.',
    options: ['This does not matter much to me', 'Somewhat matters', 'Matters a lot', 'This is essential'],
    questions: [
      'Having genuine autonomy over how and when you do your work.',
      'Knowing that what you do has a real impact on people or on the world.',
      'Being compensated well and having financial stability.',
      'Working in an environment where you are always learning something new.',
      'Being recognised and appreciated for what you contribute.',
      'Having a strong sense of stability and predictability in your role.',
      'Feeling creative freedom in your work and being able to try new approaches.',
      'Working alongside people you genuinely like and respect.',
      'Having a clear sense of where your career is heading and being able to grow.',
      'Being able to close your laptop at a reasonable time and truly switch off.',
      'Feeling that your work aligns with your personal values, not just your skills.',
      'Having variety in your work - different types of tasks or problems to solve.',
    ],
    contextHints: [
      'e.g. Micromanagement drains me quickly...',
      'e.g. I want to feel like my work matters beyond just a salary...',
      'e.g. Financial security is one of my core concerns right now...',
      'e.g. Stagnation is one of my biggest fears professionally...',
      'e.g. Being overlooked affects my motivation significantly...',
      'e.g. Uncertainty about my role or the company makes me anxious...',
      'e.g. Doing the same thing the same way forever sounds like a slow death...',
      'e.g. Team culture often matters more to me than the job itself...',
      'e.g. I want to know there is somewhere to go from where I am...',
      'e.g. Burnout is something I have dealt with before and want to avoid...',
      'e.g. I cannot stay in a role that conflicts with what I believe in...',
      'e.g. Doing the exact same tasks every day makes me disengage...',
    ],
    scoring: [
      { max: 18, label: 'Security-oriented', color: '#8b7355' },
      { max: 30, label: 'Balance-seeking', color: '#b8a070' },
      { max: 36, label: 'Growth and autonomy driven', color: '#7a9e7e' },
    ],
    note: 'Based on career motivation research including Self-Determination Theory (Deci and Ryan).',
    traits: ['autonomy need', 'meaning and purpose', 'financial motivation', 'growth orientation', 'recognition need', 'security orientation', 'creative freedom', 'team connection', 'career ambition', 'work-life integration', 'values alignment', 'variety appetite'],
    intro: 'This reveals what genuinely matters to you in a work context, beyond job titles and salary.',
  },

  WORKENVIRONMENT: {
    name: 'Where You Work Best',
    full: 'Your ideal work setup and environment',
    color: '#8b7355',
    category: 'career',
    desc: 'Think honestly about where you actually do your best work, not the ideal version of yourself, the real one.',
    options: ['Strongly prefer the opposite', 'Lean toward the opposite', 'Lean this way', 'Strongly prefer this'],
    questions: [
      'You do your best thinking and working when you are alone rather than surrounded by people.',
      'A quieter, more contained work environment suits you better than a buzzing open-plan one.',
      'You would rather work remotely or from home than commute to a physical office.',
      'Flexible hours that let you structure your own day matter more to you than a fixed schedule.',
      'You prefer working on one thing deeply rather than juggling several tasks at once.',
      'Having clear processes and structure in place helps you rather than holds you back.',
      'You thrive more in a collaborative team than in a solo, independent role.',
      'You like a role with variety and change rather than a consistent, predictable one.',
      'A fast-paced, high-energy work culture suits your personality.',
      'You are more at ease in smaller, close-knit teams than large organisations.',
      'You prefer to know what your week looks like in advance rather than adapting day to day.',
      'You do your sharpest work earlier in the day or in specific conditions you have figured out.',
    ],
    contextHints: [
      'e.g. Open offices genuinely affect my concentration...',
      'e.g. I do my best work before 9am when it is quiet...',
      'e.g. My commute used to take a real toll on my energy...',
      'e.g. I am a night owl and forced 9-5 hours do not suit me...',
      'e.g. Context-switching between tasks wrecks my flow...',
      'e.g. Ambiguity in a role stresses me out more than helps...',
      'e.g. I get energy from having people to bounce ideas off...',
      'e.g. Routine eventually starts to feel like a trap...',
      'e.g. Deadlines and pace are actually motivating for me...',
      'e.g. I know everyone by name where I work and that matters to me...',
      'e.g. Surprises in my schedule throw me off more than they should...',
      'e.g. I have a specific time of day when I do my best deep work...',
    ],
    scoring: [
      { max: 22, label: 'Independent and structured', color: '#b8a070' },
      { max: 32, label: 'Adaptable', color: '#7a9e7e' },
      { max: 36, label: 'Collaborative and dynamic', color: '#8b7355' },
    ],
    note: 'Based on work environment preference research in occupational psychology.',
    traits: ['solo vs social preference', 'environment sensitivity', 'remote vs office', 'schedule flexibility', 'depth vs breadth', 'structure need', 'collaboration appetite', 'variety orientation', 'pace preference', 'team size preference', 'schedule predictability', 'peak performance conditions'],
    intro: 'This maps the conditions where you genuinely thrive and get your best work done.',
  },

  LEADERSHIP: {
    name: 'How You Lead and Contribute',
    full: 'Your natural role in teams and at work',
    color: '#b8a070',
    category: 'career',
    desc: 'Think about how you actually behave in work situations, not the version you put on your CV.',
    options: ['This is not really me', 'Occasionally like me', 'Often like me', 'This is very me'],
    questions: [
      'When a group has no clear direction, you tend to be the one who steps up to set it.',
      'Making decisions under uncertainty does not paralyse you - you back your judgment.',
      'You find it energising to develop or mentor the people around you.',
      'You are comfortable having difficult conversations when the situation calls for it.',
      'You tend to be the person who finishes the work rather than the one who directs it.',
      'You prefer to know every detail of something before considering it done.',
      'You take genuine pride in being the most knowledgeable person in your specific area.',
      'You prefer roles where success is clearly traceable to your individual effort.',
      'You notice inefficiencies in how things are done and feel driven to fix them.',
      'You are more comfortable implementing ideas than generating them.',
      'When others are unsure, your confidence tends to steady the room.',
      'The part of your work you care most about is the quality of what you personally produce.',
    ],
    contextHints: [
      'e.g. I naturally start coordinating when things feel disorganised...',
      'e.g. Analysis paralysis is not really a problem I have...',
      'e.g. I get a lot of satisfaction from watching someone I helped succeed...',
      'e.g. Avoiding conflict tends to cause bigger problems...',
      'e.g. I would rather be the person who makes it happen than the one who talks about it...',
      'e.g. I feel unsettled if I submit something I am not fully satisfied with...',
      'e.g. I want to be the person people call with questions in my field...',
      'e.g. I like being able to point to something and say I built that...',
      'e.g. I often spot a better way of doing something and cannot help myself...',
      'e.g. I am better at executing a clear brief than creating from scratch...',
      'e.g. When a meeting goes quiet, I tend to be the one who speaks...',
      'e.g. My standards for my own output are higher than most people around me...',
    ],
    scoring: [
      { max: 22, label: 'Deep contributor', color: '#8b7355' },
      { max: 32, label: 'Hybrid profile', color: '#b8a070' },
      { max: 36, label: 'Natural leader', color: '#d4af37' },
    ],
    note: 'Inspired by leadership vs individual contributor research in organisational psychology.',
    traits: ['direction-setting', 'decision confidence', 'developing others', 'conflict courage', 'execution focus', 'detail orientation', 'domain expertise pride', 'ownership orientation', 'systems thinking', 'implementation strength', 'steadying presence', 'craft standards'],
    intro: 'This explores where your natural energy goes at work, whether that is leading, building, or going deep.',
  },

  BURNOUT: {
    name: 'Your Energy and Limits',
    full: 'How work has been affecting you',
    color: '#c17a5a',
    category: 'career',
    desc: 'Think about the past few weeks at work. Be honest with yourself here, there is nothing to perform.',
    options: ['Rarely or never', 'Sometimes', 'Often', 'Nearly all the time'],
    questions: [
      'By the end of the week you feel genuinely depleted rather than just tired.',
      'The enthusiasm you once had for your work has been harder to find.',
      'You find yourself going through tasks mechanically without much investment.',
      'Small setbacks or criticisms at work hit harder than they used to.',
      'You feel a gap between what your job asks of you and the time or resources you have.',
      'You have been questioning whether your work is making any real difference.',
      'You feel like you can only give so much before hitting a wall.',
      'Your work feels like it takes from you more than it gives back right now.',
      'You carry the weight of work home with you even when you are not working.',
      'You feel a creeping sense of distance from colleagues or the organisation.',
      'Sunday evenings bring a specific kind of dread about the week ahead.',
      'You have started to notice that you are performing at work rather than actually present in it.',
    ],
    contextHints: [
      'e.g. I used to bounce back from a weekend. Lately I do not...',
      'e.g. I used to look forward to Mondays. That has changed...',
      'e.g. I open tasks but barely register what I am doing...',
      'e.g. Feedback that would not have fazed me before now stings...',
      'e.g. I feel like I am always running behind with no way to catch up...',
      'e.g. I keep asking myself if any of this actually matters...',
      'e.g. I hit a point in the day where I simply cannot produce anything else...',
      'e.g. My job asks a lot but does not give much back in terms of meaning or reward...',
      'e.g. I am thinking about work during dinner, on walks, in the shower...',
      'e.g. I feel a bit checked out, even in meetings I used to care about...',
      'e.g. Friday nights feel like relief and Sunday nights feel like dread...',
      'e.g. I am going through the motions in meetings - technically present, not really there...',
    ],
    scoring: [
      { max: 15, label: 'Holding up well', color: '#7a9e7e' },
      { max: 27, label: 'Some signs of strain', color: '#c4913a' },
      { max: 48, label: 'Worth paying attention to', color: '#c17a5a' },
    ],
    note: 'Inspired by burnout research including Maslach and Leiter. Not a clinical assessment.',
    traits: ['physical depletion', 'motivation erosion', 'emotional detachment', 'emotional resilience', 'workload pressure', 'sense of meaning', 'capacity limits', 'reciprocity imbalance', 'work-life boundary', 'organisational connection', 'anticipatory dread', 'presenteeism'],
    intro: 'This reflects how the demands of your work have been landing on you emotionally and physically.',
  },
}

type QType = keyof typeof Qs

const CATEGORIES = {
  wellbeing: {
    label: 'Wellbeing',
    subtitle: 'How you have been feeling',
    color: '#d4af37',
    icon: '◯',
    keys: ['MOOD', 'WORRY', 'SELFWORTH'] as QType[],
  },
  personality: {
    label: 'Personality',
    subtitle: 'Who you are and how you connect',
    color: '#c9897a',
    icon: '◈',
    keys: ['BIGFIVE', 'ATTACHMENT', 'EQ', 'STRESS'] as QType[],
  },
  career: {
    label: 'Career and Work',
    subtitle: 'What suits you professionally',
    color: '#7a9e7e',
    icon: '◎',
    keys: ['CAREERVALUES', 'WORKENVIRONMENT', 'LEADERSHIP', 'BURNOUT'] as QType[],
  },
}

type CategoryKey = keyof typeof CATEGORIES
type Screen = 'categories' | 'category' | 'test' | 'result'

// ─── SOCIALLY SAFE NUDGE OVERLAY ──────────────────────────────────────────────
function SafeAnswerNudge({
  nudge, onDismiss, onChange, color,
}: { nudge: string; onDismiss: () => void; onChange: () => void; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="rounded-xl p-4 mt-3"
      style={{ background: `${color}0d`, border: `1px solid ${color}30` }}>
      <p className="font-body text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        {nudge}
      </p>
      <div className="flex gap-2">
        <button onClick={onDismiss}
          className="px-4 py-1.5 rounded-lg font-jost text-xs tracking-wide"
          style={{ background: `${color}12`, border: `1px solid ${color}28`, color }}>
          My answer stands
        </button>
        <button onClick={onChange}
          className="px-4 py-1.5 rounded-lg font-jost text-xs tracking-wide"
          style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          Let me reconsider
        </button>
      </div>
    </motion.div>
  )
}

export default function ScreeningPage() {
  const [screen, setScreen] = useState<Screen>('categories')
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null)
  const [active, setActive] = useState<QType | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [questionContexts, setQuestionContexts] = useState<string[]>([])
  const [expandedContext, setExpandedContext] = useState<Set<number>>(new Set())
  const [result, setResult] = useState<{ score: number; severityIdx: number; type: QType } | null>(null)
  const [aiSummary, setAiSummary] = useState<string>('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<{ type: QType; score: number; label: string }[]>([])
  // Tracks which (qi, val) nudges have been dismissed so we don't show them again
  const [dismissedNudges, setDismissedNudges] = useState<Set<number>>(new Set())
  const [activeNudge, setActiveNudge] = useState<{ qi: number; nudge: string } | null>(null)

  // Read ?test= from URL and auto-open that test
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const testKey = params.get('test') as QType | null
    if (testKey && Qs[testKey]) {
      // Find which category it belongs to and set it
      const catEntry = Object.entries(CATEGORIES).find(([, cat]) =>
        (cat.keys as string[]).includes(testKey)
      )
      if (catEntry) {
        setActiveCategory(catEntry[0] as CategoryKey)
      }
      start(testKey)
    }
  }, [])

  const q = active ? Qs[active] : null

  const goToCategory = (cat: CategoryKey) => { setActiveCategory(cat); setScreen('category') }

  const start = (type: QType) => {
    setActive(type)
    setAnswers(Array(Qs[type].questions.length).fill(-1))
    setQuestionContexts(Array(Qs[type].questions.length).fill(''))
    setExpandedContext(new Set())
    setDismissedNudges(new Set())
    setActiveNudge(null)
    setResult(null); setAiSummary('')
    setScreen('test')
  }

  const pick = (qi: number, val: number) => {
    setAnswers(prev => { const n = [...prev]; n[qi] = val; return n })

    // Check for socially safe answer
    if (active) {
      const flags = SAFE_ANSWER_FLAGS[active]
      if (flags && flags[qi] && !dismissedNudges.has(qi)) {
        const flag = flags[qi]
        if (val === flag.safeIdx) {
          setActiveNudge({ qi, nudge: flag.nudge })
        } else {
          // They chose a non-safe answer - dismiss any open nudge for this qi
          if (activeNudge?.qi === qi) setActiveNudge(null)
        }
      }
    }
  }

  const dismissNudge = (qi: number) => {
    setDismissedNudges(prev => {
      const next = new Set(prev)
      next.add(qi)
      return next
    })
    setActiveNudge(null)
  }

  const undoAnswer = (qi: number) => {
    setAnswers(prev => { const n = [...prev]; n[qi] = -1; return n })
    setActiveNudge(null)
  }

  const toggleContext = (qi: number) => {
    setExpandedContext(prev => { const n = new Set(prev); n.has(qi) ? n.delete(qi) : n.add(qi); return n })
  }

  const setCtx = (qi: number, val: string) => {
    setQuestionContexts(prev => { const n = [...prev]; n[qi] = val; return n })
  }

  const calcScore = (type: QType, ans: number[]): number => {
    const test = Qs[type] as any
    if (test.reversed) return ans.reduce((sum, v, i) => sum + (test.reversed.has(i) ? (3 - v) : v), 0)
    return ans.reduce((a, b) => a + b, 0)
  }

  const generateAiSummary = async (type: QType, score: number, severityLabel: string, ans: number[], ctxs: string[]) => {
    setSummaryLoading(true)
    const qd = Qs[type]
    const highItems = ans
      .map((a, i) => ({ question: qd.questions[i], score: a, context: ctxs[i], trait: qd.traits[i] }))
      .filter(item => item.score >= 2)
    const contextNotes = qd.questions
      .map((q, i) => ctxs[i]?.trim() ? `- "${q}": ${ctxs[i]}` : null)
      .filter(Boolean).join('\n')

    // Fun terminologies per test type
    const funFramework: Record<string, string> = {
      MOOD: 'Use one evocative phrase to name their emotional pattern (e.g. "running on fumes mode", "signal-to-noise collapse", "dimmer switch effect").',
      WORRY: 'Use one memorable term for their anxiety pattern (e.g. "background noise mode", "future-leaning brain", "threat-scouting habit").',
      SELFWORTH: 'Use one grounded metaphor for their self-relationship (e.g. "inner critic with a loud mic", "borrowed self-view", "mirror set at the wrong angle").',
      BIGFIVE: 'Describe their personality profile with one vivid phrase (e.g. "high-fidelity sensor", "structured explorer", "ambient empath").',
      ATTACHMENT: 'Name their relational pattern with a memorable term (e.g. "proximity calibration", "earned distance", "closeness-avoidance paradox").',
      EQ: 'Use one precise phrase to capture their emotional intelligence pattern.',
      STRESS: 'Name their coping style with one memorable phrase (e.g. "productive suppressor", "somatic stress carrier", "solo processor").',
      CAREERVALUES: 'Use one phrase to name what drives them at work.',
      WORKENVIRONMENT: 'Name their optimal work conditions with a short phrase.',
      LEADERSHIP: 'Name their natural work style with one crisp phrase.',
      BURNOUT: 'Use one honest phrase to name where they are (e.g. "running on reserve tank", "slow-drain depletion", "checked-in but not present").',
    }

    const prompt = `You are a warm, thoughtful psychological guide helping someone understand their results from a self-reflection questionnaire.

Test: ${qd.name} (${qd.full})
Overall result: ${score} points, described as "${severityLabel}"
What this test measures: ${qd.intro}

${highItems.length > 0
        ? `Areas the person scored higher on:\n${highItems.map(h =>
          `- "${h.question}" (relates to: ${h.trait})${h.context ? `, they noted: "${h.context}"` : ''}`
        ).join('\n')}`
        : 'No particularly high-scoring areas.'}

${contextNotes ? `\nPersonal context the person added:\n${contextNotes}` : ''}

Style instruction: ${funFramework[type] || 'Use one memorable term or metaphor to name their pattern.'}

Write a warm, honest, 3-paragraph personal reflection for them:
Paragraph 1: Reflect what this pattern says about where they are right now. Weave in their personal context naturally. ${funFramework[type]} Use it naturally in your prose, not as a header.
Paragraph 2: Point gently toward what seems to be going well and what is taking the most from them right now. No section headers. Just natural reflection.
Paragraph 3: Offer one or two gentle, practical ideas tailored to what they shared. End on agency and self-compassion.

Rules:
- Do not use em dashes anywhere
- Do not say "seek help" or give clinical directives
- Do not diagnose or use clinical labels
- Speak directly to them as "you"
- Explain the summary in simple terms that native English speakers understand and relate to. Do not use overtechnical jargon.
- Warm, human, slightly literary tone
- Under 240 words
- End on a note of agency and self-compassion`

    try {
      const text = await fetchSummary(prompt)
      const finalText = text || 'Unable to generate your summary right now.'
      setAiSummary(finalText)
      if (text) await saveSummaryToDashboard(qd.name, severityLabel, text)
    } catch {
      setAiSummary('Unable to generate your summary right now. Your results have been saved.')
    } finally { setSummaryLoading(false) }
  }

  const submit = async () => {
    if (!active || !q) return
    if (answers.some(a => a === -1)) { toast.error('Please answer all questions'); return }
    setLoading(true)
    try {
      const score = calcScore(active, answers)
      const idx = (() => { const i = q.scoring.findIndex(s => score <= s.max); return i === -1 ? q.scoring.length - 1 : i })()
      try { await screeningAPI.submit(active, answers, questionContexts) } catch { }
      setResult({ score, severityIdx: idx, type: active })
      setHistory(prev => [{ type: active, score, label: q.scoring[idx].label }, ...prev.slice(0, 4)])
      setScreen('result')
      generateAiSummary(active, score, q.scoring[idx].label, answers, questionContexts)
    } finally { setLoading(false) }
  }

  const answered = answers.filter(a => a !== -1).length
  const resultQ = result ? Qs[result.type] : null
  const severity = result && resultQ ? resultQ.scoring[result.severityIdx] : null

  return (
    <main className="bg-screening min-h-screen relative overflow-hidden">
      <ParticleCanvas colors={['#d4af37', '#c9897a', '#c4913a', '#b8860b']} count={22} />
      <Navigation />
      <div className="relative z-10 pt-24 pb-20 px-5 max-w-3xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="font-display font-light mb-3"
            style={{ fontSize: 'clamp(2.5rem,6vw,5rem)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Self <span className="font-display italic" style={{ fontWeight: 300 }}>Reflection</span>
          </h1>
          <p className="font-display italic text-lg" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>
            Thoughtful tools for understanding yourself better.
          </p>
          <div className="mt-4 mx-auto max-w-lg text-xs font-jost tracking-wide px-4 py-2 rounded-full"
            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            These results are a starting point for self-understanding, not a diagnosis.
          </div>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* CATEGORY SELECTOR */}
          {screen === 'categories' && (
            <motion.div key="cats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {history.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                  {history.map((h, i) => (
                    <span key={i} className="text-xs px-3 py-1.5 rounded-full font-jost"
                      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      {Qs[h.type].name}: <span style={{ color: Qs[h.type].color }}>{h.score}</span> · {h.label}
                    </span>
                  ))}
                </div>
              )}
              {(Object.entries(CATEGORIES) as [CategoryKey, typeof CATEGORIES[CategoryKey]][]).map(([key, cat], i) => (
                <motion.button key={key}
                  initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}
                  onClick={() => goToCategory(key)}
                  className="glass rounded-xl p-5 w-full text-left flex items-center gap-5"
                  style={{ border: `1px solid ${cat.color}28` }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center font-display text-2xl flex-shrink-0"
                    style={{ background: `${cat.color}12`, color: cat.color, border: `1.5px solid ${cat.color}28` }}>
                    {cat.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-gothic text-sm mb-0.5" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>{cat.label}</h3>
                    <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>{cat.subtitle}</p>
                    <p className="font-jost text-xs mt-1.5 tracking-widest uppercase" style={{ color: cat.color }}>
                      {cat.keys.length} {cat.keys.length === 1 ? 'CHECK' : 'CHECKS'} INSIDE
                    </p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* CATEGORY INNER */}
          {screen === 'category' && activeCategory && (
            <motion.div key="cat-inner" initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -22 }}>
              <button onClick={() => setScreen('categories')}
                className="mb-6 text-sm font-jost tracking-widest uppercase opacity-55 hover:opacity-100"
                style={{ color: 'var(--text-primary)' }}>
                Back
              </button>
              <div className="mb-6">
                <h2 className="font-gothic text-xl mb-1" style={{ color: CATEGORIES[activeCategory].color, letterSpacing: '0.08em' }}>
                  {CATEGORIES[activeCategory].label}
                </h2>
                <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>{CATEGORIES[activeCategory].subtitle}</p>
              </div>
              <div className="space-y-4">
                {CATEGORIES[activeCategory].keys.map((key, i) => {
                  const test = Qs[key]
                  return (
                    <motion.button key={key}
                      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
                      onClick={() => start(key)}
                      className="glass rounded-xl p-5 w-full text-left"
                      style={{ border: `1px solid ${test.color}28` }}>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${test.color}12`, border: `1.5px solid ${test.color}28` }}>
                          <span className="font-jost text-xs" style={{ color: test.color }}>{test.questions.length}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-gothic text-sm mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>{test.name}</h3>
                          <p className="font-body text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{test.full}</p>
                          <p className="font-jost text-xs" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{test.intro}</p>
                          <p className="font-jost text-xs mt-2 tracking-widest uppercase" style={{ color: test.color }}>BEGIN</p>
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* QUESTIONNAIRE */}
          {screen === 'test' && active && q && (
            <motion.div key="qn" initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -22 }}>
              <div className="flex items-center gap-4 mb-4">
                <button onClick={() => setScreen('category')}
                  className="text-sm font-jost tracking-widest uppercase opacity-55 hover:opacity-100"
                  style={{ color: 'var(--text-primary)' }}>
                  Back
                </button>
                <div>
                  <h2 className="font-gothic text-lg" style={{ color: q.color, letterSpacing: '0.1em' }}>{q.name}</h2>
                  <p className="font-body text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{q.desc}</p>
                </div>
              </div>
              <div className="mb-5 px-4 py-2.5 rounded-lg"
                style={{ background: `${q.color}08`, border: `1px solid ${q.color}18` }}>
                <p className="font-jost text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Each question has an optional context field. Use it to share anything that helps explain your answer.
                </p>
              </div>
              <div className="space-y-4">
                {q.questions.map((question, qi) => (
                  <motion.div key={qi} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: qi * 0.03 }}
                    className="glass rounded-xl p-5" style={{ border: '1px solid var(--border-subtle)' }}>
                    <p className="font-body text-base leading-relaxed mb-4" style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>
                      <span className="font-jost text-xs mr-2" style={{ color: 'var(--text-muted)' }}>{qi + 1}.</span>
                      {question}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {q.options.map((opt, oi) => (
                        <button key={oi} onClick={() => pick(qi, oi)}
                          className="px-3 py-2.5 rounded-lg font-jost tracking-wide transition-all duration-180 text-left"
                          style={{
                            fontSize: '0.8rem',
                            background: answers[qi] === oi ? `${q.color}18` : 'var(--bg-glass)',
                            border: answers[qi] === oi ? `1px solid ${q.color}45` : '1px solid var(--border-subtle)',
                            color: answers[qi] === oi ? q.color : 'var(--text-secondary)',
                          }}>
                          {opt}
                        </button>
                      ))}
                    </div>

                    {/* Socially safe nudge */}
                    <AnimatePresence>
                      {activeNudge?.qi === qi && (
                        <SafeAnswerNudge
                          nudge={activeNudge.nudge}
                          color={q.color}
                          onDismiss={() => dismissNudge(qi)}
                          onChange={() => undoAnswer(qi)}
                        />
                      )}
                    </AnimatePresence>

                    <button onClick={() => toggleContext(qi)}
                      className="flex items-center gap-1.5 font-jost tracking-wide transition-opacity hover:opacity-80 mt-2"
                      style={{ color: q.color, opacity: expandedContext.has(qi) ? 0.8 : 0.4, fontSize: '0.72rem' }}>
                      <span style={{ fontSize: '9px' }}>{expandedContext.has(qi) ? 'v' : '>'}</span>
                      {expandedContext.has(qi) ? 'Hide context' : 'Add context for this question (optional)'}
                    </button>
                    <AnimatePresence>
                      {expandedContext.has(qi) && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                          <textarea rows={2} value={questionContexts[qi]} onChange={e => setCtx(qi, e.target.value)}
                            placeholder={q.contextHints[qi] ?? 'Add any personal context...'}
                            className="w-full mt-2 p-3 rounded-lg resize-none font-body focus:outline-none"
                            style={{
                              background: 'var(--bg-glass)',
                              border: `1px solid ${q.color}22`,
                              color: 'var(--text-secondary)',
                              fontSize: '0.825rem',
                              lineHeight: '1.6',
                            }} />
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-jost)' }}>
                            Your context helps personalise your summary.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
              <div className="mt-7 flex items-center justify-between">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-jost)' }}>{answered}/{q.questions.length} answered</span>
                <motion.button onClick={submit} disabled={loading || answered < q.questions.length}
                  className="px-8 py-3 rounded-xl font-jost font-semibold tracking-widest uppercase disabled:opacity-40"
                  style={{ fontSize: '0.8rem', background: `linear-gradient(135deg,${q.color}28,${q.color}0e)`, border: `1px solid ${q.color}38`, color: 'var(--text-primary)' }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  {loading ? 'Thinking...' : 'See Reflection'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* RESULT */}
          {screen === 'result' && result && resultQ && severity && (
            <motion.div key="res" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="glass-strong rounded-2xl p-8" style={{ border: `1px solid ${severity.color}28` }}>
                <div className="text-center mb-6">
                  <motion.div className="font-display font-light mb-1"
                    style={{ fontSize: '5rem', color: severity.color, lineHeight: 1 }}
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 180 }}>
                    {result.score}
                  </motion.div>
                  <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>YOUR SCORE</p>
                  <div className="inline-block px-6 py-2 rounded-full font-gothic text-sm tracking-widest"
                    style={{ background: `${severity.color}14`, border: `1px solid ${severity.color}38`, color: severity.color }}>
                    {severity.label}
                  </div>
                </div>
                <p className="text-center font-body text-sm mb-6 mx-auto max-w-md"
                  style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {resultQ.intro}
                </p>
                <div className="rounded-xl p-5 mb-5" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                  <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
                    Your Personal Reflection
                  </p>
                  {summaryLoading ? (
                    <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: `${severity.color} transparent transparent transparent` }} />
                      <span className="font-body text-sm">Writing your reflection...</span>
                    </div>
                  ) : (
                    <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
                      {aiSummary}
                    </p>
                  )}
                </div>
                <p className="text-xs font-jost text-center mb-6" style={{ color: 'var(--text-muted)' }}>{resultQ.note}</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <motion.button onClick={() => { setScreen('categories'); setResult(null) }} whileHover={{ scale: 1.03 }}
                    className="px-6 py-3 rounded-xl font-jost text-sm tracking-widest uppercase glass"
                    style={{ border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                    All checks
                  </motion.button>
                  <motion.button onClick={() => { if (active) start(active) }} whileHover={{ scale: 1.03 }}
                    className="px-6 py-3 rounded-xl font-jost text-sm tracking-widest uppercase glass"
                    style={{ border: `1px solid ${severity.color}38`, color: severity.color }}>
                    Retake
                  </motion.button>
                  <motion.button onClick={() => window.location.href = '/chat'} whileHover={{ scale: 1.03 }}
                    className="px-6 py-3 rounded-xl font-jost text-sm tracking-widest uppercase"
                    style={{ background: `${severity.color}18`, border: `1px solid ${severity.color}38`, color: 'var(--text-primary)' }}>
                    Talk it through
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  )
}