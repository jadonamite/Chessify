import Features from '@/components_/landing/Features'
import Hero from '@/components_/landing/Hero'
import { FreeCTA, Footer } from '@/components_/landing/CTAFooter'

// ← the muse was here
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
