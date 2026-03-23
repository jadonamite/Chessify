'use client'
import Image from 'next/image'
import Link from 'next/link'
import GlowButton from '@/components/ui/GlowButton'
import ThemeToggle from '@/components/ui/ThemeToggle'

const KEYFRAMES = `
@keyframes king-move   { 0%,100%{transform:translate(0,0) rotate(0)} 20%{transform:translate(0,-14px)} 40%{transform:translate(14px,-14px) rotate(.8deg)} 60%{transform:translate(14px,0)} 80%{transform:translate(0,0) rotate(-.4deg)} }
@keyframes queen-move  { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-48px,-32px)} 50%{transform:translate(-48px,16px)} 75%{transform:translate(24px,-24px)} }
@keyframes bishop-move { 0%,100%{transform:translate(0,0) rotate(0)} 30%{transform:translate(36px,-36px) rotate(2.5deg)} 60%{transform:translate(68px,0) rotate(-2deg)} 80%{transform:translate(36px,20px) rotate(0)} }
@keyframes knight-move { 0%,12%{transform:translate(0,0)} 28%{transform:translate(0,-56px)} 44%{transform:translate(28px,-56px)} 50%,65%{transform:translate(28px,-28px)} 80%{transform:translate(28px,-84px)} 94%{transform:translate(56px,-84px)} 100%{transform:translate(0,0)} }
@keyframes rook-move   { 0%,100%{transform:translate(0,0)} 25%{transform:translate(0,-46px)} 50%{transform:translate(44px,-46px)} 75%{transform:translate(44px,0)} }
@keyframes rspin       { to{transform:translate(-50%,-50%) rotate(360deg)} }
@keyframes pulseDot    { 0%,100%{box-shadow:0 0 8px var(--c),0 0 16px rgba(0,204,255,.4)} 50%{box-shadow:0 0 14px var(--c),0 0 28px rgba(0,204,255,.65)} }
@keyframes fadeUp      { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
`

const GRADIENTS = {
  kbg:   'linear-gradient(160deg,#353566 0%,#1a1a45 40%,#05050f 100%)',
  qbg:   'linear-gradient(160deg,#dcdcf8 0%,#aaaacc 30%,#585875 65%,#1e1e32 100%)',
  bbg:   'linear-gradient(160deg,#2a2a52 0%,#04040c 100%)',
  ngbg:  'linear-gradient(160deg,#d4d4ec 0%,#8c8caa 32%,#444460 72%,#161626 100%)',
  rbg:   'linear-gradient(160deg,#242445 0%,#04040c 100%)',
}

