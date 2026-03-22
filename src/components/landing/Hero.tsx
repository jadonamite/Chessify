'use client'
import Image from 'next/image'
import Link from 'next/link'
import GlowButton from '@/components/ui/GlowButton'
import ThemeToggle from '@/components/ui/ThemeToggle'

function Navbar() {
  return (
    <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 52px', position:'relative', zIndex:10 }}>
      {/* Logo group */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div className="sku-pill" style={{ height:40, padding:'0 14px', borderRadius:999, display:'flex', alignItems:'center', gap:10 }}>
          {/* <Image src="/Piece.png" alt="Chessify" width={22} height={22} style={{ objectFit:'contain', borderRadius:4 }} /> */}
          <Image src="/Chessify.png" alt="Chessify" width={80} height={18} style={{ objectFit:'contain' }} />
        </div>
        <div className="vel-pill">
          <span style={{ fontFamily:'var(--fd)', fontSize:9, fontWeight:600, color:'rgba(0,204,255,.7)', letterSpacing:'.12em' }}>BY VELOCITY LABS</span>
        </div>
      </div>

      {/* Links */}
      <div className="sku-pill" style={{ display:'flex', alignItems:'center', gap:28, borderRadius:999, padding:'15px 30px' }}>
        {['How it works','Leaderboard','Faucet'].map(l => (
          <a key={l} href={`#${l.toLowerCase().replace(' ','-')}`}
            style={{ fontFamily:'var(--fd)', fontSize:10, fontWeight:500, color:'var(--t2)', textDecoration:'none', letterSpacing:'.06em', transition:'color .2s' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color='var(--c)' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color='var(--t2)' }}
          >{l}</a>
        ))}
      </div>  

      {/* Right */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <ThemeToggle />
        <Link href="/app/lobby"><GlowButton size="sm">Launch App</GlowButton></Link>
      </div>
    </nav>
  )
}

/* ── CHESS PIECE SVGs ── */
function KingPiece() {
  return (
    <svg viewBox="0 0 80 130" width="100%" style={{ filter:'drop-shadow(0 0 20px rgba(0,204,255,.25))' }}>
      <defs>
        <radialGradient id="kg1" cx="30%" cy="25%" r="70%"><stop offset="0%" stopColor="#2a2a50"/><stop offset="100%" stopColor="#080812"/></radialGradient>
        <radialGradient id="kg2" cx="30%" cy="25%" r="70%"><stop offset="0%" stopColor="#1e3a3a"/><stop offset="100%" stopColor="#040e10"/></radialGradient>
      </defs>
      <ellipse cx="40" cy="122" rx="26" ry="7" fill="rgba(0,0,0,.5)"/>
      <path d="M14 116 Q13 85 20 68 L30 54 L50 54 L60 68 Q67 85 66 116Z" fill="url(#kg1)" stroke="rgba(0,204,255,.4)" strokeWidth="0.8"/>
      <path d="M14 116 Q13 85 20 68 L28 60 L28 54 L30 54 L20 68 Q13 85 14 116Z" fill="rgba(255,255,255,.04)"/>
      <rect x="22" y="83" width="36" height="8" rx="4" fill="url(#kg2)" stroke="rgba(0,204,255,.35)" strokeWidth="0.7"/>
      <rect x="29" y="43" width="22" height="14" rx="3" fill="url(#kg1)" stroke="rgba(0,204,255,.3)" strokeWidth="0.7"/>
      <path d="M20 43 Q20 20 40 15 Q60 20 60 43Z" fill="url(#kg1)" stroke="rgba(0,204,255,.35)" strokeWidth="0.8"/>
      <path d="M20 43 Q20 20 40 15 Q28 20 24 43Z" fill="rgba(255,255,255,.05)"/>
      <rect x="38" y="3" width="4" height="16" rx="2" fill="#00ccff" style={{ filter:'drop-shadow(0 0 6px #00ccff)' }}/>
      <rect x="30" y="8" width="20" height="4" rx="2" fill="#00ccff" style={{ filter:'drop-shadow(0 0 6px #00ccff)' }}/>
      <circle cx="24" cy="39" r="3" fill="#00ccff" style={{ filter:'drop-shadow(0 0 5px #00ccff)' }}/>
      <circle cx="40" cy="33" r="3" fill="#00ccff" style={{ filter:'drop-shadow(0 0 5px #00ccff)' }}/>
      <circle cx="56" cy="39" r="3" fill="#00ccff" style={{ filter:'drop-shadow(0 0 5px #00ccff)' }}/>
    </svg>
  )
}

function QueenPiece() {
  return (
    <svg viewBox="0 0 80 130" width="100%" style={{ filter:'drop-shadow(0 12px 20px rgba(0,0,0,.6))' }}>
      <defs>
        <linearGradient id="qg1" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#d8d8f0"/><stop offset="50%" stopColor="#9090b0"/><stop offset="100%" stopColor="#505068"/>
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="122" rx="26" ry="7" fill="rgba(0,0,0,.5)"/>
      <path d="M14 116 Q13 85 20 68 L30 56 L50 56 L60 68 Q67 85 66 116Z" fill="url(#qg1)" stroke="rgba(255,255,255,.2)" strokeWidth="0.8"/>
      <path d="M14 116 Q13 85 20 68 L28 62 L28 56 L30 56 L20 68 Q13 85 14 116Z" fill="rgba(255,255,255,.12)"/>
      <rect x="22" y="83" width="36" height="8" rx="4" fill="rgba(0,204,255,.18)" stroke="rgba(0,204,255,.45)" strokeWidth="0.7"/>
      <path d="M20 43 Q20 22 40 18 Q60 22 60 43Z" fill="url(#qg1)" stroke="rgba(255,255,255,.15)" strokeWidth="0.7"/>
      <path d="M20 43 Q20 22 40 18 Q28 22 24 43Z" fill="rgba(255,255,255,.2)"/>
      <path d="M20 36 L26 43 L40 26 L54 43 L60 36 L55 43 L25 43Z" fill="url(#qg1)" stroke="rgba(255,255,255,.2)" strokeWidth="0.7"/>
      <circle cx="20" cy="33" r="3.5" fill="#00ccff" style={{ filter:'drop-shadow(0 0 6px #00ccff)' }}/>
      <circle cx="40" cy="23" r="3.5" fill="#00ccff" style={{ filter:'drop-shadow(0 0 6px #00ccff)' }}/>
      <circle cx="60" cy="33" r="3.5" fill="#00ccff" style={{ filter:'drop-shadow(0 0 6px #00ccff)' }}/>
    </svg>
  )
}

function BishopPiece() {
  return (
    <svg viewBox="0 0 70 115" width="100%" style={{ filter:'drop-shadow(0 0 16px rgba(0,204,255,.18))' }}>
      <defs>
        <radialGradient id="bg3" cx="30%" cy="25%" r="70%"><stop offset="0%" stopColor="#242440"/><stop offset="100%" stopColor="#06060e"/></radialGradient>
      </defs>
      <ellipse cx="35" cy="108" rx="22" ry="6" fill="rgba(0,0,0,.5)"/>
      <path d="M12 104 Q11 78 17 63 L24 50 L46 50 L53 63 Q59 78 58 104Z" fill="url(#bg3)" stroke="rgba(0,204,255,.25)" strokeWidth="0.8"/>
      <path d="M12 104 Q11 78 17 63 L22 56 L22 50 L24 50 L17 63 Q11 78 12 104Z" fill="rgba(255,255,255,.04)"/>
      <rect x="16" y="77" width="38" height="7" rx="3.5" fill="rgba(0,204,255,.08)" stroke="rgba(0,204,255,.22)" strokeWidth="0.6"/>
      <ellipse cx="35" cy="34" rx="15" ry="18" fill="url(#bg3)" stroke="rgba(0,204,255,.22)" strokeWidth="0.7"/>
      <ellipse cx="32" cy="28" rx="5" ry="7" fill="rgba(255,255,255,.04)"/>
      <circle cx="35" cy="11" r="5" fill="rgba(0,204,255,.1)" stroke="rgba(0,204,255,.4)" strokeWidth="1"/>
      <circle cx="35" cy="11" r="2.5" fill="#00ccff" style={{ filter:'drop-shadow(0 0 5px #00ccff)' }}/>
    </svg>
  )
}

function KnightPiece() {
  return (
    <svg viewBox="0 0 78 118" width="100%" style={{ filter:'drop-shadow(0 10px 18px rgba(0,0,0,.6))' }}>
      <defs>
        <linearGradient id="ng1" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#c0c0d8"/><stop offset="50%" stopColor="#787890"/><stop offset="100%" stopColor="#3a3a50"/>
        </linearGradient>
      </defs>
      <ellipse cx="38" cy="111" rx="24" ry="6" fill="rgba(0,0,0,.5)"/>
      <path d="M13 107 Q12 80 18 66 L25 52 L52 52 L58 66 Q64 80 62 107Z" fill="url(#ng1)" stroke="rgba(255,255,255,.15)" strokeWidth="0.8"/>
      <path d="M13 107 Q12 80 18 66 L23 58 L23 52 L25 52 L18 66 Q12 80 13 107Z" fill="rgba(255,255,255,.1)"/>
      <rect x="17" y="78" width="40" height="8" rx="4" fill="rgba(0,204,255,.12)" stroke="rgba(0,204,255,.3)" strokeWidth="0.6"/>
      <path d="M20 52 Q17 28 28 20 Q38 12 55 17 Q64 19 62 33 Q60 45 50 49 Q43 52 20 52Z" fill="url(#ng1)" stroke="rgba(255,255,255,.15)" strokeWidth="0.7"/>
      <path d="M20 52 Q17 28 28 20 Q24 26 22 52Z" fill="rgba(255,255,255,.12)"/>
      <circle cx="52" cy="25" r="2.5" fill="#0a0a18"/>
    </svg>
  )
}

export default function Hero() {
  return (
    <section style={{ background:'var(--bg)', position:'relative', overflow:'hidden' }}>
      {/* Grid bg */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)', backgroundSize:'56px 56px', pointerEvents:'none' }}/>
      {/* Glow */}
      <div style={{ position:'absolute', top:'40%', left:'58%', transform:'translate(-50%,-50%)', width:600, height:500, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(0,204,255,.07) 0%,transparent 65%)', pointerEvents:'none' }}/>

      <Navbar />

      {/* Hero body */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', alignItems:'center', minHeight:'calc(100vh - 80px)', padding:'0 52px 48px', gap:40, position:'relative', zIndex:2 }}>

        {/* Left */}
        <div className="animate-fade-up">
          <div className="badge" style={{ marginBottom:32 }}>
            <span className="badge-dot"/>
            <span style={{ fontFamily:'var(--fd)', fontSize:9, fontWeight:600, color:'var(--c)', letterSpacing:'.14em' }}>ON-CHAIN CHESS — STACKS BLOCKCHAIN</span>
          </div>

          <h1 style={{ fontFamily:'var(--fd)', fontWeight:900, fontSize:'clamp(48px,6vw,72px)', lineHeight:.92, letterSpacing:'-.03em', marginBottom:24, color:'var(--t1)' }}>
            Be the<br/>
            <span style={{ color:'var(--c)', display:'block', textShadow:'0 0 60px rgba(0,204,255,.4)' }}>King</span>
            of Chess
          </h1>

          <p style={{ fontSize:15, color:'var(--t2)', lineHeight:1.75, marginBottom:36, maxWidth:380, fontWeight:300 }}>
            Wager CHESS tokens, play on-chain. Every move permanently recorded. Your rating, your winnings — provably yours.
          </p>

          <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:48, flexWrap:'wrap' }}>
            <Link href="/app/lobby"><GlowButton size="lg">Play Now</GlowButton></Link>
            <Link href="/app/faucet"><GlowButton variant="secondary" size="lg">Get CHESS Tokens</GlowButton></Link>
          </div>

          {/* Stats */}
          <div style={{ display:'flex' }}>
            {[{v:'CHESS',l:'TOKEN'},{v:'Stacks',l:'BLOCKCHAIN'},{v:'~10 days',l:'TIMEOUT'}].map((s,i) => (
              <div key={s.l} style={{ padding:'14px 24px', borderRight: i < 2 ? '1px solid rgba(255,255,255,.06)' : 'none', paddingLeft: i === 0 ? 0 : 24 }}>
                <div style={{ fontFamily:'var(--fd)', fontWeight:700, fontSize:17, color:'var(--c)', letterSpacing:'-.01em' }}>{s.v}</div>
                <div style={{ fontFamily:'var(--fd)', fontSize:9, color:'var(--t3)', letterSpacing:'.14em', marginTop:3 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — pieces stage */}
        <div style={{ position:'relative', height:520 }}>
          {/* Rings */}
          <div style={{ position:'absolute', top:'50%', left:'50%', width:300, height:300, border:'1px dashed rgba(0,204,255,.1)', borderRadius:'50%', transform:'translate(-50%,-50%)', animation:'rspin 25s linear infinite' }}/>
          <div style={{ position:'absolute', top:'50%', left:'50%', width:420, height:420, border:'1px solid rgba(0,204,255,.04)', borderRadius:'50%', transform:'translate(-50%,-50%)' }}/>

          {/* Pieces */}
          <div style={{ position:'absolute', left:55, top:10, width:170, animation:'float1 4.2s ease-in-out infinite' }}><KingPiece/></div>
          <div style={{ position:'absolute', right:20, top:30, width:150, animation:'float2 5.2s ease-in-out infinite' }}><QueenPiece/></div>
          <div style={{ position:'absolute', left:0, bottom:60, width:108, animation:'float3 4.8s ease-in-out infinite' }}><BishopPiece/></div>
          <div style={{ position:'absolute', right:55, bottom:40, width:118, animation:'float2 3.9s ease-in-out infinite' }}><KnightPiece/></div>

          {/* Float cards */}
          <div style={{ position:'absolute', right:-10, top:'43%', padding:'12px 18px', borderRadius:16, background:'linear-gradient(145deg,#0d1a2a,#091018)', border:'1px solid rgba(0,204,255,.22)', boxShadow:'0 1px 0 rgba(0,204,255,.12) inset,0 -1px 0 rgba(0,0,0,.5) inset,0 12px 30px rgba(0,204,255,.12)' }}>
            <div style={{ fontFamily:'var(--fd)', fontSize:9, letterSpacing:'.12em', color:'var(--t3)', marginBottom:3 }}>CURRENT LEADER</div>
            <div style={{ fontFamily:'var(--fd)', fontWeight:700, fontSize:14, color:'var(--c)' }}>ELO 2,418</div>
          </div>
          <div style={{ position:'absolute', left:-15, top:'60%', padding:'12px 18px', borderRadius:16, background:'linear-gradient(145deg,#161628,#0e0e1f)', border:'1px solid rgba(255,255,255,.08)', boxShadow:'0 1px 0 rgba(255,255,255,.07) inset,0 -1px 0 rgba(0,0,0,.5) inset,0 12px 30px rgba(0,0,0,.5)' }}>
            <div style={{ fontFamily:'var(--fd)', fontSize:9, letterSpacing:'.12em', color:'var(--t3)', marginBottom:3 }}>PRIZE POOL</div>
            <div style={{ fontFamily:'var(--fd)', fontWeight:700, fontSize:14, color:'var(--t1)' }}>1,000 CHESS</div>
          </div>
        </div>
      </div>

      {/* Scroll */}
      <div style={{ textAlign:'center', paddingBottom:40, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <span style={{ fontFamily:'var(--fd)', fontSize:9, letterSpacing:'.2em', color:'var(--t3)' }}>SCROLL</span>
        <div style={{ width:1, height:36, background:'linear-gradient(var(--c),transparent)' }}/>
      </div>
    </section>
  )
}
