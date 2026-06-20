import { createConfig } from '@privy-io/wagmi'
import { celo, mainnet, base } from 'viem/chains'
import { http } from 'wagmi'

const createTransports = (chains: any[]) => {
  const transports: any = {}
  chains.forEach((chain: any) => {
    if (chain.id === celo.id) {
      transports[chain.id] = http('https://forno.celo.org')
    } else if (chain.id === mainnet.id) {
      transports[chain.id] = http()
    } else if (chain.id === base.id) {
      transports[chain.id] = http('https://mainnet.base.org')
    }
  })
  return transports
}

export const wagmiConfig = createConfig({
  chains: [celo, mainnet, base],
  transports: createTransports([celo, mainnet, base]),
})
