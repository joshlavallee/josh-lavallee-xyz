import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: { butterfly: THREE.Mesh }
  materials: { None: THREE.MeshStandardMaterial }
}

const LEAD_DISTANCE = 2.0
const LEAD_HEIGHT = 1.8

interface ButterflyProps {
  input: React.RefObject<{ x: number; y: number; active: boolean }>
  dogWorldPosition: React.RefObject<THREE.Vector3>
  isIdle: React.RefObject<boolean>
}

export default function Butterfly({ input, dogWorldPosition, isIdle }: ButterflyProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { nodes, materials } = useGLTF('/models/Butterfly.glb') as GLTFResult
  const leadX = useRef(0)
  const leadZ = useRef(0)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!groupRef.current || !dogWorldPosition.current) return

    const dog = dogWorldPosition.current
    const { x, y } = input.current

    if (isIdle.current) {
      // Land near the dog's nose
      const landY = dog.y + LEAD_HEIGHT * 0.5 + Math.sin(t * 3.5) * 0.03
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, dog.x, 0.02)
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, dog.z + 1.0, 0.02)
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, landY, 0.03)

      // Reduced flutter
      groupRef.current.rotation.z = Math.sin(t * 20) * 0.04
    } else {
      // Butterfly leads in the movement direction
      leadX.current = THREE.MathUtils.lerp(leadX.current, x * LEAD_DISTANCE, 0.04)
      leadZ.current = THREE.MathUtils.lerp(leadZ.current, -y * LEAD_DISTANCE, 0.04)

      // Default forward offset when no input
      const defaultZ = LEAD_DISTANCE * 0.6
      const targetX = dog.x + leadX.current
      const targetZ = dog.z + defaultZ + leadZ.current
      const targetY = dog.y + LEAD_HEIGHT + Math.sin(t * 3.5) * 0.12

      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.06)
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.06)
      groupRef.current.position.y = targetY

      // Wing flutter
      groupRef.current.rotation.z = Math.sin(t * 20) * 0.15
    }

    // Face movement direction
    if (Math.abs(x) > 0.01 || Math.abs(y) > 0.01) {
      const targetRot = Math.atan2(x, -y)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRot,
        0.05,
      )
    }
  })

  return (
    <group ref={groupRef} dispose={null}>
      <mesh
        geometry={nodes.butterfly.geometry}
        material={materials.None}
        scale={0.12}
      />
    </group>
  )
}

useGLTF.preload('/models/Butterfly.glb')
