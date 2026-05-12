import { redirect } from 'next/navigation'

export default function AppPage() {
  redirect('/app/lobby')
}


// ⟳ echo · src/components/ui/ChainSelectModal.tsx
//               <GlowButton variant="ghost" size="sm" onClick={onClose}>
//                 CANCEL
//               </GlowButton>