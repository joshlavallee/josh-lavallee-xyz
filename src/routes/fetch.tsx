import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/fetch')({
  component: Fetch,
})

function Fetch() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 flex justify-center">
      <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-950/60 px-4 py-2 backdrop-blur-sm">
        <div className="size-2 animate-pulse rounded-full bg-amber-400" />
        <span className="text-sm font-medium text-amber-300">
          Work in Progress
        </span>
      </div>
    </div>
  )
}
