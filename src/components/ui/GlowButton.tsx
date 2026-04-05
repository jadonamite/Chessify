'use client'
import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'brand' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  parallelogram?: boolean
  loading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
}

/* ── shared brand colours (work in both themes via CSS vars) ── */
// const BRAND_FACE_DARK  = 'linear_-gradient(180deg,#33eeff 0%,#00ccff 40%,#00b8e8 75%,#009acc 100%)'
// const BRAND_FACE_LIGHT = 'linear_-gradient(180deg,#00aadd 0%,#0088bb 40%,#007aaa 75%,#006699 100%)'

/* We detect the theme via data-theme on <html> at render time — but since this is
   a client component we read it safely from the DOM. We use CSS custom properties
   instead so the button adapts automatically without JS reads. */

const btnBase: React.CSSProperties = {
  fontFamily: 'var(--fd)',
  fontWeight: 800,
  letterSpacing: '.08em',
  color: 'var(--btn-text, #001a22)',
  background: 'var(--btn-face)',
  border: 'none',
  cursor: 'pointer',
  boxShadow: 'var(--btn-shadow)',
  transition: 'all .15s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative' as const,
}

const pillSize: Record<string, React.CSSProperties> = {
  sm: { fontSize: '11px', padding: '10px 22px', borderRadius: 999 },
  md: { fontSize: '12px', padding: '11px 26px', borderRadius: 999 },
  lg: { fontSize: '13px', padding: '15px 34px', borderRadius: 999 },
}

const ghostBase: React.CSSProperties = {
  fontFamily: 'var(--fd)',
  fontWeight: 700,
  fontSize: '13px',
  letterSpacing: '.07em',
  color: 'var(--c)',
  background: 'transparent',
  border: 'none',
  borderRadius: 999,
  padding: '16px 40px',
  cursor: 'pointer',
  display: 'inline-block',
  boxShadow: '0 0 0 1px var(--b2), 0 4px 0 rgba(0,50,70,.5), 0 8px 24px rgba(0,204,255,.1)',
  transition: 'all .18s ease',
}

const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  (
    { variant = 'brand', size = 'md', parallelogram = false, loading = false,
      fullWidth = false, icon, className = '', children, disabled, style, ...props },
    ref
  ) => {
    const isDisabled = disabled || loading

    if (variant === 'ghost') {
      return (
        <button
          ref={ref}
          disabled={isDisabled}
          style={{ ...ghostBase, opacity: isDisabled ? .45 : 1, width: fullWidth ? '100%' : undefined, ...style }}
          onMouseEnter={e => { if (!isDisabled) { const el = e.currentTarget; el.style.background = 'rgba(0,204,255,.05)'; el.style.boxShadow = '0 0 0 1px rgba(0,204,255,.55), 0 4px 0 rgba(0,50,70,.5), 0 16px 40px rgba(0,204,255,.2)'; el.style.transform = 'translateY(-1px)' }}}
          onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'transparent'; el.style.boxShadow = '0 0 0 1px var(--b2), 0 4px 0 rgba(0,50,70,.5), 0 8px 24px rgba(0,204,255,.1)'; el.style.transform = '' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
          className={className}
          {...props}
        >
          {loading && <span style={{ width:13, height:13, border:'2px solid currentColor', borderTopColor:'transparent', borderRadius:'50%', display:'inline-block', animation:'spin .6s linear_ infinite', marginRight:8 }}/>}
          {children}
        </button>
      )
    }

    /* Brand button */
    const paraStyle: React.CSSProperties = parallelogram ? {
      fontSize: '14px',
      padding: '18px 56px',
      borderRadius: 0,
      clipPath: 'polygon(16px 0%, 100% 0%, calc(100% - 16px) 100%, 0% 100%)',
    } : pillSize[size]

    const combined: React.CSSProperties = {
      ...btnBase,
      ...paraStyle,
      opacity: isDisabled ? .45 : 1,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      width: fullWidth ? '100%' : undefined,
      /* shadow + face via CSS vars so light/dark theme work */
      background: 'var(--btn-face)',
      boxShadow: 'var(--btn-shadow)',
      color: 'var(--btn-text, #001a22)',
      ...style,
    }

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={combined}
        onMouseEnter={e => {
          if (isDisabled) return
          const el = e.currentTarget
          el.style.transform = 'translateY(-2px)'
          el.style.boxShadow = 'var(--btn-shadow-hover)'
          el.style.filter = 'brightness(1.04)'
        }}
        onMouseLeave={e => {
          if (isDisabled) return
          const el = e.currentTarget
          el.style.transform = ''
          el.style.boxShadow = 'var(--btn-shadow)'
          el.style.filter = ''
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = 'var(--btn-shadow-press)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--btn-shadow-hover)' }}
        className={className}
        {...props}
      >
        {loading && <span style={{ width:13, height:13, border:'2px solid currentColor', borderTopColor:'transparent', borderRadius:'50%', display:'inline-block', animation:'spin .6s linear_ infinite', marginRight:8 }}/>}
        {icon && !loading && <span style={{ marginRight:8, display:'inline-flex', alignItems:'center' }}>{icon}</span>}
        {children}
      </button>
    )
  }
)

GlowButton.displayName = 'GlowButton'
export default GlowButton


// ⟳ echo · src/components/landing/CTAFooter.tsx
//           onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--t3)' }}
//         >
//           <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
//             <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>