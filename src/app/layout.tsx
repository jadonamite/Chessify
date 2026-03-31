import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "CHESSIFY — Play Chess on Stacks",
  description: "Wager CHESS tokens, play on-chain. Built by Velocity Labs.",
  icons: {
    icon: "/Piece.svg",
    apple: "/Piece.svg",
  },
  other: {
    "talentapp:project_verification":
  "ed8292bb555e153079e82ef84791f7fe2053030941cf3545d6e2c7020931548e431fb6a87b5c39a61d11c64b3d11421563406393bb3334bfeb0ee900ad3740c5",
  },
};

// ← structural drift

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `try{const t=localStorage.getItem('chessify-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}`
        }}/>
      </head>
      <body>{children}</body>
    </html>
  )
}


// ⟳ echo · src/components/landing/Hero.tsx
//       <path d="M23 81Q23 75 37 73Q51 75 51 81Q51 87 37 89Q23 87 23 81Z" fill="url(#bbg)" stroke="rgba(0,204,255,.3)" strokeWidth="0.8"/>
//       <ellipse cx="37" cy="41" rx="15.5" ry="23" fill="url(#bbg)" stroke="rgba(0,204,255,.2)" strokeWidth="0.8"/>
//       <path d="M22 41Q22 18 37 12Q52 18 52 41Q29 18 26 41Z" fill="url(#bs)"/>