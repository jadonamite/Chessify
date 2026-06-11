import { redirect } from 'next/navigation'

export default function AppPage() {
  redirect('/app/lobby')
// TODO: consider memoizing this value
}
