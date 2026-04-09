import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import vertexShader from '../shaders/particles.vert.glsl?raw'
import fragmentShader from '../shaders/particles.frag.glsl?raw'
import redParticlesVert from '../shaders/red-particles.vert.glsl?raw'
import redParticlesFrag from '../shaders/red-particles.frag.glsl?raw'
import sparkleVert from '../shaders/sparkle.vert.glsl?raw'
import sparkleFrag from '../shaders/sparkle.frag.glsl?raw'
import { planetSettings } from '../lib/planet-store'

const PARTICLE_COUNT = 800

function PlanetParticles() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const speeds = new Float32Array(PARTICLE_COUNT)
    const directions = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribute on unit sphere surface
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const x = Math.sin(phi) * Math.cos(theta)
      const y = Math.sin(phi) * Math.sin(theta)
      const z = Math.cos(phi)

      // Start just above the planet surface
      positions[i * 3] = x * 1.02
      positions[i * 3 + 1] = y * 1.02
      positions[i * 3 + 2] = z * 1.02

      // Drift outward along normal with some randomness
      directions[i * 3] = x + (Math.random() - 0.5) * 0.3
      directions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.3
      directions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.3

      // Random speed so particles are staggered
      speeds[i] = 0.1 + Math.random() * 0.3
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
    geo.setAttribute('aDirection', new THREE.BufferAttribute(directions, 3))

    return {
      geometry: geo,
      uniforms: { uTime: { value: 0 }, uRedMode: { value: 0 } },
    }
  }, [])

  useFrame((_state, delta) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uTime.value += delta * 0.5
    const target = planetSettings.redMode ? 1.0 : 0.0
    const current = materialRef.current.uniforms.uRedMode.value
    materialRef.current.uniforms.uRedMode.value += (target - current) * Math.min(delta * 2.0, 1.0)
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

const RED_PARTICLE_COUNT = 12000

function RedModeParticles() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(RED_PARTICLE_COUNT * 3)
    const speeds = new Float32Array(RED_PARTICLE_COUNT)
    const directions = new Float32Array(RED_PARTICLE_COUNT * 3)
    const sizes = new Float32Array(RED_PARTICLE_COUNT)

    // Camera-facing direction in planet local space
    // Planet is at [3, -3, -2.5], camera at [0, 0, 3], planet has Z rotation of PI/2
    // Bias particles toward the visible hemisphere
    const viewDir = { x: -0.37, y: 0.37, z: 0.68 }

    for (let i = 0; i < RED_PARTICLE_COUNT; i++) {
      let x: number, y: number, z: number

      // Rejection sample: heavily bias toward camera-facing hemisphere
      do {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        x = Math.sin(phi) * Math.cos(theta)
        y = Math.sin(phi) * Math.sin(theta)
        z = Math.cos(phi)
      } while (
        x * viewDir.x + y * viewDir.y + z * viewDir.z < -0.2 &&
        Math.random() > 0.1
      )

      // Spread particles from surface out further — visible over planet face
      const dist = 1.0 + Math.random() * 0.25
      positions[i * 3] = x * dist
      positions[i * 3 + 1] = y * dist
      positions[i * 3 + 2] = z * dist

      directions[i * 3] = x + (Math.random() - 0.5) * 0.4
      directions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.4
      directions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.4

      speeds[i] = 0.05 + Math.random() * 0.2
      sizes[i] = 0.3 + Math.random() * 1.0
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
    geo.setAttribute('aDirection', new THREE.BufferAttribute(directions, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

    return {
      geometry: geo,
      uniforms: {
        uTime: { value: 0 },
        uRedMode: { value: 0 },
      },
    }
  }, [])

  useFrame((_state, delta) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uTime.value += delta * 0.5
    // Smooth lerp toward target
    const target = planetSettings.redMode ? 1.0 : 0.0
    const current = materialRef.current.uniforms.uRedMode.value
    materialRef.current.uniforms.uRedMode.value += (target - current) * Math.min(delta * 2.0, 1.0)
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={redParticlesVert}
        fragmentShader={redParticlesFrag}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

const SPARKLE_COUNT = 25000

function SparkleParticles() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(SPARKLE_COUNT * 3)
    const speeds = new Float32Array(SPARKLE_COUNT)
    const directions = new Float32Array(SPARKLE_COUNT * 3)
    const sizes = new Float32Array(SPARKLE_COUNT)
    const phases = new Float32Array(SPARKLE_COUNT)

    const viewDir = { x: -0.37, y: 0.37, z: 0.68 }

    for (let i = 0; i < SPARKLE_COUNT; i++) {
      let x: number, y: number, z: number

      do {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        x = Math.sin(phi) * Math.cos(theta)
        y = Math.sin(phi) * Math.sin(theta)
        z = Math.cos(phi)
      } while (
        x * viewDir.x + y * viewDir.y + z * viewDir.z < -0.1 &&
        Math.random() > 0.15
      )

      // Spread from surface, but not too far to avoid distracting foreground particles
      const dist = 1.0 + Math.random() * 0.35
      positions[i * 3] = x * dist
      positions[i * 3 + 1] = y * dist
      positions[i * 3 + 2] = z * dist

      directions[i * 3] = x + (Math.random() - 0.5) * 0.5
      directions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.5
      directions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.5

      speeds[i] = 0.03 + Math.random() * 0.15
      sizes[i] = 0.2 + Math.random() * 0.6
      phases[i] = Math.random() * Math.PI * 2
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
    geo.setAttribute('aDirection', new THREE.BufferAttribute(directions, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

    return {
      geometry: geo,
      uniforms: {
        uTime: { value: 0 },
        uRedMode: { value: 0 },
      },
    }
  }, [])

  useFrame((_state, delta) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uTime.value += delta * 0.5
    const target = planetSettings.redMode ? 1.0 : 0.0
    const current = materialRef.current.uniforms.uRedMode.value
    materialRef.current.uniforms.uRedMode.value += (target - current) * Math.min(delta * 2.0, 1.0)
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={sparkleVert}
        fragmentShader={sparkleFrag}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function AllParticles() {
  return (
    <>
      <PlanetParticles />
      <RedModeParticles />
      <SparkleParticles />
    </>
  )
}
