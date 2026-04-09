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
  swirlIntensity: 1.3,
  amberIntensity: 1.8,
  raySteps: 12,
  shellThickness: 0.2,
  densityScale: 2.0,
  curlScale: 3.75,
  curlStrength: 0.25,
  emissionStrength: 0.9,
  contrast: 2.0,
}
