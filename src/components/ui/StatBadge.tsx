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


// ⟳ echo · src/files/tailwind.config.ts
//         'glow-cyan': '0 0 24px rgba(0,204,255,0.35), 0 0 48px rgba(0,204,255,0.1)',
//       },
//     },
//   },

// ⟳ echo · src/components/landing/CTAFooter.tsx
//             <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
//           </svg>
//         </a>