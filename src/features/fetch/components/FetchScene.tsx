import { useRef, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars, Html, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import type { SceneProps } from '@/features/photography/types'
import GrassField from './GrassField'
import Butterfly from './Butterfly'
import Dog from './Dog'
import Sun from './Sun'
import Moon from './Moon'
import VirtualJoystick from './VirtualJoystick'
import { useInput, setJoystickInput } from '../hooks/useInput'
import { BIOMES, biomeSettings } from '../lib/biomes'

const SPHERE_RADIUS = 20
const SPHERE_Y_OFFSET = -18.5
const WALK_ROTATION_SPEED = 0.15
const RUN_ROTATION_SPEED = 0.18
const RUN_THRESHOLD = 0.95 // distance threshold for walk vs run

// Dog sits slightly forward on the sphere (toward camera)
const DOG_Y = SPHERE_RADIUS + SPHERE_Y_OFFSET
const DOG_Z = SPHERE_RADIUS * 0.05

// Module-level color constants
const DAY_AMBIENT = new THREE.Color(0xb0d4f1)
const NIGHT_AMBIENT = new THREE.Color(0x1a1a3a)
const DAY_SKY = new THREE.Color(0x87ceeb)
const NIGHT_SKY = new THREE.Color(0x0a0a2a)
const DAY_GROUND_HEMI = new THREE.Color(0x4a8c3f)
const NIGHT_GROUND_HEMI = new THREE.Color(0x1a1a3a)
const DAY_BG = new THREE.Color('#87CEEB')
const NIGHT_BG = new THREE.Color('#0A0A2A')

// Sun/Moon lighting colors
const SUN_COLOR = new THREE.Color(0xfff5e6)
const MOON_COLOR = new THREE.Color(0xcce5ff)

// Camera initial position: behind and above the dog
const CAM_Y = DOG_Y + 1.5
const CAM_Z = DOG_Z + 5.5

export default function FetchScene({ colorMode }: SceneProps) {
  const { scene } = useThree()

  // Clean up scene background on unmount so it doesn't leak to other routes
  useEffect(() => {
    return () => { scene.background = null }
  }, [scene])
  const input = useInput()
  const sphereRef = useRef<THREE.Group>(null!)
  const idleTimer = useRef(0)
  const isIdle = useRef(false)
  const isMoving = useRef(false)
  const isFast = useRef(false)
  const facingAngle = useRef(0)
  const dogWorldPos = useRef(new THREE.Vector3(0, DOG_Y, DOG_Z))
  const _qX = useRef(new THREE.Quaternion())
  const _qZ = useRef(new THREE.Quaternion())
  const _axisX = new THREE.Vector3(1, 0, 0)
  const _axisZ = new THREE.Vector3(0, 0, 1)

  // Light refs
  const ambientRef = useRef<THREE.AmbientLight>(null!)
  const sunLightRef = useRef<THREE.DirectionalLight>(null!)
  const moonLightRef = useRef<THREE.DirectionalLight>(null!)
  const hemiRef = useRef<THREE.HemisphereLight>(null!)
  const sphereMatRef = useRef<THREE.MeshStandardMaterial>(null!)
  const bgColor = useRef(new THREE.Color())

  // Biome state (reads from shared store each frame)
  const prevBiomeIdx = useRef(biomeSettings.index)
  const currentBiomeIdx = useRef(biomeSettings.index)
  const biomeT = useRef(0)
  const transitioning = useRef(false)

  const handleJoystickInput = useCallback((x: number, y: number) => {
    setJoystickInput(input, x, y)
  }, [input])

  // Night blend
  const nightBlendRef = useRef(colorMode === 'dark' ? 1.0 : 0.0)
  const targetNightBlend = colorMode === 'dark' ? 1.0 : 0.0

  // Camera target refs
  const _camTarget = useRef(new THREE.Vector3())
  const _camIdeal = useRef(new THREE.Vector3())

  useFrame((state, delta) => {
    const cam = state.camera
    _camIdeal.current.set(0, CAM_Y, CAM_Z)
    _camTarget.current.set(0, DOG_Y - 1, DOG_Z - 6)
    cam.position.lerp(_camIdeal.current, 0.05)
    cam.lookAt(_camTarget.current)

    // Lerp night blend
    nightBlendRef.current = THREE.MathUtils.lerp(nightBlendRef.current, targetNightBlend, delta * 2.0)

    // Detect biome changes from the shared store
    if (biomeSettings.index !== currentBiomeIdx.current) {
      prevBiomeIdx.current = currentBiomeIdx.current
      currentBiomeIdx.current = biomeSettings.index
      biomeT.current = 0
      transitioning.current = true
    }

    // Biome transition
    if (transitioning.current) {
      biomeT.current = Math.min(biomeT.current + delta * 0.67, 1.0)
      if (biomeT.current >= 1.0) {
        transitioning.current = false
        prevBiomeIdx.current = currentBiomeIdx.current
        biomeT.current = 0
      }
    }

    // Sphere rotation from input - speed scales with mouse distance
    const { x, y, distance } = input.current
    const isRunning = distance > RUN_THRESHOLD
    const rotSpeed = isRunning
      ? THREE.MathUtils.lerp(WALK_ROTATION_SPEED, RUN_ROTATION_SPEED, (distance - RUN_THRESHOLD) / (1 - RUN_THRESHOLD))
      : THREE.MathUtils.lerp(0, WALK_ROTATION_SPEED, distance / RUN_THRESHOLD)

    if (sphereRef.current && (x !== 0 || y !== 0)) {
      // Use quaternion rotation to avoid gimbal lock on diagonal movement
      const angle = rotSpeed * delta
      _qX.current.setFromAxisAngle(_axisX, y * angle)
      _qZ.current.setFromAxisAngle(_axisZ, x * angle)
      sphereRef.current.quaternion.premultiply(_qX.current)
      sphereRef.current.quaternion.premultiply(_qZ.current)
    }

    // Derive dog facing from input direction
    if (x !== 0 || y !== 0) {
      facingAngle.current = Math.atan2(x, -y)
    }

    // Movement state for dog animations - synced to distance
    isMoving.current = distance > 0.05
    isFast.current = isRunning

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
      ambientRef.current.intensity = THREE.MathUtils.lerp(0.3, 0.1, nb)
    }
    // Sun light: warm from the left, fades at night
    if (sunLightRef.current) {
      sunLightRef.current.intensity = THREE.MathUtils.lerp(1.5, 0.0, nb)
    }
    // Moon light: cool from the right, fades during day
    if (moonLightRef.current) {
      moonLightRef.current.intensity = THREE.MathUtils.lerp(0.0, 0.8, nb)
    }
    if (hemiRef.current) {
      hemiRef.current.color.lerpColors(DAY_SKY, NIGHT_SKY, nb)
      hemiRef.current.groundColor.lerpColors(DAY_GROUND_HEMI, NIGHT_GROUND_HEMI, nb)
      hemiRef.current.intensity = THREE.MathUtils.lerp(0.3, 0.15, nb)
    }
    if (sphereMatRef.current) {
      const prevGround = BIOMES[prevBiomeIdx.current].groundColor
      const targetGround = BIOMES[currentBiomeIdx.current].groundColor
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

  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={45}
        near={0.1}
        far={200}
        position={[0, CAM_Y, CAM_Z]}
      />

      {/* Lighting */}
      <ambientLight ref={ambientRef} />

      {/* Sun directional light - from the left */}
      <directionalLight
        ref={sunLightRef}
        color={SUN_COLOR}
        intensity={1.5}
        position={[-15, 8, 0]}
      />

      {/* Moon directional light - from the right */}
      <directionalLight
        ref={moonLightRef}
        color={MOON_COLOR}
        intensity={0}
        position={[15, 8, 0]}
      />

      <hemisphereLight ref={hemiRef} />

      {/* Sun on the left horizon */}
      <Sun nightBlendRef={nightBlendRef} />
      {/* Moon on the right horizon */}
      <Moon nightBlendRef={nightBlendRef} />

      {/* Stars (night only) */}
      {targetNightBlend > 0.3 && (
        <Stars radius={80} count={3000} fade speed={0.5} />
      )}

      {/* Sphere World - rotates based on input */}
      <group ref={sphereRef} position={[0, SPHERE_Y_OFFSET, 0]}>
        <mesh>
          <sphereGeometry args={[SPHERE_RADIUS, 64, 64]} />
          <meshStandardMaterial ref={sphereMatRef} />
        </mesh>

        <GrassField
          biome={BIOMES[prevBiomeIdx.current]}
          targetBiome={BIOMES[currentBiomeIdx.current]}
          biomeTransition={biomeT.current}
          nightBlendRef={nightBlendRef}
          sphereRadius={SPHERE_RADIUS}
        />
      </group>

      {/* Dog in world space - sphere rolls under its feet */}
      <Dog
        sphereRadius={SPHERE_RADIUS}
        yOffset={SPHERE_Y_OFFSET}
        isMoving={isMoving}
        isFast={isFast}
        facingAngle={facingAngle}
      />

      {/* Soft fill light on the dog so it's not silhouetted */}
      <pointLight
        position={[0, DOG_Y + 2, DOG_Z + 3]}
        intensity={0.8}
        color="#ffffff"
        distance={8}
        decay={2}
      />

      {/* Butterfly floats near the dog's nose */}
      <Butterfly
        input={input}
        dogWorldPosition={dogWorldPos}
        isIdle={isIdle}
      />

      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <VirtualJoystick onInput={handleJoystickInput} />
      </Html>
    </>
  )
}
