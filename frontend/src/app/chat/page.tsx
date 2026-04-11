'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/layout/Navigation'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import type { RiskLevel } from '@/types'
import { CrisisBanner } from '@/components/crisis/CrisisBanner'
import DarkVeil from '@/components/DarkVeil'
import '@/components/DarkVeil.css'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const RISK: Record<number, string[]> = {
  1: ['want to die', 'wish i was dead', 'dont want to be here', 'worthless', 'hopeless'],
  2: ['kill myself', 'end my life', 'suicidal', 'want to hurt myself'],
  3: ['about to end it', 'going to kill myself', 'have a plan', 'goodbye everyone'],
}
function detectRisk(t: string): RiskLevel {
  const l = t.toLowerCase()
  if (RISK[3].some(k => l.includes(k))) return 3
  if (RISK[2].some(k => l.includes(k))) return 2
  if (RISK[1].some(k => l.includes(k))) return 1
  return 0
}
function fmtTime(d: Date) {
  if (!d || d.getTime() === 0) return ''
  const h = d.getHours() % 12 || 12, m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
}
function fmtDate(d: Date) {
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return fmtTime(d)
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return d.toLocaleDateString('en', { weekday: 'short' })
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

interface ToolRedirect { name: string; path: string; description: string }
interface Msg {
  id: string; role: 'user' | 'assistant'; content: string
  timestamp: Date; riskLevel: RiskLevel
  toolRedirect?: ToolRedirect | null; toolAnswered?: boolean
  streaming?: boolean
}
interface Convo { id: string; title: string; updated_at: string }

// ── Build personalised welcome message using stored user info ──
function buildWelcome(name?: string | null): Msg {
  const greeting = name ? `Hey ${name}.` : "Hey."
  return {
    id: '0', role: 'assistant', timestamp: new Date(0),
    riskLevel: 0, content: `${greeting} What's on your mind?`
  }
}

function parseToolRedirect(text: string): { content: string; toolRedirect: ToolRedirect | null } {
  const match = text.match(/TOOL_REDIRECT:(\{[\s\S]*?\})/)
  if (!match) return { content: text, toolRedirect: null }
  const content = text.replace(/\s*TOOL_REDIRECT:\{[\s\S]*?\}/, '').trim()
  try {
    const toolRedirect = JSON.parse(match[1]) as ToolRedirect
    return { content, toolRedirect }
  } catch {
    return { content: text, toolRedirect: null }
  }
}

// ── AVATAR ──
const Avatar = ({ riskLevel }: { riskLevel: RiskLevel }) => (
  <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 0.08, duration: 0.3 }}
    style={{
      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
      marginRight: '13px', marginTop: '3px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '13px',
      color: riskLevel >= 2 ? '#fff' : '#d4af37',
      background: riskLevel >= 2
        ? 'linear-gradient(135deg,#dc2626,#7f1d1d)'
        : 'linear-gradient(145deg,#1a0c04 0%,#2c1808 50%,#160a02 100%)',
      border: riskLevel >= 2
        ? '1px solid rgba(220,38,38,0.5)'
        : '1px solid rgba(212,175,55,0.42)',
      boxShadow: riskLevel >= 2
        ? '0 0 16px rgba(220,38,38,0.4)'
        : '0 0 14px rgba(212,175,55,0.28), inset 0 1px 0 rgba(212,175,55,0.22)',
    }}>✦</motion.div>
)

const StreamCursor = () => (
  <motion.span
    animate={{ opacity: [1, 0, 1] }}
    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
    style={{ display: 'inline-block', marginLeft: '2px', color: '#d4af37' }}>▍</motion.span>
)

