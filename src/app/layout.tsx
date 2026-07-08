import './globals.css'
import type { Metadata } from 'next'
import { Providers } from './providers'

export const metadata: Metadata = {
  // Set NEXT_PUBLIC_SITE_URL in prod so OG/canonical URLs resolve absolutely.
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title: {
    default: "Chessify — Learn, Play & Stake Chess On-Chain",
    template: "%s · Chessify",
  },
  description:
    "Train with grandmaster AI coaches, wager CHESS tokens on real games, and keep every coin you win. On-chain chess across Celo, Stacks and Base.",
  applicationName: "Chessify",
  keywords: [
    "chess",
    "play chess online",
    "crypto chess",
    "on-chain chess",
    "chess wager",
    "CHESS token",
    "Celo",
    "Base",
    "Stacks",
    "chess coach",
    "web3 chess",
  ],
  alternates: { canonical: "/" },
  icons: {
    icon: "/Piece.svg",
    apple: "/Piece.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Chessify",
    url: "/",
    title: "Chessify — Learn, Play & Stake Chess On-Chain",
    description:
      "Train with grandmaster AI coaches, wager CHESS tokens on real games, and keep every coin you win.",
    images: [{ url: "/chessify.png", width: 1522, height: 294, alt: "Chessify" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chessify — Learn, Play & Stake Chess On-Chain",
    description:
      "Train with grandmaster AI coaches, wager CHESS tokens on real games, and keep every coin you win.",
    images: ["/chessify.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  other: {
    // Base mini-app id — Chessify-specific, do not drop.
    "base:app_id": "6a1d6c2968e7f787fedc066b",
    // Chessify's own Talent verification token — per-project, do NOT use playchessify's.
    "talentapp:project_verification":
      "ed8292bb555e153079e82ef84791f7fe2053030941cf3545d6e2c7020931548e431fb6a87b5c39a61d11c64b3d11421563406393bb3334bfeb0ee900ad3740c5",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head />
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  ),
}
