import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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

// Tuned layouts for desktop (16:9) and mobile portrait (~9:19)
const DESKTOP = {
  planetPos: [3.0, -3.0, -2.5] as const,
  planetScale: 6.0,
  astroPos: [-1.75, 0.25, 0.5] as const,
  astroScale: 0.22,
};

const MOBILE = {
  planetPos: [4.5, -2.0, -4.0] as const,
  planetScale: 5.5,
  astroPos: [-0.2, 0.3, 0.5] as const,
  astroScale: 0.18,
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Interpolate between mobile and desktop layouts based on aspect ratio */
function useResponsiveLayout() {
  const { viewport } = useThree();
  return useMemo(() => {
    const aspect = viewport.width / viewport.height;
    // 0 = mobile portrait (0.5), 1 = desktop (1.78+)
    const t = Math.min(Math.max((aspect - 0.5) / (16 / 9 - 0.5), 0), 1);

    return {
      planetPos: [
        lerp(MOBILE.planetPos[0], DESKTOP.planetPos[0], t),
        lerp(MOBILE.planetPos[1], DESKTOP.planetPos[1], t),
        lerp(MOBILE.planetPos[2], DESKTOP.planetPos[2], t),
      ] as [number, number, number],
      planetScale: lerp(MOBILE.planetScale, DESKTOP.planetScale, t),
      astroPos: [
        lerp(MOBILE.astroPos[0], DESKTOP.astroPos[0], t),
        lerp(MOBILE.astroPos[1], DESKTOP.astroPos[1], t),
        lerp(MOBILE.astroPos[2], DESKTOP.astroPos[2], t),
      ] as [number, number, number],
      astroScale: lerp(MOBILE.astroScale, DESKTOP.astroScale, t),
    };
  }, [viewport.width, viewport.height]);
}

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
  const { scene } = useThree();
  const layout = useResponsiveLayout();

  useEffect(() => {
    scene.background = new THREE.Color(0x000000);
    return () => { scene.background = null };
  }, [scene]);

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
      <group position={layout.planetPos} scale={layout.planetScale}>
        <TauCetiPlanet />
      </group>

      {/* Floating astronaut facing us, upper-left near planet edge */}
      <FloatGroup
        position={layout.astroPos}
        bobSpeed={1}
        bobAmplitude={0.015}
        swaySpeed={0.2}
        swayAmplitude={0.005}
        rotationSpeed={1}
      >
        <group rotation={[-Math.PI / 2.5, -2.5, 0.75]}>
          <Astronaut scale={layout.astroScale} />
        </group>
      </FloatGroup>

    </>
  );
}
