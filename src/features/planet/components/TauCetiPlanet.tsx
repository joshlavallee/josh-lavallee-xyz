import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import vertexShader from '../shaders/planet.vert.glsl?raw'
import fragmentShader from '../shaders/planet.frag.glsl?raw'
import atmoVertShader from '../shaders/atmosphere.vert.glsl?raw'
import atmoFragShader from '../shaders/atmosphere.frag.glsl?raw'
import innerHazeFragShader from '../shaders/inner-haze.frag.glsl?raw'
import { planetSettings } from '../lib/planet-store'

const SUN_DIRECTION = new THREE.Vector3(0.6, 0.3, 0.8).normalize()

export default function TauCetiPlanet() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWarpStrength: { value: planetSettings.warpStrength },
      uHeatAmount: { value: planetSettings.heatAmount },
      uPolarBias: { value: planetSettings.polarBias },
      uEmissionStrength: { value: planetSettings.emissionStrength },
      uSunDirection: { value: SUN_DIRECTION },
    }),
    []
  )

  useFrame((_state, delta) => {
    if (!materialRef.current || !meshRef.current) return

    const u = materialRef.current.uniforms

    u.uTime.value += delta * 0.75
    u.uWarpStrength.value = planetSettings.warpStrength
    u.uHeatAmount.value = planetSettings.heatAmount
    u.uPolarBias.value = planetSettings.polarBias
    u.uEmissionStrength.value = planetSettings.emissionStrength
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>
      {/* Outer atmosphere glow — BackSide layered falloff */}
      <mesh>
        <sphereGeometry args={[1.02, 48, 48]} />
        <shaderMaterial
          vertexShader={atmoVertShader}
          fragmentShader={atmoFragShader}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {/* Inner atmospheric haze — gel-like layer */}
      <mesh>
        <sphereGeometry args={[1.01, 48, 48]} />
        <shaderMaterial
          vertexShader={atmoVertShader}
          fragmentShader={innerHazeFragShader}
          transparent
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
