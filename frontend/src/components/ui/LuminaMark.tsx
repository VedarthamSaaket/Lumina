export function LuminaMark({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <path d="M12 1 C12.9 8 16 11.1 23 12 C16 12.9 12.9 16 12 23 C11.1 16 8 12.9 1 12 C8 11.1 11.1 8 12 1 Z" />
      <circle cx="19.5" cy="4.5" r="1.4" opacity="0.7" />
    </svg>
  )
}
