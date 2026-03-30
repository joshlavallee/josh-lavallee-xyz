import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="surface max-w-md rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">About Me</h1>
        <p className="mt-3 text-muted-foreground">Welcome to the portfolio experience.</p>
      </div>
    </div>
  )
}
