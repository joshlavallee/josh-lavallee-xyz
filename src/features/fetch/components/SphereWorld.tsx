import { useRef, forwardRef, useImperativeHandle } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SPHERE_RADIUS } from '../constants'

const ROTATION_SPEED = 1.2
const ROTATION_LERP = 0.08

interface SphereWorldProps {
  input: React.RefObject<{ x: number; y: number; active: boolean }>
  children?: React.ReactNode
}

const SphereWorld = forwardRef<THREE.Group, SphereWorldProps>(
  function SphereWorld({ input, children }, ref) {
    const groupRef = useRef<THREE.Group>(null!)
    const velocity = useRef({ x: 0, z: 0 })

    useImperativeHandle(ref, () => groupRef.current)

    useFrame((_, delta) => {
      if (!groupRef.current) return

      const targetVelX = (input.current?.y ?? 0) * ROTATION_SPEED
      const targetVelZ = -(input.current?.x ?? 0) * ROTATION_SPEED

      velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, targetVelX, ROTATION_LERP)
      velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, targetVelZ, ROTATION_LERP)

      groupRef.current.rotation.x += velocity.current.x * delta
      groupRef.current.rotation.z += velocity.current.z * delta
    })

    return (
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[SPHERE_RADIUS, 64, 64]} />
          <meshStandardMaterial color="#3a5a2a" roughness={0.9} />
        </mesh>
        {children}
      </group>
    )
  },
)

export default SphereWorld
