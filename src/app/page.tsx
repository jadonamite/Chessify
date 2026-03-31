import Hero from '@/components_/landing_/Hero'
import Features from '@/components_/landing_/Features'
import { FreeCTA, Footer } from '@/components_/landing_/CTAFooter'

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
