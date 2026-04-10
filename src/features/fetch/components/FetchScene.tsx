import { useRef, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars, Html } from '@react-three/drei'
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
import { BIOMES, DEFAULT_BIOME_INDEX } from '../lib/biomes'

const SPHERE_RADIUS = 4
const ROTATION_SPEED = 0.5

// Module-level color constants
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
  const sphereRef = useRef<THREE.Group>(null!)
  const idleTimer = useRef(0)
  const isIdle = useRef(false)
  const isMoving = useRef(false)
  const isFast = useRef(false)
  const facingAngle = useRef(0)
  const dogWorldPos = useRef(new THREE.Vector3(0, SPHERE_RADIUS, 0))
  const _dogLocal = useRef(new THREE.Vector3(0, SPHERE_RADIUS, 0))

  // Light refs
  const ambientRef = useRef<THREE.AmbientLight>(null!)
  const dirLightRef = useRef<THREE.DirectionalLight>(null!)
  const hemiRef = useRef<THREE.HemisphereLight>(null!)
  const sphereMatRef = useRef<THREE.MeshStandardMaterial>(null!)
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

  // Set fixed camera on first frame
  const cameraSet = useRef(false)

  useFrame((state, delta) => {
    // Fixed camera - set once
    if (!cameraSet.current) {
      camera.position.set(0, 7, 7)
      camera.lookAt(0, 0, 0)
      cameraSet.current = true
    }

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

    // Sphere rotation from input
    const { x, y } = input.current
    if (sphereRef.current && (x !== 0 || y !== 0)) {
      // W/Up = sphere rotates toward camera (positive X rotation)
      // D/Right = sphere rotates left (negative Z rotation)
      sphereRef.current.rotation.x += y * ROTATION_SPEED * delta
      sphereRef.current.rotation.z -= x * ROTATION_SPEED * delta
    }

    // Derive dog facing from input direction
    if (x !== 0 || y !== 0) {
      facingAngle.current = Math.atan2(x, -y)
    }

    // Movement state for dog animations
    const speed = Math.sqrt(x * x + y * y)
    isMoving.current = speed > 0.1
    isFast.current = speed > 0.7

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

    // Compute dog's world position (local top of sphere transformed by sphere rotation)
    if (sphereRef.current) {
      dogWorldPos.current.copy(_dogLocal.current)
      sphereRef.current.localToWorld(dogWorldPos.current)
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
    if (sphereMatRef.current) {
      const prevGround = BIOMES[prevBiomeIdx.current].groundColor
      const targetGround = BIOMES[biomeIdx].groundColor
      const t = biomeT.current
      sphereMatRef.current.color.setRGB(
        prevGround[0] + (targetGround[0] - prevGround[0]) * t,
        prevGround[1] + (targetGround[1] - prevGround[1]) * t,
        prevGround[2] + (targetGround[2] - prevGround[2]) * t,
      )
    }

    // Sky background lerp
    bgColor.current.lerpColors(DAY_BG, NIGHT_BG, nb)
    state.scene.background = bgColor.current
  })

  // Sun/Moon use a fixed ref at origin since camera doesn't move
  const originRef = useRef(new THREE.Vector3(0, 0, 0))

  return (
    <>
      {/* Lighting */}
      <ambientLight ref={ambientRef} />
      <directionalLight ref={dirLightRef} />
      <hemisphereLight ref={hemiRef} />

      <Sun fieldCenter={originRef} nightBlendRef={nightBlendRef} />
      <Moon fieldCenter={originRef} nightBlendRef={nightBlendRef} />

      {/* Stars (night only) */}
      {targetNightBlend > 0.3 && (
        <Stars radius={50} count={2000} fade speed={0.5} />
      )}

      {/* Sphere World - rotates based on input */}
      <group ref={sphereRef}>
        {/* Sphere ground */}
        <mesh>
          <sphereGeometry args={[SPHERE_RADIUS, 64, 64]} />
          <meshStandardMaterial ref={sphereMatRef} />
        </mesh>

        {/* Grass on upper hemisphere */}
        <GrassField
          biome={BIOMES[prevBiomeIdx.current]}
          targetBiome={BIOMES[biomeIdx]}
          biomeTransition={biomeT.current}
          nightBlend={nightBlendRef.current}
          sphereRadius={SPHERE_RADIUS}
        />

        {/* Dog at top of sphere */}
        <Dog
          sphereRadius={SPHERE_RADIUS}
          isMoving={isMoving}
          isFast={isFast}
          facingAngle={facingAngle}
        />
      </group>

      {/* Butterfly in world space above the sphere */}
      <Butterfly
        input={input}
        sphereRadius={SPHERE_RADIUS}
        isIdle={isIdle}
        dogWorldPosition={dogWorldPos}
      />

      <Html fullscreen style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '6rem' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <BiomeSelector currentIndex={biomeIdx} onBiomeChange={handleBiomeChange} />
        </div>
        <VirtualJoystick onInput={handleJoystickInput} />
      </Html>
    </>
  )
}
