import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: { butterfly: THREE.Mesh }
  materials: { None: THREE.MeshStandardMaterial }
}

interface ButterflyProps {
  pointerTarget: React.RefObject<THREE.Vector3>
}

export default function Butterfly({ pointerTarget }: ButterflyProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { nodes, materials } = useGLTF('/models/Butterfly.glb') as GLTFResult

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!groupRef.current || !pointerTarget.current) return

    const target = pointerTarget.current

    // Smooth follow
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      target.x,
      0.15
    )
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      target.z,
      0.15
    )

    // Hover bob
    groupRef.current.position.y = 1.0 + Math.sin(t * 3.5) * 0.12

    // Face movement direction
    const dx = target.x - groupRef.current.position.x
    const dz = target.z - groupRef.current.position.z
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      const targetRot = Math.atan2(dx, dz)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRot,
        0.05
      )
    }

    // Wing-like flutter via slight scale pulsing and rotation
    const flutter = Math.sin(t * 20) * 0.15
    groupRef.current.rotation.z = flutter
  })

  return (
    <group ref={groupRef} position={[1, 1, 1]} dispose={null}>
      <mesh
        geometry={nodes.butterfly.geometry}
        material={materials.None}
        scale={0.2}
      />
    </group>
  )
}

useGLTF.preload('/models/Butterfly.glb')
