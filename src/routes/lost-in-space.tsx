import { createFileRoute } from '@tanstack/react-router'
import { PlanetControls } from '@/features/planet'

export const Route = createFileRoute('/lost-in-space')({
  component: LostInSpace,
})

function LostInSpace() {
  return <PlanetControls />
}
