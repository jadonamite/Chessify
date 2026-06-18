import { redirect } from 'next/navigation';

const getRedirectUrl = () => {
  // Potential for adding more complex logic here in the future
  return '/app/lobby';
};

export default function AppPage() {
  redirect(getRedirectUrl());
}