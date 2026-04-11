'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import { journalAPI, moodAPI } from '@/lib/api'
import type { JournalEntry } from '@/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import DarkVeil from '@/components/DarkVeil'
import '@/components/DarkVeil.css'

const EMOJI: Record<number,string> = {1:'😔',2:'😟',3:'😕',4:'😐',5:'🙂',6:'😊',7:'😄',8:'😁',9:'🌟',10:'✨'}
const TAGS  = ['Anxious','Calm','Hopeful','Tired','Grateful','Overwhelmed','Content','Sad','Excited','Confused']

export default function JournalPage() {
  const [entries,  setEntries]  = useState<JournalEntry[]>([])
  const [moodData, setMoodData] = useState<{date:string;score:number}[]>([])
  const [content,  setContent]  = useState('')
  const [mood,     setMood]     = useState(5)
  const [tags,     setTags]     = useState<string[]>([])
  const [loading,  setLoading]  = useState(false)
  const [view,     setView]     = useState<'write'|'history'|'trends'>('write')

  useEffect(()=>{
    ;(async()=>{
      try {
        const [je,me] = await Promise.all([journalAPI.list(), moodAPI.history()])
        // FIX: Map snake_case API → camelCase type
        setEntries(je.data.map((e:any)=>({...e, createdAt: new Date(e.created_at??e.createdAt)})))
        setMoodData(me.data.map((m:any)=>({date:format(new Date(m.created_at),'MMM d'),score:m.score})))
      } catch {}
    })()
  },[])

  const save = async () => {
    if (!content.trim()){ toast.error('Write something first'); return }
    setLoading(true)
    try {
      await Promise.all([journalAPI.create(content, mood, tags), moodAPI.log(mood,'',tags)])
      toast.success('Entry saved ✦')
      // Add to local state immediately
      const newEntry: JournalEntry = { id:Date.now().toString(), userId:'', content, moodScore:mood, tags, createdAt:new Date() }
      setEntries(p=>[newEntry,...p])
      setMoodData(p=>[...p,{date:format(new Date(),'MMM d'),score:mood}])
      setContent(''); setTags([]); setMood(5)
    } catch(err:any) {
      // FIX: Show actual error, not just generic message
      const msg = err?.response?.data?.detail ?? 'Could not save. Are you signed in? Check your connection.'
      toast.error(msg)
    } finally { setLoading(false) }
  }

  return (
    <main className="bg-journal min-h-screen relative overflow-hidden">
      <ParticleCanvas colors={['#d4af37','#c5a2f2','#2bd2ff']} count={32}/>
      <Navigation/>
      <div className="relative z-10 pt-24 pb-20 px-5 max-w-4xl mx-auto">

        <motion.div initial={{opacity:0,y:28}} animate={{opacity:1,y:0}} transition={{duration:0.8}} className="text-center mb-10">
          <h1 className="font-display font-light mb-2" style={{fontSize:'clamp(3rem,8vw,6rem)',letterSpacing:'-0.02em',color:'var(--text-primary)'}}>
            The Inner <span className="text-gold-shimmer font-baskerville italic">Ledger</span>
          </h1>
          <p className="font-baskerville italic text-lg" style={{color:'var(--text-secondary)'}}>A space where feelings become form, and form becomes understanding.</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['write','history','trends'] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)}
              className="px-5 py-2 rounded-full text-xs font-jost tracking-widest uppercase transition-all duration-280"
              style={{background:view===v?'rgba(212,175,55,0.18)':'transparent',border:view===v?'1px solid rgba(212,175,55,0.38)':'1px solid var(--border-subtle)',color:view===v?'#d4af37':'var(--text-muted)'}}>
              {v}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {view==='write'&&(
            <motion.div key="write" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}}>
              {/* Mood */}
              <div className="glass rounded-xl p-5 mb-4" style={{border:'1px solid var(--border-subtle)'}}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-jost tracking-widest uppercase" style={{color:'var(--text-muted)'}}>How are you feeling?</span>
                  <span className="text-3xl">{EMOJI[mood]}</span>
                </div>
                <input type="range" min="1" max="10" value={mood} onChange={e=>setMood(+e.target.value)} className="mood-slider w-full"/>
                <div className="flex justify-between mt-2 text-xs font-jost" style={{color:'var(--text-muted)'}}>
                  <span>Struggling</span>
                  <span className="font-bold text-sm" style={{color:'var(--text-primary)'}}>{mood}/10</span>
                  <span>Thriving</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {TAGS.map(t=>(
                  <button key={t} onClick={()=>setTags(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t])}
                    className="px-3.5 py-1.5 rounded-full text-xs font-jost tracking-wide transition-all duration-200"
                    style={{background:tags.includes(t)?'rgba(212,175,55,0.18)':'var(--bg-glass)',border:tags.includes(t)?'1px solid rgba(212,175,55,0.45)':'1px solid var(--border-subtle)',color:tags.includes(t)?'#d4af37':'var(--text-muted)'}}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Text */}
              <div className="glass-strong rounded-xl p-5 mb-4" style={{border:'1px solid var(--border-medium)'}}>
                <textarea value={content} onChange={e=>setContent(e.target.value)} rows={7}
                  placeholder="What has today held for you? Write freely, without judgment…"
                  className="w-full bg-transparent text-base font-body leading-relaxed resize-none focus:outline-none"
                  style={{color:'var(--text-primary)',lineHeight:'1.7'}}/>
                <div className="flex justify-between items-center mt-3 pt-3" style={{borderTop:'1px solid var(--border-subtle)'}}>
                  <span className="text-xs font-jost" style={{color:'var(--text-muted)'}}>{content.length} chars</span>
                  <motion.button onClick={save} disabled={loading}
                    className="px-7 py-2.5 rounded-xl font-jost font-semibold text-sm tracking-widest uppercase disabled:opacity-50"
                    style={{background:'linear-gradient(135deg,rgba(212,175,55,0.28),rgba(197,162,242,0.28))',border:'1px solid rgba(212,175,55,0.38)',color:'var(--text-primary)'}}
                    whileHover={{scale:1.03}} whileTap={{scale:0.97}}>
                    {loading?'Saving…':'Save Entry ✦'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {view==='history'&&(
            <motion.div key="hist" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} className="space-y-3">
              {entries.length===0&&(
                <div className="text-center py-20" style={{color:'var(--text-muted)'}}>
                  <p className="font-baskerville italic text-2xl mb-2">No entries yet</p>
                  <p className="font-body text-sm">Your journal awaits its first words.</p>
                </div>
              )}
              {entries.map((e,i)=>(
                <motion.div key={e.id} initial={{opacity:0,x:-14}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}
                  className="glass rounded-xl p-5" style={{border:'1px solid var(--border-subtle)'}}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-jost tracking-widest" style={{color:'var(--text-muted)'}}>
                      {format(new Date(e.createdAt),'MMMM d, yyyy')}
                    </span>
                    {e.moodScore&&<span className="text-xl">{EMOJI[e.moodScore]}</span>}
                  </div>
                  <p className="font-body text-base leading-relaxed" style={{color:'var(--text-primary)'}}>
                    {String(e.content).slice(0,220)}{String(e.content).length>220?'…':''}
                  </p>
                  {e.tags.length>0&&(
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {e.tags.map(t=><span key={t} className="text-xs px-2.5 py-1 rounded-full" style={{background:'rgba(212,175,55,0.09)',color:'#d4af37',border:'1px solid rgba(212,175,55,0.18)'}}>{t}</span>)}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}

          {view==='trends'&&(
            <motion.div key="trends" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}}>
              <div className="glass-strong rounded-xl p-6" style={{border:'1px solid var(--border-medium)'}}>
                <h3 className="font-gothic tracking-widest text-xs mb-6" style={{color:'var(--text-muted)'}}>MOOD OVER TIME</h3>
                {moodData.length>1?(
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={moodData}>
                      <XAxis dataKey="date" stroke="var(--text-muted)" tick={{fontFamily:'var(--font-jost)',fontSize:11}}/>
                      <YAxis domain={[1,10]} stroke="var(--text-muted)" tick={{fontFamily:'var(--font-jost)',fontSize:11}}/>
                      <Tooltip contentStyle={{background:'rgba(12,9,41,0.92)',border:'1px solid rgba(212,175,55,0.28)',borderRadius:'10px',fontFamily:'var(--font-eb-garamond)'}} labelStyle={{color:'#d4af37'}} itemStyle={{color:'var(--text-primary)'}}/>
                      <Line type="monotone" dataKey="score" stroke="#d4af37" strokeWidth={2} dot={{fill:'#d4af37',r:3}} activeDot={{r:5,fill:'#f9e07a'}}/>
                    </LineChart>
                  </ResponsiveContainer>
                ):(
                  <div className="text-center py-14" style={{color:'var(--text-muted)'}}>
                    <p className="font-baskerville italic">Log at least 2 mood entries to see your trends</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  )
}