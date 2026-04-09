import { useState, useRef, useEffect } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Home, PawPrint, Waypoints, Box, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/' as const, label: 'Home', icon: Home },
  { to: '/about' as const, label: 'About', icon: PawPrint },
  { to: '/particlepeg' as const, label: 'Particle Peg', icon: Waypoints },
  { to: '/lost-in-space' as const, label: 'Lost in Space', icon: Box },
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
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'surface overflow-hidden transition-all duration-300 ease-out',
            isOpen ? 'w-48' : 'w-[52px]'
          )}
          style={{ maxHeight: isOpen ? '500px' : '52px' }}
        >
          {/* Burger toggle button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'flex h-[52px] shrink-0 items-center justify-center cursor-pointer text-foreground/80 transition-all hover:text-foreground',
              isOpen ? 'w-[52px]' : 'w-full',
              isOpen && 'rotate-90'
            )}
            style={{ transition: 'transform 0.3s ease' }}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          {/* Nav items */}
          <div
            className={cn(
              'px-2 pb-2 transition-all duration-200',
              isOpen
                ? 'translate-y-0 opacity-100'
                : 'pointer-events-none -translate-y-2 opacity-0'
            )}
            style={{ transitionDelay: isOpen ? '100ms' : '0ms' }}
          >
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item, index) => {
                const isActive = currentPath === item.to
                const Icon = item.icon

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'surface-btn flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground',
                      isOpen
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none -translate-y-2 opacity-0'
                    )}
                    style={{
                      borderRadius: 'var(--surface-radius)',
                      transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                    }}
                    aria-label={item.label}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        <span className="flex h-[52px] items-center text-sm font-semibold uppercase tracking-[2px] text-muted-foreground">
          {currentLabel}
        </span>
      </div>
    </nav>
  )
}
