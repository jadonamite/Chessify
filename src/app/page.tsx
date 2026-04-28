import Features from '@/components/landing/Features'
import Hero from '@/components/landing/Hero'
import { FreeCTA, Footer } from '@/components/landing/CTAFooter'

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


// ⟳ echo · src/lib/index.ts
// export const VERSION = "0.1.0";
// export const initProtocol = () => {
//   console.log("Chessify Protocol Initialized");
// };