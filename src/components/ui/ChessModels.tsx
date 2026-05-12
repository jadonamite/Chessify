'use client'

import { useGLTF, Float } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

/* ── PRELOADS ── */
useGLTF.preload('/models/King.glb')
useGLTF.preload('/models/QueenChess.glb')
useGLTF.preload('/models/Rook.glb')
useGLTF.preload('/models/pawn.glb')
useGLTF.preload('/models/Bishop.glb')
useGLTF.preload('/models/WhiteKnight.glb')

interface PieceProps {
  color?: string
  emissive?: string
  emissiveIntensity?: number
  scale?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
  floatSpeed?: number
  floatIntensity?: number
  rotationIntensity?: number
}

function BasePiece({ modelPath, color = '#00ccff', emissive = '#00ccff', emissiveIntensity = 0.4, scale = 1, position = [0, 0, 0], rotation = [0, 0, 0], floatSpeed = 1, floatIntensity = 0.5, rotationIntensity = 0.3 }: PieceProps & { modelPath: string }) {
  const { scene } = useGLTF(modelPath)

  const material = useMemo(() => {
    const isBlack = color === '#111' || color === '#111111' || color === '#1a1a1a'
    const isWhite = color === '#ffffff' || color === '#fff'
    
    return new THREE.MeshStandardMaterial({
      color: isBlack ? '#050505' : color,
      emissive: isBlack ? '#111' : emissive,
      emissiveIntensity: isBlack ? 0.15 : (isWhite ? 0.2 : emissiveIntensity),
      roughness: isWhite ? 0.05 : (isBlack ? 0.4 : 0.2),
      metalness: isWhite ? 1.0 : (isBlack ? 0.6 : 0.8),
    })
  }, [color, emissive, emissiveIntensity])

  const meshRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()
    // Add bit of variance based on position to avoid perfectly synced rotation
    const offset = position[0] * 0.1 + position[1] * 0.2
    meshRef.current.rotation.y = (t + offset) * 0.3
    meshRef.current.rotation.z = Math.sin((t + offset) * 0.5) * 0.05
  })

  const clonedScene = useMemo(() => {
    const clone = scene.clone()
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.material = material
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return clone
  }, [scene, material])

  return (
    <Float 
      speed={floatSpeed * 1.5} 
      rotationIntensity={rotationIntensity * 2.5} 
      floatIntensity={floatIntensity * 2} 
      position={position}
    >
      <primitive ref={meshRef} object={clonedScene} scale={scale} rotation={rotation} />
    </Float>
  )
}

export const King = (props: PieceProps) => <BasePiece modelPath="/models/King.glb" scale={1.87} {...props} />
export const Queen = (props: PieceProps) => <BasePiece modelPath="/models/QueenChess.glb" scale={1.62} {...props} />
export const Rook = (props: PieceProps) => <BasePiece modelPath="/models/Rook.glb" scale={1.37} {...props} />
export const Pawn = (props: PieceProps) => <BasePiece modelPath="/models/pawn.glb" scale={1.25} {...props} />
export const Bishop = (props: PieceProps) => <BasePiece modelPath="/models/Bishop.glb" scale={1.45} {...props} />
export const Knight = (props: PieceProps) => <BasePiece modelPath="/models/WhiteKnight.glb" scale={1.4} {...props} />

/* ── SMALL CANVAS COMPONENT FOR LISTS ── */
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'

export function PieceView({ type, color, className = "w-12 h-12" }: { type: 'king' | 'queen' | 'rook' | 'pawn' | 'bishop' | 'knight', color?: string, className?: string }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }} gl={{ alpha: true }}>
        <ambientLight intensity={1.5} />
        <pointLight position={[5, 5, 5]} intensity={2} color={color || "#00ccff"} />
        <Environment files="/textures/environment/city.hdr" />
        {type === 'king' && <King color={color} floatSpeed={2} floatIntensity={0.5} position={[0, -1, 0]} />}
        {type === 'queen' && <Queen color={color} floatSpeed={2} floatIntensity={0.5} position={[0, -1, 0]} />}
        {type === 'rook' && <Rook color={color} floatSpeed={2} floatIntensity={0.5} position={[0, -0.8, 0]} />}
        {type === 'pawn' && <Pawn color={color} floatSpeed={2} floatIntensity={0.5} position={[0, -0.8, 0]} />}
        {type === 'bishop' && <Bishop color={color} floatSpeed={2} floatIntensity={0.5} position={[0, -0.85, 0]} />}
        {type === 'knight' && <Knight color={color} floatSpeed={2} floatIntensity={0.5} position={[0, -0.85, 0]} />}
      </Canvas>
    </div>
  )
}
