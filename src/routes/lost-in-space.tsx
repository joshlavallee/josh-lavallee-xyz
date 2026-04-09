import { createFileRoute } from '@tanstack/react-router'
import { PlanetControls } from '@/features/planet'

export const Route = createFileRoute('/lost-in-space')({
  component: LostInSpace,
})

function LostInSpace() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: [
            'linear-gradient(to left, rgba(0,0,0,0.55) 0%, transparent 40%)',
            'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 40%)',
          ].join(', '),
        }}
      />
      <PlanetControls />
    </>
  )
}
