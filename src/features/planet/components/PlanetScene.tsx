import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { ColorMode, UIStyle } from "@/providers/theme-provider";
import { planetSettings } from "../lib/planet-store";
import TauCetiPlanet from "./TauCetiPlanet";
import Starfield from "./Starfield";
import FloatGroup from "./FloatGroup";
import Astronaut from "./Astronaut";

interface PlanetSceneProps {
  colorMode: ColorMode;
  uiStyle: UIStyle;
}

const GREEN_GLOW = new THREE.Color("#1a7a20");
const RED_GLOW = new THREE.Color("#7a1a10");


function GlowLight() {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame((_state, delta) => {
    if (!lightRef.current) return;
    const target = planetSettings.redMode ? RED_GLOW : GREEN_GLOW;
    lightRef.current.color.lerp(target, Math.min(delta * 2.0, 1.0));
  });
  return (
    <pointLight
      ref={lightRef}
      position={[1.5, -1.5, 0.5]}
      intensity={0.4}
      color="#1a7a20"
      distance={4}
      decay={2}
    />
  );
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

      <GlowLight />

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
          <Astronaut scale={0.22} />
        </group>
      </FloatGroup>

    </>
  );
}
