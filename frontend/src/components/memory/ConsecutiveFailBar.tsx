'use client'
import { motion } from 'framer-motion'

interface ConsecutiveFailBarProps {
  count: number
  color: string
}

export function ConsecutiveFailBar({ count, color }: ConsecutiveFailBarProps) {
  return (
    <div className="flex gap-1">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="h-2 w-6 rounded-full"
          style={{
            background: i < count ? color : 'rgba(255,255,255,0.1)',
            border: `1px solid ${i < count ? color : 'rgba(255,255,255,0.15)'}`,
          }}
        />
      ))}
    </div>
  )
}