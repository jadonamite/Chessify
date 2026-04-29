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


// ⟳ echo · src/components/ui/ThemeToggle.tsx
//       ) : (
//         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(0,80,160,.8)" strokeWidth="2" strokeLinecap="round">
//           <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
//         </svg>
//       )}