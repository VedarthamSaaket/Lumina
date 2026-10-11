export interface Paper {
  id: string
  label: string
  color: string
  image: string
  size: string
}

export interface Ink {
  id: string
  label: string
  color: string
}

export interface PromptTemplate {
  id: string
  label: string
  hint: string
  text: string
}

export interface Decor {
  id: string
  label: string
  url: string
  scale: number
  tile?: string
}

const RULE = 'rgba(120,84,36,0.22)'

export const PAPERS: Paper[] = [
  { id: 'dotted', label: 'Dotted', color: '#f5ead0', image: 'radial-gradient(circle, rgba(0,0,0,0.12) 1px, transparent 1px)', size: '18px 18px' },
  { id: 'lined', label: 'Lined', color: '#f5ead0', image: `linear-gradient(to bottom, transparent 23px, ${RULE} 24px)`, size: '100% 24px' },
  { id: 'grid', label: 'Grid', color: '#f5ead0', image: `linear-gradient(to right, ${RULE} 1px, transparent 1px), linear-gradient(to bottom, ${RULE} 1px, transparent 1px)`, size: '20px 20px' },
  { id: 'plain', label: 'Plain', color: '#f7efdc', image: 'none', size: 'auto' },
  { id: 'kraft', label: 'Kraft', color: '#d8bd90', image: 'repeating-linear-gradient(115deg, rgba(90,58,20,0.05) 0 2px, transparent 2px 7px)', size: 'auto' },
  { id: 'linen', label: 'Linen', color: '#efe4cd', image: 'repeating-linear-gradient(0deg, rgba(120,84,36,0.06) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgba(120,84,36,0.06) 0 1px, transparent 1px 4px)', size: 'auto' },
  { id: 'blush', label: 'Blush', color: '#f6e2d2', image: 'radial-gradient(circle, rgba(150,80,50,0.14) 1px, transparent 1px)', size: '18px 18px' },
  { id: 'latte', label: 'Latte', color: '#e9d6b6', image: `linear-gradient(to bottom, transparent 23px, rgba(90,58,20,0.2) 24px)`, size: '100% 24px' },
]

export const INKS: Ink[] = [
  { id: 'espresso', label: 'Espresso', color: 'rgba(35,20,5,0.88)' },
  { id: 'sepia', label: 'Sepia', color: '#6b4423' },
  { id: 'rust', label: 'Rust', color: '#8a3d1c' },
  { id: 'forest', label: 'Forest', color: '#2f4a35' },
  { id: 'plum', label: 'Plum', color: '#4d2b45' },
  { id: 'gold', label: 'Old Gold', color: '#7a5a10' },
]

export const HANDS = [
  { id: 'garamond', label: 'Classic' },
  { id: 'cormorant', label: 'Elegant' },
  { id: 'playfair', label: 'Editorial' },
  { id: 'dancing', label: 'Handwritten' },
  { id: 'tangerine', label: 'Calligraphy' },
  { id: 'josefin', label: 'Clean' },
  { id: 'fraunces', label: 'Storybook' },
  { id: 'lora', label: 'Letter' },
]

export const PROMPTS: PromptTemplate[] = [
  { id: 'good-things', label: 'Three good things', hint: 'Gratitude, the short way', text: 'Three good things today\n1. \n2. \n3. \n\nWhy they mattered: ' },
  { id: 'morning', label: 'Morning pages', hint: 'Set the tone before the day does', text: 'This morning I feel\n\nToday would be good if\n\nOne thing I will let go of: ' },
  { id: 'evening', label: 'Evening unwind', hint: 'Close the day gently', text: 'What went well today:\n\nWhat was hard:\n\nWhat I want to remember: ' },
  { id: 'brain-dump', label: 'Brain dump', hint: 'No order, no editing', text: 'Everything on my mind, no order, no editing:\n\n' },
  { id: 'worry', label: 'Untangle a worry', hint: 'Sort what you can act on', text: 'The worry:\n\nWhat I know for sure:\n\nWhat I can do about it today:\n\nWhat I can leave for later: ' },
  { id: 'letter', label: 'Letter to myself', hint: 'Write to you, kindly', text: 'Dear me,\n\n' },
  { id: 'wins', label: 'Small wins', hint: 'Evidence that you moved', text: 'Small wins this week\n- \n- \n- ' },
  { id: 'one-line', label: 'One line a day', hint: 'A single honest sentence', text: 'Today in one line: ' },
]

