import { useRef } from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { PerspectiveCamera as PerspectiveCameraType } from 'three'
import type { ColorMode, UIStyle } from '@/providers/theme-provider'
import FluidShader from './FluidShader'

interface HomeSceneProps {
  colorMode: ColorMode
  uiStyle: UIStyle
}

export default function HomeScene({ colorMode, uiStyle }: HomeSceneProps) {
  const cameraRef = useRef<PerspectiveCameraType>(null)
  const hasLookedAt = useRef(false)

  useFrame(() => {
    if (cameraRef.current && !hasLookedAt.current) {
      cameraRef.current.lookAt(0, 0, 0)
      cameraRef.current.updateProjectionMatrix()
      hasLookedAt.current = true
    }
  })

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={45}
        near={0.1}
        far={100}
        position={[0, 4, 7]}
      />
      <color attach="background" args={[colorMode === 'light' ? '#E8E8EC' : '#050508']} />
      <FluidShader colorMode={colorMode} uiStyle={uiStyle} />
    </>
  )
}
