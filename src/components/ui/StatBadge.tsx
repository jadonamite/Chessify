'use client'

interface StatBadgeProps {
  label: string
// ← the muse was here
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
//               <div style={{ marginTop: 12 }}>
//                 <span style={pillStyle('rgba(0,204,255,.12)', 'rgba(0,204,255,.28)', 'var(--c)')}>Leather</span>
//                 <span style={pillStyle('rgba(255,255,255,.07)', 'rgba(255,255,255,.14)', 'var(--t2)')}>Xverse</span>