import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import vertexShader from '../shaders/starfield.vert.glsl?raw'
import fragmentShader from '../shaders/starfield.frag.glsl?raw'
import { planetSettings } from '../lib/planet-store'

export default function Starfield() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRedMode: { value: 0 },
    }),
    []
  )

  useFrame((_state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
      const target = planetSettings.redMode ? 1.0 : 0.0
      const current = materialRef.current.uniforms.uRedMode.value
      materialRef.current.uniforms.uRedMode.value += (target - current) * Math.min(delta * 2.0, 1.0)
    }
  })

  return (
    <mesh>
      <sphereGeometry args={[50, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}
