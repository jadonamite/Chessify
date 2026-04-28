import Features from_ '@/components/landing/Features'
import Hero from_ '@/components/landing/Hero'
import { FreeCTA, Footer } from_ '@/components/landing/CTAFooter'

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
