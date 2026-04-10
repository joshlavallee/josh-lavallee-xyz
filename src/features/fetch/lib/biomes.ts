export interface Biome {
  name: string
  baseColor: [number, number, number]
  tipColor: [number, number, number]
  flowerColorA: [number, number, number]
  flowerColorB: [number, number, number]
  groundColor: [number, number, number]
  fogColor: [number, number, number]
  fogColorNight: [number, number, number]
  grassHeight: number
  flowerDensity: number
  glowIntensity: number
  windStrength: number
}

export const BIOMES: Biome[] = [
  {
    name: 'Enchanted Meadow',
    baseColor: [0.176, 0.353, 0.118],
    tipColor: [0.494, 0.784, 0.314],
    flowerColorA: [0.608, 0.349, 0.714],
    flowerColorB: [0.365, 0.678, 0.886],
    groundColor: [0.15, 0.25, 0.1],
    fogColor: [0.75, 0.85, 0.95],
    fogColorNight: [0.05, 0.05, 0.15],
    grassHeight: 0.8,
    flowerDensity: 0.15,
    glowIntensity: 0.5,
    windStrength: 1.0,
  },
  {
    name: 'Golden Prairie',
    baseColor: [0.251, 0.278, 0.035],
    tipColor: [0.784, 0.745, 0.612],
    flowerColorA: [0.906, 0.298, 0.235],
    flowerColorB: [0.204, 0.596, 0.859],
    groundColor: [0.2, 0.18, 0.08],
    fogColor: [0.9, 0.92, 0.94],
    fogColorNight: [0.06, 0.06, 0.12],
    grassHeight: 1.0,
    flowerDensity: 0.08,
    glowIntensity: 0.0,
    windStrength: 1.3,
  },
  {
    name: 'Twilight Grove',
    baseColor: [0.102, 0.227, 0.165],
    tipColor: [0.18, 0.545, 0.431],
    flowerColorA: [0.0, 0.898, 1.0],
    flowerColorB: [0.878, 0.251, 0.984],
    groundColor: [0.06, 0.12, 0.1],
    fogColor: [0.4, 0.5, 0.5],
    fogColorNight: [0.02, 0.04, 0.08],
    grassHeight: 0.9,
    flowerDensity: 0.12,
    glowIntensity: 1.0,
    windStrength: 0.7,
  },
  {
    name: 'Cherry Blossom',
    baseColor: [0.227, 0.353, 0.18],
    tipColor: [0.769, 0.541, 0.69],
    flowerColorA: [1.0, 0.412, 0.706],
    flowerColorB: [1.0, 0.941, 0.96],
    groundColor: [0.18, 0.22, 0.12],
    fogColor: [0.95, 0.9, 0.92],
    fogColorNight: [0.06, 0.04, 0.08],
    grassHeight: 0.7,
    flowerDensity: 0.2,
    glowIntensity: 0.3,
    windStrength: 0.8,
  },
  {
    name: 'Volcanic Ashlands',
    baseColor: [0.102, 0.102, 0.102],
    tipColor: [0.545, 0.145, 0.0],
    flowerColorA: [1.0, 0.271, 0.0],
    flowerColorB: [1.0, 0.843, 0.0],
    groundColor: [0.08, 0.06, 0.06],
    fogColor: [0.3, 0.25, 0.2],
    fogColorNight: [0.08, 0.04, 0.02],
    grassHeight: 0.6,
    flowerDensity: 0.1,
    glowIntensity: 0.6,
    windStrength: 0.5,
  },
]

export const DEFAULT_BIOME_INDEX = 2 // Twilight Grove
