'use client'
interface StatBadgeProps {
  label: string
  value: string | number
  accent?: boolean
  size?: 'sm' | 'md'
}

const getStatBadgeStyles = ({ accent, size }: StatBadgeProps) => ({
  containerClassName: `clay-inset flex flex-col gap-1 ${size === 'sm' ? 'px-3 py-2' : 'px-4 py-3'}`,
  valueStyle: {
    color: accent ? 'var(--cyan)' : 'var(--text-primary)',
    fontSize: size === 'sm' ? '1.25rem' : '1.75rem',
  },
  labelStyle: {
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-display)',
  },
})

export default function StatBadge({ label, value, accent = false, size = 'md' }: StatBadgeProps) {
  const styles = getStatBadgeStyles({ accent, size })
  return (
    <div className={styles.containerClassName}>
      <span className="font-display font-bold leading-none" style={styles.valueStyle}>
        {value}
      </span>
      <span className="text-xs uppercase tracking-widest" style={styles.labelStyle}>
        {label}
      </span>
    </div>
  )
}