import { GOLD2 } from '../types'

export function PaperFoldSVG({ size = 120, dots, highlighted = false, color = GOLD2 }:
  { size?: number; dots: Array<{ x: number; y: number }>; highlighted?: boolean; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="5" y="5" width="90" height="90" rx="4"
        fill={highlighted ? `${color}14` : 'rgba(212,175,55,0.06)'}
        stroke={color} strokeWidth={highlighted ? 2 : 1.5} strokeOpacity={0.5} />
      <line x1="50" y1="5" x2="50" y2="95" stroke={color} strokeWidth={0.5} strokeOpacity={0.2} strokeDasharray="3,3" />
      <line x1="5" y1="50" x2="95" y2="50" stroke={color} strokeWidth={0.5} strokeOpacity={0.2} strokeDasharray="3,3" />
      {dots.map((dot, i) => (
        <circle key={i} cx={5 + dot.x * 90} cy={5 + dot.y * 90} r="7"
          fill={color} fillOpacity={0.85} stroke={color} strokeWidth={1.5} />
      ))}
    </svg>
  )
}

export function FoldedPaperSVG({ folds, holeDot, color = GOLD2 }:
  { folds: Array<{ axis: 'h' | 'v'; dir: string }>; holeDot: { x: number; y: number }; color?: string }) {
  return (
    <svg width="200" height="120" viewBox="-10 0 220 110">
      {folds.map((fold, fi) => {
        const x = fi * 90 + 5
        return (
          <g key={fi}>
            <rect x={x} y={5} width={70} height={70} rx={3}
              fill={`${color}08`} stroke={color} strokeWidth={1.5} strokeOpacity={0.5} />
            {fold.axis === 'v' ? (
              <>
                <line x1={x + 35} y1={5} x2={x + 35} y2={75} stroke={color} strokeWidth={2} strokeOpacity={0.6} strokeDasharray="4,2" />
                <rect x={fold.dir === 'left' ? x : x + 35} y={5} width={35} height={70} rx={2}
                  fill={`${color}18`} stroke={color} strokeWidth={1.5} strokeOpacity={0.7} />
              </>
            ) : (
              <>
                <line x1={x} y1={40} x2={x + 70} y2={40} stroke={color} strokeWidth={2} strokeOpacity={0.6} strokeDasharray="4,2" />
                <rect x={x} y={fold.dir === 'top' ? 5 : 40} width={70} height={35} rx={2}
                  fill={`${color}18`} stroke={color} strokeWidth={1.5} strokeOpacity={0.7} />
              </>
            )}
            <text x={x + 35} y={90} textAnchor="middle" fill={color} fillOpacity={0.5} fontSize="8" fontFamily="serif">
              fold {fi + 1}
            </text>
            {fi < folds.length - 1 && (
              <text x={x + 78} y={42} fill={color} fillOpacity={0.6} fontSize="16">-></text>
            )}
          </g>
        )
      })}
      <g transform={`translate(${folds.length * 90 + 5}, 0)`}>
        <rect x={0} y={5} width={70} height={70} rx={3}
          fill={`${color}08`} stroke={color} strokeWidth={1.5} strokeOpacity={0.5} />
        <circle cx={holeDot.x * 70} cy={5 + holeDot.y * 70} r={6} fill={color} fillOpacity={0.9} />
        <text x={35} y={90} textAnchor="middle" fill={color} fillOpacity={0.5} fontSize="8" fontFamily="serif">punch</text>
      </g>
    </svg>
  )
}
