import { PerspectiveCamera } from '@react-three/drei'
import type { ColorMode, UIStyle } from '@/providers/theme-provider'
import TauCetiPlanet from './TauCetiPlanet'
import FloatGroup from './FloatGroup'
import AstronautFigure from './AstronautFigure'
import DogFigure from './DogFigure'

interface PlanetSceneProps {
  colorMode: ColorMode
  uiStyle: UIStyle
}

export default function PlanetScene({ colorMode: _colorMode, uiStyle: _uiStyle }: PlanetSceneProps) {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={45}
        near={0.1}
        far={100}
        position={[0, 0, 3]}
      />
      <color attach="background" args={['#020208']} />

      {/* Planet shifted bottom-left */}
      <group position={[-0.4, -0.3, 0]}>
        <TauCetiPlanet />
      </group>

      {/* Floating silhouettes between camera and planet */}
      <FloatGroup position={[0.15, 0.1, 1.2]} bobSpeed={0.5} swaySpeed={0.35}>
        <AstronautFigure scale={0.04} />
      </FloatGroup>

      <FloatGroup position={[0.3, 0.0, 1.15]} bobSpeed={0.4} swaySpeed={0.3}>
        <DogFigure scale={0.03} />
      </FloatGroup>
    </>
  )
}
