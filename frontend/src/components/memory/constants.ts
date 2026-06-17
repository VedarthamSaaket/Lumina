import { MemoryGameId, GameConfig, PuzzleGameId, PuzzleConfig, SeqMode, GameId } from './types'

// Colors
export const SAGE = '#7A9E7E'
export const GOLD = '#D4AF37'
export const MUTED = '#C9897A'
export const STEEL = '#5B9BD5'
export const WARM = '#C4913A'
export const GOLD2 = '#B8860B'

// Constants
export const ROUNDS_PER_LEVEL = 5
export const MAX_CONSEC = 3
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

// Sequence Memory Games
export const GAMES: Record<MemoryGameId, GameConfig> = {
  digit: {
    id: 'digit',
    icon: '8',
    color: GOLD,
    title: 'Number Sequence',
    subtitle: 'Hold and recall sequences of digits',
    desc: 'A sequence of numbers appears one at a time. Each level has 5 rounds of increasing difficulty. Recall them in the requested order: forward, reverse, sorted, or filtered. Sequences grow longer and modes get harder across levels.',
    psych: 'Measures verbal working memory and mental manipulation of numeric sequences.',
    modes: ['forward', 'reverse', 'ascending', 'descending', 'odd_only', 'even_only'],
  },
  letter: {
    id: 'letter',
    icon: 'A',
    color: '#9b7fd4',
    title: 'Letter Sequence',
    subtitle: 'Hold and recall sequences of letters',
    desc: 'Like Number Sequence, but with letters. Each level has 5 rounds of escalating length and mode complexity. Recall them forward, in reverse, or alphabetically sorted.',
    psych: 'Measures verbal working memory with semantic rather than numeric material.',
    modes: ['forward', 'reverse', 'ascending', 'descending'],
  },
  math: {
    id: 'math',
    icon: '∑',
    color: SAGE,
    title: 'Math Patterns',
    subtitle: 'Spot the rule and predict the next number',
    desc: 'A sequence of numbers follows a hidden rule. Figure out the pattern and type what comes next. Each level has 5 rounds with increasing pattern complexity. No two sequences are ever alike.',
    psych: 'Measures pattern recognition, fluid reasoning, and numerical working memory.',
    modes: [],
  },
  color: {
    id: 'color',
    icon: '◉',
    color: MUTED,
    title: 'Color Pattern',
    subtitle: 'Remember and reproduce a color sequence',
    desc: 'A sequence of colors flashes in order. Tap them back in the same order. Each level has 5 rounds growing longer and faster. Colors are never repeated in the same position across rounds.',
    psych: 'Measures visuospatial working memory with color-based encoding.',
    modes: [],
  },
  spatial: {
    id: 'spatial',
    icon: '+',
    color: STEEL,
    title: 'Pattern Memory',
    subtitle: 'Remember which cells lit up and tap them back',
    desc: 'Cells on a grid light up one at a time. Tap the same cells in the same order. Each level has 5 rounds, patterns grow longer and flash faster. No pattern repeats.',
    psych: 'Measures visuospatial working memory - how your brain stores and retrieves spatial information.',
    modes: [],
  },
  spatial_reverse: {
    id: 'spatial_reverse',
    icon: '⤢',
    color: WARM,
    title: 'Reverse Spatial',
    subtitle: 'Tap the cells back in reverse order',
    desc: 'Identical to Pattern Memory, but you must tap the cells back in reverse order. 5 rounds per level, escalating within each level.',
    psych: 'Measures visuospatial working memory with backward recall - a more demanding variant.',
    modes: [],
  },
  word: {
    id: 'word',
    icon: 'W',
    color: WARM,
    title: 'Word Recall',
    subtitle: 'Build and recall a growing list of words',
    desc: 'Words appear one by one. Each round adds a new word to the previous list. Success requires recalling ONLY the exact words in the current set. Typing extra words or words from previous rounds that aren\'t currently shown will count as an error.',
    psych: 'Measures semantic memory and interference resolution.',
    modes: [],
  },
}

