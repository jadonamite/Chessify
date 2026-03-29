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
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
}

const variantMap = {
  default:  'clay',
  cyan:     'clay-cyan',
  inset:    'clay-inset',
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
//       <path d="M17 121Q15 98 21 79L27 68L27 62L29 62L21 79Q15 98 17 121Z" fill="url(#bs)" opacity="0.6"/>
//       <ellipse cx="37" cy="84" rx="19" ry="3.5" fill="rgba(0,0,0,.3)"/>