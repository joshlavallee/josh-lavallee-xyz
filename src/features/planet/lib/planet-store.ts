export interface PlanetSettings {
  rotationSpeed: number
  swirlIntensity: number
  amberIntensity: number
  raySteps: number
  shellThickness: number
  densityScale: number
  curlScale: number
  curlStrength: number
  emissionStrength: number
  contrast: number
}

export const planetSettings: PlanetSettings = {
  rotationSpeed: 0.005,
  swirlIntensity: 0.7,
  amberIntensity: 1.75,
  raySteps: 12,
  shellThickness: 0.2,
  densityScale: 1.6,
  curlScale: 1.6,
  curlStrength: 0.25,
  emissionStrength: 3.0,
  contrast: 1.8,
}
