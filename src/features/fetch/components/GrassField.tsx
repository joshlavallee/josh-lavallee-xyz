import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import grassVertexShader from '../shaders/grass.vert.glsl?raw'
import grassFragmentShader from '../shaders/grass.frag.glsl?raw'
import type { Biome } from '../lib/biomes'

interface GrassFieldProps {
  biome: Biome
  targetBiome: Biome
  biomeTransition: number
  nightBlend: number
  sphereRadius: number
}

const INSTANCE_COUNT = 75000
const HALF_WIDTH = 0.06
const HEIGHT = 0.7

const DAY_LIGHT_DIR = new THREE.Vector3(5, 10, 5).normalize()
const NIGHT_LIGHT_DIR = new THREE.Vector3(-3, 8, -3).normalize()

function createGrassGeometry(segments: number) {
  const taper = 0.008
  const positions: number[] = []

  for (let i = 0; i < segments; i++) {
    const y0 = (i / (segments + 1)) * HEIGHT
    const y1 = ((i + 1) / (segments + 1)) * HEIGHT
    positions.push(
      -HALF_WIDTH + taper * i, y0, 0,
      HALF_WIDTH - taper * i, y0, 0,
      -HALF_WIDTH + taper * (i + 1), y1, 0,
      -HALF_WIDTH + taper * (i + 1), y1, 0,
      HALF_WIDTH - taper * i, y0, 0,
      HALF_WIDTH - taper * (i + 1), y1, 0,
    )
  }

  // Tip triangle
  const lastY = (segments / (segments + 1)) * HEIGHT
  positions.push(
    -HALF_WIDTH + taper * segments, lastY, 0,
    HALF_WIDTH - taper * segments, lastY, 0,
    0, HEIGHT, 0,
  )

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geo.computeVertexNormals()
  return geo
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function lerpScalar(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export default function GrassField({
  biome,
  targetBiome,
  biomeTransition,
  nightBlend,
  sphereRadius,
}: GrassFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  const geo = useMemo(() => createGrassGeometry(5), [])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 3.0 },
        uHalfWidth: { value: HALF_WIDTH },
        uWindStrength: { value: biome.windStrength },
        uGrassHeight: { value: biome.grassHeight },
        uBaseColor: { value: new THREE.Color(...biome.baseColor) },
        uTipColor: { value: new THREE.Color(...biome.tipColor) },
        uFlowerColorA: { value: new THREE.Color(...biome.flowerColorA) },
        uFlowerColorB: { value: new THREE.Color(...biome.flowerColorB) },
        uFogColor: { value: new THREE.Color(...biome.fogColor) },
        uFogColorNight: { value: new THREE.Color(...biome.fogColorNight) },
        uNightBlend: { value: 0.0 },
        uGlowIntensity: { value: biome.glowIntensity },
        uLightDirection: { value: new THREE.Vector3(5, 10, 5).normalize() },
        uLightColor: { value: new THREE.Color(1.0, 0.96, 0.9) },
        uLightIntensity: { value: 1.5 },
      },
      side: THREE.DoubleSide,
    })
  }, [])

  // Place blades on upper hemisphere using Fibonacci sampling - ONE TIME
  const initialized = useRef(false)
  useMemo(() => {
    // Reset so init runs again if this memo re-fires
    initialized.current = false
  }, [sphereRadius])

  useFrame((state) => {
    if (!meshRef.current) return

    // One-time instance placement
    if (!initialized.current) {
      const dummy = new THREE.Object3D()
      const up = new THREE.Vector3(0, 1, 0)
      const goldenAngle = Math.PI * (3 - Math.sqrt(5))

      const bladeTypeArr = new Float32Array(INSTANCE_COUNT)
      const bladeRandArr = new Float32Array(INSTANCE_COUNT)

      for (let i = 0; i < INSTANCE_COUNT; i++) {
        // Fibonacci sphere - full sphere coverage
        const y = 1 - (2 * i / (INSTANCE_COUNT - 1)) // 1.0 (top) to -1.0 (bottom)
        const radiusAtY = Math.sqrt(1 - y * y)
        const theta = goldenAngle * i

        const px = radiusAtY * Math.cos(theta) * sphereRadius
        const py = y * sphereRadius
        const pz = radiusAtY * Math.sin(theta) * sphereRadius

        // Normal = direction from center to surface point
        const normal = new THREE.Vector3(px, py, pz).normalize()

        // Orient blade along sphere normal
        const quat = new THREE.Quaternion().setFromUnitVectors(up, normal)
        // Add random spin around the normal for variety
        const spinQuat = new THREE.Quaternion().setFromAxisAngle(normal, Math.random() * Math.PI * 2)
        quat.premultiply(spinQuat)

        dummy.position.set(px, py, pz)
        dummy.quaternion.copy(quat)
        const s = 0.6 + Math.random() * 0.5
        dummy.scale.set(s, s, s)
        dummy.updateMatrix()

        meshRef.current.setMatrixAt(i, dummy.matrix)

        // Blade type: mostly grass, some flowers
        const typeRoll = Math.random()
        bladeTypeArr[i] = typeRoll < 0.05 ? 3.0 : typeRoll < 0.12 ? 2.0 : typeRoll < 0.3 ? 1.0 : 0.0
        bladeRandArr[i] = Math.random()
      }

      meshRef.current.instanceMatrix.needsUpdate = true
      meshRef.current.geometry.setAttribute('bladeType', new THREE.InstancedBufferAttribute(bladeTypeArr, 1))
      meshRef.current.geometry.setAttribute('bladeRand', new THREE.InstancedBufferAttribute(bladeRandArr, 1))
      initialized.current = true
    }

    // Update uniforms only - no matrix rebuilds
    const u = material.uniforms
    u.uTime.value = state.clock.getElapsedTime()
    u.uNightBlend.value = nightBlend

    // Lerp biome uniforms
    const t = biomeTransition
    const bc = lerpColor(biome.baseColor, targetBiome.baseColor, t)
    const tc = lerpColor(biome.tipColor, targetBiome.tipColor, t)
    const fa = lerpColor(biome.flowerColorA, targetBiome.flowerColorA, t)
    const fb = lerpColor(biome.flowerColorB, targetBiome.flowerColorB, t)
    const fc = lerpColor(biome.fogColor, targetBiome.fogColor, t)
    const fn = lerpColor(biome.fogColorNight, targetBiome.fogColorNight, t)

    u.uBaseColor.value.setRGB(...bc)
    u.uTipColor.value.setRGB(...tc)
    u.uFlowerColorA.value.setRGB(...fa)
    u.uFlowerColorB.value.setRGB(...fb)
    u.uFogColor.value.setRGB(...fc)
    u.uFogColorNight.value.setRGB(...fn)
    u.uGrassHeight.value = lerpScalar(biome.grassHeight, targetBiome.grassHeight, t)
    u.uWindStrength.value = lerpScalar(biome.windStrength, targetBiome.windStrength, t)
    u.uGlowIntensity.value = lerpScalar(biome.glowIntensity, targetBiome.glowIntensity, t)

    // Lighting direction based on day/night
    u.uLightDirection.value.lerpVectors(DAY_LIGHT_DIR, NIGHT_LIGHT_DIR, nightBlend)
    u.uLightColor.value.setRGB(
      THREE.MathUtils.lerp(1.0, 0.8, nightBlend),
      THREE.MathUtils.lerp(0.96, 0.9, nightBlend),
      THREE.MathUtils.lerp(0.9, 1.0, nightBlend),
    )
    u.uLightIntensity.value = THREE.MathUtils.lerp(1.5, 0.6, nightBlend)
  })

  return (
    <instancedMesh ref={meshRef} args={[geo, material, INSTANCE_COUNT]} frustumCulled={false} />
  )
}
