import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: { butterfly: THREE.Mesh }
  materials: { None: THREE.MeshStandardMaterial }
}

const MAX_DRIFT = 0.5
const HOVER_HEIGHT_OFFSET = 1.5

interface ButterflyProps {
  input: React.RefObject<{ x: number; y: number; active: boolean }>
  sphereRadius: number
  isIdle: React.RefObject<boolean>
  dogWorldPosition: React.RefObject<THREE.Vector3>
}

export default function Butterfly({ input, sphereRadius, isIdle, dogWorldPosition }: ButterflyProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { nodes, materials } = useGLTF('/models/Butterfly.glb') as GLTFResult
  const driftX = useRef(0)
  const driftZ = useRef(0)

  const hoverY = sphereRadius + HOVER_HEIGHT_OFFSET

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!groupRef.current) return

    const { x, y } = input.current

    if (isIdle.current && dogWorldPosition.current) {
      // Idle landing: descend toward dog's head
      const target = dogWorldPosition.current
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, target.x, 0.02)
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, target.z, 0.02)

      const landY = target.y + 0.6 + Math.sin(t * 3.5) * 0.03
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, landY, 0.03)

      // Reduced flutter
      groupRef.current.rotation.z = Math.sin(t * 20) * 0.04
    } else {
      // Subtle drift in input direction (butterfly stays near center)
      driftX.current = THREE.MathUtils.lerp(driftX.current, x * MAX_DRIFT, 0.05)
      driftZ.current = THREE.MathUtils.lerp(driftZ.current, -y * MAX_DRIFT, 0.05)

      groupRef.current.position.x = driftX.current
      groupRef.current.position.z = driftZ.current
      groupRef.current.position.y = hoverY + Math.sin(t * 3.5) * 0.12

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
    <group ref={groupRef} position={[0, hoverY, 0]} dispose={null}>
      <mesh
        geometry={nodes.butterfly.geometry}
        material={materials.None}
        scale={0.2}
      />
    </group>
  )
}

useGLTF.preload('/models/Butterfly.glb')