function KingPiece() {
  return (
    <svg viewBox="0 0 90 160" width="100%">
      <defs>
        <linearGradient id="kbg" x1="25%" y1="0%" x2="75%" y2="100%"><stop offset="0%" stopColor="#353566"/><stop offset="40%" stopColor="#1a1a45"/><stop offset="100%" stopColor="#05050f"/></linearGradient>
        <radialGradient id="ks" cx="26%" cy="16%" r="36%"><stop offset="0%" stopColor="rgba(255,255,255,.22)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/></radialGradient>
        <linearGradient id="kr" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="rgba(0,204,255,.52)"/><stop offset="28%" stopColor="rgba(0,204,255,.1)"/><stop offset="100%" stopColor="rgba(0,204,255,0)"/></linearGradient>
      </defs>
      <ellipse cx="45" cy="154" rx="28" ry="7.5" fill="rgba(0,0,0,.55)"/>
      <path d="M16 148Q15 145 13 138L19 130L71 130L77 138Q75 145 74 148Z" fill="url(#kbg)" stroke="rgba(0,204,255,.18)" strokeWidth="0.8"/>
      <path d="M16 148Q15 145 13 138L19 130L71 130L77 138Q75 145 74 148Z" fill="url(#ks)"/>
      <path d="M19 130Q17 107 23 88L32 73L58 73L67 88Q73 107 71 130Z" fill="url(#kbg)" stroke="rgba(255,255,255,.06)" strokeWidth="0.5"/>
      <path d="M19 130Q17 107 23 88L30 80L30 73L32 73L23 88Q17 107 19 130Z" fill="url(#kr)"/>
      <path d="M19 130Q17 107 23 88L30 80L30 73L32 73L23 88Q17 107 19 130Z" fill="url(#ks)" opacity="0.65"/>
      <ellipse cx="45" cy="100" rx="23" ry="4" fill="rgba(0,0,0,.35)"/>
      <path d="M25 97Q25 91 45 89Q65 91 65 97Q65 103 45 105Q25 103 25 97Z" fill="url(#kbg)" stroke="rgba(0,204,255,.4)" strokeWidth="1"/>
      <path d="M25 97Q25 91 45 89Q35 91 30 97Q35 103 45 105Q25 103 25 97Z" fill="url(#ks)"/>
      <rect x="34" y="61" width="22" height="15" rx="4.5" fill="url(#kbg)" stroke="rgba(0,204,255,.22)" strokeWidth="0.8"/>
      <ellipse cx="45" cy="62" rx="12" ry="3" fill="rgba(0,0,0,.28)"/>
      <path d="M25 61Q25 34 45 27Q65 34 65 61Z" fill="url(#kbg)" stroke="rgba(255,255,255,.07)" strokeWidth="0.5"/>
      <path d="M25 61Q25 34 45 27Q33 34 29 61Z" fill="url(#ks)"/>
      <rect x="43" y="4" width="4.5" height="24" rx="2.25" fill="#00ccff" style={{filter:'drop-shadow(0 0 8px #00ccff) drop-shadow(0 0 20px rgba(0,204,255,.6))'}}/>
      <rect x="33" y="11" width="24" height="4.5" rx="2.25" fill="#00ccff" style={{filter:'drop-shadow(0 0 8px #00ccff) drop-shadow(0 0 20px rgba(0,204,255,.6))'}}/>
      <circle cx="29" cy="54" r="3.5" fill="#00ccff" style={{filter:'drop-shadow(0 0 7px #00ccff) drop-shadow(0 0 16px rgba(0,204,255,.7))'}}/>
      <circle cx="45" cy="47" r="3.5" fill="#00ccff" style={{filter:'drop-shadow(0 0 9px #00ccff) drop-shadow(0 0 18px rgba(0,204,255,.7))'}}/>
      <circle cx="61" cy="54" r="3.5" fill="#00ccff" style={{filter:'drop-shadow(0 0 7px #00ccff) drop-shadow(0 0 16px rgba(0,204,255,.7))'}}/>
    </svg>
  )
}