function getAuthHeader(): Record<string, string> {
  if (typeof document === 'undefined') return {}
  const cookie = document.cookie.split(';').map(c => c.trim())
    .find(c => c.startsWith('lumina_token='))
  const token = cookie ? cookie.split('=')[1] : localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function ChatPage() {
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([buildWelcome(null)])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [risk, setRisk] = useState<RiskLevel>(0)
  const [online, setOnline] = useState(true)
  const [convos, setConvos] = useState<Convo[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // ── Redirect cooldown: track path → timestamp of last redirect shown ──
  // A path is on cooldown for 4 messages after it was shown (dismissed or answered)
  const redirectCooldown = useRef<Map<string, number>>(new Map())
  const msgCountRef = useRef<number>(1) // tracks assistant message count

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  // ── Load user name from auth on mount ──
  useEffect(() => {
    const headers = getAuthHeader()
    if (!headers.Authorization) return
    fetch(`${API}/api/auth/me`, { credentials: 'include', headers })
      .then(r => r.json())
      .then(data => {
        if (data?.name || data?.username) {
          const name = data.name || data.username
          setUserName(name)
          // Update welcome message with name
          setMsgs(prev => prev.map(m =>
            m.id === '0' ? { ...m, content: `Hey ${name}. What's on your mind?` } : m
          ))
        }
      })
      .catch(() => { })
  }, [])

  const fetchConvos = useCallback(() => {
    fetch(`${API}/api/chat/conversations`, { credentials: 'include', headers: getAuthHeader() })
      .then(r => r.json()).then(d => setConvos(Array.isArray(d) ? d : [])).catch(() => { })
  }, [])

  useEffect(() => { fetchConvos() }, [fetchConvos])

  const loadConvo = async (id: string) => {
    try {
      const r = await fetch(`${API}/api/chat/conversations/${id}`, {
        credentials: 'include', headers: getAuthHeader()
      })
      const d = await r.json()
      const m: Msg[] = (d.messages || []).map((x: any, i: number) => ({
        id: String(i), role: x.role, content: x.content,
        timestamp: new Date(x.created_at), riskLevel: 0 as RiskLevel,
      }))
      setMsgs(m.length ? m : [buildWelcome(userName)]); setActiveId(id)
    } catch { }
  }

  const newChat = () => {
    abortRef.current?.abort()
    redirectCooldown.current.clear()
    msgCountRef.current = 1
    setMsgs([buildWelcome(userName)]); setActiveId(null); setRisk(0); setInput('')
  }

  const deleteConvo = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await fetch(`${API}/api/chat/conversations/${id}`, {
      method: 'DELETE', credentials: 'include', headers: getAuthHeader()
    }).catch(() => { })
    setConvos(p => p.filter(c => c.id !== id))
    if (activeId === id) newChat()
  }

  const answerTool = (msgId: string, yes: boolean, path: string) => {
    setMsgs(p => p.map(m => m.id === msgId ? { ...m, toolAnswered: true } : m))
    // Put this path on cooldown for 5 messages regardless of yes/no
    redirectCooldown.current.set(path, msgCountRef.current)
    if (yes) router.push(path)
  }

  // ── Decide whether to suppress a tool redirect ──
  // Suppress if the same path was shown within the last 4 assistant messages
  const shouldSuppressRedirect = (path: string): boolean => {
    const lastShown = redirectCooldown.current.get(path)
    if (lastShown === undefined) return false
    return (msgCountRef.current - lastShown) < 4
  }

  const resize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const send = useCallback(async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    const r = detectRisk(text)
    setRisk(r)

    const userMsg: Msg = {
      id: Date.now().toString(), role: 'user',
      content: text, timestamp: new Date(), riskLevel: 0 as RiskLevel
    }
    setMsgs(p => [...p, userMsg])
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'
    setLoading(true)

    if (r >= 3) {
      setMsgs(p => [...p, {
        id: String(Date.now() + 1), role: 'assistant', timestamp: new Date(), riskLevel: 3 as RiskLevel,
        content: "Your safety is the only thing that matters right now. Please call emergency services (112 or 911) immediately, or contact iCall at 9152987821."
      }])
      setLoading(false); return
    }
    if (r >= 2) {
      setMsgs(p => [...p, {
        id: String(Date.now() + 1), role: 'assistant', timestamp: new Date(), riskLevel: 2 as RiskLevel,
        content: "I hear you and I'm worried. Please reach out to iCall at 9152987821 or text HOME to 741741. You don't have to go through this alone."
      }])
      setLoading(false); return
    }

    const assistantId = String(Date.now() + 1)
    msgCountRef.current += 1
    const currentMsgCount = msgCountRef.current

    setMsgs(p => [...p, {
      id: assistantId, role: 'assistant', timestamp: new Date(),
      riskLevel: 0 as RiskLevel, content: '', streaming: true,
    }])

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const history = msgs.map(m => ({ role: m.role, content: m.content }))

      const res = await fetch(`${API}/api/chat/stream`, {
        method: 'POST',
        credentials: 'include',
        signal: abortRef.current.signal,
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          content: text,
          history,
          conversation_id: activeId || null,
        }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      setOnline(true)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') break

            try {
              const parsed = JSON.parse(payload)

              if (parsed.conversation_id) {
                if (parsed.conversation_id !== activeId) {
                  setActiveId(parsed.conversation_id)
                  fetchConvos()
                }
              }
              if (parsed.risk_level != null && parsed.risk_level > r) {
                setRisk(parsed.risk_level as RiskLevel)
              }

              if (parsed.text != null) {
                accumulated += parsed.text
                const { content, toolRedirect } = parseToolRedirect(accumulated)
                // Apply cooldown suppression
                const suppressedRedirect = toolRedirect && shouldSuppressRedirect(toolRedirect.path)
                  ? null : toolRedirect

                setMsgs(p => p.map(m =>
                  m.id === assistantId
                    ? {
                      ...m, content, toolRedirect: suppressedRedirect || null, toolAnswered: false,
                      streaming: false, timestamp: new Date()
                    }
                    : m
                ))
              }
            } catch {
              accumulated += payload
              setMsgs(p => p.map(m =>
                m.id === assistantId ? { ...m, content: accumulated, streaming: true } : m
              ))
            }
          }
        }
      }

      // Finalise
      const { content, toolRedirect } = parseToolRedirect(accumulated)
      const suppressedFinal = toolRedirect && shouldSuppressRedirect(toolRedirect.path) ? null : toolRedirect

      // Register this redirect in cooldown so it won't fire again for 4 messages
      if (toolRedirect && !suppressedFinal) {
        // It was suppressed - don't register (already on cooldown)
      } else if (toolRedirect) {
        redirectCooldown.current.set(toolRedirect.path, currentMsgCount)
      }

      setMsgs(p => p.map(m =>
        m.id === assistantId
          ? { ...m, content, toolRedirect: suppressedFinal || null, toolAnswered: false, streaming: false }
          : m
      ))

    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setMsgs(p => p.map(m =>
          m.id === assistantId ? { ...m, streaming: false } : m
        ))
      } else {
        console.warn('[Chat] Stream failed, falling back to /message:', err)
        try {
          const history = msgs.map(m => ({ role: m.role, content: m.content }))
          const fallback = await fetch(`${API}/api/chat/message`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ content: text, history, conversation_id: activeId || null }),
          })
          const data = await fallback.json()
          setOnline(true)
          if (data.conversation_id && data.conversation_id !== activeId) {
            setActiveId(data.conversation_id); fetchConvos()
          }
          const { content, toolRedirect } = parseToolRedirect(data.response || '')
          const suppressedFb = toolRedirect && shouldSuppressRedirect(toolRedirect.path) ? null : toolRedirect
          if (toolRedirect && suppressedFb) {
            redirectCooldown.current.set(toolRedirect.path, msgCountRef.current)
          }
          setMsgs(p => p.map(m =>
            m.id === assistantId
              ? {
                ...m, content, streaming: false,
                toolRedirect: suppressedFb || data.tool_redirect || null,
                toolAnswered: false,
                riskLevel: (data.risk_level ?? 0) as RiskLevel,
              }
              : m
          ))
          if ((data.risk_level ?? 0) > r) setRisk(data.risk_level as RiskLevel)
        } catch {
          setOnline(false)
          setMsgs(p => p.map(m =>
            m.id === assistantId
              ? { ...m, streaming: false, content: "Having trouble connecting. Make sure Ollama is running (`ollama serve`) and try again." }
              : m
          ))
        }
      }
    } finally {
      setLoading(false)
    }
  }, [input, loading, msgs, risk, activeId, fetchConvos])

  const grouped = convos.reduce((acc, c) => {
    const diff = Math.floor((Date.now() - new Date(c.updated_at).getTime()) / 86400000)
    const key = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff < 7 ? 'This week' : 'Older'
    if (!acc[key]) acc[key] = []
    acc[key].push(c); return acc
  }, {} as Record<string, Convo[]>)

  const isStreaming = msgs.some(m => m.streaming)

  return (
    <main className={`min-h-screen relative overflow-hidden ${risk >= 2 ? 'bg-crisis' : 'bg-chat'}`}>
      <ParticleCanvas colors={risk >= 2 ? ['#dc2626', '#7f1d1d'] : ['#d4af37', '#f5ead8', '#b8860b']} count={18} />
      <Navigation />
      {risk >= 2 && <CrisisBanner level={risk} />}
      {!online && (
        <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-5 py-2 rounded-full"
          style={{
            fontFamily: 'var(--font-jost)', fontSize: '11px', letterSpacing: '0.1em',
            background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.4)', color: '#fb923c'
          }}>
          ⚠ Ollama offline, run `ollama serve`
        </motion.div>
      )}

      <div style={{ display: 'flex', height: '100vh', paddingTop: '58px' }}>

        {/* ── SIDEBAR ── */}
        <div style={{
          width: '300px', flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column',
          background: 'rgba(255,200,120,0.028)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRight: '1px solid rgba(212,175,55,0.1)',
        }}>
          <div style={{ padding: '14px 12px 8px', flexShrink: 0 }}>
            <button onClick={newChat} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
              padding: '11px 16px', borderRadius: '12px', cursor: 'pointer',
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.2)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-jost)', fontSize: '11px', fontWeight: 500,
              letterSpacing: '0.1em', transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: '11px', color: 'var(--gold)', opacity: 0.7 }}>✦</span>
              New conversation
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
            {convos.length === 0 ? (
              <div style={{
                padding: '44px 24px', textAlign: 'center',
                fontFamily: '"Baskerville", "Libre Baskerville", "Book Antiqua", Georgia, serif',
                fontSize: '15px', fontWeight: 400, lineHeight: 1.6,
              }}>
                Your conversations<br />will appear here
              </div>
            ) : (
              ['Today', 'Yesterday', 'This week', 'Older'].filter(s => grouped[s]?.length).map(section => (
                <div key={section}>
                  <div style={{
                    padding: '10px 16px 3px', fontFamily: 'var(--font-jost)',
                    fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase',
                    color: 'var(--text-muted)'
                  }}>
                    {section}
                  </div>
                  {grouped[section].map(c => (
                    <div key={c.id} onClick={() => loadConvo(c.id)}
                      className={`chat-history-item ${activeId === c.id ? 'active' : ''}`}>
                      <span style={{ fontSize: '9px', opacity: 0.3, marginTop: '3px', flexShrink: 0 }}>◈</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="chat-history-title">{c.title}</div>
                        <div className="chat-history-date">{fmtDate(new Date(c.updated_at))}</div>
                      </div>
                      <span className="chat-history-delete" onClick={e => deleteConvo(e, c.id)}>✕</span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div style={{
            padding: '10px 16px', borderTop: '1px solid rgba(212,175,55,0.1)',
            fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center'
          }}>
            Private · Local · Encrypted
          </div>
        </div>

        {/* ── MAIN CHAT ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', minWidth: 0 }}>
          <div style={{
            flex: 1, overflowY: 'auto', padding: '24px 0 160px',
            scrollbarWidth: 'thin', scrollbarColor: 'rgba(212,175,55,0.1) transparent'
          }}>
            <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 28px' }}>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                style={{ textAlign: 'center', marginBottom: '44px', paddingTop: '4px' }}>
                <h1 className="font-display" style={{
                  fontWeight: 300, fontSize: '48px', letterSpacing: '-0.02em',
                  color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1,
                }}>Lumina</h1>
                <p style={{
                  fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.24em',
                  textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0
                }}>
                  {userName ? `Welcome back, ${userName}` : 'Private & Local'} · Not a substitute for therapy
                </p>
              </motion.div>

              <AnimatePresence initial={false}>
                {msgs.map(msg => (
                  <motion.div key={msg.id}
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      marginBottom: '18px'
                    }}>

                    {msg.role === 'assistant' && <Avatar riskLevel={msg.riskLevel} />}

                    <div style={{ maxWidth: '74%' }}>
                      <div
                        className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-lumina'}
                        style={msg.riskLevel >= 2 ? {
                          background: 'rgba(220,38,38,0.11)',
                          borderColor: 'rgba(220,38,38,0.28)'
                        } : {}}>

                        {msg.content}
                        {msg.streaming && msg.content === '' && (
                          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '4px 0' }}>
                            {[0, 1, 2].map(i => (
                              <motion.div key={i}
                                style={{
                                  width: '7px', height: '7px', borderRadius: '50%',
                                  background: 'linear-gradient(135deg,#d4af37,#f0d060)',
                                  boxShadow: '0 0 8px rgba(212,175,55,0.6)'
                                }}
                                animate={{ scale: [1, 1.55, 1], opacity: [0.45, 1, 0.45] }}
                                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
                              />
                            ))}
                          </div>
                        )}
                        {msg.streaming && msg.content !== '' && <StreamCursor />}

                        {/* Tool redirect - only render if not answered and not suppressed */}
                        {msg.toolRedirect && !msg.toolAnswered && !msg.streaming && (
                          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.3 }}
                            style={{
                              marginTop: '14px', paddingTop: '14px',
                              borderTop: '1px solid rgba(212,175,55,0.15)'
                            }}>
                            <p style={{
                              margin: '0 0 10px', fontFamily: 'var(--font-jost)', fontSize: '12px',
                              color: 'var(--text-secondary)', letterSpacing: '0.02em', lineHeight: 1.55
                            }}>
                              {msg.toolRedirect.description}
                            </p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {(['Yes', 'Not now'] as const).map((label, i) => (
                                <button key={label}
                                  onClick={() => answerTool(msg.id, i === 0, msg.toolRedirect!.path)}
                                  style={{
                                    padding: '6px 18px', borderRadius: '18px', cursor: 'pointer',
                                    fontFamily: 'var(--font-jost)', fontSize: '10px', fontWeight: 500,
                                    letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.18s',
                                    background: i === 0 ? 'rgba(212,175,55,0.15)' : 'rgba(255,220,150,0.05)',
                                    border: i === 0 ? '1px solid rgba(212,175,55,0.35)' : '1px solid rgba(212,175,55,0.12)',
                                    color: i === 0 ? '#d4af37' : 'var(--text-muted)',
                                  }}>
                                  {label}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {msg.id !== '0' && !msg.streaming && (
                          <div className="chat-timestamp">{fmtTime(msg.timestamp)}</div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <div ref={bottomRef} />
            </div>
          </div>

          {/* ── INPUT BAR ── */}
          {risk < 2 && (
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.45 }}
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '12px 24px 18px',
                background: 'linear-gradient(to top, var(--input-bar-fade, rgba(8,3,0,0.94)) 60%, transparent)',
              }}>
              <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px 10px 22px', borderRadius: '28px',
                  background: 'rgba(255,215,140,0.045)',
                  backdropFilter: 'blur(48px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(48px) saturate(200%)',
                  border: '1px solid rgba(212,175,55,0.18)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(212,175,55,0.08)',
                }}>
                  <textarea ref={taRef} value={input} onChange={resize}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                    }}
                    rows={1} placeholder="Share what's on your mind…"
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      resize: 'none', fontFamily: 'var(--font-jost)', fontSize: '13px',
                      fontStyle: 'normal', fontWeight: 400, lineHeight: 1.5,
                      color: 'var(--text-primary)', maxHeight: '120px', overflow: 'auto', paddingTop: '1px',
                    }} />

                  {isStreaming ? (
                    <button
                      onClick={() => { abortRef.current?.abort(); setLoading(false) }}
                      style={{
                        flexShrink: 0, padding: '9px 22px', borderRadius: '22px', cursor: 'pointer',
                        fontFamily: 'var(--font-jost)', fontSize: '10px', fontWeight: 600,
                        letterSpacing: '0.16em', textTransform: 'uppercase',
                        background: 'rgba(220,38,38,0.15)',
                        border: '1px solid rgba(220,38,38,0.3)',
                        color: '#f87171', transition: 'all 0.2s',
                      }}>
                      Stop
                    </button>
                  ) : (
                    <button onClick={send} disabled={!input.trim() || loading}
                      style={{
                        flexShrink: 0, padding: '9px 22px', borderRadius: '22px', cursor: 'pointer',
                        fontFamily: 'var(--font-jost)', fontSize: '10px', fontWeight: 600,
                        letterSpacing: '0.16em', textTransform: 'uppercase',
                        background: 'linear-gradient(135deg, rgba(140,85,10,0.55), rgba(80,40,4,0.55))',
                        border: '1px solid rgba(212,175,55,0.32)',
                        color: 'var(--text-primary)', transition: 'all 0.2s',
                        opacity: !input.trim() || loading ? 0.38 : 1,
                      }}>
                      Send
                    </button>
                  )}
                </div>
                <p style={{
                  textAlign: 'center', marginTop: '7px', fontFamily: 'var(--font-jost)',
                  fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em'
                }}>
                  Not a substitute for professional care
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  )
}