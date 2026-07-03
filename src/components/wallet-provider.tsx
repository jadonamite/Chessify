'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { usePrivy, useWallets, useCreateWallet } from '@privy-io/react-auth'
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets'
import { useAccount, useDisconnect, useChainId, useSwitchChain, useConnect, useConnectors } from 'wagmi'
import { CELO_CHAIN_ID, BASE_CHAIN_ID } from '@/config/contracts'

// Active chain. Celo and Base share the same Privy EVM wallet/address; Stacks is
// a separate session.
export type ActiveChain = 'celo' | 'stacks' | 'base'

// Capability tier drives how EVM (Celo/Base) writes are sponsored:
//   'minipay' → legacy tx + USDm gas-drip (MiniPay can't sign typed data)
//   'smart'   → ERC-4337 userOp sponsored by the Pimlico paymaster
//   'eoa'     → embedded Privy or external wallet; pays its own gas (native drip)
export type WalletTier = 'minipay' | 'smart' | 'eoa'

interface WalletContextType {
  // ── Addresses ──
  address: string | null
  stacksAddress: string | null
  // On-chain EVM identity used as the game "player": the smart-account address
  // for Tier A (embedded/social), otherwise the connected EOA. Always matches
  // white/black on-chain.
  playerAddress: string | null

  // ── Connection State ──
  isConnected: boolean
  isStacksConnected: boolean
  isReady: boolean
  // True once the user's real on-chain identity is resolved (the smart account for
  // embedded users). Gate create/join/claim on this to avoid the EOA-split bug.
  identityReady: boolean
  isMiniPay: boolean
  walletTier: WalletTier      // EVM sponsorship capability tier
  activeChain: ActiveChain
  isWrongChain: boolean       // EVM wallet connected but not on the active EVM chain
  switchToCelo: () => void    // request chain switch to the active EVM chain

  // ── Unified Auth ──
  connectWallet: () => void       // Opens chain select modal
  disconnectAll: () => void       // Disconnects active chain
  showChainSelect: boolean
  setShowChainSelect: (show: boolean) => void

  // ── Internal (used by ChainSelectModal) ──
  connect: () => Promise<void>
  connectBase: () => Promise<void>
  connectStacks: () => Promise<void>
  connectSocial: () => Promise<void>
  disconnect: () => void
  disconnectStacks: () => void
  setActiveChain: (chain: ActiveChain) => void

  // ── Session ──
  userSession: any | null
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  stacksAddress: null,
  playerAddress: null,
  isConnected: false,
  isStacksConnected: false,
  isReady: false,
  identityReady: false,
  isMiniPay: false,
  walletTier: 'eoa',
  activeChain: 'celo',
  isWrongChain: false,
  switchToCelo: () => { },
  connectWallet: () => { },
  disconnectAll: () => { },
  showChainSelect: false,
  setShowChainSelect: () => { },
  connect: async () => { },
  connectBase: async () => { },
  disconnect: () => { },
  connectStacks: async () => { },
  connectSocial: async () => { },
  disconnectStacks: () => { },
  setActiveChain: () => { },
  userSession: null
})

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // --- EVM state (Privy) ---
  const { login, logout, authenticated, ready } = usePrivy()
  const { address: evmAddress } = useAccount()
  const { wallets } = useWallets()
  const { createWallet } = useCreateWallet()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { connect: wagmiConnect } = useConnect()
  const connectors = useConnectors()
  const { client: smartWalletClient } = useSmartWallets()
  const currentChainId = useChainId()
  const { switchChain } = useSwitchChain()

