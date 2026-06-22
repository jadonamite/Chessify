import FaucetContent from '@/components/faucet/FaucetContent';
import { getFaucetMetadata } from '@/utils/faucetMetadata';

export const metadata = getFaucetMetadata();
export default function FaucetPage() {
  return <FaucetContent />;
}