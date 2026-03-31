'use client'

interface StatBadgeProps {
// ← echo residue
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
