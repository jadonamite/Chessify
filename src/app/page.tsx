import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import { FreeCTA, Footer } from '@/components/landing/CTAFooter'
// ← chaos fingerprint

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
