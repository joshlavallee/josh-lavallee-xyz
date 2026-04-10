import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: { butterfly: THREE.Mesh }
  materials: { None: THREE.MeshStandardMaterial }
}

const MAX_DRIFT = 0.3
const NOSE_OFFSET_Y = 1.0
const NOSE_OFFSET_Z = 0.8

interface ButterflyProps {
  input: React.RefObject<{ x: number; y: number; active: boolean }>
  dogWorldPosition: React.RefObject<THREE.Vector3>
  isIdle: React.RefObject<boolean>
}

export default function Butterfly({ input, dogWorldPosition, isIdle }: ButterflyProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { nodes, materials } = useGLTF('/models/Butterfly.glb') as GLTFResult
  const driftX = useRef(0)
  const driftZ = useRef(0)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!groupRef.current || !dogWorldPosition.current) return

    const dog = dogWorldPosition.current
    const { x, y } = input.current

    // Base position: float near the dog's nose
    const baseX = dog.x
    const baseY = dog.y + NOSE_OFFSET_Y
    const baseZ = dog.z + NOSE_OFFSET_Z

    if (isIdle.current) {
      // Land closer to the dog's nose
      const landY = dog.y + NOSE_OFFSET_Y * 0.6 + Math.sin(t * 3.5) * 0.03
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, dog.x, 0.02)
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, dog.z + NOSE_OFFSET_Z * 0.5, 0.02)
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, landY, 0.03)

      // Reduced flutter
      groupRef.current.rotation.z = Math.sin(t * 20) * 0.04
    } else {
      // Drift slightly from the dog's nose based on input
      driftX.current = THREE.MathUtils.lerp(driftX.current, x * MAX_DRIFT, 0.05)
      driftZ.current = THREE.MathUtils.lerp(driftZ.current, -y * MAX_DRIFT, 0.05)

      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, baseX + driftX.current, 0.08)
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, baseZ + driftZ.current, 0.08)
      groupRef.current.position.y = baseY + Math.sin(t * 3.5) * 0.12

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
        scale={0.2}
      />
    </group>
  )
}

useGLTF.preload('/models/Butterfly.glb')
