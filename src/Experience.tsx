import { ParticlePhotography } from '@/features/photography'
import { AboutScene } from '@/features/about'
import { HomeScene } from '@/features/home'
import { PlanetScene } from '@/features/planet'
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
      {routePath === '/particlepeg' && (
        <ParticlePhotography
          colorMode={colorMode}
          uiStyle={uiStyle}
          photoIndex={photoIndex}
        />
      )}
      {routePath === '/lost-in-space' && (
        <PlanetScene colorMode={colorMode} uiStyle={uiStyle} />
      )}
    </>
  )
}
