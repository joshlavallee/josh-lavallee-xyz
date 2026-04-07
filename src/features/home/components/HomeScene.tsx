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
      <OrthographicCamera
        makeDefault
        left={-1}
        right={1}
        top={1}
        bottom={-1}
        near={0}
        far={2}
        position={[0, 0, 1]}
      />
      <FluidShader colorMode={colorMode} uiStyle={uiStyle} />
    </>
  )
}
