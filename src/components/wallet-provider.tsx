'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { usePrivy, useWallets, useCreateWallet } from '@privy-io/react-auth'
import { useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { CELO_CHAIN_ID } from '@/config/contracts'

interface WalletContextType {
  // ── Addresses ──
  address: string | null
  stacksAddress: string | null

  // ── Connection State ──
  isConnected: boolean
  isStacksConnected: boolean
  isMiniPay: boolean
  activeChain: 'celo' | 'stacks'
  isWrongChain: boolean       // EVM wallet connected but not on Celo
  switchToCelo: () => void    // request chain switch to Celo

  // ── Unified Auth ──
  connectWallet: () => void       // Opens chain select modal
  disconnectAll: () => void       // Disconnects active chain
  showChainSelect: boolean
  setShowChainSelect: (show: boolean) => void

  // ── Internal (used by ChainSelectModal) ──
  connect: () => Promise<void>
  connectStacks: () => Promise<void>
  connectSocial: () => Promise<void>
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
  isWrongChain: false,
  switchToCelo: () => { },
  connectWallet: () => { },
  disconnectAll: () => { },
  showChainSelect: false,
  setShowChainSelect: () => { },
  connect: async () => { },
  disconnect: () => { },
  connectStacks: async () => { },
  connectSocial: async () => { },
  disconnectStacks: () => { },
  setActiveChain: () => { },
  userSession: null
})

export const useWallet = () => useContext(WalletContext)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // --- EVM state (Privy) ---
  const { login, logout, authenticated, ready } = usePrivy()
  const { address: evmAddress } = useAccount()
  const { wallets } = useWallets()
  const { createWallet } = useCreateWallet()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const currentChainId = useChainId()
  const { switchChain } = useSwitchChain()

  // --- Stacks State (Lazy Init) ---
  const [userSession, setUserSession] = useState<any>(null)
  const [stacksAddress, setStacksAddress] = useState<string | null>(null)

  // --- Common State ---
  const [isMiniPay, setIsMiniPay] = useState(false)
  const [activeChain, setActiveChainState] = useState<'celo' | 'stacks'>('celo')
  const [showChainSelect, setShowChainSelect] = useState(false)

  // Prefer wagmi (external wallet), fall back to Privy embedded wallet
  const privyAddress = wallets[0]?.address as `0x${string}` | undefined
  const evmResolvedAddress = evmAddress ?? privyAddress ?? null

  const isConnected = ready && authenticated
  const isStacksConnected = !!stacksAddress

  // True when an EVM wallet is connected but the user is on the wrong network.
  // Embedded Privy wallets auto-switch; this catches external wallets (MetaMask etc.).
  const isWrongChain = isConnected && activeChain === 'celo' && !!currentChainId && currentChainId !== CELO_CHAIN_ID
  const switchToCelo = useCallback(() => {
    switchChain?.({ chainId: CELO_CHAIN_ID })
  }, [switchChain])

  // 1. Restore saved chain preference first, then initialize Stacks session.
  //    Reading localStorage before Stacks init prevents the init effect from
  //    being overwritten by the preference effect (React runs effects in order).
  useEffect(() => {
    const saved = localStorage.getItem('chessify_active_chain') as 'celo' | 'stacks' | null
    if (saved) setActiveChainState(saved)

    const initStacks = async () => {
      try {
        const { AppConfig, UserSession } = await import('@stacks/connect')
        const appConfig = new AppConfig(['store_write', 'publish_data'])
        const session = new UserSession({ appConfig })
        setUserSession(session)

        if (session.isUserSignedIn()) {
          const userData = session.loadUserData()
          setStacksAddress(userData.profile.stxAddress.mainnet || userData.profile.stxAddress.testnet)
          // Only auto-switch to Stacks if no saved preference and no Celo connection
          if (!saved && !authenticated) {
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

  // 4. If authenticated but no wallet exists yet, create an embedded one
  useEffect(() => {
    if (!ready || !authenticated) return
    if (wallets.length === 0 && !evmAddress) {
      createWallet().catch(() => {})
    }
  }, [ready, authenticated, wallets.length, evmAddress, createWallet])

  // ── Connect Celo (via Privy — wallet or social) ──
  const connect = useCallback(async () => {
    if (!authenticated) login()
    setActiveChain('celo')
    setShowChainSelect(false)
  }, [login, authenticated, setActiveChain])

  // ── Connect via social login (Privy unified modal) ──
  const connectSocial = useCallback(async () => {
    if (!authenticated) login()
    setActiveChain('celo')
    setShowChainSelect(false)
  }, [login, authenticated, setActiveChain])

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

  // ── Disconnect Celo (Privy) ──
  const disconnect = useCallback(() => {
    logout()
    wagmiDisconnect()
  }, [logout, wagmiDisconnect])

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

  // ── Unified: Disconnect both chains if connected ──
  const disconnectAll = useCallback(() => {
    if (isConnected) disconnect()
    if (isStacksConnected) disconnectStacks()
  }, [isConnected, isStacksConnected, disconnect, disconnectStacks])

  return (
    <WalletContext.Provider
      value={{
        address: evmResolvedAddress,
        stacksAddress,
        isConnected,
        isStacksConnected,
        isMiniPay,
        activeChain,
        isWrongChain,
        switchToCelo,
        connectWallet,
        disconnectAll,
        showChainSelect,
        setShowChainSelect,
        connect,
        disconnect,
        connectStacks,
        connectSocial,
        disconnectStacks,
        setActiveChain,
        userSession
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
