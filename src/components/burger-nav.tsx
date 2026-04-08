import { useState, useRef, useEffect } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Home, PawPrint, Waypoints, Box, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/' as const, label: 'Home', icon: Home },
  { to: '/about' as const, label: 'About', icon: PawPrint },
  { to: '/particlepeg' as const, label: 'Particle Peg', icon: Waypoints },
  { to: '/placeholder' as const, label: 'Placeholder', icon: Box },
]

export default function BurgerNav() {
  const [isOpen, setIsOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const currentLabel = NAV_ITEMS.find((item) => item.to === currentPath)?.label ?? ''

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  return (
    <nav
      className="fixed top-4 left-4 z-50"
      ref={navRef}
      aria-label="Main navigation"
    >
      {/* Burger button + page label */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'surface surface-btn flex h-[52px] w-[52px] items-center justify-center text-foreground/80 transition-all hover:text-foreground',
            isOpen && 'rotate-90'
          )}
          style={{ transition: 'transform 0.3s ease, box-shadow 0.2s ease' }}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>

        <span className="text-[11px] font-medium uppercase tracking-[2px] text-muted-foreground">
          {currentLabel}
        </span>
      </div>

      {/* Nav items */}
      <div className="absolute top-[64px] left-0 flex flex-col gap-1">
        {NAV_ITEMS.map((item, index) => {
          const isActive = currentPath === item.to
          const Icon = item.icon

          return (
            <Link
              key={item.to}
              to={item.to}
              className="group/nav-item flex items-center"
              onClick={() => setIsOpen(false)}
              aria-label={item.label}
            >
              <div
                className={cn(
                  'flex h-[52px] w-[52px] items-center justify-center transition-all duration-200',
                  isActive ? 'surface-btn bg-primary/10' : 'surface-btn bg-background/50',
                  isOpen
                    ? 'translate-y-0 opacity-100'
                    : 'pointer-events-none -translate-y-2 opacity-0'
                )}
                style={{
                  borderRadius: 'var(--surface-radius)',
                  transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                }}
              >
                <Icon
                  className={cn(
                    'size-4 transition-colors',
                    isActive ? 'text-primary' : 'text-foreground/70'
                  )}
                />
              </div>

              {/* Hover label */}
              <span
                className={cn(
                  'pointer-events-none ml-2.5 whitespace-nowrap px-2.5 py-1 text-xs font-medium transition-opacity duration-150',
                  'surface',
                  'opacity-0 group-hover/nav-item:opacity-100',
                  !isOpen && 'hidden'
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
