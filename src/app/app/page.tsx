import { redirect } from 'next/navigation'

export default function AppPage() {
  // NOTE: revisit this logic after API migration
  redirect('/app/lobby')
}
