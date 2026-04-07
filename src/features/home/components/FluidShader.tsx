import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { UIStyle } from '@/providers/theme-provider'
import vertexShader from '../shaders/fluid.vert.glsl?raw'
import fragmentShader from '../shaders/fluid.frag.glsl?raw'
import noiseGlsl from '@/shaders/noise.glsl?raw'

const THEME_TINTS: Record<UIStyle, [number, number, number]> = {
  paper: [0.08, 0.04, -0.02],
  glass: [-0.02, 0.02, 0.06],
  flat: [0.0, 0.0, 0.0],
}

const GRID_SIZE = 10
const GRID_SEGMENTS = 128

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
  const meshRef = useRef<THREE.Mesh>(null)

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
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useFrame((state, delta) => {
    if (!materialRef.current) return

    materialRef.current.uniforms.uTime.value += delta

    // Ray-plane intersection: project mouse onto XZ ground plane
    const pointer = state.pointer
    ndcVec.set(pointer.x, pointer.y)
    raycaster.setFromCamera(ndcVec, state.camera)
    const hit = raycaster.ray.intersectPlane(groundPlane, intersectPoint)

    if (hit) {
      const targetX = intersectPoint.x
      const targetZ = intersectPoint.z
      mouseRef.current.x += (targetX - mouseRef.current.x) * 0.05
      mouseRef.current.y += (targetZ - mouseRef.current.y) * 0.05
    }
    materialRef.current.uniforms.uMouse.value.copy(mouseRef.current)

    // Update reactive uniforms
    materialRef.current.uniforms.uColorMode.value = colorMode === 'light' ? 1.0 : 0.0
    const tint = THEME_TINTS[uiStyle]
    materialRef.current.uniforms.uThemeTint.value.set(tint[0], tint[1], tint[2])
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
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
