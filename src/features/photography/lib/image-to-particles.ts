import type { ParticleData } from '../types'

interface ImageToParticlesOptions {
  threshold?: number
  maxParticles?: number
}

export async function imageToParticles(
  imageUrl: string,
  options: ImageToParticlesOptions = {}
): Promise<ParticleData> {
  const { threshold = 0.13, maxParticles = 60000 } = options

  const img = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // Downsample to ~320px wide like the original demo
  const sampleWidth = 320
  const sampleHeight = Math.round(320 / (img.width / img.height))

  canvas.width = sampleWidth
  canvas.height = sampleHeight
  ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight)

  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight)
  const pixels = imageData.data
  const imageAspect = img.width / img.height

  const tempPositions: number[] = []
  const tempColors: number[] = []
  const tempSizes: number[] = []
  const tempRandoms: number[] = []

  for (let y = 0; y < sampleHeight; y++) {
    for (let x = 0; x < sampleWidth; x++) {
      if (tempPositions.length / 3 >= maxParticles) break

      const i = (y * sampleWidth + x) * 4
      const r = pixels[i] / 255
      const g = pixels[i + 1] / 255
      const b = pixels[i + 2] / 255
      const a = pixels[i + 3] / 255
      const brightness = r * 0.21 + g * 0.71 + b * 0.07

      if (brightness < threshold || a < 0.5) continue

      const px = (x / sampleWidth - 0.5) * imageAspect
      const py = 0.5 - y / sampleHeight

      tempPositions.push(px, py, 0)
      tempColors.push(r, g, b)
      tempSizes.push(brightness)
      tempRandoms.push(Math.random())
    }
  }

  const count = tempPositions.length / 3

  return {
    positions: new Float32Array(tempPositions),
    colors: new Float32Array(tempColors),
    sizes: new Float32Array(tempSizes),
    randoms: new Float32Array(tempRandoms),
    count,
    imageAspect,
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}
