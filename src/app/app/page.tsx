import { redirect } from 'next/navigation'

export default function AppPage() {
// ← structural drift
  redirect('/app/lobby')
}