function QueenPiece() {
  return (
    <svg viewBox="0 0 85 155" width="100%">
      <defs>
        <linearGradient id="qbg" x1="18%" y1="0%" x2="82%" y2="100%"><stop offset="0%" stopColor="#dcdcf8"/><stop offset="30%" stopColor="#aaaacc"/><stop offset="65%" stopColor="#585875"/><stop offset="100%" stopColor="#1e1e32"/></linearGradient>
        <radialGradient id="qs" cx="26%" cy="17%" r="38%"><stop offset="0%" stopColor="rgba(255,255,255,.48)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/></radialGradient>
        <linearGradient id="qr" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="rgba(255,255,255,.3)"/><stop offset="40%" stopColor="rgba(255,255,255,0)"/></linearGradient>
      </defs>
      <ellipse cx="42" cy="149" rx="27" ry="7.5" fill="rgba(0,0,0,.5)"/>
      <path d="M14 144Q13 141 11 134L17 127L67 127L73 134Q71 141 70 144Z" fill="url(#qbg)" stroke="rgba(255,255,255,.15)" strokeWidth="0.8"/>
      <path d="M14 144Q13 141 11 134L17 127L67 127L73 134Q71 141 70 144Z" fill="url(#qs)"/>
      <path d="M17 127Q15 104 21 85L29 70L55 70L63 85Q69 104 67 127Z" fill="url(#qbg)"/>
      <path d="M17 127Q15 104 21 85L27 77L27 70L29 70L21 85Q15 104 17 127Z" fill="url(#qr)" opacity="0.8"/>
      <path d="M17 127Q15 104 21 85L27 77L27 70L29 70L21 85Q15 104 17 127Z" fill="url(#qs)" opacity="0.55"/>
      <ellipse cx="42" cy="91" rx="21" ry="3.5" fill="rgba(0,0,0,.28)"/>
      <path d="M27 88Q27 82 42 80Q57 82 57 88Q57 94 42 96Q27 94 27 88Z" fill="url(#qbg)" stroke="rgba(0,204,255,.45)" strokeWidth="1"/>
      <path d="M27 88Q27 82 42 80Q33 82 29 88Q33 94 42 96Q27 94 27 88Z" fill="url(#qs)"/>
      <path d="M23 56Q23 30 42 23Q61 30 61 56Z" fill="url(#qbg)"/>
      <path d="M23 56Q23 30 42 23Q31 30 28 56Z" fill="url(#qs)"/>
      <path d="M21 48L27 56L42 30L57 56L63 48L58 56L26 56Z" fill="url(#qbg)" stroke="rgba(255,255,255,.18)" strokeWidth="0.8"/>
      <path d="M21 48L27 56L42 30L57 56L63 48L58 56L26 56Z" fill="url(#qs)" opacity="0.45"/>
      <circle cx="21" cy="45" r="4" fill="#00ccff" style={{filter:'drop-shadow(0 0 8px #00ccff) drop-shadow(0 0 18px rgba(0,204,255,.7))'}}/>
      <circle cx="42" cy="27" r="4.5" fill="#00ccff" style={{filter:'drop-shadow(0 0 10px #00ccff) drop-shadow(0 0 22px rgba(0,204,255,.7))'}}/>
      <circle cx="63" cy="45" r="4" fill="#00ccff" style={{filter:'drop-shadow(0 0 8px #00ccff) drop-shadow(0 0 18px rgba(0,204,255,.7))'}}/>
    </svg>
  )
}

function BishopPiece() {
  return (
    <svg viewBox="0 0 75 148" width="100%">
      <defs>
        <linearGradient id="bbg" x1="25%" y1="0%" x2="75%" y2="100%"><stop offset="0%" stopColor="#2a2a52"/><stop offset="100%" stopColor="#04040c"/></linearGradient>
        <radialGradient id="bs" cx="25%" cy="16%" r="38%"><stop offset="0%" stopColor="rgba(255,255,255,.16)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/></radialGradient>
        <linearGradient id="br" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="rgba(0,204,255,.46)"/><stop offset="28%" stopColor="rgba(0,204,255,.08)"/><stop offset="100%" stopColor="rgba(0,204,255,0)"/></linearGradient>
      </defs>
      <ellipse cx="37" cy="142" rx="23" ry="6.5" fill="rgba(0,0,0,.55)"/>
      <path d="M14 137Q13 134 11 128L17 121L57 121L63 128Q61 134 60 137Z" fill="url(#bbg)" stroke="rgba(0,204,255,.16)" strokeWidth="0.8"/>
      <path d="M14 137Q13 134 11 128L17 121L57 121L63 128Q61 134 60 137Z" fill="url(#bs)"/>
      <path d="M17 121Q15 98 21 79L29 62L45 62L53 79Q59 98 57 121Z" fill="url(#bbg)"/>
      <path d="M17 121Q15 98 21 79L27 68L27 62L29 62L21 79Q15 98 17 121Z" fill="url(#br)"/>
      <path d="M17 121Q15 98 21 79L27 68L27 62L29 62L21 79Q15 98 17 121Z" fill="url(#bs)" opacity="0.6"/>
      <ellipse cx="37" cy="84" rx="19" ry="3.5" fill="rgba(0,0,0,.3)"/>
      <path d="M23 81Q23 75 37 73Q51 75 51 81Q51 87 37 89Q23 87 23 81Z" fill="url(#bbg)" stroke="rgba(0,204,255,.3)" strokeWidth="0.8"/>
      <ellipse cx="37" cy="41" rx="15.5" ry="23" fill="url(#bbg)" stroke="rgba(0,204,255,.2)" strokeWidth="0.8"/>
      <path d="M22 41Q22 18 37 12Q52 18 52 41Q29 18 26 41Z" fill="url(#bs)"/>
      <path d="M22 41Q22 18 37 12Q29 18 26 41Z" fill="url(#br)" opacity="0.55"/>
      <ellipse cx="37" cy="60" rx="13" ry="3" fill="rgba(0,0,0,.25)"/>
      <rect x="25" y="57" width="24" height="6.5" rx="3.25" fill="rgba(0,204,255,.12)" stroke="rgba(0,204,255,.28)" strokeWidth="0.7"/>
      <circle cx="37" cy="11" r="6.5" fill="rgba(0,204,255,.1)" stroke="rgba(0,204,255,.4)" strokeWidth="1.2"/>
      <circle cx="37" cy="11" r="3.5" fill="#00ccff" style={{filter:'drop-shadow(0 0 8px #00ccff) drop-shadow(0 0 18px rgba(0,204,255,.6))'}}/>
    </svg>
  )
}

