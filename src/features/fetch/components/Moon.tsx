import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface MoonProps {
  fieldCenter: React.RefObject<THREE.Vector3>
  nightBlend: number
}

export default function Moon({ fieldCenter, nightBlend }: MoonProps) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame(() => {
    if (!groupRef.current) return

    // Follow field center on the right horizon
    const center = fieldCenter.current
    groupRef.current.position.set(center.x + 30, 8, center.z)

    // Fade in during night
    const opacity = nightBlend
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(0, 1, opacity))
    groupRef.current.visible = nightBlend > 0.05
  })

  return (
    <group ref={groupRef}>
      {/* Moon body */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#E8E8F0" toneMapped={false} />
      </mesh>

      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[2.8, 32, 32]} />
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
        <ringGeometry args={[2, 4.5, 64]} />
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
