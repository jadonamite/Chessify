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

const getChainInfo = (activeChain: string, address: string, stacksAddress: string) => {
  const chainLabel = activeChain === 'stacks' ? 'STX' : activeChain === 'base' ? 'BASE' : 'CELO';
  const chainColor = activeChain === 'stacks' ? '#ff9900' : activeChain === 'base' ? '#0052ff' : '#35ee66';
  const displayAddress = activeChain === 'stacks' ? stacksAddress : address;
  return { chainLabel, chainColor, displayAddress };
};

export default function Navbar() {
  const { isConnected, address, isStacksConnected, stacksAddress, activeChain, connectWallet, disconnectAll, showChainSelect, setShowChainSelect, connect, connectStacks, connectSocial, connectBase, isWrongChain, switchToCelo,
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
  const { chainLabel, chainColor, displayAddress } = getChainInfo(activeChain, address, stacksAddress);
  const showWallet = mounted && connected && !!displayAddress;
  return (
    // ...
  );
}