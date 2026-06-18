/* ... (rest of the code remains the same) */

const getBalance = async (address: string, chain: string) => {
  if (chain === 'stacks') {
    const balance = await getStacksBalance();
    return (Number(balance) / Math.pow(10, TOKEN_DECIMALS)).toFixed(2);
  } else if (chain === 'celo') {
    const balance = await useReadContract({
      address: CELO_CONTRACTS.token as `0x${string}`,
      abi: CHESS_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });
    return formatUnits(balance as bigint, TOKEN_DECIMALS);
  } else if (chain === 'base') {
    const balance = await useReadContract({
      address: BASE_CONTRACTS.token as `0x${string}`,
      abi: CHESS_TOKEN_ABI,
      functionName: 'balanceOf',
      chainId: BASE_CHAIN_ID,
      args: [address as `0x${string}`],
    });
    return formatUnits(balance as bigint, TOKEN_DECIMALS);
  }
};

const getStats = async (address: string, chain: string) => {
  if (chain === 'stacks') {
    const stats = await getStacksStats(address);
    if (stats) {
      return {
        rating: Number(stats.rating.value),
        wins: Number(stats.wins.value),
        losses: Number(stats.losses.value),
      };
    }
  } else if (chain === 'celo') {
    const stats = await useReadContract({
      address: CELO_CONTRACTS.game as `0x${string}`,
      abi: CHESS_GAME_ABI,
      functionName: 'playerStats',
      args: [address as `0x${string}`],
    });
    if (stats) {
      return {
        rating: Number(stats[3]),
        wins: Number(stats[0]),
        losses: Number(stats[1]),
      };
    }
  } else if (chain === 'base') {
    const stats = await useReadContract({
      address: BASE_CONTRACTS.game as `0x${string}`,
      abi: BASE_CHESS_GAME_ABI,
      functionName: 'getPlayerStats',
      chainId: BASE_CHAIN_ID,
      args: [address as `0x${string}`],
    });
    if (stats) {
      return {
        rating: Number(stats.rating),
        wins: Number(stats.wins),
        losses: Number(stats.losses),
      };
    }
  }
};

useEffect(() => {
  if (activeChain === 'stacks' && stacksAddress) {
    getBalance(stacksAddress, 'stacks').then((balance) => setBalance(balance));
    getStats(stacksAddress, 'stacks').then((stats) => {
      if (stats) {
        setRating(stats.rating);
        setWins(stats.wins);
        setLosses(stats.losses);
      }
    });
  } else if (activeChain === 'celo' && celoAddress) {
    getBalance(celoAddress, 'celo').then((balance) => setBalance(balance));
    getStats(celoAddress, 'celo').then((stats) => {
      if (stats) {
        setRating(stats.rating);
        setWins(stats.wins);
        setLosses(stats.losses);
      }
    });
  } else if (activeChain === 'base' && celoAddress) {
    getBalance(celoAddress, 'base').then((balance) => setBalance(balance));
    getStats(celoAddress, 'base').then((stats) => {
      if (stats) {
        setRating(stats.rating);
        setWins(stats.wins);
        setLosses(stats.losses);
      }
    });
  }
}, [activeChain, stacksAddress, celoAddress]);
