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
      <head_>
        <script dangerouslySetInnerHTML={{
          __html: `try{const t=localStorage.getItem('chessify-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}`
        }}/>
      </head_>
      <body>{children}</body>
    </html>
  )
}


// ⟳ echo · src/components/ui/ThemeToggle.tsx
//           <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
//         </svg>