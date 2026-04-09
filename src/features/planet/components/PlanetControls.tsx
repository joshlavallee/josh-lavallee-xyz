import { useState, useCallback, useRef } from 'react'
import { Atom } from 'lucide-react'
import { cn } from '@/lib/utils'
import { planetSettings } from '../lib/planet-store'

export default function PlanetControls() {
  const [isRedMode, setIsRedMode] = useState(planetSettings.redMode)
  const [blackout, setBlackout] = useState(false)
  const transitioning = useRef(false)

  const toggle = useCallback(() => {
    if (transitioning.current) return
    transitioning.current = true

    const next = !planetSettings.redMode

    // 1. Fade to black
    setBlackout(true)

    // 2. Once fully dark, switch the mode
    setTimeout(() => {
      planetSettings.redMode = next
      setIsRedMode(next)
    }, 120)

    // 3. Fade back in
    setTimeout(() => {
      setBlackout(false)
      transitioning.current = false
    }, 250)
  }, [])

  return (
    <>
      {/* Blackout overlay — sits below buttons (z-40) but above the canvas */}
      <div
        className="pointer-events-none fixed inset-0 z-40 bg-black transition-opacity"
        style={{
          opacity: blackout ? 0.85 : 0,
          transitionDuration: blackout ? '100ms' : '150ms',
          transitionTimingFunction: blackout ? 'ease-in' : 'ease-out',
        }}
      />

      <div className="fixed bottom-4 right-4 z-50">
        {/* Outer wrapper for the spinning border */}
        <div className="group relative flex h-[58px] w-[58px] items-center justify-center">
          {/* Spinning conic gradient border */}
          <div
            className={cn(
              'beacon-border absolute inset-0 rounded-[var(--surface-radius)] opacity-60 group-hover:opacity-100',
              isRedMode ? 'beacon-border--green group-hover:shadow-[0_0_18px_4px_rgba(50,230,80,0.4)]' : 'beacon-border--red group-hover:shadow-[0_0_18px_4px_rgba(255,50,30,0.4)]'
            )}
            style={{ transition: 'opacity 0.3s ease, box-shadow 0.3s ease' }}
          />

          {/* Inner button */}
          <button
            onClick={toggle}
            className={cn(
              'surface relative z-10 flex h-[52px] w-[52px] items-center justify-center cursor-pointer transition-all duration-300',
              isRedMode
                ? 'beacon-breathe-green hover:!text-green-400 hover:![animation:none]'
                : 'beacon-breathe-red hover:!text-red-400 hover:![animation:none]'
            )}
            aria-label={isRedMode ? 'Disable red spectrum' : 'Enable red spectrum'}
          >
            <Atom className="size-5" />
          </button>
        </div>
      </div>
    </>
  )
}
