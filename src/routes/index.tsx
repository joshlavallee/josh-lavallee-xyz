import { createFileRoute } from '@tanstack/react-router'
import { ShaderControls } from '@/features/home'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="h-dvh">
      <ShaderControls />
    </div>
  )
}
