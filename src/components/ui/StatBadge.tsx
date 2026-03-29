'use client'

interface StatBadgeProps {
  label: string
  value: string | number
  accent?: boolean
  size?: 'sm' | 'md'
}

export default function StatBadge({ label, value, accent = false, size = 'md' }: StatBadgeProps) {
  return (
    <div className={`clay-inset flex flex-col gap-1 ${size === 'sm' ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <span
        className="font-display font-bold leading-none"
        style={{
          color: accent ? 'var(--cyan)' : 'var(--text-primary)',
          fontSize: size === 'sm' ? '1.25rem' : '1.75rem',
        }}
      >
        {value}
      </span>
      <span
        className="text-xs uppercase tracking-widest"
        style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-display)' }}
      >
        {label}
      </span>
    </div>
  )
}


// ⟳ echo · src/components/landing/Features.tsx
//           >
//             <BgIcon>
//               <svg viewBox="0 0 24 24" fill="none" width="100%" height="100%">
//                 <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke="rgba(255,180,0,.9)" strokeWidth="1.5" strokeLinejoin="round"/>
//               </svg>