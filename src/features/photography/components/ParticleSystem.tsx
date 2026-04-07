import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ParticleData } from '../types'
import vertexShader from '../shaders/particle.vert.glsl?raw'
import fragmentShader from '../shaders/particle.frag.glsl?raw'
import noiseGlsl from '@/shaders/noise.glsl?raw'

const MAX_PARTICLES = 60000
const LERP_SPEED = 4.0
const LERP_THRESHOLD = 0.0001

interface ParticleSystemProps {
  data: ParticleData
  touchTexture: THREE.Texture
  opacity?: number
  softness?: number
  pointSize?: number
  displacementScale?: number
  invertColors?: number
}

export default function ParticleSystem({
  data,
  touchTexture,
  opacity = 1.0,
  softness = 0.15,
  pointSize = 1.5,
  displacementScale = 1.0,
  invertColors = 0,
}: ParticleSystemProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const geometryRef = useRef<THREE.BufferGeometry>(null)

  const stateRef = useRef({
    positions: new Float32Array(MAX_PARTICLES * 3),
    colors: new Float32Array(MAX_PARTICLES * 3),
    sizes: new Float32Array(MAX_PARTICLES),
    randoms: new Float32Array(MAX_PARTICLES),
    targetPositions: null as Float32Array | null,
    targetColors: null as Float32Array | null,
    targetSizes: null as Float32Array | null,
    activeCount: 0,
    isLerping: false,
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
      uInvertColors: { value: invertColors },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // When data changes, either snap or set up a lerp transition
  useEffect(() => {
    const s = stateRef.current
    const count = Math.min(data.count, MAX_PARTICLES)

    // Build padded target arrays (zeros for unused slots)
    const tPos = new Float32Array(MAX_PARTICLES * 3)
    const tCol = new Float32Array(MAX_PARTICLES * 3)
    const tSiz = new Float32Array(MAX_PARTICLES)
    tPos.set(data.positions.subarray(0, count * 3))
    tCol.set(data.colors.subarray(0, count * 3))
    tSiz.set(data.sizes.subarray(0, count))

    // Update randoms
    s.randoms.fill(0)
    s.randoms.set(data.randoms.subarray(0, count))

    s.activeCount = Math.max(count, s.activeCount)

    if (!s.targetPositions) {
      // First load: snap directly, no lerp
      s.positions.set(tPos)
      s.colors.set(tCol)
      s.sizes.set(tSiz)
      s.targetPositions = tPos
      s.targetColors = tCol
      s.targetSizes = tSiz
      s.isLerping = false

      // Upload immediately
      if (geometryRef.current) {
        flagAllAttributes(geometryRef.current)
        const randomAttr = geometryRef.current.getAttribute('aRandom') as THREE.BufferAttribute
        randomAttr.needsUpdate = true
      }
    } else {
      // Transition: set targets, start lerping
      s.targetPositions = tPos
      s.targetColors = tCol
      s.targetSizes = tSiz
      s.isLerping = true

      if (geometryRef.current) {
        const randomAttr = geometryRef.current.getAttribute('aRandom') as THREE.BufferAttribute
        randomAttr.needsUpdate = true
      }
    }
  }, [data])

  useFrame((_, delta) => {
    if (!materialRef.current) return

    // Always update time and uniforms (cheap)
    materialRef.current.uniforms.uTime.value += delta
    materialRef.current.uniforms.uTouchTexture.value = touchTexture
    materialRef.current.uniforms.uPointSize.value = pointSize
    materialRef.current.uniforms.uImageAspect.value = data.imageAspect
    materialRef.current.uniforms.uDisplacementScale.value = displacementScale
    materialRef.current.uniforms.uOpacity.value = opacity
    materialRef.current.uniforms.uSoftness.value = softness
    materialRef.current.uniforms.uInvertColors.value = invertColors

    // Only lerp buffers during transitions
    const s = stateRef.current
    if (!s.isLerping || !s.targetPositions || !geometryRef.current) return

    const t = Math.min(LERP_SPEED * delta, 1)
    const n3 = s.activeCount * 3
    const n = s.activeCount
    let maxDiff = 0

    for (let i = 0; i < n3; i++) {
      const diff = s.targetPositions[i] - s.positions[i]
      s.positions[i] += diff * t
      if (Math.abs(diff) > maxDiff) maxDiff = Math.abs(diff)
    }
    for (let i = 0; i < n3; i++) {
      s.colors[i] += (s.targetColors![i] - s.colors[i]) * t
    }
    for (let i = 0; i < n; i++) {
      s.sizes[i] += (s.targetSizes![i] - s.sizes[i]) * t
    }

    flagAllAttributes(geometryRef.current)

    // Stop lerping once converged
    if (maxDiff < LERP_THRESHOLD) {
      s.positions.set(s.targetPositions)
      s.colors.set(s.targetColors!)
      s.sizes.set(s.targetSizes!)
      s.isLerping = false
      s.activeCount = Math.min(data.count, MAX_PARTICLES)
      flagAllAttributes(geometryRef.current)
    }
  })

  const s = stateRef.current

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          array={s.positions}
          count={MAX_PARTICLES}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={s.colors}
          count={MAX_PARTICLES}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          array={s.sizes}
          count={MAX_PARTICLES}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          array={s.randoms}
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

function flagAllAttributes(geometry: THREE.BufferGeometry) {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  const col = geometry.getAttribute('color') as THREE.BufferAttribute
  const siz = geometry.getAttribute('aSize') as THREE.BufferAttribute
  if (pos) pos.needsUpdate = true
  if (col) col.needsUpdate = true
  if (siz) siz.needsUpdate = true
}
