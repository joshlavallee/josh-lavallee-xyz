import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import vertexShader from '../shaders/planet.vert.glsl?raw'
import fragmentShader from '../shaders/planet.frag.glsl?raw'
import { planetSettings } from '../lib/planet-store'

const SUN_DIRECTION = new THREE.Vector3(1.0, 1.0, 0.5).normalize()

export default function TauCetiPlanet() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSwirlIntensity: { value: planetSettings.swirlIntensity },
      uOrangeIntensity: { value: planetSettings.orangeIntensity },
      uSunDirection: { value: SUN_DIRECTION },
    }),
    []
  )

  useFrame((_state, delta) => {
    if (!materialRef.current || !meshRef.current) return

    const u = materialRef.current.uniforms

    u.uTime.value += delta * 0.3
    u.uSwirlIntensity.value = planetSettings.swirlIntensity
    u.uOrangeIntensity.value = planetSettings.orangeIntensity

    meshRef.current.rotation.y += delta * planetSettings.rotationSpeed
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  )
}
