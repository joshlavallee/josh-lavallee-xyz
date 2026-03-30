import type { ColorMode, UIStyle } from '@/providers/theme-provider'

export interface PhotoData {
  id: string
  src: string
  title: string
  alt: string
}

export interface ParticleData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  randoms: Float32Array
  count: number
  imageAspect: number
}

export interface SceneProps {
  colorMode: ColorMode
  uiStyle: UIStyle
}
