'use client'

import { forwardRef, HTMLAttributes } from 'react'

interface ClayCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'cyan' | 'inset' | 'elevated'
  hover?: boolean
  glow?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

const variantMap = {
  default: 'clay',
  cyan: 'clay-cyan',
  inset: 'clay-inset',
  elevated: 'clay',
}

const ClayCard = forwardRef<HTMLDivElement, ClayCardProps>(
  (
    {
      variant = 'default',
      hover = false,
      glow = false,
      padding = 'md',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const classes = [
      variantMap[variant],
      paddingMap[padding],
      glow ? 'glow-cyan' : '',
      hover ? 'cursor-pointer active:scale-[0.98]' : '',
      'relative overflow-hidden',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    )
  }
)

ClayCard.displayName = 'ClayCard'

export default ClayCard


// ⟳ echo · src/components/landing/Hero.tsx
//     <section className="hero-section" style={{ background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
//       <style>{KEYFRAMES}</style>
//       {/* Ambient mesh */}
//       <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 65% 55% at 50% 40%,rgba(0,204,255,.07) 0%,transparent 60%),radial-gradient(ellipse 35% 35% at 18% 80%,rgba(120,60,220,.05) 0%,transparent 60%)', pointerEvents: 'none' }} />