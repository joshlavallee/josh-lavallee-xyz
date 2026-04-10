import { createFileRoute } from '@tanstack/react-router'
import BiomeSelector from '@/features/fetch/components/BiomeSelector'

export const Route = createFileRoute('/fetch')({
  component: Fetch,
})

function Fetch() {
  return <BiomeSelector />
}
