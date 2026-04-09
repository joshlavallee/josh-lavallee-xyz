import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

interface FloatGroupProps {
  children: React.ReactNode
  position?: [number, number, number]
  bobSpeed?: number
  bobAmplitude?: number
  swaySpeed?: number
  swayAmplitude?: number
  rotationSpeed?: number
}

export default function FloatGroup({
  children,
  position = [0, 0, 0],
  bobSpeed = 0.5,
  bobAmplitude = 0.02,
  swaySpeed = 0.35,
  swayAmplitude = 0.01,
  rotationSpeed = 0.05,
}: FloatGroupProps) {
  const groupRef = useRef<Group>(null)
  const timeRef = useRef(0)

  useFrame((_state, delta) => {
    if (!groupRef.current) return
    timeRef.current += delta

    const t = timeRef.current
    groupRef.current.position.set(
      position[0] + Math.sin(t * swaySpeed) * swayAmplitude,
      position[1] + Math.sin(t * bobSpeed) * bobAmplitude,
      position[2]
    )
    groupRef.current.rotation.z = Math.sin(t * rotationSpeed) * 0.03
  })

  return (
    <group ref={groupRef} position={position}>
      {children}
    </group>
  )
}
