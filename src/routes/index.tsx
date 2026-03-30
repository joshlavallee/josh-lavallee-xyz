import { createFileRoute } from '@tanstack/react-router'
import { Canvas } from '@react-three/fiber'
import Experience from '@/Experience'
import { CAMERA_SETTINGS, GL_SETTINGS, PIXEL_RATIO } from '@/settings'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <Canvas gl={GL_SETTINGS} camera={CAMERA_SETTINGS} dpr={PIXEL_RATIO}>
      <Experience />
    </Canvas>
  )
}
