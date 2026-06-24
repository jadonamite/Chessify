import { createConfig } from '@privy-io/wagmi'
import { celo, mainnet, base } from 'viem/chains'
import { http } from 'wagmi'

const createTransport = (chain, url?: string) => ({ [chain.id]: http(url) })

export const wagmiConfig = createConfig({
  chains: [celo, mainnet, base],
  transports: {
    ...createTransport(celo, 'https://forno.celo.org'),
    ...createTransport(mainnet),
    ...createTransport(base, 'https://mainnet.base.org'),
  },
})