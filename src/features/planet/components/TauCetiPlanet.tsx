import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import vertexShader from '../shaders/planet.vert.glsl?raw'
import fragmentShader from '../shaders/planet.frag.glsl?raw'
import atmoVertShader from '../shaders/atmosphere.vert.glsl?raw'
import atmoFragShader from '../shaders/atmosphere.frag.glsl?raw'
import innerHazeFragShader from '../shaders/inner-haze.frag.glsl?raw'
import noise3d from '../shaders/noise3d.glsl?raw'
import { planetSettings } from '../lib/planet-store'
import PlanetParticles from './PlanetParticles'

const SUN_DIRECTION = new THREE.Vector3(0.6, 0.3, 0.8).normalize()

// Prepend shared noise code to atmosphere fragment shaders
const atmoFragWithNoise = noise3d + '\n' + atmoFragShader
const innerHazeFragWithNoise = noise3d + '\n' + innerHazeFragShader

export default function TauCetiPlanet() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const outerAtmoRef = useRef<THREE.ShaderMaterial>(null)
  const innerAtmoRef = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWarpStrength: { value: planetSettings.warpStrength },
      uHeatAmount: { value: planetSettings.heatAmount },
      uPolarBias: { value: planetSettings.polarBias },
      uEmissionStrength: { value: planetSettings.emissionStrength },
      uRedMode: { value: 0 },
      uSunDirection: { value: SUN_DIRECTION },
    }),
    []
  )

  const atmoUniforms = useMemo(
    () => ({
      uSunDirection: { value: SUN_DIRECTION },
      uTime: { value: 0 },
      uRedMode: { value: 0 },
    }),
    []
  )

  const innerAtmoUniforms = useMemo(
    () => ({
      uSunDirection: { value: SUN_DIRECTION },
      uTime: { value: 0 },
      uRedMode: { value: 0 },
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

    // Smooth lerp toward target red mode
    const targetRed = planetSettings.redMode ? 1.0 : 0.0
    const currentRed = u.uRedMode.value
    u.uRedMode.value += (targetRed - currentRed) * Math.min(delta * 2.0, 1.0)

    // Sync time and red mode to atmosphere layers
    const t = u.uTime.value
    if (outerAtmoRef.current) {
      outerAtmoRef.current.uniforms.uTime.value = t
      outerAtmoRef.current.uniforms.uRedMode.value = u.uRedMode.value
    }
    if (innerAtmoRef.current) {
      innerAtmoRef.current.uniforms.uTime.value = t
      innerAtmoRef.current.uniforms.uRedMode.value = u.uRedMode.value
    }
  })

  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>
      {/* Outer atmosphere glow — thick, noise-textured, sun-aware */}
      <mesh>
        <sphereGeometry args={[1.025, 48, 48]} />
        <shaderMaterial
          ref={outerAtmoRef}
          uniforms={atmoUniforms}
          vertexShader={atmoVertShader}
          fragmentShader={atmoFragWithNoise}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {/* Inner atmospheric haze — textured wisps */}
      <mesh>
        <sphereGeometry args={[1.012, 48, 48]} />
        <shaderMaterial
          ref={innerAtmoRef}
          uniforms={innerAtmoUniforms}
          vertexShader={atmoVertShader}
          fragmentShader={innerHazeFragWithNoise}
          transparent
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>
      {/* Particles drifting off the planet surface */}
      <PlanetParticles />
    </group>
  )
}
