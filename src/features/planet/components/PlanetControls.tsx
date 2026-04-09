import { useState } from 'react'
import { Globe, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { planetSettings, type PlanetSettings } from '../lib/planet-store'

interface SliderConfig {
  key: keyof PlanetSettings
  label: string
  min: number
  max: number
  step: number
  labelLow: string
  labelHigh: string
}

interface SliderGroup {
  label: string
  sliders: SliderConfig[]
}

const SLIDER_GROUPS: SliderGroup[] = [
  {
    label: 'Flow & Turbulence',
    sliders: [
      { key: 'warpStrength', label: 'Warp Strength', min: 0.5, max: 8.0, step: 0.1, labelLow: 'Gentle', labelHigh: 'Chaotic' },
    ],
  },
  {
    label: 'Heat Regions',
    sliders: [
      { key: 'heatAmount', label: 'Heat Amount', min: 0.0, max: 2.0, step: 0.01, labelLow: 'None', labelHigh: 'Dominant' },
      { key: 'polarBias', label: 'Polar Bias', min: 0.0, max: 0.5, step: 0.01, labelLow: 'Uniform', labelHigh: 'Polar' },
    ],
  },
  {
    label: 'Atmosphere',
    sliders: [
      { key: 'emissionStrength', label: 'Emission', min: 0.0, max: 0.5, step: 0.01, labelLow: 'Dark', labelHigh: 'Glowing' },
    ],
  },
]

export default function PlanetControls() {
  const [isOpen, setIsOpen] = useState(false)
  const [values, setValues] = useState<PlanetSettings>({ ...planetSettings })
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  function updateValue(key: keyof PlanetSettings, value: number) {
    planetSettings[key] = value
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={cn(
          'surface flex flex-col-reverse overflow-hidden transition-all duration-300 ease-out',
          isOpen ? 'w-64' : 'w-[52px]'
        )}
        style={{ maxHeight: isOpen ? '80vh' : '52px' }}
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
            'overflow-y-auto px-3 pt-3 transition-all duration-200',
            isOpen
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-2 opacity-0'
          )}
          style={{ transitionDelay: isOpen ? '100ms' : '0ms' }}
        >
          <span className="mb-3 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Planet
          </span>

          <div className="flex flex-col gap-1">
            {SLIDER_GROUPS.map((group) => (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full cursor-pointer items-center justify-between py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground"
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      'size-3 transition-transform duration-200',
                      collapsedGroups[group.label] && '-rotate-90'
                    )}
                  />
                </button>

                <div
                  className={cn(
                    'flex flex-col gap-2.5 overflow-hidden transition-all duration-200',
                    collapsedGroups[group.label] ? 'max-h-0 opacity-0' : 'max-h-96 pb-2 opacity-100'
                  )}
                >
                  {group.sliders.map((config) => (
                    <div key={config.key}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{config.label}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {values[config.key].toFixed(config.step >= 1 ? 0 : 2)}
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
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
