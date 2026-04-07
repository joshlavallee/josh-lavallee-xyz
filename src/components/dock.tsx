import { useRef, useState, useCallback } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Home, PawPrint, Camera, Box } from 'lucide-react'
import { cn } from '@/lib/utils'

const DOCK_ITEMS = [
  { to: '/' as const, label: 'Home', icon: Home },
  { to: '/about' as const, label: 'About', icon: PawPrint },
  { to: '/photography' as const, label: 'Photography', icon: Camera },
  { to: '/placeholder' as const, label: 'Placeholder', icon: Box },
]

const BASE_SIZE = 48
const MAX_SCALE = 1.3
const MAGNIFICATION_RANGE = 100

function getScale(distanceFromMouse: number): number {
  if (distanceFromMouse > MAGNIFICATION_RANGE) return 1
  const ratio = 1 - distanceFromMouse / MAGNIFICATION_RANGE
  return 1 + (MAX_SCALE - 1) * ratio * ratio
}

export default function Dock() {
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [mouseX, setMouseX] = useState<number | null>(null)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.clientX)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setMouseX(null)
  }, [])

  return (
    <nav
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
      aria-label="Main navigation"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-end gap-1.5">
        {DOCK_ITEMS.map((item, index) => {
          const isActive = currentPath === item.to
          const el = itemRefs.current[index]
          let scale = 1
          if (mouseX !== null && el) {
            const rect = el.getBoundingClientRect()
            const itemCenter = rect.left + rect.width / 2
            scale = getScale(Math.abs(mouseX - itemCenter))
          }

          return (
            <DockItem
              key={item.to}
              ref={(node) => { itemRefs.current[index] = node }}
              to={item.to}
              label={item.label}
              icon={item.icon}
              isActive={isActive}
              scale={scale}
            />
          )
        })}
      </div>
    </nav>
  )
}

import { forwardRef } from 'react'

const DockItem = forwardRef<
  HTMLAnchorElement,
  {
    to: string
    label: string
    icon: typeof Home
    isActive: boolean
    scale: number
  }
>(function DockItem({ to, label, icon: Icon, isActive, scale }, ref) {
  return (
    <Link
      ref={ref}
      to={to}
      className="group/dock-item relative flex flex-col items-center"
      aria-label={label}
    >
      {/* Icon + tooltip container - scales together */}
      <div
        className="flex flex-col items-center"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'bottom center',
          transition: 'transform 0.15s ease-out',
        }}
      >
        {/* Tooltip */}
        <span
          className={cn(
            'pointer-events-none mb-2 whitespace-nowrap px-3 py-1.5 text-xs font-medium',
            'surface',
            'opacity-0 transition-opacity group-hover/dock-item:opacity-100'
          )}
        >
          {label}
        </span>

        {/* Icon container */}
        <div
          className={cn(
            'flex items-center justify-center',
            isActive ? 'surface-btn bg-primary/10' : 'surface-btn bg-background/50'
          )}
          style={{
            width: BASE_SIZE,
            height: BASE_SIZE,
            borderRadius: 'var(--surface-radius)',
          }}
        >
          <Icon
            className={cn(
              'size-5 transition-colors',
              isActive ? 'text-primary' : 'text-foreground/70'
            )}
          />
        </div>
      </div>

      {/* Active indicator dot */}
      <div
        className={cn(
          'mt-1 h-1 w-1 rounded-full transition-colors',
          isActive ? 'bg-primary' : 'bg-transparent'
        )}
      />
    </Link>
  )
})
