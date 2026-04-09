import { PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type { ColorMode, UIStyle } from "@/providers/theme-provider";
import TauCetiPlanet from "./TauCetiPlanet";
import Starfield from "./Starfield";
import FloatGroup from "./FloatGroup";
import Astronaut from "./Astronaut";

interface PlanetSceneProps {
  colorMode: ColorMode;
  uiStyle: UIStyle;
}

export default function PlanetScene({
  colorMode: _colorMode,
  uiStyle: _uiStyle,
}: PlanetSceneProps) {
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

      {/* Scene lighting */}
      <ambientLight intensity={0.08} />
      <directionalLight
        position={[6, 3, 8]}
        intensity={0.6}
        color="#fffaf0"
      />
      {/* Planet glow — green spill onto astronaut */}
      <pointLight
        position={[1.5, -1.5, 0.5]}
        intensity={0.8}
        color="#1a7a20"
        distance={5}
        decay={2}
      />

      {/* Planet massive, limb arc filling bottom-right */}
      <group position={[3.0, -3.0, -2.5]} scale={6.0}>
        <TauCetiPlanet />
      </group>

      {/* Floating astronaut facing us, upper-left near planet edge */}
      <FloatGroup
        position={[-1.75, 0.25, 0.5]}
        bobSpeed={1}
        bobAmplitude={0.015}
        swaySpeed={0.2}
        swayAmplitude={0.005}
        rotationSpeed={1}
      >
        <group rotation={[-Math.PI / 2.5, -2.5, 0.75]}>
          <Astronaut scale={0.175} />
        </group>
      </FloatGroup>

      {/* Bloom for atmospheric glow bleed */}
      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.4}
          radius={0.5}
        />
      </EffectComposer>
    </>
  );
}
