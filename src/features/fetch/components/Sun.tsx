import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SunProps {
  nightBlendRef: React.RefObject<number>
}

export default function Sun({ nightBlendRef }: SunProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const coronaRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    const nightBlend = nightBlendRef.current

    // Fade out during night
    const opacity = 1.0 - nightBlend
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(0, 1, opacity))
    groupRef.current.visible = nightBlend < 0.95

    // Pulse corona
    if (coronaRef.current) {
      const pulse = 1.0 + Math.sin(clock.getElapsedTime() * 0.5) * 0.05
      coronaRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <group ref={groupRef} position={[-25, 3, -20]}>
      {/* Sun body */}
      <mesh>
        <sphereGeometry args={[3, 32, 32]} />
        <meshBasicMaterial color="#FFF5E6" toneMapped={false} />
      </mesh>

      {/* Corona glow */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[5, 32, 32]} />
        <meshBasicMaterial
          color="#FFD700"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer glow ring */}
      <mesh>
        <ringGeometry args={[4, 8, 64]} />
        <meshBasicMaterial
          color="#FFA500"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