function KnightPiece() {
  return (
    <svg viewBox="0 0 90 150" width="100%">
      <defs>
        <linearGradient id="ngbg" x1="18%" y1="0%" x2="82%" y2="100%"><stop offset="0%" stopColor="#d4d4ec"/><stop offset="32%" stopColor="#8c8caa"/><stop offset="72%" stopColor="#444460"/><stop offset="100%" stopColor="#161626"/></linearGradient>
        <radialGradient id="ns" cx="22%" cy="16%" r="42%"><stop offset="0%" stopColor="rgba(255,255,255,.42)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/></radialGradient>
        <linearGradient id="nr" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="rgba(255,255,255,.3)"/><stop offset="40%" stopColor="rgba(255,255,255,0)"/></linearGradient>
      </defs>
      <ellipse cx="45" cy="143" rx="26" ry="7.5" fill="rgba(0,0,0,.55)"/>
      <path d="M18 138Q17 135 15 128L21 121L69 121L75 128Q73 135 72 138Z" fill="url(#ngbg)" stroke="rgba(255,255,255,.12)" strokeWidth="0.8"/>
      <path d="M18 138Q17 135 15 128L21 121L69 121L75 128Q73 135 72 138Z" fill="url(#ns)"/>
      <path d="M21 121Q19 98 25 79L33 63L57 63L65 79Q71 98 69 121Z" fill="url(#ngbg)"/>
      <path d="M21 121Q19 98 25 79L31 69L31 63L33 63L25 79Q19 98 21 121Z" fill="url(#nr)" opacity="0.7"/>
      <path d="M21 121Q19 98 25 79L31 69L31 63L33 63L25 79Q19 98 21 121Z" fill="url(#ns)" opacity="0.4"/>
      <ellipse cx="45" cy="85" rx="21" ry="3.5" fill="rgba(0,0,0,.28)"/>
      <path d="M27 82Q27 76 45 74Q63 76 63 82Q63 88 45 90Q27 88 27 82Z" fill="url(#ngbg)" stroke="rgba(0,204,255,.3)" strokeWidth="0.9"/>
      <path d="M23 63Q19 40 27 28Q33 18 47 14Q64 12 72 22Q80 32 78 47Q76 57 65 62Q56 66 23 63Z" fill="url(#ngbg)" stroke="rgba(255,255,255,.09)" strokeWidth="0.7"/>
      <path d="M23 63Q19 40 27 28Q25 38 25 63Z" fill="url(#ns)" opacity="0.55"/>
      <path d="M29 44Q31 35 40 27Q48 22 57 22" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M29 63Q25 53 25 42Q25 32 31 24" fill="none" stroke="rgba(0,0,0,.28)" strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="63" cy="29" r="4.5" fill="#0c0c1e"/>
      <circle cx="61.5" cy="27.5" r="1.5" fill="rgba(255,255,255,.55)"/>
      <ellipse cx="71" cy="45" rx="2.5" ry="2" fill="rgba(0,0,0,.45)"/>
    </svg>
  )
}

