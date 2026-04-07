import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { UIStyle } from '@/providers/theme-provider'
import vertexShader from '../shaders/fluid.vert.glsl?raw'
import fragmentShader from '../shaders/fluid.frag.glsl?raw'
import noiseGlsl from '@/shaders/noise.glsl?raw'

const THEME_TINTS: Record<UIStyle, [number, number, number]> = {
  paper: [0.08, 0.04, -0.02],   // warm amber shift
  glass: [-0.02, 0.02, 0.06],   // cool blue shift
  flat: [0.0, 0.0, 0.0],        // neutral
}

interface FluidShaderProps {
  colorMode: 'light' | 'dark'
  uiStyle: UIStyle
}

export default function FluidShader({ colorMode, uiStyle }: FluidShaderProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5))
  const { size } = useThree()

  const fullFragmentShader = useMemo(
    () => fragmentShader.replace('NOISE_PLACEHOLDER', noiseGlsl),
    []
  )

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uColorMode: { value: colorMode === 'light' ? 1.0 : 0.0 },
      uThemeTint: { value: new THREE.Vector3(...THEME_TINTS[uiStyle]) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useFrame((state, delta) => {
    if (!materialRef.current) return

    materialRef.current.uniforms.uTime.value += delta

    // Smooth mouse lerp
    const pointer = state.pointer
    const targetX = (pointer.x + 1) / 2
    const targetY = (pointer.y + 1) / 2
    mouseRef.current.x += (targetX - mouseRef.current.x) * 0.05
    mouseRef.current.y += (targetY - mouseRef.current.y) * 0.05
    materialRef.current.uniforms.uMouse.value.copy(mouseRef.current)

    // Update reactive uniforms
    materialRef.current.uniforms.uResolution.value.set(state.size.width, state.size.height)
    materialRef.current.uniforms.uColorMode.value = colorMode === 'light' ? 1.0 : 0.0
    const tint = THEME_TINTS[uiStyle]
    materialRef.current.uniforms.uThemeTint.value.set(tint[0], tint[1], tint[2])
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fullFragmentShader}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}
