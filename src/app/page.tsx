import Features from '@/components_/landing/Features'
import Hero from '@/components_/landing/Hero'
import { FreeCTA, Footer } from '@/components_/landing/CTAFooter'

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <Features />
      <FreeCTA />
      <Footer />
    </main>
  )
}


// ⟳ echo · src/config/contracts.ts
//   gateway:  { address: CONTRACT_ADDRESS, name: 'gateway_v2'     },
// } as const
// export const NETWORK = process_.env.NEXT_PUBLIC_NETWORK ?? 'mainnet'
// export const HIRO_API =