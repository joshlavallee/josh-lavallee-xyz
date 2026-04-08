import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  const clampedIndex = Math.max(0, Math.min(photo, PHOTOS.length - 1))
  const currentPhoto = PHOTOS[clampedIndex]

  function goTo(index: number) {
    const next = Math.max(0, Math.min(index, PHOTOS.length - 1))
    navigate({ to: '/particlepeg', search: { photo: next } })
  }

  return (
    <div className="flex h-dvh flex-col items-center justify-end p-8 pb-24">
      <div className="surface flex items-center gap-4 px-5 py-2.5">
        <button
          className={cn(
            'surface-btn flex items-center justify-center rounded-lg p-2',
            clampedIndex === 0 && 'pointer-events-none opacity-30'
          )}
          onClick={() => goTo(clampedIndex - 1)}
          aria-label="Previous photo"
        >
          <ChevronLeft className="size-4 text-foreground" />
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-medium text-foreground">
            {currentPhoto.title}
          </span>
          <span className="text-xs text-muted-foreground">
            {clampedIndex + 1} / {PHOTOS.length}
          </span>
        </div>

        <button
          className={cn(
            'surface-btn flex items-center justify-center rounded-lg p-2',
            clampedIndex === PHOTOS.length - 1 && 'pointer-events-none opacity-30'
          )}
          onClick={() => goTo(clampedIndex + 1)}
          aria-label="Next photo"
        >
          <ChevronRight className="size-4 text-foreground" />
        </button>
      </div>
    </div>
  )
}
