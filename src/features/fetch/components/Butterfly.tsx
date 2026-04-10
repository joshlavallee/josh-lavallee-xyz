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
}

export default function Butterfly({ input, positionRef }: ButterflyProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { nodes, materials } = useGLTF('/models/Butterfly.glb') as GLTFResult

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    if (!groupRef.current) return

    const { x, y } = input.current

    // Move in world space
    if (x !== 0 || y !== 0) {
      groupRef.current.position.x += x * MOVE_SPEED * delta
      groupRef.current.position.z -= y * MOVE_SPEED * delta
    }

    // Hover bob
    groupRef.current.position.y = HOVER_HEIGHT + Math.sin(t * 3.5) * 0.12

    // Face movement direction
    if (Math.abs(x) > 0.01 || Math.abs(y) > 0.01) {
      const targetRot = Math.atan2(x, -y)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRot,
        0.05,
      )
    }

    // Wing flutter
    groupRef.current.rotation.z = Math.sin(t * 20) * 0.15

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
