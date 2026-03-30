import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ParticleData } from '../types'
import vertexShader from '../shaders/particle.vert.glsl?raw'
import fragmentShader from '../shaders/particle.frag.glsl?raw'
import noiseGlsl from '../shaders/noise.glsl?raw'

const MAX_PARTICLES = 350000
const LERP_SPEED = 3.0

interface ParticleSystemProps {
  data: ParticleData
  touchTexture: THREE.Texture
  opacity?: number
  softness?: number
  pointSize?: number
  displacementScale?: number
}

export default function ParticleSystem({
  data,
  touchTexture,
  opacity = 1.0,
  softness = 0.15,
  pointSize = 1.5,
  displacementScale = 1.0,
}: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const geometryRef = useRef<THREE.BufferGeometry>(null)

  // Persistent buffers that get lerped toward target
  const buffersRef = useRef({
    currentPositions: new Float32Array(MAX_PARTICLES * 3),
    currentColors: new Float32Array(MAX_PARTICLES * 3),
    currentSizes: new Float32Array(MAX_PARTICLES),
    randoms: new Float32Array(MAX_PARTICLES),
    targetPositions: new Float32Array(MAX_PARTICLES * 3),
    targetColors: new Float32Array(MAX_PARTICLES * 3),
    targetSizes: new Float32Array(MAX_PARTICLES),
    initialized: false,
  })

  const fullVertexShader = useMemo(
    () => vertexShader.replace('NOISE_PLACEHOLDER', noiseGlsl),
    []
  )

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTouchTexture: { value: touchTexture },
      uPointSize: { value: pointSize },
      uImageAspect: { value: data.imageAspect },
      uDisplacementScale: { value: displacementScale },
      uOpacity: { value: opacity },
      uSoftness: { value: softness },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // When data changes, update target buffers
  useEffect(() => {
    const b = buffersRef.current

    // Reset targets to zero (hides unused particles)
    b.targetPositions.fill(0)
    b.targetColors.fill(0)
    b.targetSizes.fill(0)

    // Copy new data into targets
    const count = Math.min(data.count, MAX_PARTICLES)
    b.targetPositions.set(data.positions.subarray(0, count * 3))
    b.targetColors.set(data.colors.subarray(0, count * 3))
    b.targetSizes.set(data.sizes.subarray(0, count))

    // Copy randoms (no lerp needed)
    b.randoms.fill(0)
    b.randoms.set(data.randoms.subarray(0, count))

    // On first load, snap to target immediately
    if (!b.initialized) {
      b.currentPositions.set(b.targetPositions)
      b.currentColors.set(b.targetColors)
      b.currentSizes.set(b.targetSizes)
      b.initialized = true
    }

    // Update randoms attribute
    if (geometryRef.current) {
      const randomAttr = geometryRef.current.getAttribute('aRandom') as THREE.BufferAttribute
      randomAttr.array = b.randoms
      randomAttr.needsUpdate = true
    }
  }, [data])

  useFrame((_, delta) => {
    if (!materialRef.current || !geometryRef.current) return

    const b = buffersRef.current
    const t = Math.min(LERP_SPEED * delta, 1)

    // Lerp positions, colors, and sizes toward targets
    for (let i = 0; i < MAX_PARTICLES * 3; i++) {
      b.currentPositions[i] += (b.targetPositions[i] - b.currentPositions[i]) * t
      b.currentColors[i] += (b.targetColors[i] - b.currentColors[i]) * t
    }
    for (let i = 0; i < MAX_PARTICLES; i++) {
      b.currentSizes[i] += (b.targetSizes[i] - b.currentSizes[i]) * t
    }

    // Flag attributes for GPU upload
    const posAttr = geometryRef.current.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = geometryRef.current.getAttribute('color') as THREE.BufferAttribute
    const sizeAttr = geometryRef.current.getAttribute('aSize') as THREE.BufferAttribute
    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    sizeAttr.needsUpdate = true

    // Update uniforms
    materialRef.current.uniforms.uTime.value += delta
    materialRef.current.uniforms.uTouchTexture.value = touchTexture
    materialRef.current.uniforms.uPointSize.value = pointSize
    materialRef.current.uniforms.uImageAspect.value = data.imageAspect
    materialRef.current.uniforms.uDisplacementScale.value = displacementScale
    materialRef.current.uniforms.uOpacity.value = opacity
    materialRef.current.uniforms.uSoftness.value = softness
  })

  const b = buffersRef.current

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          array={b.currentPositions}
          count={MAX_PARTICLES}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={b.currentColors}
          count={MAX_PARTICLES}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          array={b.currentSizes}
          count={MAX_PARTICLES}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          array={b.randoms}
          count={MAX_PARTICLES}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={fullVertexShader}
        fragmentShader={fragmentShader}
        vertexColors
        transparent
        depthWrite={false}
      />
    </points>
  )
}
