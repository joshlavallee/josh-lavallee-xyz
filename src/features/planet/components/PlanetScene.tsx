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

      {/* Planet shifted bottom-left, scaled up to fill space */}
      <group position={[-0.7, -0.5, 0]} scale={1.5}>
        <TauCetiPlanet />
      </group>

      {/* Floating silhouettes between camera and planet */}
      <FloatGroup position={[0.15, 0.1, 1.2]} bobSpeed={0.5} swaySpeed={0.35}>
        <AstronautFigure scale={0.04} />
      </FloatGroup>

    </>
  )
}
