import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/fetch')({
  component: Fetch,
})

function Fetch() {
  return (
    <div className="flex h-dvh flex-col items-center justify-end p-8 pb-24">
      <div className="surface px-6 py-3">
        <span className="text-sm font-medium text-foreground">
          Josh & Winnie
        </span>
      </div>
    </div>
  )
}
