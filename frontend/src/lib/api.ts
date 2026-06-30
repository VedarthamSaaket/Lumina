// src/lib/api.ts
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ── Auth interceptor - attaches JWT to every request automatically ─────────
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
  }
  return config
})

// ── 401 interceptor - redirect to /auth on token expiry ───────────────────
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const isAuthRoute = window.location.pathname.startsWith('/auth')
      if (!isAuthRoute) {
        localStorage.removeItem('access_token')
        window.location.href = '/'
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  // Step 1 of signup — emails a 6-digit code; no account created yet.
  signup: (
    email: string,
    password: string,
    ageConfirmed: boolean,
    profile?: { fullName?: string; age?: number; gender?: string }
  ) =>
    api.post('/api/auth/signup', {
      email,
      password,
      age_confirmed: ageConfirmed,
      full_name: profile?.fullName || null,
      age:       profile?.age       || null,
      gender:    profile?.gender    || null,
    }),
  // Step 2 of signup — confirms the code, creates the account, signs in.
  verifyEmail: (email: string, code: string, remember = false) =>
    api.post('/api/auth/verify-email', { email, code, remember }),
  resendCode:  (email: string) =>
    api.post('/api/auth/resend-code', { email }),
  signin:  (email: string, password: string, remember = false) =>
    api.post('/api/auth/signin', { email, password, remember }),
  signout: () => api.post('/api/auth/signout'),
  me:      () => api.get('/api/auth/me'),
  // Forgot / reset password (6-digit code)
  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),
  resetPassword:  (email: string, code: string, password: string) =>
    api.post('/api/auth/reset-password', { email, code, password }),
}

// ── Chat ──────────────────────────────────────────────────────────────────
export const chatAPI = {
  sendMessage: (
    content: string,
    history: { role: string; content: string }[],
    conversation_id?: string
  ) => api.post('/api/chat/message', { content, history, conversation_id }),

  getConversations: () =>
    api.get('/api/chat/conversations'),

  getConversation: (id: string) =>
    api.get(`/api/chat/conversations/${id}`),

  deleteConversation: (id: string) =>
    api.delete(`/api/chat/conversations/${id}`),
}

// ── Journal ───────────────────────────────────────────────────────────────
export const journalAPI = {
  create: (content: string, moodScore: number, tags: string[], stickers?: Record<string, any>[]) =>
    api.post('/api/journal', { content, mood_score: moodScore, tags, stickers: stickers || [] }),
  list:   () => api.get('/api/journal'),
  delete: (id: string) => api.delete(`/api/journal/${id}`),
}

// ── Mood ──────────────────────────────────────────────────────────────────
export const moodAPI = {
  log:     (score: number, note: string, tags: string[]) =>
    api.post('/api/mood', { score, note, tags }),
  history: () => api.get('/api/mood/history'),
}

// ── Screening ─────────────────────────────────────────────────────────────
export const screeningAPI = {
  submit: (type: string, answers: number[], questionContexts?: string[]) =>
    api.post('/api/screening', {
      type,
      answers,
      question_contexts: questionContexts ?? [],
    }),
  history: () => api.get('/api/screening/history'),
}

// ── CBT ───────────────────────────────────────────────────────────────────
export const cbtAPI = {
  getModules:   () => api.get('/api/cbt/modules'),
  saveProgress: (moduleId: string, data: Record<string, unknown>) =>
    api.post(`/api/cbt/modules/${moduleId}/progress`, data),
  getProgress:  (moduleId: string) =>
    api.get(`/api/cbt/modules/${moduleId}/progress`),
}

// ── Memory / Cognitive ────────────────────────────────────────────────────
export const memoryAPI = {
  save: (payload: {
    game_type:    string
    stats:        Record<string, number>
    rounds_data:  unknown[]
    completed_at: string
  }) => api.post('/cognitive/memory', payload),

  history:       () => api.get('/cognitive/memory/history'),
  historyByType: (gameType: string) =>
    api.get(`/cognitive/memory/history/${gameType}`),
}

// ── Crisis ────────────────────────────────────────────────────────────────
export const crisisAPI = {
  getResources: (country?: string) =>
    api.get('/api/crisis/resources', { params: { country } }),
  logEvent: (level: number, content: string) =>
    api.post('/api/crisis/log', { level, content }),
}

// ── Psych augmentation warmup ──────────────────────────────────────────────
// Hit on page-mount so the HF cold-start (~20s) and the Colab worker wake
// happen WHILE the user is reading / taking a test. By the time they submit,
// both layers are warm. Fire-and-forget — failures are swallowed so a cold
// psych layer never blocks the page.
export type PsychPage =
  | 'chat' | 'journal' | 'cbt' | 'crisis' | 'screening' | 'orion' | 'dashboard'

export const psychAPI = {
  // Warm one page's layer-A classifier + probe its layer-B Colab worker.
  warmupPage: (page: PsychPage) =>
    api.get(`/api/psych/warmup/${page}`).then(r => r.data).catch(() => null),
  // Warm everything (e.g. from the app shell once after sign-in).
  warmupAll: () => api.get('/api/psych/warmup').then(r => r.data).catch(() => null),
  health:    () => api.get('/api/psych/health').then(r => r.data).catch(() => null),
}