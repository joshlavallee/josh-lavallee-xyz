import { useRef, useState, useCallback } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { User, Camera, Box } from 'lucide-react'
import { cn } from '@/lib/utils'

const DOCK_ITEMS = [
  { to: '/' as const, label: 'About Me', icon: User },
  { to: '/photography' as const, label: 'Photography', icon: Camera },
  { to: '/placeholder' as const, label: 'Placeholder', icon: Box },
]

const BASE_SIZE = 48
const MAX_SCALE = 1.8
const MAGNIFICATION_RANGE = 150

function getScale(itemCenterX: number, mouseX: number | null): number {
  if (mouseX === null) return 1
  const distance = Math.abs(mouseX - itemCenterX)
  if (distance > MAGNIFICATION_RANGE) return 1
  const ratio = 1 - distance / MAGNIFICATION_RANGE
  return 1 + (MAX_SCALE - 1) * ratio * ratio
}

export default function Dock() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mouseX, setMouseX] = useState<number | null>(null)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setMouseX(e.clientX - rect.left)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setMouseX(null)
  }, [])

  return (
    <nav
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
      aria-label="Main navigation"
    >
      <div
        ref={containerRef}
        className="surface flex items-end gap-1 rounded-2xl px-2 pb-2 pt-2"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {DOCK_ITEMS.map((item, index) => {
          const isActive = currentPath === item.to
          const itemCenter = (index + 0.5) * (BASE_SIZE + 4) + 8
          const scale = getScale(itemCenter, mouseX)

          return (
            <DockItem
              key={item.to}
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

function DockItem({
  to,
  label,
  icon: Icon,
  isActive,
  scale,
}: {
  to: string
  label: string
  icon: typeof User
  isActive: boolean
  scale: number
}) {
  return (
    <Link
      to={to}
      className="group/dock-item relative flex flex-col items-center"
      aria-label={label}
    >
      {/* Tooltip */}
      <span
        className={cn(
          'pointer-events-none absolute -top-9 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium',
          'bg-foreground text-background',
          'opacity-0 transition-opacity group-hover/dock-item:opacity-100'
        )}
      >
        {label}
      </span>

      {/* Icon container */}
      <div
        className={cn(
          'flex items-center justify-center rounded-xl transition-[transform,background-color] duration-200',
          'hover:bg-primary/10',
          isActive && 'bg-primary/15'
        )}
        style={{
          width: BASE_SIZE,
          height: BASE_SIZE,
          transform: `scale(${scale})`,
          transformOrigin: 'bottom center',
        }}
      >
        <Icon
          className={cn(
            'size-5 transition-colors',
            isActive ? 'text-primary' : 'text-foreground/70'
          )}
        />
      </div>

      {/* Active indicator dot */}
      <div
        className={cn(
          'mt-0.5 h-1 w-1 rounded-full transition-colors',
          isActive ? 'bg-primary' : 'bg-transparent'
        )}
      />
    </Link>
  )
}
