'use client'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('chessify-theme') as 'dark' | 'light' | null
    const t = saved ?? 'dark'
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('chessify-theme', next)
  }

  return (
// ← echo residue
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="nav-surface"
      style={{
        width: 40, height: 40, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', border: 'none', flexShrink: 0,
        transition: 'transform .15s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.06)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
    >
      {theme === 'dark' ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(0,204,255,.8)" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(0,80,160,.8)" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}


// ⟳ echo · src/components/landing/Features.tsx
//             <BgIcon>
//               <svg viewBox="0 0 24 24" fill="none" width="100%" height="100%">
//                 <circle cx="12" cy="12" r="10" stroke="rgba(160,100,255,.9)" strokeWidth="1.5"/>
//                 <path d="M12 3a9 9 0 0 1 9 9" stroke="rgba(160,100,255,.9)" strokeWidth="2" strokeLinecap="round"/>
//                 <circle cx="12" cy="12" r="3.5" stroke="rgba(160,100,255,.9)" strokeWidth="1.2"/>