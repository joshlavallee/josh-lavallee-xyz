import { useState, useCallback, useRef } from 'react'
import { Atom } from 'lucide-react'
import { cn } from '@/lib/utils'
import { planetSettings } from '../lib/planet-store'

export default function PlanetControls() {
  const [isRedMode, setIsRedMode] = useState(planetSettings.redMode)
  const [isFlashing, setIsFlashing] = useState(false)
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>(null)

  const toggle = useCallback(() => {
    const next = !planetSettings.redMode
    planetSettings.redMode = next
    setIsRedMode(next)

    if (next) {
      setIsFlashing(true)
      if (flashTimeout.current) clearTimeout(flashTimeout.current)
      flashTimeout.current = setTimeout(() => setIsFlashing(false), 600)
    }
  }, [])

  return (
    <>
      {/* Scene flash overlay */}
      <div
        className={cn(
          'pointer-events-none fixed inset-0 z-40 transition-opacity',
          isFlashing ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          background: 'radial-gradient(circle at center, rgba(255,60,40,0.25) 0%, rgba(180,20,10,0.12) 40%, transparent 70%)',
          transitionDuration: isFlashing ? '80ms' : '500ms',
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
