'use client'

import { useEffect, useRef, useState } from 'react'
import { Renderer, Program, Mesh, Triangle } from 'ogl'

// ─── GRAINIENT ───────────────────────────────────────────────────────────────

const hexToRgb = (hex: string): number[] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [1, 1, 1]
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ]
}

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);
  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;
  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);
  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));
  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;
  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);
  o=vec4(col,1.0);
}
void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}`

interface GrainientProps {
  timeSpeed?: number
  colorBalance?: number
  warpStrength?: number
  warpFrequency?: number
  warpSpeed?: number
  warpAmplitude?: number
  blendAngle?: number
  blendSoftness?: number
  rotationAmount?: number
  noiseScale?: number
  grainAmount?: number
  grainScale?: number
  grainAnimated?: boolean
  contrast?: number
  gamma?: number
  saturation?: number
  centerX?: number
  centerY?: number
  zoom?: number
  color1?: string
  color2?: string
  color3?: string
  className?: string
  style?: React.CSSProperties
}

function Grainient({
  timeSpeed = 0.18,
  colorBalance = 0.05,
  warpStrength = 1.2,
  warpFrequency = 4.0,
  warpSpeed = 1.4,
  warpAmplitude = 60.0,
  blendAngle = 25.0,
  blendSoftness = 0.08,
  rotationAmount = 420.0,
  noiseScale = 2.2,
  grainAmount = 0.065,
  grainScale = 2.5,
  grainAnimated = true,
  contrast = 1.35,
  gamma = 1.05,
  saturation = 0.85,
  centerX = 0.0,
  centerY = 0.0,
  zoom = 0.88,
  color1 = '#c4a882',
  color2 = '#f5e6c8',
  color3 = '#7a5c38',
  className = '',
  style = {},
}: GrainientProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const renderer = new Renderer({ webgl: 2, alpha: true, antialias: false, dpr: Math.min(window.devicePixelRatio || 1, 2) })
    const gl = renderer.gl
    const canvas = gl.canvas as HTMLCanvasElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    const container = containerRef.current
    container.appendChild(canvas)
    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex, fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uTimeSpeed: { value: timeSpeed },
        uColorBalance: { value: colorBalance },
        uWarpStrength: { value: warpStrength },
        uWarpFrequency: { value: warpFrequency },
        uWarpSpeed: { value: warpSpeed },
        uWarpAmplitude: { value: warpAmplitude },
        uBlendAngle: { value: blendAngle },
        uBlendSoftness: { value: blendSoftness },
        uRotationAmount: { value: rotationAmount },
        uNoiseScale: { value: noiseScale },
        uGrainAmount: { value: grainAmount },
        uGrainScale: { value: grainScale },
        uGrainAnimated: { value: grainAnimated ? 1.0 : 0.0 },
        uContrast: { value: contrast },
        uGamma: { value: gamma },
        uSaturation: { value: saturation },
        uCenterOffset: { value: new Float32Array([centerX, centerY]) },
        uZoom: { value: zoom },
        uColor1: { value: new Float32Array(hexToRgb(color1)) },
        uColor2: { value: new Float32Array(hexToRgb(color2)) },
        uColor3: { value: new Float32Array(hexToRgb(color3)) },
      },
    })
    const mesh = new Mesh(gl, { geometry, program })
    const setSize = () => {
      const rect = container.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      renderer.setSize(w, h)
      const res = program.uniforms.iResolution.value as Float32Array
      res[0] = gl.drawingBufferWidth
      res[1] = gl.drawingBufferHeight
      renderer.render({ scene: mesh })
    }
    const ro = new ResizeObserver(setSize)
    ro.observe(container)
    setSize()
    let raf = 0
    const t0 = performance.now()
    const loop = (t: number) => {
      program.uniforms.iTime.value = (t - t0) * 0.001
      renderer.render({ scene: mesh })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      try { container.removeChild(canvas) } catch { }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}
    />
  )
}

// ─── TOKENS ──────────────────────────────────────────────────────────────────

const T = {
  ink: '#1c1410',
  inkMid: '#241a13',
  bark: '#3a2a1e',
  umber: '#5c3d28',
  gold: '#c4a060',
  parchment: '#c4a882',
  cream: '#f5e6c8',
  cream2: '#ede0c4',
  creamDark: '#d4c9a8',
  chalk: '#faf3e8',
  serif: "'Playfair Display', serif",
  script: "'Cormorant Garamond', serif",
  sans: "'DM Sans', sans-serif",
  mono: "'IBM Plex Mono', monospace",
  inkLine: 'rgba(250,243,232,0.06)',
  creamLine: 'rgba(28,20,16,0.09)',
}

// ─── NAVIGATION HELPER ───────────────────────────────────────────────────────

const goToSignup = () => { window.location.href = '/auth/signup' }

// ─── GOLD SHIMMER HEADING ─────────────────────────────────────────────────────

function GoldWord({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: 'linear-gradient(90deg, #b8860b 0%, #c4a060 22%, #f0d080 50%, #c4a060 78%, #b8860b 100%)',
      backgroundSize: '220% auto',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      animation: 'textShimmer 5s linear infinite',
      display: 'inline',
    }}>{children}</span>
  )
}

// ─── SECTION RULE ─────────────────────────────────────────────────────────────

function SectionRule({ label, num, light = false }: { label: string; num: string; light?: boolean }) {
  const c = light
    ? { txt: 'rgba(28,20,16,0.35)', line: 'rgba(28,20,16,0.1)', n: 'rgba(28,20,16,0.22)' }
    : { txt: 'rgba(250,243,232,0.28)', line: 'rgba(250,243,232,0.07)', n: 'rgba(250,243,232,0.2)' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 56 }}>
      <span style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: c.txt, paddingRight: 20, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: c.line }} />
      <span style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 20, color: c.n, paddingLeft: 20, flexShrink: 0 }}>{num}</span>
    </div>
  )
}

// ─── NAV ─────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 800,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '28px 52px',
      background: scrolled ? 'rgba(28,20,16,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(10px)' : 'none',
      borderBottom: scrolled ? `1px solid ${T.inkLine}` : '1px solid transparent',
      transition: 'background 0.4s, border-color 0.4s',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <div style={{ fontFamily: T.serif, fontWeight: 900, fontSize: 22, letterSpacing: '-0.01em', color: T.cream, lineHeight: 1 }}>Lumina</div>
          <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.gold, opacity: 0.7 }}>+ Orion</div>
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(250,243,232,0.28)', marginTop: 3 }}>Cognitive Wellness Sanctuary</div>
      </div>
      <ul style={{ listStyle: 'none', display: 'flex', gap: 32, alignItems: 'center', margin: 0, padding: 0 }}>
        {['Features', 'Orion', 'Inner Work', 'Privacy', 'Begin'].map(item => (
          <li key={item}>
            <a href={`#${item.toLowerCase().replace(' ', '-')}`} style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(250,243,232,0.32)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = T.chalk)}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(250,243,232,0.32)')}
            >{item}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ─── TICKER ───────────────────────────────────────────────────────────────────

