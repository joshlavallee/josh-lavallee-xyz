import { useState } from 'react'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { planetSettings } from '../lib/planet-store'

const SLIDER_CONFIGS = [
  { key: 'rotationSpeed' as const, label: 'Rotation Speed', min: 0.0, max: 1.0, step: 0.01, labelLow: 'Still', labelHigh: 'Fast' },
  { key: 'swirlIntensity' as const, label: 'Swirl Intensity', min: 0.5, max: 4.0, step: 0.1, labelLow: 'Smooth', labelHigh: 'Turbulent' },
  { key: 'orangeIntensity' as const, label: 'Orange Intensity', min: 0.0, max: 1.0, step: 0.01, labelLow: 'Subtle', labelHigh: 'Dominant' },
] as const

export default function PlanetControls() {
  const [isOpen, setIsOpen] = useState(false)
  const [values, setValues] = useState({
    rotationSpeed: planetSettings.rotationSpeed,
    swirlIntensity: planetSettings.swirlIntensity,
    orangeIntensity: planetSettings.orangeIntensity,
  })

  function updateValue(key: keyof typeof planetSettings, value: number) {
    planetSettings[key] = value
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={cn(
          'surface flex flex-col-reverse overflow-hidden transition-all duration-300 ease-out',
          isOpen ? 'w-60' : 'w-[52px]'
        )}
        style={{ maxHeight: isOpen ? '600px' : '52px' }}
      >
        {/* Toggle button row (at bottom due to flex-col-reverse) */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'flex h-[52px] shrink-0 items-center justify-center cursor-pointer text-foreground/60 transition-all hover:text-foreground',
              isOpen ? 'w-[52px]' : 'w-full'
            )}
            aria-label={isOpen ? 'Close planet controls' : 'Open planet controls'}
          >
            <Globe className={cn('size-5 transition-transform duration-300', isOpen && 'rotate-90')} />
          </button>
        </div>

        {/* Panel content (above button due to flex-col-reverse) */}
        <div
          className={cn(
            'px-3 pt-3 transition-all duration-200',
            isOpen
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-2 opacity-0'
          )}
          style={{ transitionDelay: isOpen ? '100ms' : '0ms' }}
        >
          <span className="mb-3 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Planet
          </span>

          <div className="flex flex-col gap-2.5">
            {SLIDER_CONFIGS.map((config) => (
              <div key={config.key}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{config.label}</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {values[config.key].toFixed(2)}
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
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground/50">{config.labelLow}</span>
                  <span className="text-[9px] text-muted-foreground/50">{config.labelHigh}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
