/* ... (unchanged code) ... */

/* ── Claim Handler: Celo ── */
const claimCelo = async () => {
  const txPromise = writeContractAsync({
    address: CELO_CONTRACTS.token as `0x${string}`,
    abi: CHESS_TOKEN_ABI,
    functionName: 'faucetClaim',
    args: [],
  })
  const timeoutPromise = timeoutPromiseFactory(60_000)
  const [hash, error] = await Promise.allSettled([txPromise, timeoutPromise])
  if (error) throw error
  return hash
}

/* ── Claim Handler: Base ── */
const claimBase = async () => {
  const txPromise = writeContractAsync({
    chainId: BASE_CHAIN_ID,
    address: BASE_CONTRACTS.token as `0x${string}`,
    abi: CHESS_TOKEN_ABI,
    functionName: 'faucetClaim',
    args: [],
  })
  const timeoutPromise = timeoutPromiseFactory(60_000)
  const [hash, error] = await Promise.allSettled([txPromise, timeoutPromise])
  if (error) throw error
  return hash
}

/* ── Claim Handler: Stacks ── */
const claimStacks = async () => {
  /* ... (unchanged code) ... */
}

const timeoutPromiseFactory = (timeoutMs: number) =>
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs))

/* ... (unchanged code) ... */