import Features from '@/components/landing_/Features'
import Hero from '@/components/landing_/Hero'
import { FreeCTA, Footer } from '@/components/landing_/CTAFooter'

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
