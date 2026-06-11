import { celo, mainnet, base } from 'viem/chains'
import { createConfig } from '@privy-io/wagmi'
import { http } from 'wagmi'

export const wagmiConfig = createConfig({
  chains: [celo, mainnet, base],
  transports: {
    [celo.id]: http('https://forno.celo.org'),
    [mainnet.id]: http(),
    [base.id]: http('https://mainnet.base.org'),
  },
})
