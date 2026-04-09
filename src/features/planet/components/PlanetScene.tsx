import { PerspectiveCamera } from '@react-three/drei'
import type { ColorMode, UIStyle } from '@/providers/theme-provider'
import TauCetiPlanet from './TauCetiPlanet'
import FloatGroup from './FloatGroup'
import AstronautFigure from './AstronautFigure'
import Starfield from './Starfield'

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
      <Starfield />

      {/* Planet massive, only limb arc visible from left to bottom-right */}
      <group position={[-1.8, -2.2, -1]} scale={4.2}>
        <TauCetiPlanet />
      </group>

      {/* Astronaut floating near the planet's limb */}
      <FloatGroup position={[0.2, 0.3, 1.2]} bobSpeed={0.5} swaySpeed={0.35}>
        <AstronautFigure scale={0.04} />
      </FloatGroup>

    </>
  )
}
