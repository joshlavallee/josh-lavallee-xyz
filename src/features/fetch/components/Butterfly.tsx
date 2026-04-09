import { useRef, forwardRef, useImperativeHandle } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: { butterfly: THREE.Mesh }
  materials: { None: THREE.MeshStandardMaterial }
}

const HOVER_HEIGHT = 1.5
const MAX_DRIFT = 0.5
const DRIFT_LERP = 0.04
const FLUTTER_SPEED = 20
const FLUTTER_AMPLITUDE = 0.15
const BOB_SPEED = 3.5
const BOB_AMPLITUDE = 0.12
const ROTATION_LERP = 0.05

interface ButterflyProps {
  input: React.RefObject<{ x: number; y: number; active: boolean }>
}

const Butterfly = forwardRef<THREE.Group, ButterflyProps>(
  function Butterfly({ input }, ref) {
    const groupRef = useRef<THREE.Group>(null!)
    const { nodes, materials } = useGLTF('/models/Butterfly.glb') as GLTFResult
    const drift = useRef({ x: 0, z: 0 })

    useImperativeHandle(ref, () => groupRef.current)

    useFrame(({ clock }) => {
      if (!groupRef.current) return
      const t = clock.getElapsedTime()
      const ix = input.current?.x ?? 0
      const iy = input.current?.y ?? 0

      // Drift toward input direction, max MAX_DRIFT from center
      drift.current.x = THREE.MathUtils.lerp(drift.current.x, ix * MAX_DRIFT, DRIFT_LERP)
      drift.current.z = THREE.MathUtils.lerp(drift.current.z, -iy * MAX_DRIFT, DRIFT_LERP)

      groupRef.current.position.x = drift.current.x
      groupRef.current.position.z = drift.current.z
      groupRef.current.position.y = HOVER_HEIGHT + Math.sin(t * BOB_SPEED) * BOB_AMPLITUDE

      // Face movement direction
      if (Math.abs(ix) > 0.01 || Math.abs(iy) > 0.01) {
        const targetRot = Math.atan2(ix, -iy)
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          targetRot,
          ROTATION_LERP,
        )
      }

      // Wing flutter
      groupRef.current.rotation.z = Math.sin(t * FLUTTER_SPEED) * FLUTTER_AMPLITUDE
    })

    return (
      <group ref={groupRef} position={[0, HOVER_HEIGHT, 0]} dispose={null}>
        <mesh
          geometry={nodes.butterfly.geometry}
          material={materials.None}
          scale={0.2}
        />
      </group>
    )
  },
)

export default Butterfly

useGLTF.preload('/models/Butterfly.glb')