const svg = (body: string, w: number, h: number) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}`

const TAPE_W = 240
const TAPE_H = 64

const pinked = (() => {
  const teeth = 8
  const step = TAPE_H / teeth
  let right = ''
  let left = ''
  for (let i = 0; i < teeth; i++) {
    right += ` L${TAPE_W} ${i * step + step / 2} L${TAPE_W - 6} ${(i + 1) * step}`
    left += ` L0 ${TAPE_H - (i * step + step / 2)} L6 ${TAPE_H - (i + 1) * step}`
  }
  return `M6 0 L${TAPE_W - 6} 0${right} L6 ${TAPE_H}${left} Z`
})()

const tapeBody = (base: string, edge: string, pattern: string) =>
  `<rect width='${TAPE_W}' height='${TAPE_H}' fill='${base}'/>${pattern}` +
  `<rect width='${TAPE_W}' height='7' fill='${edge}'/><rect y='${TAPE_H - 7}' width='${TAPE_W}' height='7' fill='${edge}'/>` +
  `<rect y='10' width='${TAPE_W}' height='1.4' fill='${edge}' opacity='0.7'/><rect y='${TAPE_H - 11.4}' width='${TAPE_W}' height='1.4' fill='${edge}' opacity='0.7'/>` +
  `<rect width='${TAPE_W}' height='${TAPE_H}' fill='url(#g)'/>`

const TAPE_SHEEN = `<linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='0.28'/><stop offset='0.45' stop-color='#fff' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='0.08'/></linearGradient>`

const tape = (base: string, edge: string, pattern: string) =>
  svg(
    `<defs><clipPath id='c'><path d='${pinked}'/></clipPath>${TAPE_SHEEN}</defs>` +
    `<g clip-path='url(#c)'>${tapeBody(base, edge, pattern)}</g>` +
    `<path d='${pinked}' fill='none' stroke='${edge}' stroke-width='1.6' stroke-linejoin='round'/>`,
    TAPE_W, TAPE_H,
  )

const tapeTile = (base: string, edge: string, pattern: string) =>
  svg(`<defs>${TAPE_SHEEN}</defs>${tapeBody(base, edge, pattern)}`, TAPE_W, TAPE_H)

const washi = (id: string, label: string, base: string, edge: string, pattern: string): Decor =>
  ({ id, label, url: tape(base, edge, pattern), tile: tapeTile(base, edge, pattern), scale: 3 })

export const TAPE_CLIP = (() => {
  const teeth = 8
  const right = Array.from({ length: teeth }, (_, i) => `100% ${((i + 0.5) / teeth) * 100}%, calc(100% - 4px) ${((i + 1) / teeth) * 100}%`)
  const left = Array.from({ length: teeth }, (_, i) => `0 ${(1 - (i + 0.5) / teeth) * 100}%, 4px ${(1 - (i + 1) / teeth) * 100}%`)
  return `polygon(4px 0, calc(100% - 4px) 0, ${right.join(', ')}, ${left.join(', ')})`
})()

const stripes = (color: string) =>
  Array.from({ length: 22 }, (_, k) => k - 3).map(i => `<rect x='${i * 20 - 30}' y='-20' width='9' height='110' fill='${color}' transform='rotate(28 ${i * 20} 32)'/>`).join('')

const dots = (color: string) =>
  Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 14 }, (_, i) => `<circle cx='${(row % 2 ? 0 : -10) + i * 20}' cy='${20 + row * 12}' r='3.4' fill='${color}'/>`).join('')
  ).join('')

const gingham = (color: string) =>
  Array.from({ length: 10 }, (_, i) => `<rect x='${i * 24}' y='0' width='12' height='${TAPE_H}' fill='${color}' opacity='0.4'/>`).join('') +
  [14, 36].map(y => `<rect x='0' y='${y}' width='${TAPE_W}' height='11' fill='${color}' opacity='0.4'/>`).join('')

const blossoms = (petal: string, heart: string) =>
  Array.from({ length: 8 }, (_, i) => {
    const cx = 15 + i * 30
    const cy = i % 2 ? 24 : 41
    const petals = [0, 72, 144, 216, 288].map(a => `<ellipse cx='${cx}' cy='${cy - 6.5}' rx='3.4' ry='5.6' fill='${petal}' transform='rotate(${a} ${cx} ${cy})'/>`).join('')
    return `${petals}<circle cx='${cx}' cy='${cy}' r='2.6' fill='${heart}'/>`
  }).join('')

const vine = (stem: string, leaf: string) =>
  `<path d='M0 32 ${Array.from({ length: 8 }, (_, i) => `q15 ${i % 2 ? 12 : -12} 30 0`).join(' ')}' fill='none' stroke='${stem}' stroke-width='2'/>` +
  Array.from({ length: 8 }, (_, i) => {
    const x = 15 + i * 30
    const up = i % 2 === 0
    return `<ellipse cx='${x}' cy='${up ? 21 : 43}' rx='4' ry='8' fill='${leaf}' transform='rotate(${up ? 35 : -35} ${x} ${up ? 21 : 43})'/>`
  }).join('')

const scallops = (color: string) =>
  [18, 32, 46].map((y, row) =>
    Array.from({ length: 13 }, (_, i) => `<path d='M${(row % 2 ? -10 : 0) + i * 20} ${y} a10 10 0 0 0 20 0' fill='none' stroke='${color}' stroke-width='2'/>`).join('')
  ).join('')

const diamonds = (color: string, line: string) =>
  Array.from({ length: 9 }, (_, i) => `<path d='M${i * 30 - 3} 32 l15 -17 l15 17 l-15 17 Z' fill='${color}'/>`).join('') +
  `<path d='M0 15 ${Array.from({ length: 8 }, () => 'l15 17 l15 -17').join(' ')}' fill='none' stroke='${line}' stroke-width='1.2'/>` +
  `<path d='M0 49 ${Array.from({ length: 8 }, () => 'l15 -17 l15 17').join(' ')}' fill='none' stroke='${line}' stroke-width='1.2'/>`

const chevrons = (color: string) =>
  [22, 32, 42].map(y => `<path d='M0 ${y + 4} ${Array.from({ length: 12 }, () => 'l10 -8 l10 8').join(' ')}' fill='none' stroke='${color}' stroke-width='2.4' stroke-linejoin='round'/>`).join('')

const waves = (color: string) =>
  [22, 32, 42].map(y => `<path d='M0 ${y} ${Array.from({ length: 4 }, () => 'q15 -9 30 0 q15 9 30 0').join(' ')}' fill='none' stroke='${color}' stroke-width='2.2'/>`).join('')

const checker = (color: string) =>
  [14, 26, 38].map((y, row) =>
    Array.from({ length: 10 }, (_, i) => `<rect x='${(row % 2 ? 12 : 0) + i * 24}' y='${y}' width='12' height='12' fill='${color}' opacity='0.72'/>`).join('')
  ).join('')

const hearts = (color: string) =>
  Array.from({ length: 8 }, (_, i) => {
    const cx = 15 + i * 30
    const cy = i % 2 ? 26 : 38
    return `<path d='M${cx} ${cy + 6} C${cx - 10} ${cy - 1} ${cx - 6} ${cy - 8} ${cx} ${cy - 3} C${cx + 6} ${cy - 8} ${cx + 10} ${cy - 1} ${cx} ${cy + 6} Z' fill='${color}'/>`
  }).join('')

const stars = (color: string) =>
  Array.from({ length: 8 }, (_, i) => {
    const cx = 15 + i * 30
    const cy = i % 2 ? 25 : 39
    const r = i % 2 ? 7 : 5
    return `<path d='M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z' fill='${color}'/>`
  }).join('')

const pinstripe = (color: string) =>
  [19, 25.5, 32, 38.5, 45].map(y => `<rect y='${y - 0.8}' width='${TAPE_W}' height='1.6' fill='${color}'/>`).join('')

const leaves = (color: string) =>
  `<rect y='31.4' width='${TAPE_W}' height='1.2' fill='${color}'/>` +
  Array.from({ length: 10 }, (_, i) => {
    const cx = 12 + i * 24
    return `<ellipse cx='${cx}' cy='32' rx='4' ry='9' fill='${color}' transform='rotate(${i % 2 ? -35 : 35} ${cx} 32)'/>`
  }).join('')

const crosses = (color: string) =>
  [24, 40].map((cy, row) =>
    Array.from({ length: 13 }, (_, i) => {
      const cx = (row % 2 ? 0 : 10) + i * 20
      return `<rect x='${cx - 4}' y='${cy - 1}' width='8' height='2' fill='${color}'/><rect x='${cx - 1}' y='${cy - 4}' width='2' height='8' fill='${color}'/>`
    }).join('')
  ).join('')

const bunting = (first: string, second: string) =>
  Array.from({ length: 10 }, (_, i) => `<path d='M${i * 24} 12 h24 l-12 22 Z' fill='${i % 2 ? second : first}'/>`).join('')

const polka = (big: string, small: string) =>
  Array.from({ length: 6 }, (_, i) => `<circle cx='${20 + i * 40}' cy='32' r='7' fill='${big}'/>`).join('') +
  Array.from({ length: 7 }, (_, i) => `<circle cx='${i * 40}' cy='22' r='2.6' fill='${small}'/><circle cx='${i * 40}' cy='42' r='2.6' fill='${small}'/>`).join('')

export const WASHI: Decor[] = [
  washi('washi-caramel', 'Caramel stripe', '#f1dcb4', '#a8743a', stripes('#cfa468')),
  washi('washi-cocoa', 'Cocoa dots', '#6b4a30', '#3d2716', dots('#f1dfbd')),
  washi('washi-gingham', 'Cream gingham', '#f8eed8', '#a8743a', gingham('#b98350')),
  washi('washi-blossom', 'Blossom', '#f6e1d2', '#b65f38', blossoms('#cf7a5e', '#8a3d1c')),
  washi('washi-vine', 'Olive vine', '#ece6c8', '#6f7f55', vine('#6f7f55', '#8fa06f')),
  washi('washi-scallop', 'Gold scallop', '#f7e7b8', '#b08a2a', scallops('#b08a2a')),
  washi('washi-argyle', 'Rust argyle', '#f1d3bd', '#8a3d1c', diamonds('#c97a52', '#8a3d1c')),
  washi('washi-plum', 'Plum blossom', '#ecdbe3', '#5f3554', blossoms('#8a5a7a', '#4d2b45')),
  washi('washi-chevron', 'Mocha chevron', '#ead9bd', '#7a5230', chevrons('#7a5230')),
  washi('washi-wave', 'Honey wave', '#f7e9c4', '#b8862e', waves('#c99a3c')),
  washi('washi-checker', 'Espresso check', '#f3e6cf', '#4a2f1c', checker('#4a2f1c')),
  washi('washi-hearts', 'Rose hearts', '#f8e4dc', '#a8504a', hearts('#c66a60')),
  washi('washi-stars', 'Midnight stars', '#3b2a3f', '#241728', stars('#f1d98a')),
  washi('washi-pinstripe', 'Latte pinstripe', '#efdcbc', '#8a6238', pinstripe('#a87a48')),
  washi('washi-leaf', 'Sage leaf', '#e8ecd6', '#5d7049', leaves('#7d9163')),
  washi('washi-cross', 'Terracotta cross', '#f4d9c4', '#a2532c', crosses('#b8663a')),
  washi('washi-bunting', 'Bunting', '#fbf1dc', '#9a6a34', bunting('#c98a4a', '#8a3d1c')),
  washi('washi-polka', 'Caramel polka', '#f6e3bf', '#9c6b2f', polka('#c8924a', '#8a5a24')),
]