export const useWallet = () => useContext(WalletContext)

  // --- Stacks State (Lazy Init) ---
  const [userSession, setUserSession] = useState<any>(null)
  const [stacksAddress, setStacksAddress] = useState<string | null>(null)

  // --- Common State ---
  const [isMiniPay, setIsMiniPay] = useState(false)
  const [activeChain, setActiveChainState] = useState<ActiveChain>('celo')
  const [showChainSelect, setShowChainSelect] = useState(false)
  const miniPayConnectTried = useRef(false)

  // Prefer wagmi (external wallet), fall back to Privy embedded wallet
  const privyAddress = wallets[0]?.address as `0x${string}` | undefined
  const address = evmAddress ?? privyAddress ?? null

  // Authenticated via Privy, OR auto-connected MiniPay (injected wallet, no Privy session)
  const isConnected = (ready && authenticated) || (isMiniPay && !!evmAddress)
  const isStacksConnected = !!stacksAddress

  // A user with an embedded Privy wallet WILL get a smart account — so their true
  // on-chain identity is the smart account, not the embedded EOA. We must not let
  // them act under the EOA in the window before the smart client resolves, or a
  // profile/game gets recorded under the wrong address (the dual-identity split).
  const hasEmbeddedWallet = wallets.some(
    (w) => w.connectorType === 'embedded' || w.walletClientType === 'privy',
  )
  const expectsSmartAccount = !isMiniPay && hasEmbeddedWallet
  const smartAccount = smartWalletClient?.account?.address ?? null

  // Safety valve: if the smart account never resolves, don't brick the user —
  // after a grace period fall back to the EOA (the alias self-heal covers the
  // rare split that creates).
  const [smartTimedOut, setSmartTimedOut] = useState(false)
  useEffect(() => {
    if (!expectsSmartAccount || smartAccount) {
      if (smartTimedOut) setSmartTimedOut(false)
      return
    }
    const t = setTimeout(() => setSmartTimedOut(true), 8_000)
    return () => clearTimeout(t)
  }, [expectsSmartAccount, smartAccount, smartTimedOut])

  // Capability tier — MiniPay first; an embedded user is 'smart' (even while the
  // account is still resolving) unless we've given up waiting; else external EOA.
  const walletTier: WalletTier = isMiniPay
    ? 'minipay'
    : expectsSmartAccount && (smartAccount || !smartTimedOut)
      ? 'smart'
      : 'eoa'

  // Pinned on-chain EVM identity:
  //   • MiniPay / external EOA → the connected EOA
  //   • embedded (smart) user  → the smart account ONLY. Intentionally null until
  //     it resolves, so create/join/claim (which all bail on a null identity) wait
  //     instead of acting under the EOA. Degrades to the EOA only after the timeout.
  const playerAddress = isMiniPay
    ? address
    : expectsSmartAccount
      ? smartAccount ?? (smartTimedOut ? address : null)
      : address

  // Fully ready = connected AND the real identity is resolved (or we gave up waiting).
  const identityReady = isMiniPay
    ? !!address
    : expectsSmartAccount
      ? !!smartAccount || smartTimedOut
      : !!address
  const isReady = isConnected && !!playerAddress && identityReady

  // True when an EVM wallet is connected but on the wrong network for the active
  // EVM chain. Embedded Privy wallets auto-switch; this catches external wallets.
  const expectedEvmChainId = activeChain === 'base' ? BASE_CHAIN_ID : CELO_CHAIN_ID
  const isWrongChain = isConnected && (activeChain === 'celo' || activeChain === 'base')
    && !!currentChainId && currentChainId !== expectedEvmChainId
  const switchToCelo = useCallback(() => {
    switchChain?.({ chainId: expectedEvmChainId })
  }, [switchChain, expectedEvmChainId])

  // 1. Restore saved chain preference first, then initialize Stacks session.
  //    Reading localStorage before Stacks init prevents the init effect from
  //    being overwritten by the preference effect (React runs effects in order).
  useEffect(() => {
    const saved = localStorage.getItem('chessify_active_chain') as ActiveChain | null
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

  const setActiveChain = useCallback((chain: ActiveChain) => {
    setActiveChainState(chain)
    localStorage.setItem('chessify_active_chain', chain)
  }, [])

  // 3. Detect MiniPay and auto-connect its injected wallet. MiniPay runs the dApp
  //    in an in-app browser and grants without a prompt, so the user lands
  //    logged-in without tapping "connect".
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!(window as unknown as { ethereum?: { isMiniPay?: boolean } }).ethereum?.isMiniPay) return
    setIsMiniPay(true)
    if (miniPayConnectTried.current || evmAddress) return
    const injectedConnector = connectors.find((c) => c.type === 'injected')
    if (!injectedConnector) return
    miniPayConnectTried.current = true
    wagmiConnect({ connector: injectedConnector })
  }, [connectors, wagmiConnect, evmAddress])

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

  // ── Connect Base (same Privy EVM wallet as Celo, different active chain) ──
  const connectBase = useCallback(async () => {
    if (!authenticated) login()
    setActiveChain('base')
    setShowChainSelect(false)
    // Best-effort network switch for external wallets; embedded wallets follow
    // the chainId passed on each write.
    try { switchChain?.({ chainId: BASE_CHAIN_ID }) } catch { /* ignore */ }
  }, [login, authenticated, setActiveChain, switchChain])

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
      // @stacks/connect v8 removed the `showConnect` runtime export (its .d.ts
      // still declares it, but the value is undefined). `authenticate` is the
      // documented legacy replacement — same AuthOptions, still populates
      // userSession — so the rest of the Stacks flow (openContractCall in the
      // game hooks) keeps working unchanged.
      const { authenticate } = await import('@stacks/connect')
      authenticate({
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
        address,
        stacksAddress,
        playerAddress,
        isConnected,
        isStacksConnected,
        isReady,
        identityReady,
        isMiniPay,
        walletTier,
        activeChain,
        isWrongChain,
        switchToCelo,
        connectWallet,
        disconnectAll,
        showChainSelect,
        setShowChainSelect,
        connect,
        connectBase,
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
