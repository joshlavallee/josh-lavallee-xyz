import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/photography')({
  component: Photography,
})

function Photography() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="surface max-w-md rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Photography</h1>
        <p className="mt-3 text-muted-foreground">Photo gallery coming soon.</p>
      </div>
    </div>
  )
}
