import { createConfig, webSocket } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    metaMask(),
    injected()
  ],
  pollingInterval: 200,
  transports: {
    [baseSepolia.id]: webSocket('wss://soft-alpha-grass.base-sepolia.quiknode.pro/fd5e4bf346247d9b6e586008a9f13df72ce6f5b2/')
  },
})