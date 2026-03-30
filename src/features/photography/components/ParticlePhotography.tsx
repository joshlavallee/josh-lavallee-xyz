import { useState, useEffect, useRef } from 'react'
import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { SceneProps, ParticleData } from '../types'
import { PHOTOS } from '../photos'
import { imageToParticles } from '../lib/image-to-particles'
import useTouchInteraction from '../hooks/useTouchInteraction'
import ParticleSystem from './ParticleSystem'

interface ParticlePhotographyProps extends SceneProps {
  photoIndex: number
}

const THEME_SETTINGS = {
  flat: { opacity: 1.0, softness: 0.08, displacementScale: 1.0 },
  glass: { opacity: 0.7, softness: 0.12, displacementScale: 1.3 },
  paper: { opacity: 1.0, softness: 0.03, displacementScale: 0.8 },
} as const

export default function ParticlePhotography({ colorMode, uiStyle, photoIndex }: ParticlePhotographyProps) {
  const [particleData, setParticleData] = useState<ParticleData | null>(null)
  const cacheRef = useRef<Map<string, ParticleData>>(new Map())
  const { size } = useThree()

  const clampedIndex = Math.max(0, Math.min(photoIndex, PHOTOS.length - 1))
  const photo = PHOTOS[clampedIndex]

  useEffect(() => {
    let cancelled = false
    const cached = cacheRef.current.get(photo.id)
    if (cached) {
      setParticleData(cached)
      return
    }

    imageToParticles(photo.src).then((data) => {
      if (cancelled) return
      cacheRef.current.set(photo.id, data)
      setParticleData(data)
    })

    return () => { cancelled = true }
  }, [photo.id, photo.src])

  const touchTexture = useTouchInteraction(particleData?.imageAspect ?? 1)

  if (!particleData) return null

  const settings = THEME_SETTINGS[uiStyle]

  // Cover-fit: make the image fill the entire viewport (like CSS background-size: cover)
  const viewportAspect = size.width / size.height
  const imgAspect = particleData.imageAspect

  // The particle grid spans from -imgAspect/2 to +imgAspect/2 on X, -0.5 to +0.5 on Y
  // For cover fit, we want the image to fill the viewport completely
  let cameraHalfW: number, cameraHalfH: number
  if (viewportAspect > imgAspect) {
    // Viewport is wider: fit width, crop top/bottom
    cameraHalfW = imgAspect / 2
    cameraHalfH = cameraHalfW / viewportAspect
  } else {
    // Viewport is taller: fit height, crop sides
    cameraHalfH = 0.5
    cameraHalfW = cameraHalfH * viewportAspect
  }

  // Calculate point size so particles tile seamlessly to form the image
  // The visible width in world units = cameraHalfW * 2
  // The number of particles across = sampleWidth ≈ sqrt(count * imgAspect)
  const particlesAcross = Math.sqrt(particleData.count * imgAspect)
  const pixelSpacing = imgAspect / particlesAcross
  // Point size in pixels: spacing in world units * pixels per world unit
  const worldToPixels = size.width / (cameraHalfW * 2)
  const pointSize = pixelSpacing * worldToPixels * 0.85 // slight gaps so individual particles are visible

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[0, 0, 5]}
        left={-cameraHalfW}
        right={cameraHalfW}
        top={cameraHalfH}
        bottom={-cameraHalfH}
        near={0.1}
        far={100}
      />
      <ParticleSystem
        data={particleData}
        touchTexture={touchTexture}
        opacity={settings.opacity}
        softness={settings.softness}
        pointSize={pointSize}
        displacementScale={settings.displacementScale}
      />
    </>
  )
}
