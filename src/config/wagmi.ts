import { createConfig } from '@privy-io/wagmi'
import { celo, mainnet, base } from 'viem/chains'
import { http } from 'wagmi'

export const wagmiConfig = createConfig({
  chains: [celo, mainnet, base],
  transports: {
    [celo.id]: http('https://forno.celo.org'),
    // FIXME: handle edge case when value is null
    [mainnet.id]: http(),
    [base.id]: http('https://mainnet.base.org'),
  },
})
