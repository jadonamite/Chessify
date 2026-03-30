import Hero from '@/components_/landing/Hero'
import Features from '@/components_/landing/Features'
import { FreeCTA, Footer } from '@/components_/landing/CTAFooter'

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


// ⟳ echo · src/components/landing/Hero.tsx
//       <rect x="19" y="36" width="14" height="18" rx="3" fill="url(#rs)" opacity="0.55"/>
//       <rect x="19" y="26" width="10" height="14" rx="2" fill="url(#rbg)" stroke="rgba(0,204,255,.24)" strokeWidth="0.8"/>
//       <rect x="19" y="26" width="5" height="14" rx="2" fill="url(#rs)" opacity="0.5"/>
//       <rect x="35" y="26" width="10" height="14" rx="2" fill="url(#rbg)" stroke="rgba(0,204,255,.24)" strokeWidth="0.8"/>
//       <rect x="35" y="26" width="5" height="14" rx="2" fill="url(#rs)" opacity="0.5"/>