// Puzzle Games (Fluid Intelligence)
export const PUZZLE_GAMES: Record<PuzzleGameId, PuzzleConfig> = {
  matrix: {
    id: 'matrix',
    icon: '⊞',
    color: GOLD,
    title: 'Matrix Reasoning',
    subtitle: 'Find the missing piece in the pattern grid',
    desc: 'A 3×3 grid of shapes follows a hidden rule. The bottom-right cell is missing. Study the patterns across rows and columns to find what belongs there. 5 rounds per level, each round adds a new layer of rule complexity.',
    psych: 'Measures fluid intelligence and abstract pattern recognition.',
  },
  oddoneout: {
    id: 'oddoneout',
    icon: '◉',
    color: MUTED,
    title: 'Odd One Out',
    subtitle: 'Find the shape that doesn\'t belong',
    desc: 'Five shapes are shown. Four share something in common. One doesn\'t. 5 rounds per level, attributes compound as levels rise (shape, fill, size, rotation, color, multi-attribute).',
    psych: 'Measures perceptual discrimination and inductive reasoning.',
  },
  series: {
    id: 'series',
    icon: '→',
    color: STEEL,
    title: 'Series Completion',
    subtitle: 'What shape comes next in the sequence?',
    desc: 'A row of shapes follows a rule. Select what logically continues the sequence. 5 rounds per level, rules start simple (fill cycle) and escalate to triple-compound transformations.',
    psych: 'Measures sequential reasoning and rule induction.',
  },
  analogy: {
    id: 'analogy',
    icon: '∴',
    color: WARM,
    title: 'Visual Analogy',
    subtitle: 'B corresponds to A as D corresponds to C',
    desc: 'Two shapes share a relationship. Apply the same transformation to a third. 5 rounds per level, analogies escalate from single to triple-attribute transforms.',
    psych: 'Measures analogical reasoning and relational thinking.',
  },
  paperfold: {
    id: 'paperfold',
    icon: '◱',
    color: GOLD2,
    title: 'Paper Folding',
    subtitle: 'Where do the holes appear when unfolded?',
    desc: 'A square paper is folded and a hole is punched. When unfolded, which image shows the correct holes? Early levels: 1 fold. Later levels: 2 folds with tighter margins.',
    psych: 'Measures visuospatial transformation and mental folding ability.',
  },
}

export const isPuzzleId = (id: string): id is PuzzleGameId => id in PUZZLE_GAMES

// Mode Labels
export const MODE_LABELS: Record<SeqMode, string> = {
  forward: 'Forward order',
  reverse: 'Reverse order',
  ascending: 'Ascending (low -> high)',
  descending: 'Descending (high -> low)',
  odd_only: 'Odd digits only',
  even_only: 'Even digits only',
}

// Data Banks
export const COLORS = [
  { name: 'Crimson', hex: '#DC143C', text: '#fff' },
  { name: 'Cobalt', hex: '#0047AB', text: '#fff' },
  { name: 'Emerald', hex: '#009B77', text: '#fff' },
  { name: 'Amber', hex: '#FFBF00', text: '#1a1200' },
  { name: 'Violet', hex: '#7F00FF', text: '#fff' },
  { name: 'Tangerine', hex: '#F28500', text: '#fff' },
  { name: 'Rose', hex: '#FF007F', text: '#fff' },
  { name: 'Teal', hex: '#008080', text: '#fff' },
  { name: 'Gold', hex: '#D4AF37', text: '#1a1200' },
  { name: 'Indigo', hex: '#4B0082', text: '#fff' },
  { name: 'Jade', hex: '#00A878', text: '#fff' },
  { name: 'Scarlet', hex: '#FF2400', text: '#fff' },
] as const

export const WORD_BANK = [
  'river', 'candle', 'mirror', 'window', 'silver', 'carpet', 'shadow', 'garden', 'forest', 'lantern',
  'bottle', 'pencil', 'bridge', 'anchor', 'velvet', 'marble', 'copper', 'feather', 'thunder', 'crystal',
  'bamboo', 'falcon', 'temple', 'harbor', 'mosaic', 'prism', 'ember', 'cipher', 'spiral', 'zenith',
  'dusk', 'echo', 'fable', 'gravel', 'hollow', 'jasper', 'kindle', 'lagoon', 'mantle', 'nectar',
  'obsidian', 'parchment', 'quartz', 'riddle', 'sunset', 'tallow', 'umber', 'vortex', 'willow', 'zephyr',
  'atlas', 'beacon', 'citadel', 'dagger', 'eclipse', 'fjord', 'glacier', 'haven', 'iris', 'jubilee',
  'karst', 'lupine', 'meridian', 'nova', 'oracle', 'phantom', 'relic', 'solstice', 'tundra', 'utopia',
  'verdi', 'warden', 'xenon', 'yonder', 'zonal', 'arbor', 'brume', 'cornice', 'deluge', 'effigy',
] as const

export const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

// Game groups for selector
export const GAME_GROUPS = [
  { label: 'Sequence Memory', ids: ['digit', 'letter', 'math'] as MemoryGameId[] },
  { label: 'Visual Memory', ids: ['color', 'spatial', 'spatial_reverse'] as MemoryGameId[] },
  { label: 'Verbal Memory', ids: ['word'] as MemoryGameId[] },
] as const