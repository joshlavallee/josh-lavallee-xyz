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
  rotationSpeed: 0.04,
  swirlIntensity: 0.7,
  amberIntensity: 0.4,
  raySteps: 12,
  shellThickness: 0.2,
  densityScale: 2.0,
  curlScale: 0.5,
  curlStrength: 1.2,
  emissionStrength: 0.3,
  contrast: 2.8,
}
