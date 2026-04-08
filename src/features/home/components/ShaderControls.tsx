import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { shaderSettings, PALETTES } from '../lib/shader-store'

const SLIDER_CONFIGS = [
  { key: 'speed' as const, label: 'Speed', min: 0.1, max: 3.0, step: 0.1 },
  { key: 'displacement' as const, label: 'Displacement', min: 0.2, max: 3.0, step: 0.1 },
  { key: 'mouseRadius' as const, label: 'Mouse Radius', min: 0.5, max: 5.0, step: 0.1 },
  { key: 'mouseStrength' as const, label: 'Mouse Strength', min: 0.5, max: 5.0, step: 0.1 },
] as const

const paletteKeys = Object.keys(PALETTES)

export default function ShaderControls() {
  const [isOpen, setIsOpen] = useState(false)
  const [values, setValues] = useState({
    speed: shaderSettings.speed,
    displacement: shaderSettings.displacement,
    mouseRadius: shaderSettings.mouseRadius,
    mouseStrength: shaderSettings.mouseStrength,
    palette: shaderSettings.palette,
  })

  function updateValue(key: keyof typeof shaderSettings, value: number | string) {
    shaderSettings[key] = value as never
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed top-1/2 right-4 z-50 -translate-y-1/2">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="surface surface-btn flex h-[42px] w-[42px] items-center justify-center text-foreground/60 transition-all hover:text-foreground"
        style={{ transition: 'box-shadow 0.2s ease' }}
        aria-label={isOpen ? 'Close shader controls' : 'Open shader controls'}
      >
        {isOpen ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
      </button>

      {/* Panel */}
      <div
        className={cn(
          'surface absolute top-0 right-10 w-52 origin-right p-3 transition-all duration-200',
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        )}
      >
        <span className="mb-3 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Shader
        </span>

        {/* Sliders */}
        <div className="flex flex-col gap-2.5">
          {SLIDER_CONFIGS.map((config) => (
            <div key={config.key}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{config.label}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {values[config.key].toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={config.min}
                max={config.max}
                step={config.step}
                value={values[config.key]}
                onChange={(e) => updateValue(config.key, parseFloat(e.target.value))}
                className="surface-input h-1 w-full cursor-pointer appearance-none [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded [&::-moz-range-track]:bg-muted [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-3 h-px bg-border/50" />

        {/* Palette */}
        <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Palette
        </span>
        <div className="grid grid-cols-2 gap-1">
          {paletteKeys.map((key) => {
            const palette = PALETTES[key]
            return (
              <button
                key={key}
                onClick={() => updateValue('palette', key)}
                className={cn(
                  'surface-btn flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-medium transition-colors',
                  values.palette === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                style={{ borderRadius: 'var(--surface-radius)' }}
              >
                {/* Color swatch */}
                <div className="flex gap-px">
                  {[palette.low, palette.mid, palette.high].map((c, i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-sm"
                      style={{ background: `rgb(${c[0] * 255},${c[1] * 255},${c[2] * 255})` }}
                    />
                  ))}
                </div>
                {palette.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
