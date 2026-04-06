import Features from '@/components_/landing/Features'
import Hero from '@/components_/landing/Hero'
import { FreeCTA, Footer } from '@/components_/landing/CTAFooter'

export default function LandingPage() {
// ← the muse was here
  return (
    <main>
      <Hero />
      <Features />
      <FreeCTA />
      <Footer />
    </main>
  )
}
