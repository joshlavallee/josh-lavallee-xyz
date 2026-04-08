import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { UIStyle } from '@/providers/theme-provider'
import vertexShader from '../shaders/fluid.vert.glsl?raw'
import fragmentShader from '../shaders/fluid.frag.glsl?raw'
import noiseGlsl from '@/shaders/noise.glsl?raw'
import { shaderSettings, PALETTES } from '../lib/shader-store'

const THEME_TINTS: Record<UIStyle, [number, number, number]> = {
  paper: [0.08, 0.04, -0.02],
  glass: [-0.02, 0.02, 0.06],
  flat: [0.0, 0.0, 0.0],
}

const GRID_SIZE = 50
const GRID_SEGMENTS = 200

// Reusable objects to avoid per-frame allocation
const raycaster = new THREE.Raycaster()
const ndcVec = new THREE.Vector2()
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const intersectPoint = new THREE.Vector3()

interface FluidShaderProps {
  colorMode: 'light' | 'dark'
  uiStyle: UIStyle
}

export default function FluidShader({ colorMode, uiStyle }: FluidShaderProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const mouseRef = useRef(new THREE.Vector2(0, 0))

  const fullVertexShader = useMemo(
    () => vertexShader.replace('NOISE_PLACEHOLDER', noiseGlsl),
    []
  )

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColorMode: { value: colorMode === 'light' ? 1.0 : 0.0 },
      uThemeTint: { value: new THREE.Vector3(...THEME_TINTS[uiStyle]) },
      uSpeed: { value: 1.0 },
      uDisplacementScale: { value: 1.0 },
      uMouseRadius: { value: 2.5 },
      uMouseStrength: { value: 2.0 },
      uColorLow: { value: new THREE.Vector3(0.13, 0.88, 0.83) },
      uColorMid: { value: new THREE.Vector3(0.55, 0.24, 0.78) },
      uColorHigh: { value: new THREE.Vector3(1.0, 0.2, 0.6) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useFrame((state, delta) => {
    if (!materialRef.current) return

    const u = materialRef.current.uniforms

    u.uTime.value += delta * shaderSettings.speed

    // Ray-plane intersection: project mouse onto XZ ground plane
    ndcVec.set(state.pointer.x, state.pointer.y)
    raycaster.setFromCamera(ndcVec, state.camera)
    const hit = raycaster.ray.intersectPlane(groundPlane, intersectPoint)

    if (hit) {
      // Negate Z: PlaneGeometry rotated -PI/2 around X maps local Y to world -Z
      mouseRef.current.x += (intersectPoint.x - mouseRef.current.x) * 0.05
      mouseRef.current.y += (-intersectPoint.z - mouseRef.current.y) * 0.05
    }
    u.uMouse.value.copy(mouseRef.current)

    // Reactive uniforms
    u.uColorMode.value = colorMode === 'light' ? 1.0 : 0.0
    const tint = THEME_TINTS[uiStyle]
    u.uThemeTint.value.set(tint[0], tint[1], tint[2])

    // Read from shader store (written by ShaderControls)
    u.uSpeed.value = shaderSettings.speed
    u.uDisplacementScale.value = shaderSettings.displacement
    u.uMouseRadius.value = shaderSettings.mouseRadius
    u.uMouseStrength.value = shaderSettings.mouseStrength

    const palette = PALETTES[shaderSettings.palette] ?? PALETTES.retrowave
    u.uColorLow.value.set(...palette.low)
    u.uColorMid.value.set(...palette.mid)
    u.uColorHigh.value.set(...palette.high)
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[GRID_SIZE, GRID_SIZE, GRID_SEGMENTS, GRID_SEGMENTS]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={fullVertexShader}
        fragmentShader={fragmentShader}
        wireframe
      />
    </mesh>
  )
}
