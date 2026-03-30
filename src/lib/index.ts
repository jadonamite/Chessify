// src/lib/index.ts

/**
 * Chessify Protocol
 * A decentralized chess protocol built on the Stacks blockchain.
 * Full SDK functionality coming in v0.2.0
 */

export const VERSION = "0.1.0";

export const initProtocol = () => {
  console.log("Chessify Protocol Initialized");
};

// ⟳ echo · src/components/ui/ThemeToggle.tsx
// export default function ThemeToggle() {
//   const [theme, setTheme] = useState<'dark' | 'light'>('dark')
//   useEffect(() => {
//     const saved = localStorage.getItem('chessify-theme') as 'dark' | 'light' | null

// ⟳ echo · src/components/landing/CTAFooter.tsx
//           style={{color:'var(--t3)',display:'flex',transition:'color .2s'}}
//           onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--t1)' }}
//           onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--t3)' }}
//         >
//           <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">