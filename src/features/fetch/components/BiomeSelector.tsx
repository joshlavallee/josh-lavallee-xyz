import { useState } from 'react'
import { TreePine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BIOMES, biomeSettings } from '../lib/biomes'

export default function BiomeSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(biomeSettings.index)

  function selectBiome(index: number) {
    biomeSettings.index = index
    setSelectedIndex(index)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={cn(
          'surface flex flex-col-reverse overflow-hidden transition-all duration-300 ease-out',
          isOpen ? 'w-56' : 'w-[52px]',
        )}
        style={{ maxHeight: isOpen ? '500px' : '52px' }}
      >
        {/* Toggle button (at bottom due to flex-col-reverse) */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'flex h-[52px] shrink-0 items-center justify-center cursor-pointer text-foreground/60 transition-all hover:text-foreground',
              isOpen ? 'w-[52px]' : 'w-full',
            )}
            aria-label={isOpen ? 'Close biome selector' : 'Open biome selector'}
          >
            <TreePine
              className={cn(
                'size-5 transition-transform duration-300',
                isOpen && 'rotate-12',
              )}
            />
          </button>
        </div>

        {/* Panel content */}
        <div
          className={cn(
            'px-3 pt-3 transition-all duration-200',
            isOpen
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-2 opacity-0',
          )}
          style={{ transitionDelay: isOpen ? '100ms' : '0ms' }}
        >
          <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Biome
          </span>

          <div className="flex flex-col gap-1">
            {BIOMES.map((biome, index) => (
              <button
                key={biome.name}
                onClick={() => selectBiome(index)}
                className={cn(
                  'surface-btn flex items-center gap-2 px-2.5 py-2 text-[11px] font-medium transition-colors',
                  selectedIndex === index
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                style={{ borderRadius: 'var(--surface-radius)' }}
              >
                <div className="flex gap-px">
                  {[biome.baseColor, biome.tipColor, biome.flowerColorA, biome.flowerColorB].map(
                    (c, i) => (
                      <div
                        key={i}
                        className="h-3 w-3 rounded-sm"
                        style={{
                          background: `rgb(${c[0] * 255},${c[1] * 255},${c[2] * 255})`,
                        }}
                      />
                    ),
                  )}
                </div>
                {biome.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
