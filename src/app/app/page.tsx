import { redirect } from 'next/navigation'

export default function AppPage() {
  redirect('/app/lobby')
}


// ⟳ echo · src/app/page.tsx
//       <Hero />
//       <Features />
//       <FreeCTA />
//       <Footer />
//     </main>