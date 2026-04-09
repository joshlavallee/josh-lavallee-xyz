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
  rotationSpeed: 0.025,
  swirlIntensity: 0.5,
  amberIntensity: 0.2,
  raySteps: 12,
  shellThickness: 0.2,
  densityScale: 2.0,
  curlScale: 2.3,
  curlStrength: 0.2,
  emissionStrength: 1.1,
  contrast: 2.8,
}
