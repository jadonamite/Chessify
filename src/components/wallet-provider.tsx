'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { AppConfig, UserSession, showConnect } from '@stacks/connect'


// Define the shape of our context

// Define the shape of our context
interface WalletContextType {
  address: string | null          // EVM Address
  stacksAddress: string | null    // Stacks Address
  isConnected: boolean            // EVM connection status
  isStacksConnected: boolean      // Stacks connection status
  isMiniPay: boolean
  activeChain: 'celo' | 'stacks'
  connect: () => Promise<void>
  disconnect: () => void
  connectStacks: () => Promise<void>
  disconnectStacks: () => void
  setActiveChain: (chain: 'celo' | 'stacks') => void
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
})

export const useWallet = () => useContext(WalletContext)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // --- EVM / Celo State ---
  const [address, setAddress] = useState<string | null>(null)
  const [isMiniPay, setIsMiniPay] = useState(false)
  
  // --- Stacks State ---
  const appConfig = useMemo(() => new AppConfig(['store_write', 'publish_data']), [])
  const userSession = useMemo(() => new UserSession({ appConfig }), [appConfig])
  const [stacksAddress, setStacksAddress] = useState<string | null>(null)

  // --- Active Chain Logic ---
  const [activeChain, setActiveChainState] = useState<'celo' | 'stacks'>('celo')

  const isConnected = !!address
  const isStacksConnected = !!stacksAddress

  // Persistent active chain preference
  useEffect(() => {
    const savedChain = localStorage.getItem('chessify_active_chain') as 'celo' | 'stacks'
    if (savedChain) setActiveChainState(savedChain)
  }, [])

  const setActiveChain = useCallback((chain: 'celo' | 'stacks') => {
    setActiveChainState(chain)
    localStorage.setItem('chessify_active_chain', chain)
  }, [])

  // Initialize EVM / MiniPay
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      if (window.ethereum.isMiniPay) {
        setIsMiniPay(true)
        window.ethereum.request({ method: 'eth_requestAccounts' })
          .then((accounts: any) => accounts[0] && setAddress(accounts[0]))
      }

      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: any) => {
        if (accounts.length > 0) setAddress(accounts[0])
      })

      const handleAccountsChanged = (accounts: any) => {
        setAddress(accounts.length > 0 ? accounts[0] : null)
      }
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
    }
  }, [])

  // Initialize Stacks session
  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData()
      setStacksAddress(userData.profile.stxAddress.testnet) // Use testnet for dev
      setActiveChain('stacks')
    }
  }, [userSession, setActiveChain])

  const connect = useCallback(async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        if (accounts.length > 0) {
          setAddress(accounts[0])
          setActiveChain('celo')
        }
      } catch (error) {
        console.error('EVM connection failed:', error)
      }
    }
  }, [setActiveChain])

  const connectStacks = useCallback(async () => {
    showConnect({
      appDetails: {
        name: 'Chessify Protocol',
        icon: window.location.origin + '/logo.png',
      },
      userSession,
      onFinish: () => {
        const userData = userSession.loadUserData()
        setStacksAddress(userData.profile.stxAddress.testnet)
        setActiveChain('stacks')
      },
      onCancel: () => console.log('Stacks connection cancelled'),
    })
  }, [userSession, setActiveChain])

  const disconnect = useCallback(() => {
    setAddress(null)
  }, [])

  const disconnectStacks = useCallback(() => {
    userSession.signUserOut()
    setStacksAddress(null)
    if (activeChain === 'stacks') setActiveChain('celo')
  }, [userSession, activeChain, setActiveChain])

  return (
    <WalletContext.Provider
      value={{
        address,
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
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
