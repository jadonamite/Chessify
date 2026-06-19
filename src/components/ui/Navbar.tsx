import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from '@/components/wallet-provider';
import ChessName from '@/components/ui/ChessName';
import ChessAvatar from '@/components/ui/ChessAvatar';
import GlowButton from '@/components/ui/GlowButton';
import ChainSelectModal from '@/components/ui/ChainSelectModal';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { stopAmbient } from '@/lib/audio';

const NAV_LINKS = [
  { label: 'Leaderboard', path: '/app/leaderboard' },
  { label: 'History', path: '/app/history' },
  { label: 'Faucet', path: '/app/faucet' },
  { label: 'Settings', path: '/app/settings' },
];

function LogoutIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

const getChainInfo = (activeChain: string, chainColor: string) => {
  switch (activeChain) {
    case 'stacks':
      return { label: 'STX', color: chainColor };
    case 'base':
      return { label: 'BASE', color: chainColor };
    default:
      return { label: 'CELO', color: chainColor };
  }
};

export default function Navbar() {
  const {
    isConnected,
    address,
    isStacksConnected,
    stacksAddress,
    activeChain,
    connectWallet,
    disconnectAll,
    showChainSelect,
    setShowChainSelect,
    connect,
    connectStacks,
    connectSocial,
    connectBase,
    isWrongChain,
    switchToCelo,
  } = useWallet();
  const { soundEnabled, setSoundEnabled } = useSettingsStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const close = () => setMobileOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  const connected = isConnected || isStacksConnected;
  const displayAddress = activeChain === 'stacks' ? stacksAddress : address;
  const { label: chainLabel, color: chainColor } = getChainInfo(activeChain, '#ff9900');

  const showWallet = mounted && connected && !!displayAddress;

  return (
    // ...
  );
}