import { OrthographicCamera } from '@react-three/drei'
import type { ColorMode, UIStyle } from '@/providers/theme-provider'
import FluidShader from './FluidShader'

interface HomeSceneProps {
  colorMode: ColorMode
  uiStyle: UIStyle
}

export default function HomeScene({ colorMode, uiStyle }: HomeSceneProps) {
  return (
    <>
      <OrthographicCamera makeDefault position={[0, 0, 1]} />
      <FluidShader colorMode={colorMode} uiStyle={uiStyle} />
    </>
  )
}
