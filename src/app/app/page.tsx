import { redirect } from 'next/navigation'

export default function AppPage() {
  redirect('/app/lobby')
}


// ⟳ echo · src/app/app/history/page.tsx
// import { HistoryContent } from '@/components/lobby/HistoryContent'
// export default function HistoryPage() {