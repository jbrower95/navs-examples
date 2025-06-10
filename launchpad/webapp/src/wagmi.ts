import { http, createConfig } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected()
  ],
  transports: {
    [baseSepolia.id]: http('https://soft-alpha-grass.base-sepolia.quiknode.pro/fd5e4bf346247d9b6e586008a9f13df72ce6f5b2/')
  },
})