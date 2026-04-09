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
  swirlIntensity: 1.8,
  amberIntensity: 0.5,
  raySteps: 12,
  shellThickness: 0.2,
  densityScale: 2.0,
  curlScale: 1.5,
  curlStrength: 1.2,
  emissionStrength: 1.5,
  contrast: 1.5,
}
