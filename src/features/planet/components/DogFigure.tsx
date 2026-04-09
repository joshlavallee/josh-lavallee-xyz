import { useMemo } from 'react'
import * as THREE from 'three'
import vertexShader from '../shaders/silhouette.vert.glsl?raw'
import fragmentShader from '../shaders/silhouette.frag.glsl?raw'

const RIM_COLOR = new THREE.Vector3(0.24, 0.78, 0.16)

function useSilhouetteMaterial() {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uRimColor: { value: RIM_COLOR },
          uRimPower: { value: 3.0 },
          uRimIntensity: { value: 0.6 },
        },
        vertexShader,
        fragmentShader,
      }),
    []
  )
}

interface DogFigureProps {
  scale?: number
}

export default function DogFigure({ scale = 0.03 }: DogFigureProps) {
  const material = useSilhouetteMaterial()

  return (
    <group scale={scale}>
      {/* Body - horizontal capsule */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={material}>
        <capsuleGeometry args={[0.4, 1.2, 8, 16]} />
      </mesh>

      {/* Head */}
      <mesh position={[1.0, 0.2, 0]} material={material}>
        <sphereGeometry args={[0.35, 16, 16]} />
      </mesh>

      {/* Snout */}
      <mesh position={[1.35, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} material={material}>
        <capsuleGeometry args={[0.12, 0.2, 6, 12]} />
      </mesh>

      {/* Left ear */}
      <mesh position={[0.85, 0.55, -0.15]} rotation={[0.3, 0, -0.2]} material={material}>
        <coneGeometry args={[0.1, 0.25, 8]} />
      </mesh>

      {/* Right ear */}
      <mesh position={[0.85, 0.55, 0.15]} rotation={[-0.3, 0, -0.2]} material={material}>
        <coneGeometry args={[0.1, 0.25, 8]} />
      </mesh>

      {/* Front left leg */}
      <mesh position={[0.5, -0.55, -0.2]} material={material}>
        <capsuleGeometry args={[0.08, 0.4, 6, 8]} />
      </mesh>

      {/* Front right leg */}
      <mesh position={[0.5, -0.55, 0.2]} material={material}>
        <capsuleGeometry args={[0.08, 0.4, 6, 8]} />
      </mesh>

      {/* Back left leg */}
      <mesh position={[-0.5, -0.55, -0.2]} material={material}>
        <capsuleGeometry args={[0.08, 0.4, 6, 8]} />
      </mesh>

      {/* Back right leg */}
      <mesh position={[-0.5, -0.55, 0.2]} material={material}>
        <capsuleGeometry args={[0.08, 0.4, 6, 8]} />
      </mesh>

      {/* Tail - angled upward */}
      <group position={[-0.8, 0.3, 0]} rotation={[0, 0, 0.8]}>
        <mesh material={material}>
          <capsuleGeometry args={[0.05, 0.4, 6, 8]} />
        </mesh>
      </group>
    </group>
  )
}
