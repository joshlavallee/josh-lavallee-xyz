import { createFileRoute } from '@tanstack/react-router'
import { PlanetControls } from '@/features/planet'

export const Route = createFileRoute('/placeholder')({
  component: Placeholder,
})

function Placeholder() {
  return <PlanetControls />
}
