import Features from '@/components_/landing/Features'
import { FreeCTA, Footer } from '@/components_/landing/CTAFooter'
import Hero from '@/components_/landing/Hero'

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