function RookPiece() {
  return (
    <svg viewBox="0 0 80 140" width="100%">
      <defs>
        <linearGradient id="rbg" x1="25%" y1="0%" x2="75%" y2="100%"><stop offset="0%" stopColor="#242445"/><stop offset="100%" stopColor="#04040c"/></linearGradient>
        <radialGradient id="rs" cx="24%" cy="17%" r="40%"><stop offset="0%" stopColor="rgba(255,255,255,.15)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/></radialGradient>
        <linearGradient id="rr" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="rgba(0,204,255,.44)"/><stop offset="28%" stopColor="rgba(0,204,255,.08)"/><stop offset="100%" stopColor="rgba(0,204,255,0)"/></linearGradient>
      </defs>
      <ellipse cx="40" cy="133" rx="25" ry="7" fill="rgba(0,0,0,.55)"/>
      <path d="M15 129Q13 126 11 119L17 112L63 112L69 119Q67 126 65 129Z" fill="url(#rbg)" stroke="rgba(0,204,255,.16)" strokeWidth="0.8"/>
      <path d="M15 129Q13 126 11 119L17 112L63 112L69 119Q67 126 65 129Z" fill="url(#rs)"/>
      <path d="M17 112Q15 88 21 68L27 52L53 52L59 68Q65 88 63 112Z" fill="url(#rbg)"/>
      <path d="M17 112Q15 88 21 68L25 58L25 52L27 52L21 68Q15 88 17 112Z" fill="url(#rr)"/>
      <path d="M17 112Q15 88 21 68L25 58L25 52L27 52L21 68Q15 88 17 112Z" fill="url(#rs)" opacity="0.55"/>
      <ellipse cx="40" cy="75" rx="21" ry="3.5" fill="rgba(0,0,0,.28)"/>
      <path d="M23 72Q23 66 40 64Q57 66 57 72Q57 78 40 80Q23 78 23 72Z" fill="url(#rbg)" stroke="rgba(0,204,255,.24)" strokeWidth="0.8"/>
      <ellipse cx="40" cy="52" rx="20" ry="3" fill="rgba(0,0,0,.22)"/>
      <rect x="19" y="36" width="42" height="18" rx="3" fill="url(#rbg)" stroke="rgba(0,204,255,.2)" strokeWidth="0.8"/>
      <rect x="19" y="36" width="14" height="18" rx="3" fill="url(#rs)" opacity="0.55"/>
      <rect x="19" y="26" width="10" height="14" rx="2" fill="url(#rbg)" stroke="rgba(0,204,255,.24)" strokeWidth="0.8"/>
      <rect x="19" y="26" width="5" height="14" rx="2" fill="url(#rs)" opacity="0.5"/>
      <rect x="35" y="26" width="10" height="14" rx="2" fill="url(#rbg)" stroke="rgba(0,204,255,.24)" strokeWidth="0.8"/>
      <rect x="35" y="26" width="5" height="14" rx="2" fill="url(#rs)" opacity="0.5"/>
      <rect x="51" y="26" width="10" height="14" rx="2" fill="url(#rbg)" stroke="rgba(0,204,255,.24)" strokeWidth="0.8"/>
      <rect x="51" y="26" width="5" height="14" rx="2" fill="url(#rs)" opacity="0.5"/>
    </svg>
  )
}

