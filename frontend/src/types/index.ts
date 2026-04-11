// src/types/index.ts

export type Theme = 'dark' | 'light'

export type RiskLevel = 0 | 1 | 2 | 3

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  riskLevel?: RiskLevel
}

export interface MoodEntry {
  id: string
  userId: string
  score: number // 1–10
  note?: string
  tags: string[]
  createdAt: Date
}

export interface JournalEntry {
  id: string
  userId: string
  content: string
  moodScore?: number
  tags: string[]
  createdAt: Date
}

export interface CBTModule {
  id: string
  title: string
  description: string
  type: 'distortion' | 'reframing' | 'exposure' | 'activation' | 'esteem' | 'habit'
  completed: boolean
}

export interface ScreeningResult {
  id: string
  userId: string
  type: 'PHQ9' | 'GAD7' | 'RSES'
  answers: number[]
  score: number
  severity: string
  completedAt: Date
}

export interface User {
  id: string
  email: string
  ageConfirmed: boolean
  theme: Theme
  createdAt: Date
}

export interface CrisisResource {
  name: string
  number: string
  url?: string
  country: string
}
