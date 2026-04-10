import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/fetch')({
  component: Fetch,
})

function Fetch() {
  return null
}
