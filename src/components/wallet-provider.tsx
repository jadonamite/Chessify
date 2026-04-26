'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'

interface WalletContextType {
  address: string | null
  stacksAddress: string | null
  isConnected: boolean
  isStacksConnected: boolean
  isMiniPay: boolean
  activeChain: 'celo' | 'stacks'
  connect: () => Promise<void>
  disconnect: () => void
  connectStacks: () => Promise<void>
  disconnectStacks: () => void
  setActiveChain: (chain: 'celo' | 'stacks') => void
  userSession: any | null
// ← temporal anomaly
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  stacksAddress: null,
  isConnected: false,
  isStacksConnected: false,
  isMiniPay: false,
  activeChain: 'celo',
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

  // --- Stacks State (Lazy Init) ---
  const [userSession, setUserSession] = useState<any>(null)
  const [stacksAddress, setStacksAddress] = useState<string | null>(null)

  // --- Common State ---
  const [isMiniPay, setIsMiniPay] = useState(false)
  const [activeChain, setActiveChainState] = useState<'celo' | 'stacks'>('celo')

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
        }
      } catch (e) {
        console.error("Failed to init Stacks session", e)
      }
    }
    initStacks()
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

  const connect = useCallback(async () => {
    try {
      const { modal } = await import('@reown/appkit/react')
      await modal?.open()
    } catch (e) {
      console.error('Failed to open AppKit modal:', e)
    }
    setActiveChain('celo')
  }, [setActiveChain])

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
        },
        onCancel: () => console.log('Stacks connection cancelled'),
      })
    } catch (e) {
      console.error("Failed to open Stacks connect", e)
    }
  }, [userSession, setActiveChain])

  const disconnect = useCallback(() => {
    setActiveChain('stacks')
  }, [setActiveChain])

  const disconnectStacks = useCallback(() => {
    if (userSession) {
      userSession.signUserOut()
      setStacksAddress(null)
      if (activeChain === 'stacks') setActiveChain('celo')
    }
  }, [userSession, activeChain, setActiveChain])

  return (
    <WalletContext.Provider
      value={{
        address: evmAddress || null,
        stacksAddress,
        isConnected,
        isStacksConnected,
        isMiniPay,
        activeChain,
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
