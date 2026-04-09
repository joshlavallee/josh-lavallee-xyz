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

interface AstronautFigureProps {
  scale?: number
}

export default function AstronautFigure({ scale = 0.04 }: AstronautFigureProps) {
  const material = useSilhouetteMaterial()

  return (
    <group scale={scale}>
      {/* Helmet */}
      <mesh position={[0, 1.8, 0]} material={material}>
        <sphereGeometry args={[0.55, 16, 16]} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 0.8, 0]} material={material}>
        <capsuleGeometry args={[0.4, 0.8, 8, 16]} />
      </mesh>

      {/* Backpack */}
      <mesh position={[0, 0.9, -0.45]} material={material}>
        <boxGeometry args={[0.5, 0.7, 0.3]} />
      </mesh>

      {/* Left arm - angled outward */}
      <group position={[-0.55, 1.0, 0]} rotation={[0, 0, 0.4]}>
        <mesh material={material}>
          <capsuleGeometry args={[0.12, 0.7, 6, 12]} />
        </mesh>
      </group>

      {/* Right arm - angled outward */}
      <group position={[0.55, 1.0, 0]} rotation={[0, 0, -0.4]}>
        <mesh material={material}>
          <capsuleGeometry args={[0.12, 0.7, 6, 12]} />
        </mesh>
      </group>

      {/* Left leg - slightly spread */}
      <group position={[-0.2, -0.2, 0]} rotation={[0, 0, 0.15]}>
        <mesh material={material}>
          <capsuleGeometry args={[0.14, 0.8, 6, 12]} />
        </mesh>
      </group>

      {/* Right leg - slightly spread */}
      <group position={[0.2, -0.2, 0]} rotation={[0, 0, -0.15]}>
        <mesh material={material}>
          <capsuleGeometry args={[0.14, 0.8, 6, 12]} />
        </mesh>
      </group>
    </group>
  )
}
