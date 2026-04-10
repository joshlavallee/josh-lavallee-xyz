import { useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import type { SceneProps } from '@/features/photography/types'
import BiomeSelector from './BiomeSelector'
import GrassField from './GrassField'
import Butterfly from './Butterfly'
import Dog from './Dog'
import Sun from './Sun'
import Moon from './Moon'
import { useInput } from '../hooks/useInput'
import { useTrailWake } from '../hooks/useTrailWake'
import { BIOMES, DEFAULT_BIOME_INDEX } from '../lib/biomes'

const GROUND_SIZE = 80

export default function FetchScene({ colorMode }: SceneProps) {
  const { camera } = useThree()
  const input = useInput()
  const fieldCenter = useRef(new THREE.Vector3(0, 0, 0))
  const dogPosition = useRef(new THREE.Vector3(0, 0, 0))
  const butterflyPosition = useRef(new THREE.Vector3(0, 0, 2))
  const trail = useTrailWake()
  const groundRef = useRef<THREE.Mesh>(null!)
  const idleTimer = useRef(0)
  const isIdle = useRef(false)

  // Biome state
  const [biomeIdx, setBiomeIdx] = useState(DEFAULT_BIOME_INDEX)
  const prevBiomeIdx = useRef(DEFAULT_BIOME_INDEX)
  const biomeT = useRef(0)
  const transitioning = useRef(false)

  const handleBiomeChange = useCallback((newIndex: number) => {
    prevBiomeIdx.current = biomeIdx
    setBiomeIdx(newIndex)
    biomeT.current = 0
    transitioning.current = true
  }, [biomeIdx])

  // Night blend
  const nightBlendRef = useRef(colorMode === 'dark' ? 1.0 : 0.0)
  const targetNightBlend = colorMode === 'dark' ? 1.0 : 0.0

  useFrame((_, delta) => {
    // Lerp night blend
    nightBlendRef.current = THREE.MathUtils.lerp(nightBlendRef.current, targetNightBlend, delta * 2.0)

    // Biome transition
    if (transitioning.current) {
      biomeT.current = Math.min(biomeT.current + delta * 0.67, 1.0)
      if (biomeT.current >= 1.0) {
        transitioning.current = false
        prevBiomeIdx.current = biomeIdx
        biomeT.current = 0
      }
    }

    // Update field center (midpoint of dog and butterfly)
    fieldCenter.current.set(
      (dogPosition.current.x + butterflyPosition.current.x) / 2,
      0,
      (dogPosition.current.z + butterflyPosition.current.z) / 2,
    )

    // Move ground plane to follow field center
    if (groundRef.current) {
      groundRef.current.position.x = fieldCenter.current.x
      groundRef.current.position.z = fieldCenter.current.z
    }

    trail.update(delta, dogPosition.current.x, dogPosition.current.z)

    // Idle detection
    if (input.current.active) {
      idleTimer.current = 0
      isIdle.current = false
    } else {
      idleTimer.current += delta
      if (idleTimer.current > 2.0) {
        isIdle.current = true
      }
    }

    // Follow camera: behind dog, looking toward butterfly
    const dogPos = dogPosition.current
    const bflyPos = butterflyPosition.current

    // Camera looks at weighted point between dog and butterfly
    const lookAt = new THREE.Vector3(
      dogPos.x * 0.6 + bflyPos.x * 0.4,
      0.5,
      dogPos.z * 0.6 + bflyPos.z * 0.4,
    )

    // Camera offset: behind and above the dog
    const dogFacing = new THREE.Vector3(bflyPos.x - dogPos.x, 0, bflyPos.z - dogPos.z)
    if (dogFacing.length() > 0.01) dogFacing.normalize()
    else dogFacing.set(0, 0, -1)

    const idealPos = new THREE.Vector3(
      dogPos.x - dogFacing.x * 4,
      3,
      dogPos.z - dogFacing.z * 4,
    )

    camera.position.lerp(idealPos, 0.03)
    const currentLookAt = new THREE.Vector3()
    camera.getWorldDirection(currentLookAt)
    const targetLookAtDir = lookAt.clone().sub(camera.position).normalize()
    currentLookAt.lerp(targetLookAtDir, 0.05)
    camera.lookAt(camera.position.clone().add(currentLookAt))
  })

  // Lighting colors
  const nightBlend = nightBlendRef.current
  const ambientColor = new THREE.Color().lerpColors(
    new THREE.Color(0xb0d4f1),
    new THREE.Color(0x1a1a3a),
    targetNightBlend,
  )
  const ambientIntensity = THREE.MathUtils.lerp(0.4, 0.15, targetNightBlend)
  const dirColor = new THREE.Color().lerpColors(
    new THREE.Color(0xfff5e6),
    new THREE.Color(0xcce5ff),
    targetNightBlend,
  )
  const dirIntensity = THREE.MathUtils.lerp(1.5, 0.6, targetNightBlend)
  const dirPos: [number, number, number] = targetNightBlend > 0.5 ? [-3, 8, -3] : [5, 10, 5]

  const groundColor = new THREE.Color(
    ...BIOMES[biomeIdx].groundColor as [number, number, number]
  )

  return (
    <>
      {/* Lighting */}
      <ambientLight color={ambientColor} intensity={ambientIntensity} />
      <directionalLight color={dirColor} intensity={dirIntensity} position={dirPos} />
      <hemisphereLight
        args={[
          targetNightBlend > 0.5 ? 0x0a0a2a : 0x87ceeb,
          targetNightBlend > 0.5 ? 0x1a1a3a : 0x4a8c3f,
          THREE.MathUtils.lerp(0.3, 0.15, targetNightBlend),
        ]}
      />

      <Sun fieldCenter={fieldCenter} nightBlend={nightBlendRef.current} />
      <Moon fieldCenter={fieldCenter} nightBlend={nightBlendRef.current} />

      {/* Sky background color */}
      <color
        attach="background"
        args={[
          targetNightBlend > 0.5 ? '#0A0A2A' : '#87CEEB',
        ]}
      />

      {/* Stars (night only) */}
      {targetNightBlend > 0.3 && (
        <Stars radius={50} count={2000} fade speed={0.5} />
      )}

      {/* Ground plane */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color={groundColor} />
      </mesh>

      {/* Grass */}
      <GrassField
        biome={BIOMES[prevBiomeIdx.current]}
        targetBiome={BIOMES[biomeIdx]}
        biomeTransition={biomeT.current}
        nightBlend={nightBlendRef.current}
        dogPosition={dogPosition}
        fieldCenter={fieldCenter}
        trailBuffer={trail.buffer}
        trailCount={trail.count}
      />

      <Butterfly input={input} positionRef={butterflyPosition} isIdle={isIdle} dogPosition={dogPosition} />
      <Dog
        butterflyPosition={butterflyPosition}
        positionRef={dogPosition}
        isIdle={isIdle}
      />
      {createPortal(
        <BiomeSelector currentIndex={biomeIdx} onBiomeChange={handleBiomeChange} />,
        document.body,
      )}
    </>
  )
}
