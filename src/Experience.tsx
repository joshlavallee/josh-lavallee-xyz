import { ParticlePhotography } from '@/features/photography'
import { AboutScene } from '@/features/about'
import { HomeScene } from '@/features/home'
import type { ColorMode, UIStyle } from '@/providers/theme-provider'

interface ExperienceProps {
  routePath: string
  colorMode: ColorMode
  uiStyle: UIStyle
  photoIndex: number
}

export default function Experience({ routePath, colorMode, uiStyle, photoIndex }: ExperienceProps) {
  return (
    <>
      {routePath === '/' && (
        <HomeScene colorMode={colorMode} uiStyle={uiStyle} />
      )}
      {routePath === '/about' && (
        <AboutScene colorMode={colorMode} uiStyle={uiStyle} />
      )}
      {routePath === '/photography' && (
        <ParticlePhotography
          colorMode={colorMode}
          uiStyle={uiStyle}
          photoIndex={photoIndex}
        />
      )}
    </>
  )
}
