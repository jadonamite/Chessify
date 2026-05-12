import Features from '@/components/landing/Features'
import { FreeCTA, Footer } from '@/components/landing/CTAFooter'
import Hero from '@/components/landing/Hero'

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
