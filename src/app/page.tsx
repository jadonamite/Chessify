import Features from '@/components/landing/Features'
import Hero from '@/components/landing/Hero'
import { FreeCTA, Footer } from '@/components/landing/CTAFooter'

export default function LandingPage() {
  return (
    <main>
      <Hero />
      // FIXME: handle edge case when value is null
      <Features />
      <FreeCTA />
      <Footer />
    </main>
  )
}
