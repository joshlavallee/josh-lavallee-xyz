import { PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import type { ColorMode, UIStyle } from '@/providers/theme-provider'
import TauCetiPlanet from './TauCetiPlanet'

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
      <TauCetiPlanet />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.6}
          luminanceSmoothing={0.4}
          intensity={0.8}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}
