export interface ShaderSettings {
  speed: number
  displacement: number
  mouseRadius: number
  mouseStrength: number
  palette: string
}

export const shaderSettings: ShaderSettings = {
  speed: 1.0,
  displacement: 1.0,
  mouseRadius: 2.5,
  mouseStrength: 2.0,
  palette: 'retrowave',
}

export const PALETTES: Record<
  string,
  { label: string; low: [number, number, number]; mid: [number, number, number]; high: [number, number, number] }
> = {
  retrowave: { label: 'Retro', low: [0.13, 0.88, 0.83], mid: [0.55, 0.24, 0.78], high: [1.0, 0.2, 0.6] },
  ocean: { label: 'Ocean', low: [0.05, 0.2, 0.4], mid: [0.1, 0.55, 0.65], high: [0.4, 0.9, 0.8] },
  ember: { label: 'Ember', low: [0.5, 0.05, 0.02], mid: [0.9, 0.4, 0.05], high: [1.0, 0.85, 0.2] },
  noir: { label: 'Noir', low: [0.05, 0.05, 0.07], mid: [0.2, 0.2, 0.22], high: [0.55, 0.55, 0.58] },
}
