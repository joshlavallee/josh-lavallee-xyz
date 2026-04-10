import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface MoonProps {
  nightBlendRef: React.RefObject<number>
}

export default function Moon({ nightBlendRef }: MoonProps) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame(() => {
    if (!groupRef.current) return

    const nightBlend = nightBlendRef.current

    // Fade in during night
    const opacity = nightBlend
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(0, 1, opacity))
    groupRef.current.visible = nightBlend > 0.05
  })

  return (
    <group ref={groupRef} position={[25, 5, -20]}>
      {/* Moon body */}
      <mesh>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#E8E8F0" toneMapped={false} />
      </mesh>

      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshBasicMaterial
          color="#CCE5FF"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <ringGeometry args={[3, 6, 64]} />
        <meshBasicMaterial
          color="#99BBFF"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
