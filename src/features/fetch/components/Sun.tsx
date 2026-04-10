import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SunProps {
  fieldCenter: React.RefObject<THREE.Vector3>
  nightBlend: number
}

export default function Sun({ fieldCenter, nightBlend }: SunProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const coronaRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    // Follow field center on the left horizon
    const center = fieldCenter.current
    groupRef.current.position.set(center.x - 30, 5, center.z)

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
    <group ref={groupRef}>
      {/* Sun body */}
      <mesh>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#FFF5E6" toneMapped={false} />
      </mesh>

      {/* Corona glow */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[3.5, 32, 32]} />
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
        <ringGeometry args={[2.5, 5, 64]} />
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
