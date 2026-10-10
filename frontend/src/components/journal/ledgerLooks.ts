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

const TORN = 'M6 0 L234 0 L240 6 L235 12 L240 18 L235 24 L240 30 L235 36 L234 40 L6 40 L0 34 L5 28 L0 22 L5 16 L0 10 L5 4 Z'

const tape = (base: string, pattern: string) =>
  svg(
    `<defs><clipPath id='c'><path d='${TORN}'/></clipPath></defs>` +
    `<g clip-path='url(#c)' opacity='0.9'><rect width='240' height='40' fill='${base}'/>${pattern}</g>`,
    240, 40,
  )

const stripes = (color: string) =>
  Array.from({ length: 18 }, (_, i) => `<rect x='${i * 16 - 20}' y='-10' width='7' height='70' fill='${color}' transform='rotate(25 ${i * 16} 20)'/>`).join('')

const dots = (color: string) =>
  Array.from({ length: 30 }, (_, i) => `<circle cx='${10 + (i % 15) * 16}' cy='${i < 15 ? 12 : 28}' r='3.2' fill='${color}'/>`).join('')

const gingham = (color: string) =>
  Array.from({ length: 12 }, (_, i) => `<rect x='${i * 20}' y='0' width='10' height='40' fill='${color}' opacity='0.45'/>`).join('') +
  `<rect x='0' y='0' width='240' height='10' fill='${color}' opacity='0.45'/><rect x='0' y='20' width='240' height='10' fill='${color}' opacity='0.45'/>`

const blossoms = (petal: string, heart: string) =>
  Array.from({ length: 8 }, (_, i) => {
    const cx = 16 + i * 30, cy = i % 2 ? 14 : 26
    const petals = [0, 72, 144, 216, 288].map(a => `<ellipse cx='${cx}' cy='${cy - 5}' rx='2.6' ry='4.4' fill='${petal}' transform='rotate(${a} ${cx} ${cy})'/>`).join('')
    return `${petals}<circle cx='${cx}' cy='${cy}' r='2' fill='${heart}'/>`
  }).join('')

const waves = (color: string) =>
  [10, 20, 30].map(y => `<path d='M0 ${y} ${Array.from({ length: 12 }, (_, i) => `q10 ${i % 2 ? 6 : -6} 20 0`).join(' ')}' fill='none' stroke='${color}' stroke-width='2'/>`).join('')

const stamp = (top: string, middle: string, color: string) =>
  svg(
    `<g fill='none' stroke='${color}' opacity='0.82'><circle cx='60' cy='60' r='54' stroke-width='3'/><circle cx='60' cy='60' r='46' stroke-width='1.2' stroke-dasharray='3 4'/></g>` +
    `<path id='a' d='M22 60 A38 38 0 0 1 98 60' fill='none'/>` +
    `<text font-family='Georgia, serif' font-size='11' letter-spacing='3' fill='${color}' opacity='0.85'><textPath href='#a' startOffset='50%' text-anchor='middle'>${top}</textPath></text>` +
    `<text x='60' y='70' text-anchor='middle' font-family='Georgia, serif' font-style='italic' font-size='19' fill='${color}' opacity='0.9'>${middle}</text>` +
    `<path d='M40 82 h40' stroke='${color}' stroke-width='1.2' opacity='0.7'/>`,
    120, 120,
  )

export const WASHI: Decor[] = [
  { id: 'washi-caramel', label: 'Caramel stripe', url: tape('#e8cfa0', stripes('#b98a4c')), scale: 2.6 },
  { id: 'washi-cocoa', label: 'Cocoa dots', url: tape('#6b4a30', dots('#f1dfbd')), scale: 2.6 },
  { id: 'washi-gingham', label: 'Cream gingham', url: tape('#f6ead2', gingham('#b0763c')), scale: 2.6 },
  { id: 'washi-blossom', label: 'Blossom', url: tape('#f3dccb', blossoms('#c9735a', '#8a3d1c')), scale: 2.6 },
  { id: 'washi-sage', label: 'Sage waves', url: tape('#d9dcc0', waves('#6f7f55')), scale: 2.6 },
  { id: 'washi-gold', label: 'Gold stripe', url: tape('#f5e2a8', stripes('#c9a13a')), scale: 2.6 },
  { id: 'washi-rust', label: 'Rust dots', url: tape('#b65f38', dots('#f6ead2')), scale: 2.6 },
  { id: 'washi-plum', label: 'Plum blossom', url: tape('#e6d3dd', blossoms('#7d4a6c', '#4d2b45')), scale: 2.6 },
]

export const STAMPS: Decor[] = [
  { id: 'stamp-today', label: 'Today', url: stamp('THE INNER LEDGER', 'today', '#8a3d1c'), scale: 1.5 },
  { id: 'stamp-grateful', label: 'Grateful', url: stamp('NOTE TO SELF', 'grateful', '#2f4a35'), scale: 1.5 },
  { id: 'stamp-proud', label: 'Proud of this', url: stamp('KEEP THIS ONE', 'proud', '#7a5a10'), scale: 1.5 },
  { id: 'stamp-rest', label: 'Rest day', url: stamp('PERMISSION GRANTED', 'rest', '#4d2b45'), scale: 1.5 },
]