function Navbar() {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 56px",
        position: "relative",
        zIndex: 20,
      }}
    >
      <div
        // className="nav-surface"
        // style={{
        //   height: 40,
        //   padding: "0 16px",
        //   borderRadius: 999,
        //   display: "flex",
        //   alignItems: "center",
        //   gap: 10,
        // }}
      >
        <Image
          src="/chessify.png"
          alt="Chessify"
          width={200}
          height={50}
          style={{ objectFit: "contain" }}
        />
      </div>
      <div
        className="nav-surface"
        style={{
          display: "flex",
          gap: 28,
          borderRadius: 999,
          padding: "10px 28px",
        }}
      >
        {["How it works", "Leaderboard", "Faucet"].map((l) => (
          <a
            key={l}
            href={`#${l.toLowerCase().replace(" ", "-")}`}
            style={{
              fontFamily: "var(--fd)",
              fontSize: 10,
              fontWeight: 500,
              color: "var(--t2)",
              textDecoration: "none",
              letterSpacing: ".06em",
              transition: "color .2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--c)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--t2)";
            }}
          >
            {l}
          </a>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <ThemeToggle />
        <Link href="/app/lobby">
          <GlowButton variant="brand" size="sm">
            Launch App
          </GlowButton>
        </Link>
      </div>
    </nav>
  );
}

export default function Hero() {
  return (
    <section style={{background:'var(--bg)',position:'relative',overflow:'hidden'}}>
      <style>{KEYFRAMES}</style>

      {/* Ambient mesh */}
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 65% 55% at 50% 40%,rgba(0,204,255,.07) 0%,transparent 60%),radial-gradient(ellipse 35% 35% at 18% 80%,rgba(120,60,220,.05) 0%,transparent 60%)',pointerEvents:'none'}}/>
      {/* Grid */}
      <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(var(--grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--grid-line) 1px,transparent 1px)',backgroundSize:'52px 52px',pointerEvents:'none',WebkitMaskImage:'radial-gradient(ellipse 90% 90% at 50% 50%,black 30%,transparent 80%)',maskImage:'radial-gradient(ellipse 90% 90% at 50% 50%,black 30%,transparent 80%)'}}/>

      <Navbar/>

      <div style={{position:'relative',minHeight:'calc(100vh - 76px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'60px 48px 80px'}}>

        {/* PIECES — z:5, IN FRONT of text */}
        <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:5}}>
          {/* Rings */}
          <div style={{position:'absolute',top:'50%',left:'50%',width:300,height:300,border:'1px dashed rgba(0,204,255,.09)',borderRadius:'50%',transform:'translate(-50%,-50%)',animation:'rspin 28s linear infinite'}}/>
          <div style={{position:'absolute',top:'50%',left:'50%',width:480,height:480,border:'1px solid rgba(0,204,255,.04)',borderRadius:'50%',transform:'translate(-50%,-50%)'}}/>
          {/* Pieces */}
          <div style={{position:'absolute',left:'50%',top:'3%',width:168,transform:'translateX(-50%)',animation:'king-move 5s ease-in-out infinite',filter:'var(--shadow-piece)'}}><KingPiece/></div>
          <div style={{position:'absolute',left:'12%',top:'7%',width:148,animation:'queen-move 6.2s ease-in-out infinite',filter:'var(--shadow-piece)'}}><QueenPiece/></div>
          <div style={{position:'absolute',right:'9%',top:'9%',width:116,animation:'bishop-move 5.5s ease-in-out infinite',filter:'var(--shadow-piece)'}}><BishopPiece/></div>
          <div style={{position:'absolute',left:'6%',bottom:'10%',width:128,animation:'knight-move 4.2s ease-in-out infinite',filter:'var(--shadow-piece)'}}><KnightPiece/></div>
          <div style={{position:'absolute',right:'5%',bottom:'12%',width:112,animation:'rook-move 4.6s ease-in-out infinite',filter:'var(--shadow-piece)'}}><RookPiece/></div>
          {/* Float cards */}
          <div style={{position:'absolute',right:'2%',top:'44%',padding:'12px 18px',borderRadius:16,fontFamily:'var(--fd)',background:'linear-gradient(145deg,#041a2c,#020f1a)',border:'1px solid rgba(0,204,255,.26)',boxShadow:'0 2px 0 rgba(0,204,255,.12) inset,0 14px 36px rgba(0,180,240,.14)'}}>
            <div style={{fontSize:9,letterSpacing:'.12em',color:'rgba(255,255,255,.35)',marginBottom:4}}>CURRENT LEADER</div>
            <div style={{fontWeight:800,fontSize:15,color:'#00ccff'}}>ELO 2,418</div>
          </div>
          <div style={{position:'absolute',left:'1%',top:'60%',padding:'12px 18px',borderRadius:16,fontFamily:'var(--fd)',background:'linear-gradient(145deg,#14142c,#0c0c1e)',border:'1px solid rgba(255,255,255,.1)',boxShadow:'0 2px 0 rgba(255,255,255,.07) inset,0 14px 36px rgba(0,0,0,.5)'}}>
            <div style={{fontSize:9,letterSpacing:'.12em',color:'rgba(255,255,255,.35)',marginBottom:4}}>PRIZE POOL</div>
            <div style={{fontWeight:800,fontSize:15,color:'var(--t1)'}}>1,000 CHESS</div>
          </div>
        </div>

        {/* TEXT — z:3, BEHIND pieces */}
        <div style={{position:'relative',zIndex:3}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'var(--badge-bg)',border:'1px solid var(--b1)',borderRadius:999,padding:'7px 18px',marginBottom:24,animation:'fadeUp .6s cubic-bezier(.16,1,.3,1) both'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'var(--c)',animation:'pulseDot 2s ease-in-out infinite',flexShrink:0}}/>
            <span style={{fontFamily:'var(--fd)',fontSize:9,fontWeight:600,color:'var(--c)',letterSpacing:'.14em'}}>ON-CHAIN CHESS — STACKS BLOCKCHAIN</span>
          </div>

          <h1 style={{fontFamily:'var(--fd)',fontWeight:900,fontSize:'clamp(72px,12vw,148px)',lineHeight:.86,letterSpacing:'-.05em',textTransform:'uppercase',marginBottom:24,color:'var(--t1)',textShadow:'var(--hero-text-shadow, 0 4px 40px rgba(0,0,0,.7))',animation:'fadeUp .6s cubic-bezier(.16,1,.3,1) .1s both'}}>
            Be the<br/>
            <span style={{color:'var(--c)',textShadow:'var(--king-text-shadow, 0 0 80px rgba(0,204,255,.45))'}}>King</span><br/>
            of Chess
          </h1>

          <p style={{fontSize:17,color:'var(--t2)',lineHeight:1.72,margin:'0 auto 38px',maxWidth:500,fontWeight:300,animation:'fadeUp .6s cubic-bezier(.16,1,.3,1) .2s both'}}>
            Wager CHESS tokens, play on-chain.<br/>Every move permanently recorded. Your rating, your winnings — provably yours.
          </p>

          <div style={{display:'flex',justifyContent:'center',marginBottom:46,animation:'fadeUp .6s cubic-bezier(.16,1,.3,1) .3s both'}}>
            <div style={{paddingRight:28,borderRight:'1px solid var(--b1)'}}>
              <div style={{fontFamily:'var(--fd)',fontWeight:800,fontSize:18,color:'var(--c)'}}>CHESS</div>
              <div style={{fontFamily:'var(--fd)',fontSize:8,color:'var(--t3)',letterSpacing:'.15em',marginTop:4}}>TOKEN</div>
            </div>
            <div style={{paddingLeft:28}}>
              <div style={{fontFamily:'var(--fd)',fontWeight:800,fontSize:18,color:'var(--c)'}}>Stacks</div>
              <div style={{fontFamily:'var(--fd)',fontSize:8,color:'var(--t3)',letterSpacing:'.15em',marginTop:4}}>BLOCKCHAIN</div>
            </div>
          </div>

          <div style={{animation:'fadeUp .6s cubic-bezier(.16,1,.3,1) .4s both'}}>
            <Link href="/app/lobby">
              <GlowButton variant="brand" parallelogram size="lg">PLAY NOW</GlowButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll */}
      <div style={{textAlign:'center',paddingBottom:36,display:'flex',flexDirection:'column',alignItems:'center',gap:8,position:'relative',zIndex:4}}>
        <span style={{fontFamily:'var(--fd)',fontSize:9,letterSpacing:'.2em',color:'var(--scroll-color)'}}>SCROLL</span>
        <div style={{width:1,height:32,background:'linear-gradient(var(--c),transparent)'}}/>
      </div>
    </section>
  )
}
