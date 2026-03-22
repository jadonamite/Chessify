import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CHESSIFY — Play Chess on Stacks',
  description: 'Wager CHESS tokens, play on-chain. Built by Velocity Labs.',
  others: {
    'twitter:card': 'summary_large_image',
    'twitter:title': 'CHESSIFY — Play Chess on Stacks',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('chessify-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}` }}/>
      </head>
      <body>{children}</body>
    </html>
  )
}
