import { redirect } from 'next/navigation'

export default function AppPage() {
  redirect('/app/lobby')
}


// ⟳ echo · src/components/wallet-provider.tsx
//       showConnect({
//         appDetails: {
//           name: 'Chessify Protocol',
//           icon: window.location.origin + '/Piece.svg',