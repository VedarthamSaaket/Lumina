'use client'
import { HANDS, INKS, PAPERS, PROMPTS, STAMPS, WASHI, type Decor, type PromptTemplate } from './ledgerLooks'

interface WritingFont { id: string; label: string; family: string; style: string }

function Label({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color, margin: '14px 0 8px' }}>
      {children}
    </p>
  )
}

export function PagePanel({ tb, paperId, inkId, fontId, fonts, onPaper, onInk, onFont }: {
  tb: any; paperId: string; inkId: string; fontId: string; fonts: WritingFont[]
  onPaper: (id: string) => void; onInk: (id: string) => void; onFont: (id: string) => void
}) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2px 14px 16px', scrollbarWidth: 'thin', scrollbarColor: `${tb.scrollColor} transparent` }}>
      <Label color={tb.labelColor}>Paper</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {PAPERS.map(p => (
          <button key={p.id} type="button" onClick={() => onPaper(p.id)} title={p.label}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{
              width: '100%', aspectRatio: '3 / 4', borderRadius: '5px',
              backgroundColor: p.color, backgroundImage: p.image, backgroundSize: p.size === 'auto' ? undefined : p.size.replace(/(\d+)px/g, (_, n) => `${Math.max(6, Math.round(Number(n) / 2.4))}px`),
              border: paperId === p.id ? `2px solid ${tb.activeItemColor}` : `1px solid ${tb.border}`,
              boxShadow: paperId === p.id ? '0 3px 10px -4px rgba(60,38,12,0.6)' : 'none',
            }} />
            <span style={{ fontFamily: 'var(--font-jost)', fontSize: '8.5px', color: paperId === p.id ? tb.panelBtnActiveColor : tb.panelBtnInactiveColor }}>{p.label}</span>
          </button>
        ))}
      </div>

      <Label color={tb.labelColor}>Ink</Label>
      <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
        {INKS.map(ink => (
          <button key={ink.id} type="button" onClick={() => onInk(ink.id)} title={ink.label} aria-label={ink.label}
            style={{
              width: '26px', height: '26px', borderRadius: '50%', cursor: 'pointer', background: ink.color,
              border: '2px solid rgba(255,248,232,0.9)',
              boxShadow: inkId === ink.id ? `0 0 0 2px ${tb.activeItemColor}` : `0 0 0 1px ${tb.border}`,
            }} />
        ))}
      </div>

      <Label color={tb.labelColor}>Hand</Label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {HANDS.map(hand => {
          const font = fonts.find(f => f.id === hand.id)
          if (!font) return null
          const active = fontId === hand.id
          return (
            <button key={hand.id} type="button" onClick={() => onFont(hand.id)}
              style={{
                padding: '8px 8px 7px', borderRadius: '9px', cursor: 'pointer', textAlign: 'left',
                background: active ? tb.panelBtnActiveBg : 'transparent',
                border: active ? `1px solid ${tb.panelBtnActiveBorder}` : `1px solid ${tb.iconBorder}`,
                color: active ? tb.panelBtnActiveColor : tb.panelBtnInactiveColor,
              }}>
              <span style={{ display: 'block', fontFamily: font.family, fontStyle: font.style as any, fontSize: '17px', lineHeight: 1.1 }}>Dear me</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-jost)', fontSize: '8.5px', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '4px', opacity: 0.85 }}>{hand.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function PromptsPanel({ tb, onPick }: { tb: any; onPick: (prompt: PromptTemplate) => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 16px', scrollbarWidth: 'thin', scrollbarColor: `${tb.scrollColor} transparent` }}>
      <p style={{ fontFamily: 'var(--font-eb-garamond)', fontStyle: 'italic', fontSize: '13px', lineHeight: 1.4, color: tb.labelColor, margin: '2px 2px 10px' }}>
        Not sure where to start? Pick one and it lands on your page.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {PROMPTS.map(prompt => (
          <button key={prompt.id} type="button" onClick={() => onPick(prompt)}
            style={{
              textAlign: 'left', padding: '10px 11px', borderRadius: '10px', cursor: 'pointer',
              background: tb.closeBtnBg, border: `1px solid ${tb.iconBorder}`, color: tb.panelBtnActiveColor,
            }}>
            <span style={{ display: 'block', fontFamily: "'Playfair Display', serif", fontSize: '14px', lineHeight: 1.15 }}>{prompt.label}</span>
            <span style={{ display: 'block', fontFamily: 'var(--font-jost)', fontSize: '9.5px', marginTop: '3px', color: tb.panelBtnInactiveColor }}>{prompt.hint}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function DecorPanel({ tb, onPick }: { tb: any; onPick: (decor: Decor) => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2px 14px 16px', scrollbarWidth: 'thin', scrollbarColor: `${tb.scrollColor} transparent` }}>
      <Label color={tb.labelColor}>Washi tape</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
        {WASHI.map(tape => (
          <button key={tape.id} type="button" onClick={() => onPick(tape)} title={tape.label}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block' }}>
            <img src={tape.url} alt={tape.label} style={{ width: '100%', height: 'auto', display: 'block', filter: 'drop-shadow(0 2px 3px rgba(60,38,12,0.25))' }} />
          </button>
        ))}
      </div>
      <Label color={tb.labelColor}>Stamps</Label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {STAMPS.map(item => (
          <button key={item.id} type="button" onClick={() => onPick(item)} title={item.label}
            style={{ background: 'rgba(255,250,238,0.6)', border: `1px solid ${tb.iconBorder}`, borderRadius: '10px', padding: '6px', cursor: 'pointer' }}>
            <img src={item.url} alt={item.label} style={{ width: '100%', height: 'auto', display: 'block', transform: 'rotate(-6deg)' }} />
          </button>
        ))}
      </div>
    </div>
  )
}
