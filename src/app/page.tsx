import React from 'react';
import ChessifyLanding from '@/components/landing/v2/ChessifyLanding';

const MemoizedChessifyLanding = React.memo(ChessifyLanding);

export default function LandingPage() {
  return <MemoizedChessifyLanding />
}