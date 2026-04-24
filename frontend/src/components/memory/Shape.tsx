'use client'
import { GOLD } from './constants'

type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'pentagon' | 'cross' | 'star' | 'hexagon'
type Fill = 'empty' | 'half' | 'full' | 'dots'

interface ShapeProps {
  type: ShapeType
  fill: Fill
  size?: number
  color?: string
  rotate?: number
  strokeWidth?: number
}

export function Shape({ type, fill, size = 40, color = GOLD, rotate = 0, strokeWidth = 2 }: ShapeProps) {
  const c = size / 2
  const r = size * 0.38

  const fillColor = fill === 'full' ? color : fill === 'half' ? color : 'none'
  const fillOpacity = fill === 'full' ? 1 : fill === 'half' ? 0.45 : 0
  const dotsPattern = fill === 'dots'

  const paths: Record<ShapeType, string> = {
    circle: '',
    square: `M${c - r},${c - r} h${r * 2} v${r * 2} h${-r * 2}Z`,
    triangle: `M${c},${c - r} L${c + r * 0.9},${c + r * 0.7} L${c - r * 0.9},${c + r * 0.7}Z`,
    diamond: `M${c},${c - r} L${c + r * 0.7},${c} L${c},${c + r} L${c - r * 0.7},${c}Z`,
    pentagon: (() => {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 - 90) * Math.PI / 180
        return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`
      })
      return `M${pts[0]} L${pts.slice(1).join(' L')}Z`
    })(),
    cross: `M${c - r * 0.28},${c - r} h${r * 0.56} v${r * 0.72} h${r * 0.72} v${r * 0.56} h${-r * 0.72} v${r * 0.72} h${-r * 0.56} v${-r * 0.72} h${-r * 0.72} v${-r * 0.56} h${r * 0.72}Z`,
    star: (() => {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (i * 36 - 90) * Math.PI / 180
        const rad = i % 2 === 0 ? r : r * 0.45
        return `${c + rad * Math.cos(a)},${c + rad * Math.sin(a)}`
      })
      return `M${pts[0]} L${pts.slice(1).join(' L')}Z`
    })(),
    hexagon: (() => {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 - 30) * Math.PI / 180
        return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`
      })
      return `M${pts[0]} L${pts.slice(1).join(' L')}Z`
    })(),
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: `rotate(${rotate}deg)`, display: 'block', flexShrink: 0 }}>
      {dotsPattern && (
        <defs>
          <pattern id={`dots-${color.replace('#', '')}`} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.2" fill={color} />
          </pattern>
        </defs>
      )}
      {type === 'circle' ? (
        <circle cx={c} cy={c} r={r}
          fill={dotsPattern ? `url(#dots-${color.replace('#', '')})` : fillColor}
          fillOpacity={dotsPattern ? 1 : fillOpacity}
          stroke={color} strokeWidth={strokeWidth} />
      ) : (
        <path d={paths[type]}
          fill={dotsPattern ? `url(#dots-${color.replace('#', '')})` : fillColor}
          fillOpacity={dotsPattern ? 1 : fillOpacity}
          stroke={color} strokeWidth={strokeWidth} />
      )}
      {fill === 'half' && type !== 'circle' && (
        <line x1={c} y1={c - r} x2={c} y2={c + r} stroke={color} strokeWidth={strokeWidth * 0.7} opacity={0.4} />
      )}
    </svg>
  )
}

interface ShapeCellProps {
  children?: React.ReactNode
  size?: number
  highlighted?: boolean
  selected?: boolean
  correctAnswer?: boolean
  onClick?: () => void
  color?: string
}

export function ShapeCell({ children, size = 56, highlighted = false, selected = false, correctAnswer = false, onClick, color = GOLD }: ShapeCellProps) {
  return (
    <div
      onClick={onClick}
      className="rounded-lg cursor-pointer transition-all duration-200"
      style={{
        width: size,
        height: size,
        background: highlighted ? `${color}25` : selected ? `${color}18` : 'rgba(255,255,255,0.04)',
        border: `2px solid ${correctAnswer ? '#22c55e' : selected ? color : 'rgba(255,255,255,0.08)'}`,
        boxShadow: highlighted ? `0 0 20px ${color}30` : selected ? `0 0 12px ${color}25` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  )
}

export type { ShapeType, Fill }