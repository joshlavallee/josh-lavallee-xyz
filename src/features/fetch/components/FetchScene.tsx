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
import VirtualJoystick from './VirtualJoystick'
import { useInput, setJoystickInput } from '../hooks/useInput'
import { useTrailWake } from '../hooks/useTrailWake'
import { BIOMES, DEFAULT_BIOME_INDEX } from '../lib/biomes'

const GROUND_SIZE = 80

// Module-level color constants (no per-frame allocations)
const DAY_AMBIENT = new THREE.Color(0xb0d4f1)
const NIGHT_AMBIENT = new THREE.Color(0x1a1a3a)
const DAY_DIR = new THREE.Color(0xfff5e6)
const NIGHT_DIR = new THREE.Color(0xcce5ff)
const DAY_SKY = new THREE.Color(0x87ceeb)
const NIGHT_SKY = new THREE.Color(0x0a0a2a)
const DAY_GROUND_HEMI = new THREE.Color(0x4a8c3f)
const NIGHT_GROUND_HEMI = new THREE.Color(0x1a1a3a)
const DAY_BG = new THREE.Color('#87CEEB')
const NIGHT_BG = new THREE.Color('#0A0A2A')

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

  // Reusable camera Vector3s (no per-frame allocations)
  const _lookAt = useRef(new THREE.Vector3())
  const _dogFacing = useRef(new THREE.Vector3())
  const _idealPos = useRef(new THREE.Vector3())
  const _currentLookAt = useRef(new THREE.Vector3())

  // Light refs for smooth in-useFrame updates
  const ambientRef = useRef<THREE.AmbientLight>(null!)
  const dirLightRef = useRef<THREE.DirectionalLight>(null!)
  const hemiRef = useRef<THREE.HemisphereLight>(null!)
  const groundMatRef = useRef<THREE.MeshStandardMaterial>(null!)

  // Reusable background color
  const bgColor = useRef(new THREE.Color())

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

  const handleJoystickInput = useCallback((x: number, y: number) => {
    setJoystickInput(input, x, y)
  }, [input])

  // Night blend
  const nightBlendRef = useRef(colorMode === 'dark' ? 1.0 : 0.0)
  const targetNightBlend = colorMode === 'dark' ? 1.0 : 0.0

  useFrame((state, delta) => {
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

    // Smooth lighting transitions
    const nb = nightBlendRef.current
    if (ambientRef.current) {
      ambientRef.current.color.lerpColors(DAY_AMBIENT, NIGHT_AMBIENT, nb)
      ambientRef.current.intensity = THREE.MathUtils.lerp(0.4, 0.15, nb)
    }
    if (dirLightRef.current) {
      dirLightRef.current.color.lerpColors(DAY_DIR, NIGHT_DIR, nb)
      dirLightRef.current.intensity = THREE.MathUtils.lerp(1.5, 0.6, nb)
      dirLightRef.current.position.set(
        THREE.MathUtils.lerp(5, -3, nb),
        THREE.MathUtils.lerp(10, 8, nb),
        THREE.MathUtils.lerp(5, -3, nb),
      )
    }
    if (hemiRef.current) {
      hemiRef.current.color.lerpColors(DAY_SKY, NIGHT_SKY, nb)
      hemiRef.current.groundColor.lerpColors(DAY_GROUND_HEMI, NIGHT_GROUND_HEMI, nb)
      hemiRef.current.intensity = THREE.MathUtils.lerp(0.3, 0.15, nb)
    }
    if (groundMatRef.current) {
      const prevGround = BIOMES[prevBiomeIdx.current].groundColor
      const targetGround = BIOMES[biomeIdx].groundColor
      const t = biomeT.current
      groundMatRef.current.color.setRGB(
        prevGround[0] + (targetGround[0] - prevGround[0]) * t,
        prevGround[1] + (targetGround[1] - prevGround[1]) * t,
        prevGround[2] + (targetGround[2] - prevGround[2]) * t,
      )
    }

    // Sky background lerp
    bgColor.current.lerpColors(DAY_BG, NIGHT_BG, nb)
    state.scene.background = bgColor.current

    // Follow camera: behind dog, looking toward butterfly
    const dogPos = dogPosition.current
    const bflyPos = butterflyPosition.current

    // Camera looks at weighted point between dog and butterfly
    _lookAt.current.set(
      dogPos.x * 0.6 + bflyPos.x * 0.4,
      0.5,
      dogPos.z * 0.6 + bflyPos.z * 0.4,
    )

    // Camera offset: behind and above the dog
    _dogFacing.current.set(bflyPos.x - dogPos.x, 0, bflyPos.z - dogPos.z)
    if (_dogFacing.current.length() > 0.01) _dogFacing.current.normalize()
    else _dogFacing.current.set(0, 0, -1)

    _idealPos.current.set(
      dogPos.x - _dogFacing.current.x * 4,
      3,
      dogPos.z - _dogFacing.current.z * 4,
    )

    camera.position.lerp(_idealPos.current, 0.03)
    camera.getWorldDirection(_currentLookAt.current)
    const targetLookAtDir = _lookAt.current.sub(camera.position).normalize()
    _currentLookAt.current.lerp(targetLookAtDir, 0.05)
    camera.lookAt(camera.position.clone().add(_currentLookAt.current))
  })

  return (
    <>
      {/* Lighting */}
      <ambientLight ref={ambientRef} />
      <directionalLight ref={dirLightRef} />
      <hemisphereLight ref={hemiRef} />

      <Sun fieldCenter={fieldCenter} nightBlendRef={nightBlendRef} />
      <Moon fieldCenter={fieldCenter} nightBlendRef={nightBlendRef} />

      {/* Stars (night only) */}
      {targetNightBlend > 0.3 && (
        <Stars radius={50} count={2000} fade speed={0.5} />
      )}

      {/* Ground plane */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial ref={groundMatRef} />
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
        <>
          <BiomeSelector currentIndex={biomeIdx} onBiomeChange={handleBiomeChange} />
          <VirtualJoystick onInput={handleJoystickInput} />
        </>,
        document.body,
      )}
    </>
  )
}
