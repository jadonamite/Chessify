import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { useWallet } from '@/components/wallet-provider';
import { useStacksRead } from '@/hooks/useStacksRead';
import { CHESS_GAME_ABI, BASE_CHESS_GAME_ABI } from '@/config/abis';
import { CELO_CONTRACTS, BASE_CONTRACTS, BASE_CHAIN_ID } from '@/config/contracts';

export interface Game {
  id: number;
  creator: string;
  wager: number;
  chain: 'celo' | 'stacks' | 'base';
  elo: number;
}

const fetchGames = async (
  publicClient: any,
  contractAddress: string,
  abi: any,
  functionName: string,
  getGameFunctionName: string,
  chain: 'celo' | 'stacks' | 'base'
) => {
  if (!publicClient) return [];
  try {
    const total = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName,
    });
    const games: Game[] = [];
    const start = Number(total) - 1;
    const end = Math.max(0, start - 9);
    for (let i = start; i >= end; i--) {
      const g = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: getGameFunctionName,
        args: [BigInt(i)],
      });
      if (g && Number(g.status) === 0) {
        games.push({
          id: i,
          creator: g.white,
          wager: Number(g.wager) / 1e6,
          chain,
          elo: 1200,
        });
      }
    }
    return games;
  } catch (err) {
    console.error(`Error fetching ${chain} games:`, err);
    return [];
  }
};

export function useLobby() {
  const { activeChain } = useWallet();
  const { getTotalGames: getStacksTotal, getGame: getStacksGame } = useStacksRead();
  const publicClient = usePublicClient();
  const basePublicClient = usePublicClient({ chainId: BASE_CHAIN_ID });
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCeloGames = useCallback(async () => {
    return fetchGames(
      publicClient,
      CELO_CONTRACTS.game,
      CHESS_GAME_ABI,
      'gameNonce',
      'getGame',
      'celo'
    );
  }, [publicClient]);

  const fetchStacksGames = useCallback(async () => {
    if (!getStacksTotal || !getStacksGame) return [];
    try {
      const total = await getStacksTotal();
      const games: Game[] = [];
      const start = total - 1;
      const end = Math.max(0, start - 9);
      for (let i = start; i >= end; i--) {
        const g = await getStacksGame(i);
        if (g && Number(g.status.value) === 0) {
          games.push({
            id: i,
            creator: g.white.value,
            wager: Number(g.wager.value) / 1e6,
            chain: 'stacks',
            elo: 1200,
          });
        }
      }
      return games;
    } catch (err) {
      console.error('Error fetching stacks games:', err);
      return [];
    }
  }, [getStacksTotal, getStacksGame]);

  const fetchBaseGames = useCallback(async () => {
    return fetchGames(
      basePublicClient,
      BASE_CONTRACTS.game,
      BASE_CHESS_GAME_ABI,
      'totalGames',
      'getGame',
      'base'
    );
  }, [basePublicClient]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [cGames, sGames, bGames] = await Promise.all([
      fetchCeloGames(),
      fetchStacksGames(),
      fetchBaseGames(),
    ]);
    setGames([...cGames, ...sGames, ...bGames]);
    setIsLoading(false);
  }, [fetchCeloGames, fetchStacksGames, fetchBaseGames]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    games: games.filter((g) => g.chain === activeChain),
    isLoading,
    refresh,
  };
}