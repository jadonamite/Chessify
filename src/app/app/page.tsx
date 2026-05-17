import { redirect } from 'next/navigation'

export default function AppPage() {
  redirect('/app/lobby')
}


// ⟳ echo · package.json
//     "contracts"
//   ],
//   "scripts": {
//     "dev": "next dev",
//     "build": "next build",