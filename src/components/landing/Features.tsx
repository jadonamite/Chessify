'use client'

const h = (color: string, size = 18): React.CSSProperties => ({
  fontFamily:'var(--fd)',fontWeight:800,fontSize:size,color,lineHeight:1.05,letterSpacing:'-.02em',marginBottom:9,
})
const p: React.CSSProperties = {fontSize:13.5,color:'var(--t2)',lineHeight:1.65,fontWeight:300}
const tag = (bg: string, border: string, color: string): React.CSSProperties => ({
  fontFamily:'var(--fd)',fontSize:9,letterSpacing:'.12em',borderRadius:999,
  padding:'4px 12px',display:'inline-block',marginBottom:13,
  background:bg,border:`1px solid ${border}`,color,
})
const pill = (bg: string, border: string, color: string): React.CSSProperties => ({
  fontFamily:'var(--fd)',fontSize:10,fontWeight:600,padding:'7px 17px',
  borderRadius:999,display:'inline-block',marginTop:12,marginRight:7,
  background:bg,border:`1px solid ${border}`,color,
  boxShadow:'0 2px 0 rgba(255,255,255,.1) inset,0 -1px 0 rgba(0,0,0,.3) inset',
})

const hover = (e: React.MouseEvent<HTMLDivElement>, on: boolean) => {
  e.currentTarget.style.transform = on ? 'translateY(-5px) scale(1.006)' : ''
}

export default function Features() {
  return (
    <section id="how-it-works" style={{padding:'80px 56px',background:'var(--bg)'}}>

      <div style={{textAlign:'center',marginBottom:54}}>
        <div style={{display:'inline-flex',alignItems:'center',background:'linear-gradient(145deg,rgba(160,100,255,.12),rgba(160,100,255,.05))',border:'1px solid rgba(160,100,255,.22)',borderRadius:999,padding:'6px 18px',marginBottom:18}}>
          <span style={{fontFamily:'var(--fd)',fontSize:9,fontWeight:600,color:'#c090ff',letterSpacing:'.15em'}}>WHY CHESSIFY</span>
        </div>
        <h2 style={{fontFamily:'var(--fd)',fontWeight:900,fontSize:'clamp(28px,3.5vw,44px)',lineHeight:1.06,letterSpacing:'-.03em',marginBottom:14,color:'var(--t1)'}}>
          Chess, rewired<br/><span style={{color:'var(--c)'}}>for the chain</span>
        </h2>
        <p style={{fontSize:15,color:'var(--t2)',maxWidth:400,margin:'0 auto',lineHeight:1.7,fontWeight:300}}>
          Real stakes, verifiable moves, and permanent on-chain reputation.
        </p>
      </div>

      <div style={{maxWidth:960,margin:'0 auto',display:'flex',flexDirection:'column',gap:14}}>

        <div style={{display:'grid',gridTemplateColumns:'1.65fr 1fr',gap:14}}>
          {/* Purple: Real Wagers */}
          <div className="clay-purple" style={{minHeight:290}} onMouseEnter={e=>hover(e,true)} onMouseLeave={e=>hover(e,false)}>
            <svg className="bg-icon-wm" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(160,100,255,.55)" strokeWidth="1.2"/><path d="M12 3a9 9 0 0 1 9 9" stroke="rgba(160,100,255,.65)" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="12" r="3.5" stroke="rgba(160,100,255,.5)" strokeWidth="1.1"/><line x1="12" y1="12" x2="17.5" y2="8.5" stroke="rgba(160,100,255,.6)" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <div style={{padding:'28px 30px',position:'relative',zIndex:2,height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
              <div>
                <span style={tag('rgba(160,100,255,.15)','rgba(160,100,255,.28)','#c090ff')}>CORE FEATURE</span>
                <div style={h('#c090ff',23)}>Real Wagers</div>
                <div style={p}>Stake CHESS tokens before each game. Winner takes the full pot — on-chain, instant, zero middlemen.</div>
              </div>
              <div style={{display:'flex',gap:22,paddingTop:18,marginTop:18,borderTop:'1px solid rgba(255,255,255,.07)'}}>
                {[{v:'2×',l:'PAYOUT'},{v:'0%',l:'FEES'},{v:'∞',l:'GAMES'}].map(m=>(
                  <div key={m.l}>
                    <div style={{fontFamily:'var(--fd)',fontWeight:800,fontSize:28,color:'#c090ff'}}>{m.v}</div>
                    <div style={{fontFamily:'var(--fd)',fontSize:8,color:'var(--t3)',letterSpacing:'.13em',marginTop:3}}>{m.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cyan: On-chain */}
          <div className="clay-cyan-card" style={{minHeight:290}} onMouseEnter={e=>hover(e,true)} onMouseLeave={e=>hover(e,false)}>
            <svg className="bg-icon-wm" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="rgba(0,204,255,.55)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <div style={{padding:'28px 30px',position:'relative',zIndex:2,height:'100%',display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
              <span style={tag('rgba(0,204,255,.1)','rgba(0,204,255,.24)','#00ccff')}>ON-CHAIN</span>
              <div style={h('var(--c)',19)}>Every Move Recorded</div>
              <div style={p}>Each move is a Stacks transaction. Provably fair, permanently on-chain.</div>
            </div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
          {/* Green: Elo */}
          <div className="clay-green" style={{minHeight:238}} onMouseEnter={e=>hover(e,true)} onMouseLeave={e=>hover(e,false)}>
            <svg className="bg-icon-wm" viewBox="0 0 24 24" fill="none"><polyline points="2 17 8.5 10.5 13.5 15.5 22 7" stroke="rgba(0,220,120,.6)" strokeWidth="1.4" strokeLinecap="round"/><polyline points="16 7 22 7 22 13" stroke="rgba(0,220,120,.6)" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <div style={{padding:'28px 30px',position:'relative',zIndex:2,height:'100%',display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
              <div style={h('#00dc78')}>Elo Rankings</div>
              <div style={p}>Win to climb. Lose to fall. Permanent on-chain rating.</div>
            </div>
          </div>

          {/* Amber: Faucet */}
          <div className="clay-amber" style={{minHeight:238}} onMouseEnter={e=>hover(e,true)} onMouseLeave={e=>hover(e,false)}>
            <svg className="bg-icon-wm" viewBox="0 0 24 24" fill="none"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke="rgba(255,180,0,.6)" strokeWidth="1.4" strokeLinejoin="round"/></svg>
            <div style={{padding:'28px 30px',position:'relative',zIndex:2,height:'100%',display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
              <div style={h('#ffb400')}>Daily Faucet</div>
              <div style={p}>Claim 1,000 CHESS tokens every day — free.</div>
            </div>
          </div>

          {/* Dark: Wallets */}
          <div className="clay-dark-card" style={{minHeight:238}} onMouseEnter={e=>hover(e,true)} onMouseLeave={e=>hover(e,false)}>
            <svg className="bg-icon-wm" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="rgba(255,255,255,.36)" strokeWidth="1.2" strokeLinejoin="round"/></svg>
            <div style={{padding:'28px 30px',position:'relative',zIndex:2,height:'100%',display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
              <div style={h('var(--t1)')}>Protected</div>
              <div style={p}>Leather & Xverse supported. Mobile & desktop ready.</div>
              <div style={{marginTop:12}}>
                <span style={pill('rgba(0,204,255,.12)','rgba(0,204,255,.28)','var(--c)')}>Leather</span>
                <span style={pill('rgba(255,255,255,.07)','rgba(255,255,255,.14)','var(--t2)')}>Xverse</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
