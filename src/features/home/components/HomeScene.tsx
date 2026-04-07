import { PerspectiveCamera } from '@react-three/drei'
import type { ColorMode, UIStyle } from '@/providers/theme-provider'
import FluidShader from './FluidShader'

interface HomeSceneProps {
  colorMode: ColorMode
  uiStyle: UIStyle
}

export default function HomeScene({ colorMode, uiStyle }: HomeSceneProps) {
  return (
    <>
      <PerspectiveCamera
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
