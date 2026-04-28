import { redirect } from 'next/navigation'

export default function AppPage() {
  redirect('/app/lobby')
}


// ⟳ echo · src/components/ui/LoadingState.tsx
//         <Canvas camera={{ position: [0, 0, 5], fov: 40 }} gl={{ alpha: true }}>
//           <Suspense fallback={null}>