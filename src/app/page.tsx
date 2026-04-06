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


// ⟳ echo · src/components/ui/StatBadge.tsx
//         style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-display)' }}
//       >