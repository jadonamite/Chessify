'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAccount, useDisconnect } from 'wagmi'

interface WalletContextType {
  // ── Addresses ──
  address: string | null
  stacksAddress: string | null

  // ── Connection State ──
  isConnected: boolean
  isStacksConnected: boolean
  isMiniPay: boolean
  activeChain: 'celo' | 'stacks'

  // ── Unified Auth ──
  connectWallet: () => void       // Opens chain select modal
  disconnectAll: () => void       // Disconnects active chain
  showChainSelect: boolean
  setShowChainSelect: (show: boolean) => void

  // ── Internal (used by ChainSelectModal) ──
  connect: () => Promise<void>
  connectStacks: () => Promise<void>
  disconnect: () => void
  disconnectStacks: () => void
  setActiveChain: (chain: 'celo' | 'stacks') => void

  // ── Session ──
  userSession: any | null
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  stacksAddress: null,
  isConnected: false,
  isStacksConnected: false,
  isMiniPay: false,
  activeChain: 'celo',
  connectWallet: () => { },
  disconnectAll: () => { },
  showChainSelect: false,
  setShowChainSelect: () => { },
  connect: async () => { },
  disconnect: () => { },
  connectStacks: async () => { },
  disconnectStacks: () => { },
  setActiveChain: () => { },
  userSession: null
})

export const useWallet = () => useContext(WalletContext)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // --- EVM state ---
  const { address: evmAddress, isConnected: evmConnected } = useAccount()
  const { disconnect: wagmiDisconnect } = useDisconnect()

  // --- Stacks State (Lazy Init) ---
  const [userSession, setUserSession] = useState<any>(null)
  const [stacksAddress, setStacksAddress] = useState<string | null>(null)

  // --- Common State ---
  const [isMiniPay, setIsMiniPay] = useState(false)
  const [activeChain, setActiveChainState] = useState<'celo' | 'stacks'>('celo')
  const [showChainSelect, setShowChainSelect] = useState(false)

  const isConnected = evmConnected || !!evmAddress
  const isStacksConnected = !!stacksAddress

  // 1. Initialize Stacks Session only on Client
  useEffect(() => {
    const initStacks = async () => {
      try {
        const { AppConfig, UserSession } = await import('@stacks/connect')
        const appConfig = new AppConfig(['store_write', 'publish_data'])
        const session = new UserSession({ appConfig })
        setUserSession(session)

        if (session.isUserSignedIn()) {
          const userData = session.loadUserData()
          setStacksAddress(userData.profile.stxAddress.mainnet || userData.profile.stxAddress.testnet)
          // Auto-set chain if Stacks session exists and no Celo connection
          if (!evmConnected) {
            setActiveChainState('stacks')
          }
        }
      } catch (e) {
        console.error("Failed to init Stacks session", e)
      }
    }
    initStacks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. Persistent chain preference
  useEffect(() => {
    const savedChain = localStorage.getItem('chessify_active_chain') as 'celo' | 'stacks'
    if (savedChain) setActiveChainState(savedChain)
  }, [])

  const setActiveChain = useCallback((chain: 'celo' | 'stacks') => {
    setActiveChainState(chain)
    localStorage.setItem('chessify_active_chain', chain)
  }, [])

  // 3. Detect MiniPay
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum?.isMiniPay) {
      setIsMiniPay(true)
    }
  }, [])

  // ── Connect Celo (via Reown AppKit) ──
  const connect = useCallback(async () => {
    try {
      const { modal } = await import('@reown/appkit/react')
      await modal?.open()
    } catch (e) {
      console.error('Failed to open AppKit modal:', e)
    }
    setActiveChain('celo')
    setShowChainSelect(false)
  }, [setActiveChain])

  // ── Connect Stacks (via Stacks Connect) ──
  const connectStacks = useCallback(async () => {
    if (!userSession) return
    try {
      const { showConnect } = await import('@stacks/connect')
      showConnect({
        appDetails: {
          name: 'Chessify Protocol',
          icon: window.location.origin + '/Piece.svg',
        },
        userSession,
        onFinish: () => {
          const userData = userSession.loadUserData()
          setStacksAddress(userData.profile.stxAddress.mainnet || userData.profile.stxAddress.testnet)
          setActiveChain('stacks')
          setShowChainSelect(false)
        },
        onCancel: () => {
          console.log('Stacks connection cancelled')
          setShowChainSelect(false)
        },
      })
    } catch (e) {
      console.error("Failed to open Stacks connect", e)
    }
  }, [userSession, setActiveChain])

  // ── Disconnect Celo ──
  const disconnect = useCallback(() => {
    wagmiDisconnect()
  }, [wagmiDisconnect])

  // ── Disconnect Stacks ──
  const disconnectStacks = useCallback(() => {
    if (userSession) {
      userSession.signUserOut()
      setStacksAddress(null)
    }
  }, [userSession])

  // ── Unified: Open Chain Select Modal ──
  const connectWallet = useCallback(() => {
    setShowChainSelect(true)
  }, [])

  // ── Unified: Disconnect whichever is active ──
  const disconnectAll = useCallback(() => {
    if (activeChain === 'celo') {
      disconnect()
    } else {
      disconnectStacks()
    }
    // Also disconnect the other if both happen to be connected
    if (isConnected) disconnect()
    if (isStacksConnected) disconnectStacks()
  }, [activeChain, isConnected, isStacksConnected, disconnect, disconnectStacks])

  return (
    <WalletContext.Provider
      value={{
        address: evmAddress || null,
        stacksAddress,
        isConnected,
        isStacksConnected,
        isMiniPay,
        activeChain,
        connectWallet,
        disconnectAll,
        showChainSelect,
        setShowChainSelect,
        connect,
        disconnect,
        connectStacks,
        disconnectStacks,
        setActiveChain,
        userSession
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}


// ⟳ echo · src/components/ui/ChessModels.tsx
//       metalness: isWhite ? 1.0 : (isBlack ? 0.6 : 0.8),
//     })
//   }, [color, emissive, emissiveIntensity])
//   const meshRef = useRef<THREE.Group>(null)