'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import SceneBoundary from '@/components/ui/SceneBoundary'
import { King, Queen, Pawn, Bishop, Knight } from '@/components/ui/ChessModels'

/**
 * Shared decorative background — the floating chess pieces + neon grid used across
 * the app. ONE WebGL context, mounted per page (only the active route's instance is
 * alive, so contexts never accumulate). Deliberately light: no HDR environment
 * (lit by plain lights instead), dpr-capped, low-power — so adding it to a page
 * doesn't cost what the landing king does. Wrapped in SceneBoundary so a lost
 * context degrades to "no background" rather than crashing the page.
 */
function renderChessPiece(hero: 'king' | 'queen', position: number[], color: string, emissive: string, emissiveIntensity: number, floatSpeed: number, floatIntensity: number, rotationIntensity: number, scale: number) {
  if (hero === 'queen') {
    return <Queen position={position} color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} floatSpeed={floatSpeed} floatIntensity={floatIntensity} rotationIntensity={rotationIntensity} scale={scale} />
  } else {
    return <King position={position} color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} floatSpeed={floatSpeed} floatIntensity={floatIntensity} rotationIntensity={rotationIntensity} scale={scale} />
  }
}

function Scene({ hero }: { hero: 'king' | 'queen' }) {
  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 5]} intensity={2} color="#00ccff" />
      <directionalLight position={[-10, -10, -5]} intensity={1} color="#6a0dad" />

      {renderChessPiece(hero, [0, -0.5, -2], '#0f172a', '#00ccff', 0.15, 0.5, 0.3, 0.1, 2.5)}
      <Pawn position={[-4, 2, -3]} color="#1e293b" emissive="#00ccff" emissiveIntensity={0.1} floatSpeed={1.5} floatIntensity={1} rotationIntensity={0.5} />
      <Bishop position={[4, -2, -2]} color="#1e293b" emissive="#6a0dad" emissiveIntensity={0.1} floatSpeed={2} floatIntensity={0.8} rotationIntensity={0.4} />
      <Knight position={[3.5, 2.5, -4]} color="#1e293b" emissive="#00ccff" emissiveIntensity={0.08} floatSpeed={1} floatIntensity={0.6} rotationIntensity={0.3} />
    </>
  )
}

export default function PageBackground({
  hero = 'king',
  grid = true,
}: {
  hero?: 'king' | 'queen'
  /** Render the neon grid overlay. Disable on pages that already draw their own. */
  grid?: boolean
}) {
  return (
    <>
      <div className="fixed inset-0 z-0 h-screen w-full pointer-events-none">
        <SceneBoundary>
          <Canvas
            camera={{ position: [0, 0, 8], fov: 45 }}
            dpr={[1, 1.5]}
            gl={{ alpha: true, powerPreference: 'low-power' }}
          >
            <Suspense fallback={null}>
              <Scene hero={hero} />
            </Suspense>
          </Canvas>
        </SceneBoundary>
      </div>

      {/* Neon grid overlay */}
      {grid && (
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(var(--grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--grid-line) 1px,transparent 1px)',
            backgroundSize: '52px 52px',
            opacity: 0.4,
          }}
        />
      )}
    </>
  )
}