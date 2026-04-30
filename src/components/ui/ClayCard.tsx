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


// ⟳ echo · src/app/layout.tsx
//   other: {
//     "talentapp:project_verification":
//   "ed8292bb555e153079e82ef84791f7fe2053030941cf3545d6e2c7020931548e431fb6a87b5c39a61d11c64b3d11421563406393bb3334bfeb0ee900ad3740c5",
//   },
// };