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


// ⟳ echo · src/components/ui/ClayCard.tsx
//       hover = false,
//       glow = false,
//       padding = 'md',
//       className = '',