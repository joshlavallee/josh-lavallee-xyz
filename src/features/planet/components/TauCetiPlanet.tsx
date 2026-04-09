import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import vertexShader from '../shaders/planet.vert.glsl?raw'
import fragmentShader from '../shaders/planet.frag.glsl?raw'
import atmoVertShader from '../shaders/atmosphere.vert.glsl?raw'
import atmoFragShader from '../shaders/atmosphere.frag.glsl?raw'
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
      uBandingStrength: { value: planetSettings.bandingStrength },
      uEmissionStrength: { value: planetSettings.emissionStrength },
      uRimPower: { value: planetSettings.rimPower },
      uSunDirection: { value: SUN_DIRECTION },
    }),
    []
  )

  const atmoUniforms = useMemo(
    () => ({
      uSunDirection: { value: SUN_DIRECTION },
      uEmissionStrength: { value: planetSettings.emissionStrength },
    }),
    []
  )

  useFrame((_state, delta) => {
    if (!materialRef.current || !meshRef.current) return

    const u = materialRef.current.uniforms

    u.uTime.value += delta
    u.uWarpStrength.value = planetSettings.warpStrength
    u.uHeatAmount.value = planetSettings.heatAmount
    u.uPolarBias.value = planetSettings.polarBias
    u.uBandingStrength.value = planetSettings.bandingStrength
    u.uEmissionStrength.value = planetSettings.emissionStrength
    u.uRimPower.value = planetSettings.rimPower

    meshRef.current.rotation.y += delta * planetSettings.rotationSpeed
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
      {/* Atmosphere glow: thin shell, additive, FrontSide so it renders outside the planet */}
      <mesh>
        <sphereGeometry args={[1.008, 48, 48]} />
        <shaderMaterial
          uniforms={atmoUniforms}
          vertexShader={atmoVertShader}
          fragmentShader={atmoFragShader}
          transparent
          side={THREE.FrontSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
