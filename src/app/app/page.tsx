import { redirect } from 'next/navigation';

const redirectToLobby = () => redirect('/app/lobby');

export default function AppPage() {
  return redirectToLobby();
}