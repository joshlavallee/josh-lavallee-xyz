import { PerspectiveCamera } from '@react-three/drei'
import type { ColorMode, UIStyle } from '@/providers/theme-provider'
import TauCetiPlanet from './TauCetiPlanet'
import Starfield from './Starfield'
import FloatGroup from './FloatGroup'
import Astronaut from './Astronaut'

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

      {/* Planet massive, limb arc from left-center to bottom-right */}
      <group position={[-3.0, 3.0, -2.5]} scale={6.0}>
        <TauCetiPlanet />
      </group>

      {/* Floating astronaut near the planet's visible edge */}
      <FloatGroup
        position={[1.2, -0.8, 0.5]}
        bobSpeed={0.3}
        bobAmplitude={0.015}
        swaySpeed={0.2}
        swayAmplitude={0.008}
        rotationSpeed={0.04}
      >
        <Astronaut scale={0.15} />
      </FloatGroup>
    </>
  )
}
