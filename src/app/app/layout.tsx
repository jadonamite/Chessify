'use client'

import { usePathname } from 'next/navigation'
import BottomNav from '@/components/ui/BottomNav'
import SideNav from '@/components/ui/SideNav'
import { Navbar } from '@/components/landing/Hero'
import StreakCelebration from '@/components/ui/StreakCelebration'
import ChainSelectModal from '@/components/ui/ChainSelectModal'
import { useProfileLink } from '@/hooks/useProfileLink'
import { useWallet } from '@/components/wallet-provider'

// Shared chrome for every /app/* route.
//  • Desktop (≥769px): the fixed SideNav rail replaces the top nav; content is
//    offset by the rail width via `.pc-app-shell`.
//  • Mobile (≤768px): the top Navbar + bottom nav own the chrome.
// The game route keeps its own header/back-link (GameClient renders its own
// Navbar), so it opts out of the shell entirely to avoid a double nav.
//
// Multi-chain: ChainSelectModal + the wrong-network banner are hoisted here so
// they're available app-wide — the desktop SideNav has no Navbar to host them.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isGame = pathname.startsWith('/app/game')

  // Self-heal the EOA ↔ smart-account name split for Privy users (one-time, silent).
  useProfileLink()

  const {
    showChainSelect, setShowChainSelect,
    connect, connectStacks, connectBase, connectSocial,
    isWrongChain, switchToCelo,
  } = useWallet()

  if (isGame) return <>{children}</>

  return (
    <div className="pc-app-shell">
      <SideNav />

      <div className='pc-mobile-chrome'>
        <Navbar />
      </div>

      {/* Wrong-network banner — EVM wallet connected but not on the active EVM chain */}
      {isWrongChain && (
        <div style={{
          background: 'rgba(239,68,68,0.12)',
          borderBottom: '1px solid rgba(239,68,68,0.25)',
          padding: '8px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#fca5a5', textTransform: 'uppercase' }}>
            Wrong network — please switch to Celo
          </span>
          <button
            onClick={switchToCelo}
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.2em',
              color: '#ef4444',
              textTransform: 'uppercase',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 6,
              padding: '3px 10px',
              cursor: 'pointer',
            }}
          >
            Switch
          </button>
        </div>
      )}

      <div className="pc-app-scroll">{children}</div>

      <BottomNav />
      <StreakCelebration />

      {/* Chain Select Modal — app-wide (works on the desktop SideNav too) */}
      <ChainSelectModal
        isOpen={showChainSelect}
        onClose={() => setShowChainSelect(false)}
        onSelectCelo={connect}
        onSelectStacks={connectStacks}
        onSelectBase={connectBase}
        onSelectSocial={connectSocial}
      />
    </div>
  )
}
