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


// ⟳ echo · src/app/app/history/page.tsx
// import { HistoryContent } from '@/components/lobby/HistoryContent'
// export default function HistoryPage() {
//   return <HistoryContent />
// }