'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { AppConfig, UserSession, showConnect } from '@stacks/connect'
import { STACKS_NETWORK } from '@/config/contracts'

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Define the shape of our context
interface WalletContextType {
  address: string | null          // EVM Address
  stacksAddress: string | null    // Stacks Address
  isConnected: boolean            // EVM connection status
  isStacksConnected: boolean      // Stacks connection status
  isMiniPay: boolean
  connect: () => Promise<void>
  connectStacks: () => Promise<void>
  disconnect: () => void
  activeChain: 'celo' | 'stacks' | null
  setActiveChain: (chain: 'celo' | 'stacks') => void
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  stacksAddress: null,
  isConnected: false,
  isStacksConnected: false,
  isMiniPay: false,
  connect: async () => {},
  connectStacks: async () => {},
  disconnect: () => {},
  activeChain: null,
  setActiveChain: () => {},
})

export const useWallet = () => useContext(WalletContext)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [stacksAddress, setStacksAddress] = useState<string | null>(null)
  const [isMiniPay, setIsMiniPay] = useState(false)
  const [activeChain, setActiveChainState] = useState<'celo' | 'stacks' | null>(null)

  const isConnected = !!address
  const isStacksConnected = !!stacksAddress

  // Stacks session setup
  const appConfig = useMemo(() => new AppConfig(['store_write', 'publish_data']), [])
  const userSession = useMemo(() => new UserSession({ appConfig }), [appConfig])

  const setActiveChain = useCallback((chain: 'celo' | 'stacks') => {
    setActiveChainState(chain)
    localStorage.setItem('chessify-active-chain', chain)
  }, [])

  // Initialize and check for existing connections
  useEffect(() => {
    // 1. Check EVM (Celo)
    if (typeof window !== 'undefined' && window.ethereum) {
      if (window.ethereum.isMiniPay) {
        setIsMiniPay(true)
        setAddress(window.ethereum.selectedAddress)
        setActiveChainState('celo')
      }

      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: any) => {
        if (accounts.length > 0) {
          setAddress(accounts[0])
        }
      }).catch(console.error)

      const handleAccountsChanged = (accounts: any) => {
        if (accounts.length > 0) {
          setAddress(accounts[0])
        } else {
          setAddress(null)
          if (activeChain === 'celo') setActiveChainState(null)
        }
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }

    // 2. Check Stacks
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData()
      const addr = STACKS_NETWORK === 'mainnet' 
        ? userData.profile.stxAddress.mainnet 
        : userData.profile.stxAddress.testnet
      setStacksAddress(addr)
    }

    // 3. Load active chain preference
    const savedChain = localStorage.getItem('chessify-active-chain') as 'celo' | 'stacks' | null
    if (savedChain) setActiveChainState(savedChain)
  }, [userSession, activeChain])

  const connect = useCallback(async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        })
        if (accounts.length > 0) {
          setAddress(accounts[0])
          setActiveChainState('celo')
          localStorage.setItem('chessify-active-chain', 'celo')
        }
      } catch (error) {
        console.error('Failed to connect EVM wallet:', error)
      }
    } else {
      alert('Please install a Web3 wallet (like MetaMask or use MiniPay)!')
    }
  }, [])

  const connectStacks = useCallback(async () => {
    showConnect({
      appDetails: {
        name: 'Chessify Protocol',
        icon: window.location.origin + '/favicon.ico',
      },
      userSession,
      onFinish: () => {
        const userData = userSession.loadUserData()
        const addr = STACKS_NETWORK === 'mainnet' 
          ? userData.profile.stxAddress.mainnet 
          : userData.profile.stxAddress.testnet
        setStacksAddress(addr)
        setActiveChainState('stacks')
        localStorage.setItem('chessify-active-chain', 'stacks')
      },
      onCancel: () => {
        console.log('Stacks connection cancelled')
      }
    })
  }, [userSession])

  const disconnect = useCallback(() => {
    if (activeChain === 'celo') {
      setAddress(null)
    } else if (activeChain === 'stacks') {
      userSession.signUserOut()
      setStacksAddress(null)
    }
    setActiveChainState(null)
    localStorage.removeItem('chessify-active-chain')
  }, [activeChain, userSession])

  return (
    <WalletContext.Provider
      value={{
        address,
        stacksAddress,
        isConnected,
        isStacksConnected,
        isMiniPay,
        connect,
        connectStacks,
        disconnect,
        activeChain,
        setActiveChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

