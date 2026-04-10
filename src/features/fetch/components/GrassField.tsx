import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import grassVertexShader from '../shaders/grass.vert.glsl?raw'
import grassFragmentShader from '../shaders/grass.frag.glsl?raw'
import type { Biome } from '../lib/biomes'

interface GrassFieldProps {
  biome: Biome
  targetBiome: Biome
  biomeTransition: number
  nightBlend: number
  dogPosition: React.RefObject<THREE.Vector3>
  fieldCenter: React.RefObject<THREE.Vector3>
  trailBuffer: React.RefObject<Float32Array>
  trailCount: React.RefObject<number>
}

const FIELD_SIZE = 60
const INSTANCE_COUNT = 150000
const HALF_WIDTH = 0.06
const HEIGHT = 1
const LOD_DISTANCE = 20

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
  dogPosition,
  fieldCenter,
  trailBuffer,
  trailCount,
}: GrassFieldProps) {
  const highRef = useRef<THREE.InstancedMesh>(null!)
  const lowRef = useRef<THREE.InstancedMesh>(null!)
  const dummy = useRef(new THREE.Object3D())
  const { camera } = useThree()

  const highGeo = useMemo(() => createGrassGeometry(7), [])
  const lowGeo = useMemo(() => createGrassGeometry(1), [])

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
        uDogPosition: { value: new THREE.Vector3() },
        uTrailPositions: { value: new Float32Array(90) },
        uTrailCount: { value: 0 },
        uLightDirection: { value: new THREE.Vector3(5, 10, 5).normalize() },
        uLightColor: { value: new THREE.Color(1.0, 0.96, 0.9) },
        uLightIntensity: { value: 1.5 },
      },
      side: THREE.DoubleSide,
    })
  }, [])

  // Store blade data: position offsets relative to field center, rotation, bladeType, bladeRand
  const bladeData = useMemo(() => {
    const data = new Float32Array(INSTANCE_COUNT * 5) // x, z, rotation, bladeType, bladeRand
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const idx = i * 5
      data[idx] = (Math.random() - 0.5) * FIELD_SIZE     // x offset
      data[idx + 1] = (Math.random() - 0.5) * FIELD_SIZE // z offset
      data[idx + 2] = Math.random() * Math.PI * 2         // rotation
      // Blade type: mostly grass, some flowers
      const typeRoll = Math.random()
      data[idx + 3] = typeRoll < 0.05 ? 3.0 : typeRoll < 0.12 ? 2.0 : typeRoll < 0.3 ? 1.0 : 0.0
      data[idx + 4] = Math.random() // bladeRand
    }
    return data
  }, [])

  // Set custom attributes on both meshes
  const setupAttributes = (mesh: THREE.InstancedMesh) => {
    const bladeTypeArr = new Float32Array(INSTANCE_COUNT)
    const bladeRandArr = new Float32Array(INSTANCE_COUNT)
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      bladeTypeArr[i] = bladeData[i * 5 + 3]
      bladeRandArr[i] = bladeData[i * 5 + 4]
    }
    mesh.geometry.setAttribute('bladeType', new THREE.InstancedBufferAttribute(bladeTypeArr, 1))
    mesh.geometry.setAttribute('bladeRand', new THREE.InstancedBufferAttribute(bladeRandArr, 1))
  }

  const attrsSet = useRef(false)

  useFrame((state) => {
    if (!highRef.current || !lowRef.current) return

    // One-time attribute setup
    if (!attrsSet.current) {
      setupAttributes(highRef.current)
      setupAttributes(lowRef.current)
      attrsSet.current = true
    }

    const elapsed = state.clock.getElapsedTime()
    const center = fieldCenter.current
    const halfField = FIELD_SIZE / 2

    const d = dummy.current
    let highIdx = 0
    let lowIdx = 0

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const idx = i * 5
      let bx = bladeData[idx]
      let bz = bladeData[idx + 1]

      // Wrap position relative to field center
      const wx = bx + center.x
      const wz = bz + center.z

      // Modular wrapping
      let finalX = ((wx - center.x + halfField) % FIELD_SIZE + FIELD_SIZE) % FIELD_SIZE - halfField + center.x
      let finalZ = ((wz - center.z + halfField) % FIELD_SIZE + FIELD_SIZE) % FIELD_SIZE - halfField + center.z

      // Update stored offset if wrapped
      bladeData[idx] = finalX - center.x
      bladeData[idx + 1] = finalZ - center.z

      d.position.set(finalX, 0, finalZ)
      d.rotation.y = bladeData[idx + 2]
      const scale = 0.8 + bladeData[idx + 4] * 0.4
      d.scale.set(scale, scale, scale)
      d.updateMatrix()

      const dist = camera.position.distanceTo(d.position)
      if (dist < LOD_DISTANCE) {
        if (highIdx < INSTANCE_COUNT) {
          highRef.current.setMatrixAt(highIdx++, d.matrix)
        }
      } else {
        if (lowIdx < INSTANCE_COUNT) {
          lowRef.current.setMatrixAt(lowIdx++, d.matrix)
        }
      }
    }

    highRef.current.count = highIdx
    lowRef.current.count = lowIdx
    highRef.current.instanceMatrix.needsUpdate = true
    lowRef.current.instanceMatrix.needsUpdate = true

    // Update uniforms
    const u = material.uniforms
    u.uTime.value = elapsed
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

    // Dog position
    if (dogPosition.current) {
      u.uDogPosition.value.copy(dogPosition.current)
    }

    // Trail wake
    if (trailBuffer.current) {
      u.uTrailPositions.value = trailBuffer.current
      u.uTrailCount.value = trailCount.current
    }

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
    <>
      <instancedMesh ref={highRef} args={[highGeo, material, INSTANCE_COUNT]} frustumCulled={false} />
      <instancedMesh ref={lowRef} args={[lowGeo, material, INSTANCE_COUNT]} frustumCulled={false} />
    </>
  )
}
