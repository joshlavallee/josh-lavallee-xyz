import { useState } from 'react'
import { Atom } from 'lucide-react'
import { cn } from '@/lib/utils'
import { planetSettings } from '../lib/planet-store'

export default function PlanetControls() {
  const [isRedMode, setIsRedMode] = useState(planetSettings.redMode)

  function toggle() {
    planetSettings.redMode = !planetSettings.redMode
    setIsRedMode(planetSettings.redMode)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={toggle}
        className={cn(
          'surface flex h-[52px] w-[52px] items-center justify-center cursor-pointer transition-all duration-300',
          isRedMode
            ? 'text-red-400 hover:text-red-300'
            : 'text-foreground/60 hover:text-foreground'
        )}
        aria-label={isRedMode ? 'Disable red spectrum' : 'Enable red spectrum'}
      >
        <Atom className="size-5" />
      </button>
    </div>
  )
}
