import { ParticlePhotography } from '@/features/photography'
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
