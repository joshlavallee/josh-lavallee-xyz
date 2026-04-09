import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import vertexShader from '../shaders/starfield.vert.glsl?raw'
import fragmentShader from '../shaders/starfield.frag.glsl?raw'

export default function Starfield() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  )

  useFrame((_state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
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
