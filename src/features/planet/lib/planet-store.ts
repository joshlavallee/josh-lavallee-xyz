export interface PlanetSettings {
  rotationSpeed: number
  warpStrength: number
  heatAmount: number
  polarBias: number
  bandingStrength: number
  emissionStrength: number
  rimPower: number
}

export const planetSettings: PlanetSettings = {
  rotationSpeed: 0.005,
  warpStrength: 3.5,
  heatAmount: 0.5,
  polarBias: 0.15,
  bandingStrength: 0.04,
  emissionStrength: 0.12,
  rimPower: 3.0,
}
