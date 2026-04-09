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
  rotationSpeed: 0.02,
  swirlIntensity: 0.5,
  amberIntensity: 1.3,
  raySteps: 12,
  shellThickness: 0.2,
  densityScale: 2.0,
  curlScale: 1.9,
  curlStrength: 0.2,
  emissionStrength: 1.0,
  contrast: 3.0,
}
