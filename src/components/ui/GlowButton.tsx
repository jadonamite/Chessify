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

const sizeMap = {
  sm: { fontSize: '11px', padding: '10px 22px' },
  md: { fontSize: '12px', padding: '11px 26px' },
  lg: { fontSize: '14px', padding: '18px 56px' },
}

const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  (
    {
      variant = 'brand',
      size = 'md',
      parallelogram = false,
      loading = false,
      fullWidth = false,
      icon,
      className = '',
      children,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const isGhost = variant === 'ghost'
    const baseClass = isGhost
      ? 'btn-ghost-brand'
      : parallelogram
      ? 'btn-brand btn-brand-para'
      : 'btn-brand btn-brand-pill'

    const inlineStyle: React.CSSProperties = {
      opacity: disabled || loading ? 0.45 : 1,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      width: fullWidth ? '100%' : undefined,
      ...(size !== 'md' && !parallelogram ? sizeMap[size] : {}),
      ...style,
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseClass} ${className}`}
        style={inlineStyle}
        {...props}
      >
        {loading && (
          <span style={{
            width: 13, height: 13,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin .6s linear infinite',
            marginRight: 8,
          }}/>
        )}
        {icon && !loading && <span style={{ marginRight: 8, display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
        {children}
      </button>
    )
  }
)

GlowButton.displayName = 'GlowButton'
export default GlowButton
