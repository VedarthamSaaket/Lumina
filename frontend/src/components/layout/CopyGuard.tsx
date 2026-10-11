'use client'
import { useEffect } from 'react'

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

export function CopyGuard() {
  useEffect(() => {
    const block = (e: Event) => {
      if (!isEditable(e.target)) e.preventDefault()
    }
    const events = ['copy', 'cut', 'contextmenu', 'dragstart'] as const
    events.forEach(name => document.addEventListener(name, block))
    return () => events.forEach(name => document.removeEventListener(name, block))
  }, [])
  return null
}
