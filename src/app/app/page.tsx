import { redirect } from 'next/navigation'

export default function AppPage() {
  redirect('/app/lobby')
}


// ⟳ echo · src/hooks/useStacksRead.ts
//       return null
//     }
//   }, [stacksAddress])
//   const getTotalGames = useCallback(async () => {