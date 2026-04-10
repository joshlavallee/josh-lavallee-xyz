import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: { butterfly: THREE.Mesh }
  materials: { None: THREE.MeshStandardMaterial }
}

const MOVE_SPEED = 3.0
const HOVER_HEIGHT = 1.0

interface ButterflyProps {
  input: React.RefObject<{ x: number; y: number; active: boolean }>
  positionRef: React.RefObject<THREE.Vector3>
  isIdle: React.RefObject<boolean>
  dogPosition: React.RefObject<THREE.Vector3>
}

export default function Butterfly({ input, positionRef, isIdle, dogPosition }: ButterflyProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { nodes, materials } = useGLTF('/models/Butterfly.glb') as GLTFResult

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    if (!groupRef.current) return

    const { x, y } = input.current

    if (isIdle.current && dogPosition.current) {
      // Idle landing: descend toward dog's head
      const landTarget = dogPosition.current.clone()
      landTarget.y += 0.6 // dog's head height (scaled model)

      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, landTarget.x, 0.02)
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, landTarget.z, 0.02)

      // Descend to head height with reduced bob
      const landY = landTarget.y + Math.sin(t * 3.5) * 0.03
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, landY, 0.03)

      // Reduced wing flutter when perched
      groupRef.current.rotation.z = Math.sin(t * 20) * 0.04
    } else {
      // Move in world space
      if (x !== 0 || y !== 0) {
        groupRef.current.position.x += x * MOVE_SPEED * delta
        groupRef.current.position.z -= y * MOVE_SPEED * delta
      }

      // Hover bob
      groupRef.current.position.y = HOVER_HEIGHT + Math.sin(t * 3.5) * 0.12

      // Wing flutter
      groupRef.current.rotation.z = Math.sin(t * 20) * 0.15
    }

    // Face movement direction (always active)
    if (Math.abs(x) > 0.01 || Math.abs(y) > 0.01) {
      const targetRot = Math.atan2(x, -y)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRot,
        0.05,
      )
    }

    // Update shared position ref
    positionRef.current.copy(groupRef.current.position)
  })

  return (
    <group ref={groupRef} position={[0, HOVER_HEIGHT, 2]} dispose={null}>
      <mesh
        geometry={nodes.butterfly.geometry}
        material={materials.None}
        scale={0.2}
      />
    </group>
  )
}

useGLTF.preload('/models/Butterfly.glb')
