import type { Metadata } from 'next'
import './globals.css'

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
//     </svg>
//   );
// }
// function RookPiece() {