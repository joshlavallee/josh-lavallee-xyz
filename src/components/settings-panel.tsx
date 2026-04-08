import { useState, useRef, useEffect } from 'react'
import { Settings, Sun, Moon, Square, Layers, Circle, Play, Pause, Volume2 } from 'lucide-react'
import { useTheme, type UIStyle } from '@/providers/theme-provider'
import { useAudio } from '@/providers/audio-provider'
import { cn } from '@/lib/utils'

const UI_STYLES: { value: UIStyle; label: string; icon: typeof Square }[] = [
  { value: 'glass', label: 'Glass', icon: Layers },
  { value: 'paper', label: 'Paper', icon: Circle },
  { value: 'flat', label: 'Flat', icon: Square },
]

export default function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { colorMode, uiStyle, setColorMode, setUIStyle } = useTheme()
  const { isPlaying, volume, toggle, setVolume } = useAudio()

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  return (
    <div className="fixed top-4 right-4 z-50" ref={panelRef}>
      <div
        className={cn(
          'surface overflow-hidden transition-all duration-300 ease-out',
          isOpen ? 'w-56' : 'w-[52px]'
        )}
        style={{ maxHeight: isOpen ? '500px' : '52px' }}
      >
        {/* Header row with gear button */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'flex h-[52px] w-[52px] shrink-0 items-center justify-center text-foreground/80 transition-all hover:text-foreground',
              isOpen && 'rotate-90'
            )}
            style={{ transition: 'transform 0.3s ease' }}
            aria-label="Settings"
            aria-expanded={isOpen}
          >
            <Settings className="size-5" />
          </button>
        </div>

        {/* Panel content */}
        <div
          className={cn(
            'px-4 pb-4 transition-all duration-200',
            isOpen
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-2 opacity-0'
          )}
          style={{ transitionDelay: isOpen ? '100ms' : '0ms' }}
        >
          {/* Mode section */}
          <div>
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Mode
            </span>
            <div className="flex gap-1">
              {(['light', 'dark'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setColorMode(mode)}
                  className={cn(
                    'surface-btn flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                    colorMode === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  style={{ borderRadius: 'var(--surface-radius)' }}
                >
                  {mode === 'light' ? <Sun className="size-3" /> : <Moon className="size-3" />}
                  {mode === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="my-3 h-px bg-border/50" />

          {/* Style section */}
          <div>
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Style
            </span>
            <div className="flex gap-1">
              {UI_STYLES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setUIStyle(value)}
                  className={cn(
                    'surface-btn flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors',
                    uiStyle === value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  style={{ borderRadius: 'var(--surface-radius)' }}
                >
                  <Icon className="size-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="my-3 h-px bg-border/50" />

          {/* Music section */}
          <div>
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Music
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                className="surface-btn flex h-7 w-7 shrink-0 items-center justify-center text-foreground/80 transition-colors hover:text-foreground"
                style={{ borderRadius: 'var(--surface-radius)' }}
                aria-label={isPlaying ? 'Pause music' : 'Play music'}
              >
                {isPlaying ? <Pause className="size-3" /> : <Play className="size-3" />}
              </button>
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="surface-input h-1 w-full cursor-pointer appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded [&::-moz-range-track]:bg-muted"
                  aria-label="Volume"
                />
                <Volume2 className="size-3 shrink-0 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
