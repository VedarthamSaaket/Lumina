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

const tape = (base: string, edge: string, pattern: string) =>
  svg(
    `<defs><clipPath id='c'><path d='${pinked}'/></clipPath>` +
    `<linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='0.28'/><stop offset='0.45' stop-color='#fff' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='0.08'/></linearGradient></defs>` +
    `<g clip-path='url(#c)'><rect width='${TAPE_W}' height='${TAPE_H}' fill='${base}'/>${pattern}` +
    `<rect width='${TAPE_W}' height='7' fill='${edge}'/><rect y='${TAPE_H - 7}' width='${TAPE_W}' height='7' fill='${edge}'/>` +
    `<rect y='10' width='${TAPE_W}' height='1.4' fill='${edge}' opacity='0.7'/><rect y='${TAPE_H - 11.4}' width='${TAPE_W}' height='1.4' fill='${edge}' opacity='0.7'/>` +
    `<rect width='${TAPE_W}' height='${TAPE_H}' fill='url(#g)'/></g>` +
    `<path d='${pinked}' fill='none' stroke='${edge}' stroke-width='1.6' stroke-linejoin='round'/>`,
    TAPE_W, TAPE_H,
  )

const stripes = (color: string) =>
  Array.from({ length: 16 }, (_, i) => `<rect x='${i * 20 - 30}' y='-20' width='9' height='110' fill='${color}' transform='rotate(28 ${i * 20} 32)'/>`).join('')

const dots = (color: string) =>
  Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 13 }, (_, i) => `<circle cx='${(row % 2 ? 20 : 10) + i * 20}' cy='${20 + row * 12}' r='3.4' fill='${color}'/>`).join('')
  ).join('')

const gingham = (color: string) =>
  Array.from({ length: 12 }, (_, i) => `<rect x='${i * 22}' y='0' width='11' height='${TAPE_H}' fill='${color}' opacity='0.4'/>`).join('') +
  [14, 36].map(y => `<rect x='0' y='${y}' width='${TAPE_W}' height='11' fill='${color}' opacity='0.4'/>`).join('')

const blossoms = (petal: string, heart: string) =>
  Array.from({ length: 9 }, (_, i) => {
    const cx = 14 + i * 27
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

const ring = (color: string, icon: string) =>
  svg(
    `<g fill='none' stroke='${color}' stroke-linecap='round' stroke-linejoin='round' opacity='0.86'>` +
    `<circle cx='60' cy='60' r='53' stroke-width='3.2'/><circle cx='60' cy='60' r='45' stroke-width='1.3' stroke-dasharray='2.5 4.5'/>${icon}</g>`,
    120, 120,
  )

const SUN = `<circle cx='60' cy='60' r='12' stroke-width='3'/>` +
  Array.from({ length: 12 }, (_, i) => `<path d='M60 ${i % 2 ? 38 : 34} V${i % 2 ? 42 : 41}' stroke-width='3' transform='rotate(${i * 30} 60 60)'/>`).join('')
const MOON = `<path d='M70 38 a24 24 0 1 0 12 40 a19 19 0 0 1 -12 -40 Z' stroke-width='3'/><path d='M44 44 v6 M41 47 h6' stroke-width='2.2'/><circle cx='52' cy='70' r='1.6' stroke-width='2.2'/>`
const SPRIG = `<path d='M60 86 C60 66 60 50 60 34' stroke-width='2.8'/>` +
  [40, 52, 64, 76].map((y, i) => `<path d='M60 ${y} q${i % 2 ? 16 : -16} -3 ${i % 2 ? 19 : -19} -15 q${i % 2 ? -15 : 15} 1 ${i % 2 ? -19 : 19} 15 Z' stroke-width='2.4'/>`).join('')
const HEART = `<path d='M60 82 C36 66 38 42 52 42 c5 0 8 4 8 8 c0 -4 3 -8 8 -8 c14 0 16 24 -8 40 Z' stroke-width='3'/><path d='M60 70 C50 62 50 53 55 52' stroke-width='2'/>`
const SPIRAL = `<path d='M60 60 m0 -3 a3 3 0 0 1 3 3 a7 7 0 0 1 -7 7 a11 11 0 0 1 -11 -11 a15 15 0 0 1 15 -15 a19 19 0 0 1 19 19 a23 23 0 0 1 -23 23' stroke-width='3'/>`
const HILLS = `<path d='M30 74 q15 -22 30 0 q15 -22 30 0' stroke-width='3'/><path d='M34 84 h52' stroke-width='2.4'/><circle cx='60' cy='44' r='7' stroke-width='2.8'/>`

export const WASHI: Decor[] = [
  { id: 'washi-caramel', label: 'Caramel stripe', url: tape('#f1dcb4', '#a8743a', stripes('#cfa468')), scale: 3 },
  { id: 'washi-cocoa', label: 'Cocoa dots', url: tape('#6b4a30', '#3d2716', dots('#f1dfbd')), scale: 3 },
  { id: 'washi-gingham', label: 'Cream gingham', url: tape('#f8eed8', '#a8743a', gingham('#b98350')), scale: 3 },
  { id: 'washi-blossom', label: 'Blossom', url: tape('#f6e1d2', '#b65f38', blossoms('#cf7a5e', '#8a3d1c')), scale: 3 },
  { id: 'washi-vine', label: 'Olive vine', url: tape('#ece6c8', '#6f7f55', vine('#6f7f55', '#8fa06f')), scale: 3 },
  { id: 'washi-scallop', label: 'Gold scallop', url: tape('#f7e7b8', '#b08a2a', scallops('#b08a2a')), scale: 3 },
  { id: 'washi-argyle', label: 'Rust argyle', url: tape('#f1d3bd', '#8a3d1c', diamonds('#c97a52', '#8a3d1c')), scale: 3 },
  { id: 'washi-plum', label: 'Plum blossom', url: tape('#ecdbe3', '#5f3554', blossoms('#8a5a7a', '#4d2b45')), scale: 3 },
]

export const STAMPS: Decor[] = [
  { id: 'stamp-sun', label: 'Sun', url: ring('#a8601e', SUN), scale: 1.5 },
  { id: 'stamp-moon', label: 'Moon', url: ring('#4d2b45', MOON), scale: 1.5 },
  { id: 'stamp-sprig', label: 'Sprig', url: ring('#2f4a35', SPRIG), scale: 1.5 },
  { id: 'stamp-heart', label: 'Heart', url: ring('#8a3d1c', HEART), scale: 1.5 },
  { id: 'stamp-spiral', label: 'Spiral', url: ring('#7a5a10', SPIRAL), scale: 1.5 },
  { id: 'stamp-hills', label: 'Hills', url: ring('#5c3d28', HILLS), scale: 1.5 },
]
