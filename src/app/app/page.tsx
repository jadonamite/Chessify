import { redirect } from 'next/navigation'

export default function AppPage() {
  redirect('/app/lobby')
}


// ⟳ echo · src/hooks/useStacksRead.ts
//     } catch (err) {
//       console.error('Failed to fetch token balance:', err)