function Ticker() {
  const items = ['Self Reflection', 'Inner Work', 'Memory Games', 'Inner Ledger', 'Orion Engine', 'Local AI', 'Zero Data Leakage', 'The Mirror', 'Thinking Companion', 'Cognitive Threading', 'Crisis Safe', 'Mood Tracking']
  const doubled = [...items, ...items]
  return (
    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', padding: '10px 0', position: 'relative', zIndex: 5 }}>
      {/* Ticker background: cream grainient */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse 90% 55% at 20% 10%, #6b3510 0%, transparent 50%), radial-gradient(ellipse 70% 60% at 85% 85%, #4b2308 0%, transparent 55%), #1c1410' }}>
        <Grainient
          color1="#c4a882" color2="#ede0c4" color3="#5c3d28"
          timeSpeed={0.06} warpStrength={0.3} grainAmount={0.065}
          contrast={1.2} saturation={0.7} zoom={1.2}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(196,168,130,0.88)', zIndex: 1, borderTop: `1px solid rgba(28,20,16,0.12)`, borderBottom: `1px solid rgba(28,20,16,0.12)` }} />
      <div style={{ position: 'relative', zIndex: 2, display: 'inline-block', animation: 'tick 40s linear infinite', fontFamily: T.mono, fontSize: 8.5, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(28,20,16,0.52)' }}>
        {doubled.map((t, i) => (
          <span key={i} style={{ padding: '0 32px' }}>{t}</span>
        ))}
      </div>
    </div>
  )
}

// ─── S1: HERO ─────────────────────────────────────────────────────────────────
// warm taupe-sand gradient, radial bloom, blue-grey bottom-left, warm gold-brown top-center,
// deep dark vignette bottom-right. Heavy film-grain. Grain tint: warm sand/taupe (#c9b99a)

function Hero() {
  return (
    <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 52px 72px', overflow: 'hidden', background: 'radial-gradient(ellipse 90% 55% at 20% 10%, #6b3510 0%, transparent 50%), radial-gradient(ellipse 70% 60% at 85% 85%, #4b2308 0%, transparent 55%), #1c1410' }}>

      {/* LAYER 1: Gradient mesh — radial bloom, warm amber-gold from top-center, cool blue-grey bottom-left, deep dark vignette bottom-right */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse 90% 55% at 20% 10%, #6b3510 0%, transparent 50%), radial-gradient(ellipse 70% 60% at 85% 85%, #4b2308 0%, transparent 55%), #1c1410' }}>
        <Grainient
          color1="#c4a882"
          color2="#f0dfc0"
          color3="#3a2a1e"
          timeSpeed={0.14}
          warpStrength={0.9}
          warpFrequency={3.5}
          warpSpeed={1.2}
          grainAmount={0.0}
          contrast={1.4}
          saturation={0.78}
          zoom={0.85}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Blue-grey radial at bottom-left */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: [
          'radial-gradient(ellipse 55% 55% at 0% 100%, rgba(88,102,118,0.62) 0%, transparent 60%)',
          'radial-gradient(ellipse 60% 50% at 48% 5%, rgba(196,160,96,0.72) 0%, transparent 55%)',
          'radial-gradient(ellipse 50% 55% at 100% 100%, rgba(14,9,4,0.88) 0%, transparent 55%)',
          'linear-gradient(to bottom, rgba(28,20,16,0.05) 0%, rgba(28,20,16,0.58) 100%)',
        ].join(','),
      }} />

      {/* LAYER 2: Grain overlay — warm sand/taupe tint #c9b99a — animated, heavy, cinematic */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        mixBlendMode: 'overlay',
      }}>
        <Grainient
          color1="#c9b99a"
          color2="#b8a888"
          color3="#9a8868"
          timeSpeed={0.22}
          warpStrength={0.2}
          warpFrequency={8.0}
          warpSpeed={3.5}
          warpAmplitude={200}
          grainAmount={0.18}
          grainScale={1.8}
          grainAnimated={true}
          contrast={0.85}
          saturation={0.3}
          zoom={1.0}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Grid lines */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        {[22, 44, 66].map(pct => <div key={pct} style={{ position: 'absolute', left: 0, right: 0, top: `${pct}%`, height: 1, background: 'rgba(250,243,232,0.04)' }} />)}
        {[33, 66].map(pct => <div key={pct} style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct}%`, width: 1, background: 'rgba(250,243,232,0.04)' }} />)}
      </div>

      {/* Ghost wordmark */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -52%)', fontFamily: T.serif, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(200px, 30vw, 400px)', lineHeight: 1, color: 'rgba(250,243,232,0.025)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 3, userSelect: 'none' }}>
        Lumina
      </div>

      {/* Side annotations */}
      <div style={{ position: 'absolute', right: 144, top: '40%', transform: 'translateY(-50%)', textAlign: 'right', fontFamily: T.mono, fontSize: 8.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(250,243,232,0.2)', lineHeight: 1.9, zIndex: 4 }}>
        Lumina<br />Cognitive Sanctuary<br />Protocol I
      </div>
      <div style={{ position: 'absolute', right: 52, top: '50%', transform: 'translateY(-50%) rotate(90deg)', transformOrigin: 'center center', fontFamily: T.mono, fontSize: 7.5, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(250,243,232,0.14)', whiteSpace: 'nowrap', zIndex: 4 }}>
        Self Reflection · Inner Work · Memory Games · Inner Ledger · Orion · Local AI
      </div>

      {/* Orion online badge */}
      <div style={{ position: 'absolute', top: 120, left: 52, zIndex: 5 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: `1px solid rgba(196,160,96,0.3)`, padding: '8px 18px', backdropFilter: 'blur(6px)', background: 'rgba(28,20,16,0.3)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.gold, animation: 'pulse 2.5s ease-in-out infinite' }} />
          <span style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: T.gold }}>Orion Online</span>
        </div>
      </div>

      {/* CONTENT — z-index above grain */}
      <div style={{ position: 'relative', zIndex: 5 }}>
        <h1 style={{ fontFamily: T.serif, fontWeight: 900, fontSize: 'clamp(88px, 15vw, 200px)', lineHeight: 0.87, letterSpacing: '-0.02em', color: T.chalk, marginBottom: 0 }}>
          <span style={{ display: 'block' }}>LUMINA</span>
          <span style={{ display: 'block', paddingLeft: '9%', color: T.creamDark, position: 'relative' }}>
            <span style={{ position: 'absolute', top: -26, left: '12%', fontFamily: T.script, fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(28px, 4vw, 52px)', color: 'rgba(196,160,96,0.48)', whiteSpace: 'nowrap' }}>your mind, understood.</span>
            MIND.
          </span>
        </h1>
        <div style={{ marginTop: 44, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'end' }}>
          <div>
            <p style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 10.5, lineHeight: 1.9, letterSpacing: '0.04em', color: 'rgba(250,243,232,0.42)', maxWidth: 380, marginBottom: 20 }}>
              A private sanctuary for your emotional wellbeing and mental sharpness. Validated self-reflection tools, a journal that knows you, and Orion, your dedicated thinking companion.
            </p>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {['Self Reflection', 'Inner Work', 'Memory Games', 'Inner Ledger'].map(f => (
                <span key={f} style={{ fontFamily: T.mono, fontSize: 7.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,243,232,0.3)', borderBottom: '1px solid rgba(250,243,232,0.12)', paddingBottom: 2 }}>{f}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, justifyContent: 'flex-end' }}>
            <button
              onClick={goToSignup}
              style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: T.ink, background: T.cream, padding: '14px 34px', border: 'none', cursor: 'pointer', boxShadow: `3px 3px 0 ${T.umber}`, transition: 'all .15s', display: 'inline-block' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `5px 5px 0 ${T.umber}` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = `3px 3px 0 ${T.umber}` }}
            >Begin Journey</button>
            <a href="#features" style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(250,243,232,0.38)', textDecoration: 'none', borderBottom: '1px solid rgba(250,243,232,0.16)', paddingBottom: 2, transition: 'color .2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.chalk }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(250,243,232,0.38)' }}
            >Explore Features</a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── S2: PHILOSOPHY — parchment/cream ─────────────────────────────────────────
// Background: parchment/cream (#f0e8d8), light and warm
// Grain tint: cream (#e8dcc8), intense, same weight as hero

function Philosophy() {
  return (
    <section id="features" style={{ position: 'relative', overflow: 'hidden', minHeight: '95vh', display: 'flex', alignItems: 'center', background: '#ede0c4' }}>

      {/* LAYER 1: Gradient mesh — very gentle directional warm gradient, slightly darker at edges */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Grainient
          color1="#f0dfc0"
          color2="#c4a882"
          color3="#6b4828"
          timeSpeed={0.08}
          warpStrength={0.55}
          warpFrequency={2.6}
          warpSpeed={0.85}
          blendAngle={58}
          grainAmount={0.0}
          contrast={1.22}
          saturation={0.58}
          zoom={0.90}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Cream overlay to unify */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(237,220,192,0.72)', zIndex: 1 }} />

      {/* Dot grid texture */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle, rgba(28,20,16,0.045) 1px, transparent 1px)', backgroundSize: '18px 18px', zIndex: 2 }} />

      {/* LAYER 2: Grain — cream tint #e8dcc8, heavy, cinematic */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', mixBlendMode: 'multiply' }}>
        <Grainient
          color1="#e8dcc8"
          color2="#d8ccb4"
          color3="#c4b898"
          timeSpeed={0.20}
          warpStrength={0.15}
          warpFrequency={9.0}
          warpSpeed={3.2}
          warpAmplitude={220}
          grainAmount={0.16}
          grainScale={1.9}
          grainAnimated={true}
          contrast={0.80}
          saturation={0.2}
          zoom={1.0}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Ghost 01 numeral */}
      <div style={{ position: 'absolute', right: -24, top: '50%', transform: 'translateY(-50%)', fontFamily: T.serif, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(260px, 32vw, 440px)', color: 'rgba(28,20,16,0.04)', lineHeight: 1, pointerEvents: 'none', userSelect: 'none', zIndex: 4 }}>01</div>

      {/* CONTENT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 100, alignItems: 'center', position: 'relative', zIndex: 5, width: '100%', padding: '112px 52px', color: T.ink }}>
        <div>
          <SectionRule label="The Lumina Approach" num="01" light />
          <h2 style={{ fontFamily: T.serif, fontWeight: 900, fontSize: 'clamp(52px, 7vw, 96px)', lineHeight: 0.9, letterSpacing: '-0.02em', color: T.ink, marginBottom: 36 }}>
            Wisdom,<br />not a<br /><em style={{ fontStyle: 'italic', color: T.umber }}>Label.</em>
          </h2>
          <p style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 11, lineHeight: 1.9, letterSpacing: '0.04em', color: 'rgba(28,20,16,0.52)', maxWidth: 400, marginBottom: 32 }}>
            Lumina removes every clinical label from your experience. Scores become stories. Patterns get names, not numbers. Instead of a severity rating, you receive a warm, honest reflection written in language that feels like a trusted friend who has read everything.
          </p>
          <div style={{ fontFamily: T.script, fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(24px, 3vw, 38px)', color: 'rgba(28,20,16,0.3)', lineHeight: 1.2 }}>
            Guidance that feels like a conversation,<br />not a report.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { n: '01', title: 'Invisible Clinical Layer', body: 'No jargon, no severity labels, no hospital aesthetics. Gold, cream, warmth, and breathing room in every word.' },
            { n: '02', title: 'Narrative Reflection', body: 'Your Self Reflection results are translated into a warm, personal 3-paragraph portrait. Your pattern gets a name, not a score.' },
            { n: '03', title: 'Honest Nudges', body: 'Lumina notices when you pick the socially safe answer and gently asks whether you are being too hard, or too easy, on yourself.' },
            { n: '04', title: 'Personality-Aware Voice', body: 'Your Big Five results shape how Lumina speaks to you. The tone adapts to match who you actually are, not a generic user.' },
          ].map(item => (
            <div key={item.n} style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 20, padding: '26px 0', borderBottom: '1px solid rgba(28,20,16,0.08)', alignItems: 'start' }}>
              <span style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 26, fontWeight: 400, color: 'rgba(28,20,16,0.2)', lineHeight: 1 }}>{item.n}</span>
              <div>
                <div style={{ fontFamily: T.serif, fontWeight: 700, fontSize: 19, color: T.ink, marginBottom: 7, lineHeight: 1.1 }}>{item.title}</div>
                <div style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 10, lineHeight: 1.85, letterSpacing: '0.04em', color: 'rgba(28,20,16,0.48)' }}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── S3: FEATURES GRID — SPLIT BLACK LEFT / WARM DARK BROWN RIGHT ─────────────
// FIX: The split background must render as a REAL CSS split using two absolutely positioned
// panels, each with its own independent Grainient + grain canvas.
// Left: pure deep black (#0a0806), independent grain (#0d0b08 tint)
// Right: warm dark brown (#1c1409), independent grain (#2a1f10 tint)
// Grain sits above gradient, below content.

function FeaturesGrid() {
  return (
    <section style={{ position: 'relative', color: T.cream, padding: '120px 52px', overflow: 'hidden', background: '#0d0a06' }} id="orion">
      {/* ── SPLIT BACKGROUND: TWO INDEPENDENT PANELS ── */}

      {/* LEFT PANEL: pure deep black */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, bottom: 0,
        width: '55%',
        zIndex: 0,
        overflow: 'hidden',
        clipPath: 'inset(0 0 0 0)',
      }}>
        {/* Left gradient mesh: pure deep black with very subtle warm undertone */}
        <div style={{ position: 'absolute', inset: 0, background: '#0a0806' }}>
          <Grainient
            color1="#1a1208"
            color2="#0a0806"
            color3="#080604"
            timeSpeed={0.06}
            warpStrength={0.4}
            warpFrequency={4.0}
            warpSpeed={1.0}
            blendAngle={-15}
            grainAmount={0.0}
            contrast={1.6}
            saturation={0.35}
            zoom={0.9}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        {/* Left grain: near-black tint #0d0b08 */}
        <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.85 }}>
          <Grainient
            color1="#0d0b08"
            color2="#181410"
            color3="#0a0806"
            timeSpeed={0.24}
            warpStrength={0.12}
            warpFrequency={10.0}
            warpSpeed={4.0}
            warpAmplitude={250}
            grainAmount={0.17}
            grainScale={1.7}
            grainAnimated={true}
            contrast={0.75}
            saturation={0.15}
            zoom={1.0}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* RIGHT PANEL: warm dark brown #1c1409 — visibly distinct from left */}
      <div style={{
        position: 'absolute',
        top: 0, right: 0, bottom: 0,
        width: '45%',
        zIndex: 0,
        overflow: 'hidden',
        clipPath: 'inset(0 0 0 0)',
      }}>
        {/* Right gradient mesh: warm brownish-amber bloom from top-right corner */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 90% 15%, #3a2810 0%, #1c1409 60%)' }}>
          <Grainient
            color1="#3a2810"
            color2="#1c1409"
            color3="#100e08"
            timeSpeed={0.07}
            warpStrength={0.55}
            warpFrequency={3.8}
            warpSpeed={1.2}
            blendAngle={30}
            grainAmount={0.0}
            contrast={1.55}
            saturation={0.48}
            zoom={0.88}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        {/* Warm amber glow bloom from top-right — makes the brown warmth perceptible */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 60% at 90% 15%, rgba(120,70,20,0.38) 0%, transparent 65%)',
        }} />
        {/* Right grain: warm dark brown tint #2a1f10 */}
        <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.85 }}>
          <Grainient
            color1="#2a1f10"
            color2="#3a2a18"
            color3="#1c1409"
            timeSpeed={0.24}
            warpStrength={0.12}
            warpFrequency={10.0}
            warpSpeed={4.0}
            warpAmplitude={250}
            grainAmount={0.17}
            grainScale={1.7}
            grainAnimated={true}
            contrast={0.75}
            saturation={0.28}
            zoom={1.0}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>


      {/* Subtle dividing seam between left and right panels */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: '55%',
        width: 1, background: 'transparent', zIndex: 1,
      }} />

      {/* Dot grid texture */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle, rgba(250,243,232,0.018) 1px, transparent 1px)', backgroundSize: '22px 22px', zIndex: 2 }} />

      {/* CONTENT — above all background layers */}
      <div style={{ position: 'relative', zIndex: 3 }}>
        <SectionRule label="What Lumina Offers" num="02" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'rgba(250,243,232,0.05)' }}>
          {[
            { icon: '◎', title: 'Self Reflection', sub: 'Know yourself honestly', body: 'Seven carefully chosen instruments from mood and anxiety to personality, attachment style, and emotional intelligence. All translated into warm, human language with zero clinical labels.', tag: '7 Instruments' },
            { icon: '◈', title: 'Inner Work', sub: 'Change your patterns', body: 'Four guided modules built on the most effective frameworks in modern psychology. Reframe negative thoughts, activate yourself into motion, clarify what matters, and quiet the inner critic.', tag: '4 Modules' },
            { icon: '◻', title: 'Inner Ledger', sub: 'Your story, your space', body: 'A 3D-rendered journal that feels like a physical object. Mood stickers, emotional timelines, and thought-dumping rituals that make daily reflection something you look forward to.', tag: '3D Book' },
            { icon: '▲', title: 'Memory Games', sub: 'Train how you think', body: 'Eight cognitive exercises modelled after real brain health research. Working memory, fluid reasoning, processing speed, executive function. Not entertainment, understanding.', tag: '8 Games' },
            { icon: '●', title: 'Orion Engine', sub: 'Your thinking companion', body: "Orion watches your game sessions, links your performance to your journal, notices patterns before you do, and debriefs every session with four precise observations. A personal trainer for your mind.", tag: 'Live Coaching' },
            { icon: '◐', title: 'Local Privacy', sub: 'Your data stays yours', body: 'The deepest analysis happens on your device via Ollama. No journal ever leaves your machine. No data is sold. No cloud inference on your psychological profile.', tag: 'Zero Leakage' },
          ].map(item => (
            <div key={item.title} style={{ position: 'relative', padding: '44px 36px', borderRight: '1px solid rgba(250,243,232,0.05)', borderBottom: '1px solid rgba(250,243,232,0.05)', overflow: 'hidden' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(250,243,232,0.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div style={{ fontFamily: T.serif, fontSize: 28, color: T.gold, opacity: 0.6, marginBottom: 20, lineHeight: 1 }}>{item.icon}</div>
              <div style={{ fontFamily: T.serif, fontWeight: 700, fontSize: 22, color: T.cream, marginBottom: 6, lineHeight: 1.1 }}>{item.title}</div>
              <div style={{ fontFamily: T.script, fontStyle: 'italic', fontSize: 15, color: 'rgba(196,160,96,0.55)', marginBottom: 16, lineHeight: 1 }}>{item.sub}</div>
              <p style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 10.5, lineHeight: 1.88, letterSpacing: '0.04em', color: 'rgba(250,243,232,0.38)', marginBottom: 20 }}>{item.body}</p>
              <div style={{ fontFamily: T.mono, fontSize: 7.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.gold, border: `1px solid rgba(196,160,96,0.25)`, padding: '4px 11px', display: 'inline-block' }}>{item.tag}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── S4: ORION DEEP SECTION — deep dark olive-brown gradient ─────────────────
// Background: deep dark olive-brown gradient (#1a1408 → #2d2210)
// Grain tint: dark warm olive (#1e1a0e)
// Dark sections: warm radial glow, brownish-amber bloom from corner

function OrionSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', background: '#1a1408' }}>
      {/* LAYER 1: Gradient mesh — deep dark olive-brown, warm amber bloom from top-right */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse 60% 50% at 85% 10%, #3a2a10 0%, #1a1408 60%)' }}>
        <Grainient
          color1="#c4a060"
          color2="#3a2a1e"
          color3="#1a1408"
          timeSpeed={0.10}
          warpStrength={1.1}
          warpFrequency={4.2}
          warpSpeed={1.5}
          blendAngle={-20}
          grainAmount={0.0}
          contrast={1.5}
          saturation={0.55}
          zoom={0.82}
          colorBalance={0.1}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Dark vignette overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(26,20,8,0.88) 0%, rgba(28,20,8,0.70) 60%, rgba(45,34,16,0.60) 100%)', zIndex: 1 }} />

      {/* Warm brownish-amber bloom from top-right corner — perceptible as brown warmth */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 55% 45% at 88% 8%, rgba(140,90,20,0.42) 0%, transparent 60%)',
      }} />

      {/* LAYER 2: Grain — dark warm olive tint #1e1a0e */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', mixBlendMode: 'screen', opacity: 0.9 }}>
        <Grainient
          color1="#1e1a0e"
          color2="#2d2510"
          color3="#151208"
          timeSpeed={0.22}
          warpStrength={0.12}
          warpFrequency={9.5}
          warpSpeed={3.8}
          warpAmplitude={240}
          grainAmount={0.17}
          grainScale={1.75}
          grainAnimated={true}
          contrast={0.75}
          saturation={0.2}
          zoom={1.0}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* CONTENT */}
      <div style={{ position: 'relative', zIndex: 3, padding: '120px 52px', color: T.cream }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 100, alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 120 }}>
            <SectionRule label="Orion" num="03" />
            <div style={{ marginBottom: 32, display: 'inline-flex', alignItems: 'center', gap: 10, border: `1px solid rgba(196,160,96,0.4)`, padding: '10px 20px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.gold, animation: 'pulse 2.5s ease-in-out infinite' }} />
              <span style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: T.gold }}>Thinking Companion</span>
            </div>
            <h2 style={{ fontFamily: T.serif, fontWeight: 900, fontSize: 'clamp(48px, 6.5vw, 84px)', lineHeight: 0.9, letterSpacing: '-0.02em', color: T.cream, marginBottom: 24 }}>
              How you<br />feel.<br /><GoldWord>How you think.</GoldWord>
            </h2>
            <p style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 11, lineHeight: 1.9, letterSpacing: '0.04em', color: 'rgba(250,243,232,0.4)', maxWidth: 320, marginBottom: 36 }}>
              Orion is your dedicated mind trainer. While Lumina holds your emotional world, Orion watches how you reason, remember, and solve, and connects the two into one living picture of your wellbeing.
            </p>
            <div style={{ fontFamily: T.script, fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(22px, 3vw, 34px)', color: 'rgba(196,160,96,0.4)', lineHeight: 1.2 }}>
              "A personal trainer<br />for your mind."
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { n: '01', title: 'Cognitive Threading', tag: 'Live pattern detection', body: "Orion links your Memory Game accuracy to your Inner Ledger entries in real time. A drop in spatial recall after a journal entry containing specific emotional markers surfaces a Cognitive Load insight, not a failure screen." },
              { n: '02', title: 'Rhythm of Thought', tag: 'Proactive focus detection', body: "Orion measures the variance in how long you take to answer, not just whether you got it right. If you answer correctly but took 400% longer than your personal baseline, Orion flags Cognitive Friction and suggests a break before you start struggling." },
              { n: '03', title: 'The Reflective Sandwich', tag: 'Pre, session, debrief', body: "Every session has three parts: a Pre-Session mood check, the exercise itself, and an Orion Debrief. The debrief is a synthesis in four parts: a headline, what happened, what it reveals about your mind today, and one thing to try next time." },
              { n: '04', title: 'Live Coaching', tag: 'In-session presence', body: "During every game, Orion sends 1 to 2 sentence messages: celebrating a difficult streak, offering a tactical tip for a specific level, or noting a unique pattern it spotted in your choices. It is present, not passive." },
              { n: '05', title: 'Orion Memory', tag: 'Long-term adaptation', body: "Orion remembers your journey across all sessions. It learns your personal baselines, notices if you consistently reach a wall at a certain difficulty, and builds tailored strategies to help you move past it." },
              { n: '06', title: 'Daily Mind Prompts', tag: 'Outside the games', body: "Orion provides rotating thinking scenarios, 2-minute mental drills, curiosity prompts, and daily challenges you can do anywhere. Your mind stays sharp between sessions, not just during them." },
            ].map(item => (
              <div key={item.n} style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 28, padding: '36px 0', borderBottom: '1px solid rgba(250,243,232,0.06)', alignItems: 'start' }}>
                <span style={{ fontFamily: T.serif, fontWeight: 900, fontSize: 'clamp(44px, 4.5vw, 68px)', lineHeight: 0.85, letterSpacing: '-0.04em', color: 'rgba(250,243,232,0.07)' }}>{item.n}</span>
                <div>
                  <div style={{ fontFamily: T.serif, fontWeight: 700, fontSize: 22, color: T.cream, marginBottom: 8, lineHeight: 1.1 }}>{item.title}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 7.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.gold, border: `1px solid rgba(196,160,96,0.25)`, padding: '4px 11px', display: 'inline-block', marginBottom: 12 }}>{item.tag}</div>
                  <div style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 10.5, lineHeight: 1.88, letterSpacing: '0.04em', color: 'rgba(250,243,232,0.4)', maxWidth: 460 }}>{item.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── S5: DIAGNOSTICS SPLIT — CREAM LEFT / NEAR-BLACK RIGHT ────────────────────
// Left half: cream/parchment (#f0e8d8), independent grain canvas (#ddd0b8 tint)
// Right half: near-black (#0d0a06), independent grain canvas (#1a1208 tint)
// Each panel gets its own gradient + grain layer, isolated with overflow:hidden

function Diagnostics() {
  return (
    <section id="science" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh', overflow: 'hidden' }}>

      {/* ── LEFT PANEL: cream/parchment — Self Reflection ── */}
      <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

        {/* Left gradient mesh: gentle warm directional gradient, lighter at center */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Grainient
            color1="#f5e6c8"
            color2="#c4a882"
            color3="#7a5c38"
            timeSpeed={0.09}
            warpStrength={0.7}
            warpFrequency={3.0}
            blendAngle={70}
            grainAmount={0.0}
            contrast={1.2}
            saturation={0.65}
            zoom={0.95}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Cream overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(237,218,188,0.80)', zIndex: 1 }} />

        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle, rgba(28,20,16,0.05) 1px, transparent 1px)', backgroundSize: '15px 15px', zIndex: 2 }} />

        {/* Left grain: cream tint #ddd0b8, isolated within this panel */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', mixBlendMode: 'multiply' }}>
          <Grainient
            color1="#ddd0b8"
            color2="#ccc0a0"
            color3="#b8a888"
            timeSpeed={0.21}
            warpStrength={0.12}
            warpFrequency={9.5}
            warpSpeed={3.6}
            warpAmplitude={230}
            grainAmount={0.17}
            grainScale={1.8}
            grainAnimated={true}
            contrast={0.78}
            saturation={0.18}
            zoom={1.0}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 4, padding: '100px 52px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <SectionRule label="Self Reflection" num="04" light />
            <div style={{ fontFamily: T.serif, fontWeight: 900, fontSize: 'clamp(72px, 10vw, 132px)', lineHeight: 0.9, letterSpacing: '-0.04em', color: T.ink }}>7</div>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(28,20,16,0.3)', marginTop: 12, marginBottom: 48 }}>Reflection Instruments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { code: 'Mood', name: 'How you have been feeling lately' },
                { code: 'Anxiety', name: 'What worry feels like in your body' },
                { code: 'Self-Worth', name: 'How you see yourself, honestly' },
                { code: 'Attachment', name: 'How you relate to the people close to you' },
                { code: 'Personality', name: 'Your Big Five traits, in plain language' },
                { code: 'Shadow', name: 'The darker patterns you rarely acknowledge' },
                { code: 'Emotional IQ', name: 'How you read and manage emotions' },
              ].map(s => (
                <div key={s.code} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0', borderTop: '1px solid rgba(28,20,16,0.07)' }}>
                  <span style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(28,20,16,0.28)', flexShrink: 0, marginTop: 2, width: 88 }}>{s.code}</span>
                  <span style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 10.5, color: 'rgba(28,20,16,0.55)', lineHeight: 1.7 }}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 48 }}>
            <div style={{ fontFamily: T.script, fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(28px, 4vw, 46px)', color: 'rgba(28,20,16,0.3)', lineHeight: 1.15 }}>
              Accuracy<br />without stigma.
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: near-black — Memory Games ── */}
      <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

        {/* Right gradient mesh: warm radial amber bloom from top-right, reads as WARM dark brown */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Grainient
            color1="#3a2a1e"
            color2="#241a13"
            color3="#0d0a06"
            timeSpeed={0.07}
            warpStrength={0.6}
            warpFrequency={3.8}
            warpSpeed={1.1}
            blendAngle={30}
            grainAmount={0.0}
            contrast={1.6}
            saturation={0.38}
            zoom={0.92}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Warm amber bloom from top-right */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 92% 12%, rgba(110,60,14,0.45) 0%, transparent 62%)',
        }} />

        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,10,6,0.55)', zIndex: 1 }} />

        {/* Right grain: dark warm tint #1a1208, isolated within this panel */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', mixBlendMode: 'screen', opacity: 0.9 }}>
          <Grainient
            color1="#1a1208"
            color2="#261a0c"
            color3="#0d0a06"
            timeSpeed={0.22}
            warpStrength={0.12}
            warpFrequency={9.5}
            warpSpeed={3.8}
            warpAmplitude={240}
            grainAmount={0.17}
            grainScale={1.75}
            grainAnimated={true}
            contrast={0.75}
            saturation={0.20}
            zoom={1.0}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 3, padding: '100px 52px' }}>
          <SectionRule label="Memory Games" num="05" />
          <h2 style={{ fontFamily: T.serif, fontWeight: 900, fontSize: 'clamp(40px, 5.5vw, 68px)', lineHeight: 0.92, letterSpacing: '-0.015em', color: T.cream, marginBottom: 32 }}>
            Eight<br />Games.<br /><em style={{ fontStyle: 'italic', color: 'rgba(196,168,130,0.7)' }}>Infinite Insight.</em>
          </h2>
          <p style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 10.5, lineHeight: 1.95, letterSpacing: '0.04em', color: 'rgba(250,243,232,0.42)', maxWidth: 360, marginBottom: 44 }}>
            Cognitive exercises modelled after the same tasks used in brain health research. Not entertainment. Real insight into how your mind works, with Orion watching every move.
          </p>
          {[
            { label: 'Working Memory', sub: 'Holding and using information in the moment' },
            { label: 'Fluid Reasoning', sub: 'Solving new problems without prior knowledge' },
            { label: 'Executive Function', sub: 'Manipulating information, not just storing it' },
            { label: 'Processing Speed', sub: 'Your personal rhythm, measured against your own baseline' },
          ].map(item => (
            <div key={item.label} style={{ padding: '20px 0', borderBottom: '1px solid rgba(250,243,232,0.06)' }}>
              <div style={{ fontFamily: T.serif, fontWeight: 700, fontSize: 17, color: T.cream, marginBottom: 6, lineHeight: 1.1 }}>{item.label}</div>
              <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(250,243,232,0.3)', lineHeight: 1.8 }}>{item.sub}</div>
            </div>
          ))}
          <div style={{ marginTop: 44, padding: '24px', background: 'rgba(250,243,232,0.03)', border: `1px solid rgba(250,243,232,0.08)`, borderLeft: `3px solid rgba(196,160,96,0.5)` }}>
            <div style={{ fontFamily: T.mono, fontSize: 7.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.gold, marginBottom: 10 }}>Orion is present</div>
            <div style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 10, lineHeight: 1.8, color: 'rgba(250,243,232,0.45)' }}>During every session, Orion watches your rhythm, celebrates your streaks, and prepares a personalised debrief for when you finish.</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── S6: INNER WORK — cream (#ede5d4) ────────────────────────────────────────
// Background: cream (#ede5d4)
// Grain tint: warm parchment (#d4c9b0)
// Cream sections: very gentle directional warm gradient

function InnerWork() {
  return (
    <section id="inner-work" style={{ position: 'relative', overflow: 'hidden', minHeight: '95vh', display: 'flex', alignItems: 'center', background: '#ede5d4' }}>
      {/* LAYER 1: Gradient mesh — very gentle directional warm gradient, slightly darker at edges */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse 80% 60% at 40% 40%, #d4c9a8 0%, #ede5d4 70%)' }}>
        <Grainient
          color1="#d4c9a8"
          color2="#b8a882"
          color3="#3a2a1e"
          timeSpeed={0.07}
          warpStrength={0.48}
          warpFrequency={2.4}
          warpSpeed={0.75}
          blendAngle={-42}
          grainAmount={0.0}
          contrast={1.18}
          saturation={0.52}
          zoom={1.0}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Cream overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(238,224,196,0.84)', zIndex: 1 }} />

      {/* LAYER 2: Grain — warm parchment tint #d4c9b0 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', mixBlendMode: 'multiply' }}>
        <Grainient
          color1="#d4c9b0"
          color2="#c4b89a"
          color3="#b0a480"
          timeSpeed={0.20}
          warpStrength={0.12}
          warpFrequency={9.2}
          warpSpeed={3.5}
          warpAmplitude={225}
          grainAmount={0.16}
          grainScale={1.85}
          grainAnimated={true}
          contrast={0.78}
          saturation={0.18}
          zoom={1.0}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Ghost wordmark */}
      <div style={{ position: 'absolute', bottom: -30, left: -10, fontFamily: T.serif, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(120px, 17vw, 210px)', lineHeight: 1, color: 'rgba(28,20,16,0.033)', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 3 }}>Inner Work</div>

      {/* CONTENT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 100, position: 'relative', zIndex: 4, width: '100%', padding: '112px 52px', color: T.ink }}>
        <div>
          <SectionRule label="Guided Sessions" num="06" light />
          <h2 style={{ fontFamily: T.serif, fontWeight: 900, fontSize: 'clamp(48px, 6.5vw, 84px)', lineHeight: 0.9, letterSpacing: '-0.02em', color: T.ink, marginBottom: 48 }}>
            Built on<br /><em style={{ fontStyle: 'italic', color: T.umber }}>Evidence.</em><br />Spoken in warmth.
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 52 }}>
            {['Thought Reframing', 'Activation', 'Values Clarity', 'Self-Compassion', 'Socratic Method'].map(tag => (
              <div key={tag} style={{ border: `1px solid rgba(28,20,16,0.22)`, padding: '9px 17px', fontFamily: T.serif, fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', color: T.ink }}>{tag}</div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { n: '01', title: 'Thought Reframing', body: 'Identify the automatic thoughts that loop quietly in the background. Socratic questions surface them without forcing positivity.' },
              { n: '02', title: 'Activation', body: 'Build a gentle ladder of activities ranked by how daunting they feel. Momentum comes before motivation.' },
              { n: '03', title: 'Values Clarity', body: 'Separate who you are from what you think. Identify what genuinely matters and reconnect with it.' },
              { n: '04', title: 'Self-Compassion', body: 'Quiet the inner critic using the same techniques that actually work. A log of evidence against the harsh voice in your head.' },
            ].map(item => (
              <div key={item.n} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 20, padding: '20px 0', borderBottom: '1px solid rgba(28,20,16,0.08)', alignItems: 'start' }}>
                <span style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 18, color: 'rgba(28,20,16,0.2)', lineHeight: 1 }}>{item.n}</span>
                <div>
                  <div style={{ fontFamily: T.serif, fontWeight: 700, fontSize: 16, color: T.ink, marginBottom: 6, lineHeight: 1.1 }}>{item.title}</div>
                  <span style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 10, lineHeight: 1.85, letterSpacing: '0.04em', color: 'rgba(28,20,16,0.5)' }}>{item.body}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: T.script, fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(34px, 4.8vw, 58px)', color: 'rgba(28,20,16,0.28)', lineHeight: 1.1, marginBottom: 52 }}>
            "Not therapy.<br />A way forward."
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 52 }}>
            {[
              { n: '7', l: 'Reflection Instruments' },
              { n: '8', l: 'Memory Games' },
              { n: '4', l: 'Inner Work Modules' },
              { n: '0', l: 'Data Sold. Ever.' },
            ].map(s => (
              <div key={s.l} style={{ borderTop: '1px solid rgba(28,20,16,0.1)', paddingTop: 16 }}>
                <span style={{ fontFamily: T.serif, fontWeight: 700, fontSize: 52, lineHeight: 1, color: T.ink, display: 'block', letterSpacing: '-0.03em' }}>{s.n}</span>
                <span style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(28,20,16,0.32)', display: 'block', marginTop: 4 }}>{s.l}</span>
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse 80% 60% at 30% 30%, #c4a882 0%, #ede0c4 70%)' }}>
            <Grainient color1="#c4a882" color2="#f0dfc0" color3="#7a5c38" timeSpeed={0.12} grainAmount={0.07} contrast={1.3} saturation={0.8} style={{ width: '100%', height: '100%' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 900, fontSize: 28, color: T.ink, letterSpacing: '-0.01em' }}>The Inner Ledger</div>
              <div style={{ fontFamily: T.mono, fontSize: 7.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(28,20,16,0.45)' }}>3D Journal · Mood Stickers · Emotional Timeline</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── S7: PRIVACY — pure black (#080604) ───────────────────────────────────────
// Background: pure black (#080604)
// Grain tint: very dark warm brown (#120e08)
// Dark sections: warm radial glow, brownish-amber bloom

function Privacy() {
  return (
    <section id="privacy" style={{ position: 'relative', overflow: 'hidden', minHeight: '90vh', display: 'flex', alignItems: 'center', background: '#080604' }}>
      {/* LAYER 1: Gradient mesh — pure black, warm radial glow from corner */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse 50% 40% at 85% 10%, #241a13 0%, #080604 60%)' }}>
        <Grainient
          color1="#241a13"
          color2="#3a2a1e"
          color3="#080604"
          timeSpeed={0.06}
          warpStrength={0.8}
          warpFrequency={5.5}
          warpSpeed={2.0}
          blendAngle={15}
          grainAmount={0.0}
          contrast={1.6}
          saturation={0.35}
          zoom={0.78}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Dark base overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,6,4,0.68)', zIndex: 1 }} />

      {/* Warm amber bloom — perceptible brownish warmth */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: [
          'radial-gradient(ellipse 48% 42% at 82% 14%, rgba(100,58,12,0.40) 0%, transparent 58%)',
          'radial-gradient(ellipse 35% 60% at 5% 88%, rgba(70,40,8,0.22) 0%, transparent 55%)',
        ].join(','),
      }} />

      {/* LAYER 2: Grain — very dark warm brown tint #120e08 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', mixBlendMode: 'screen', opacity: 0.9 }}>
        <Grainient
          color1="#120e08"
          color2="#1c160e"
          color3="#080604"
          timeSpeed={0.23}
          warpStrength={0.12}
          warpFrequency={10.0}
          warpSpeed={4.2}
          warpAmplitude={260}
          grainAmount={0.17}
          grainScale={1.7}
          grainAnimated={true}
          contrast={0.72}
          saturation={0.15}
          zoom={1.0}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Concentric circle decoration */}
      <svg style={{ position: 'absolute', top: '50%', right: -180, transform: 'translateY(-50%)', opacity: 0.055, pointerEvents: 'none', zIndex: 3 }} width="540" height="540" viewBox="0 0 540 540">
        {[36, 80, 128, 180, 234, 264].map((r, i) => <circle key={r} cx="270" cy="270" r={r} fill="none" stroke="#f5e6c8" strokeWidth={i < 4 ? 1 : 0.7} />)}
      </svg>

      {/* CONTENT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 100, alignItems: 'center', position: 'relative', zIndex: 4, width: '100%', padding: '120px 52px', color: T.cream }}>
        <div>
          <SectionRule label="Local-First Privacy" num="07" />
          <h2 style={{ fontFamily: T.serif, fontWeight: 900, fontSize: 'clamp(52px, 7vw, 88px)', lineHeight: 0.9, letterSpacing: '-0.02em', marginBottom: 36 }}>
            What you share<br /><em style={{ fontStyle: 'italic', color: 'rgba(196,168,130,0.7)' }}>stays with you.</em>
          </h2>
          <p style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 11, lineHeight: 1.9, color: 'rgba(250,243,232,0.4)', maxWidth: 400, marginBottom: 48 }}>
            Lumina runs on Ollama, a local model runtime. The most sensitive work, your journal analysis, your Self Reflection scoring, your personality synthesis, happens on your machine. No cloud inference. No training on your data. No advertising. No surveillance.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { n: '01', body: 'Local AI inference via Ollama. Your Inner Ledger never leaves your device.' },
              { n: '02', body: 'No data sold to advertisers. No third-party access to your reflection results.' },
              { n: '03', body: 'Support resources are triggered locally. Nothing flags a server.' },
              { n: '04', body: 'Open architecture. You can inspect everything that runs, everything that is stored.' },
            ].map(item => (
              <div key={item.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 0', borderTop: '1px solid rgba(250,243,232,0.07)' }}>
                <span style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(250,243,232,0.2)', flexShrink: 0, marginTop: 2 }}>{item.n}</span>
                <span style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 10, color: 'rgba(250,243,232,0.45)', lineHeight: 1.7 }}>{item.body}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 36, background: 'rgba(250,243,232,0.03)', border: '1px solid rgba(250,243,232,0.08)', boxShadow: `5px 5px 0 rgba(90,60,36,0.5)` }}>
          <div style={{ fontFamily: T.serif, fontWeight: 900, fontSize: 20, color: T.cream, letterSpacing: '-0.01em', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(250,243,232,0.08)' }}>Privacy Manifest</div>
          {[
            ['Data Location', 'Your device only'],
            ['AI Runtime', 'Ollama, local inference'],
            ['Reflection Scoring', 'On-device'],
            ['Inner Ledger', 'Never transmitted'],
            ['Third-Party Sharing', 'None, ever'],
            ['Advertising', 'None, ever'],
          ].map(([label, value]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontFamily: T.mono, fontSize: 6.5, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(250,243,232,0.22)', marginBottom: 3 }}>{label}</label>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.cream, letterSpacing: '0.03em' }}>{value}</div>
            </div>
          ))}
          <div style={{ marginTop: 18, padding: '10px 12px', background: 'rgba(90,60,36,0.25)', fontFamily: T.mono, fontSize: 7.5, letterSpacing: '0.14em', color: T.gold, lineHeight: 1.7, borderLeft: `2px solid ${T.gold}` }}>
            Built for the era when your mind is the last private place.
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── S8: CTA — muted warm taupe-brown gradient (#4a3d2e → #2d2318) ─────────────
// Grain tint: warm mid-brown (#5a4a35)

function CTA() {
  return (
    <section id="begin" style={{ position: 'relative', overflow: 'hidden', minHeight: '80vh', display: 'flex', flexDirection: 'column', background: '#2d2318' }}>
      {/* LAYER 1: Gradient mesh — muted warm taupe-brown */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 30%, #4a3d2e 0%, #2d2318 70%)' }}>
        <Grainient
          color1="#c4a882"
          color2="#6a5440"
          color3="#2d2318"
          timeSpeed={0.10}
          warpStrength={0.7}
          grainAmount={0.0}
          contrast={1.35}
          saturation={0.72}
          zoom={0.9}
          blendAngle={-10}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(28,20,16,0.65) 0%, rgba(28,20,16,0.82) 100%)', zIndex: 1 }} />

      {/* LAYER 2: Grain — warm mid-brown tint #5a4a35 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', mixBlendMode: 'screen', opacity: 0.88 }}>
        <Grainient
          color1="#5a4a35"
          color2="#6a5a42"
          color3="#4a3a28"
          timeSpeed={0.21}
          warpStrength={0.12}
          warpFrequency={9.0}
          warpSpeed={3.6}
          warpAmplitude={235}
          grainAmount={0.17}
          grainScale={1.8}
          grainAnimated={true}
          contrast={0.77}
          saturation={0.30}
          zoom={1.0}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Top accent strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', height: 5, zIndex: 3 }}>
        <span style={{ flex: 2, background: T.ink }} />
        <span style={{ flex: 1, background: `rgba(196,160,96,0.6)` }} />
        <span style={{ flex: 1, background: T.cream, opacity: 0.12 }} />
        <span style={{ flex: 3, background: T.ink }} />
        <span style={{ flex: 1, background: 'rgba(196,168,130,0.18)' }} />
      </div>

      {/* CONTENT */}
      <div style={{ position: 'relative', zIndex: 4, fontFamily: T.serif, fontWeight: 300, fontSize: 'clamp(38px, 6vw, 82px)', lineHeight: 1.05, letterSpacing: '-0.01em', color: T.cream, maxWidth: 720, margin: '0 auto 80px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 52px 0' }}>
        Every thought held.<br />
        Every pattern <strong style={{ fontWeight: 900 }}>understood.</strong>
        <span style={{ fontFamily: T.script, fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(48px, 8vw, 112px)', color: 'rgba(250,243,232,0.28)', display: 'block', lineHeight: 1, margin: '8px 0', letterSpacing: '0.01em' }}>privately.</span>
        <div style={{ marginTop: 52, display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={goToSignup}
            style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: T.ink, background: T.cream, padding: '16px 40px', border: 'none', cursor: 'pointer', boxShadow: `3px 3px 0 ${T.umber}`, transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `5px 5px 0 ${T.umber}` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = `3px 3px 0 ${T.umber}` }}
          >Begin Your Journey</button>
          <a href="#features" style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(250,243,232,0.38)', textDecoration: 'none', borderBottom: '1px solid rgba(250,243,232,0.16)', paddingBottom: 2, alignSelf: 'center', transition: 'color .2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.chalk }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(250,243,232,0.38)' }}
          >Explore Features</a>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'relative', zIndex: 4, padding: '0 52px', borderTop: '1px solid rgba(250,243,232,0.07)', paddingTop: 44, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 60, marginBottom: 44 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
            <div style={{ fontFamily: T.serif, fontWeight: 900, fontSize: 40, letterSpacing: '-0.02em', color: T.cream, opacity: 0.1 }}>Lumina</div>
            <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.gold, opacity: 0.3 }}>+ Orion</div>
          </div>
          <div style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 10, color: 'rgba(250,243,232,0.28)', lineHeight: 1.85, maxWidth: 300 }}>A private sanctuary for your emotional wellbeing and mental sharpness, built on honest science and the belief that self-knowledge is the rarest luxury.</div>
        </div>
        {[
          { head: 'Features', links: ['Self Reflection', 'Inner Work', 'Memory Games', 'Inner Ledger', 'Orion'] },
          { head: 'Orion', links: ['Cognitive Threading', 'Live Coaching', 'Reflective Debrief', 'Daily Prompts', 'Privacy'] },
        ].map(col => (
          <div key={col.head}>
            <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(250,243,232,0.2)', marginBottom: 16 }}>{col.head}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.links.map(l => (
                <li key={l}><a href="#" style={{ fontFamily: T.sans, fontWeight: 300, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(250,243,232,0.28)', textDecoration: 'none', transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = T.chalk)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(250,243,232,0.28)')}
                >{l}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ position: 'relative', zIndex: 4, padding: '0 52px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(250,243,232,0.06)', paddingTop: 20 }}>
        <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,243,232,0.18)' }}>2026 Lumina. Your mind stays yours.</div>
        <div style={{ display: 'flex', gap: 18, fontFamily: T.mono, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.35)' }}>
          <span>Local AI</span><span>No Ads</span><span>Open Source</span>
        </div>
      </div>
    </section>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function LuminaOrionLanding() {
  return (
    <>
      <style suppressHydrationWarning>{`
        @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=DM+Sans:ital,wght@0,200;0,300;0,400;1,200&family=IBM+Plex+Mono:wght@300;400&display=swap");
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { background: #1c1410; color: #f5e6c8; font-family: 'DM Sans', sans-serif; overflow-x: hidden; cursor: crosshair; }
        a { color: inherit; text-decoration: none; }
        button { cursor: crosshair; background: none; }
        @keyframes tick { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes textShimmer { to { background-position: -200% center; } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
      `}</style>
      <Nav />
      <Hero />
      <Ticker />
      <Philosophy />
      <FeaturesGrid />
      <OrionSection />
      <Diagnostics />
      <InnerWork />
      <Privacy />
      <CTA />
    </>
  )
}