import { createConfig } from '@privy-io/wagmi'
import { celo, mainnet, base } from 'viem/chains'
import { http } from 'wagmi'
import { injected } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [celo, mainnet, base],
  // Injected connector lets us auto-connect MiniPay's in-app wallet.
  connectors: [injected()],
  transports: {
    [celo.id]: http('https://forno.celo.org'),
    [mainnet.id]: http(),
    [base.id]: http('https://mainnet.base.org'),
  },
})
