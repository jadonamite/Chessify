import Hero from '@/components_/landing/Hero'
import Features from '@/components_/landing/Features'
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
//   logic:    { address: CONTRACT_ADDRESS, name: 'logic'          },
//   timer:    { address: CONTRACT_ADDRESS, name: 'timer'          },
//   ranking:  { address: CONTRACT_ADDRESS, name: 'ranking'        },
//   gateway:  { address: CONTRACT_ADDRESS, name: 'gateway_v2'     },
// } as const