import { useEffect, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTheme } from '@/providers/theme-provider'
import { PHOTOS } from '@/features/photography'

export const Route = createFileRoute('/particlepeg')({
  validateSearch: (search: Record<string, unknown>) => ({
    photo: Number(search.photo) || 0,
  }),
  component: ParticlePeg,
})

function ParticlePeg() {
  const { photo } = Route.useSearch()
  const navigate = useNavigate()
  const { colorMode } = useTheme()
  const clampedIndex = Math.max(0, Math.min(photo, PHOTOS.length - 1))
  const currentPhoto = PHOTOS[clampedIndex]
  const isDark = colorMode === 'dark'

  const advance = useCallback(() => {
    const next = (clampedIndex + 1) % PHOTOS.length
    navigate({ to: '/particlepeg', search: { photo: next } })
  }, [clampedIndex, navigate])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.tagName !== 'CANVAS') return
      advance()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target as HTMLElement
        if (target.closest('button, a, input')) return
        e.preventDefault()
        advance()
      }
    }
    document.body.style.cursor = 'pointer'
    window.addEventListener('click', handleClick)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.cursor = ''
      window.removeEventListener('click', handleClick)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [advance])

  return (
    <div className="relative h-dvh w-full">
      {/* Lower-third title overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        {/* Gradient backdrop */}
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)'
              : 'linear-gradient(to top, rgba(255,255,255,0.4) 0%, transparent 100%)',
          }}
        />

        {/* Text block */}
        <div
          key={clampedIndex}
          className="relative px-8 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          {/* Title */}
          <span
            className="block text-sm font-semibold uppercase tracking-[4px]"
            style={{
              color: 'transparent',
              background: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)'} 0.6px, transparent 0.6px)`,
              backgroundSize: '1.5px 1.5px',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }}
          >
            {currentPhoto.title}
          </span>

          {/* Separator */}
          <div
            className="mt-2 h-px w-10"
            style={{
              background: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} 0.6px, transparent 0.6px)`,
              backgroundSize: '1.5px 1.5px',
            }}
          />

          {/* Counter */}
          <span
            className="mt-1.5 block text-xs tracking-[3px]"
            style={{
              color: 'transparent',
              background: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} 0.6px, transparent 0.6px)`,
              backgroundSize: '1.5px 1.5px',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }}
          >
            {clampedIndex + 1} / {PHOTOS.length}
          </span>
        </div>
      </div>
    </div>
  )
}
