# Atmosphere & Lighting Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the thin atmospheric Fresnel lines with thick, noise-textured, sun-aware atmospheric glow, add scene lighting for drama, and add bloom post-processing.

**Architecture:** Extract shared simplex noise into a reusable GLSL snippet. Rewrite both atmosphere shaders to use noise-textured Fresnel with sun-direction awareness. Add three lights to PlanetScene (directional, ambient, point). Add bloom via EffectComposer inside PlanetScene.

**Tech Stack:** GLSL shaders, React Three Fiber, @react-three/postprocessing (Bloom, EffectComposer), Three.js lights

---

### Task 1: Extract shared simplex noise to reusable GLSL snippet

**Files:**
- Create: `src/features/planet/shaders/noise3d.glsl`

This noise code is currently embedded in `planet.frag.glsl`. We extract it so both atmosphere shaders can reuse it. The planet shader will continue using its own inline copy for now (refactoring it is out of scope).

- [ ] **Step 1: Create the noise snippet file**

Create `src/features/planet/shaders/noise3d.glsl`:

```glsl
// ─── Simplex 3D Noise (Gustavson / Ashima Arts, MIT) ───

vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/shaders/noise3d.glsl
git commit -m "refactor(planet): extract shared simplex noise to noise3d.glsl"
```

---

### Task 2: Rewrite atmosphere shaders with noise-textured sun-aware scattering

**Files:**
- Modify: `src/features/planet/shaders/atmosphere.vert.glsl`
- Rewrite: `src/features/planet/shaders/atmosphere.frag.glsl`
- Rewrite: `src/features/planet/shaders/inner-haze.frag.glsl`

**Reference files (read these first):**
- `src/features/planet/shaders/noise3d.glsl` — simplex noise from Task 1
- `src/features/planet/shaders/planet.frag.glsl` — for understanding sun direction usage and color palette

- [ ] **Step 1: Update atmosphere vertex shader to pass vPosition**

Modify `src/features/planet/shaders/atmosphere.vert.glsl` to also pass object-space position for noise sampling:

```glsl
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

- [ ] **Step 2: Rewrite outer atmosphere fragment shader**

Rewrite `src/features/planet/shaders/atmosphere.frag.glsl`:

```glsl
uniform vec3 uSunDirection;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vPosition;

// noise3d.glsl will be prepended at import time

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 nPos = normalize(vPosition);
  float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);

  // Sun-aware brightness: brighter on lit side
  float sunDot = max(dot(nPos, normalize(uSunDirection)), 0.0);
  float sunFactor = 0.4 + 0.6 * sunDot;

  // Noise-textured edge: break up the geometric perfection
  float noiseVal = snoise(nPos * 3.0 + vec3(uTime * 0.02)) * 0.5 + 0.5;
  float noiseDetail = snoise(nPos * 8.0 - vec3(uTime * 0.01)) * 0.5 + 0.5;
  float noiseMix = noiseVal * 0.7 + noiseDetail * 0.3;

  // Thick layered falloff
  float innerGlow = smoothstep(0.15, 0.85, rim) * 0.12;
  float midGlow = pow(rim, 2.0) * 0.25;
  float outerGlow = pow(rim, 4.0) * 0.45;
  float edgeGlow = pow(rim, 8.0) * 0.3;

  float alpha = (innerGlow + midGlow + outerGlow + edgeGlow) * sunFactor;

  // Noise modulates the alpha for textured feel
  alpha *= 0.7 + 0.3 * noiseMix;

  // Color: warm green on lit side, cooler teal on shadow
  vec3 litColor = vec3(0.12, 0.50, 0.08);
  vec3 shadowColor = vec3(0.04, 0.25, 0.12);
  vec3 brightEdge = vec3(0.18, 0.65, 0.12);

  vec3 baseColor = mix(shadowColor, litColor, sunDot);
  vec3 color = mix(baseColor, brightEdge, pow(rim, 3.0));

  gl_FragColor = vec4(color, alpha);
}
```

- [ ] **Step 3: Rewrite inner haze fragment shader**

Rewrite `src/features/planet/shaders/inner-haze.frag.glsl`:

```glsl
uniform vec3 uSunDirection;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vPosition;

// noise3d.glsl will be prepended at import time

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 nPos = normalize(vPosition);
  float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);

  // Sun-aware: haze more visible on lit side
  float sunDot = max(dot(nPos, normalize(uSunDirection)), 0.0);
  float sunFactor = 0.3 + 0.7 * sunDot;

  // Noise wisps
  float wisps = snoise(nPos * 4.0 + vec3(uTime * 0.015, 0.0, 0.0)) * 0.5 + 0.5;
  float detail = snoise(nPos * 10.0 + vec3(0.0, uTime * 0.008, 0.0)) * 0.5 + 0.5;
  float noiseVal = wisps * 0.6 + detail * 0.4;

  // Thicker haze that extends further across the planet face
  float haze = smoothstep(0.25, 0.9, rim) * 0.10;
  haze += pow(rim, 2.5) * 0.18;
  haze += pow(rim, 5.0) * 0.12;

  float alpha = haze * sunFactor;
  alpha *= 0.6 + 0.4 * noiseVal;

  vec3 col = vec3(0.08, 0.35, 0.09);

  gl_FragColor = vec4(col, alpha);
}
```

- [ ] **Step 4: Verify shaders compile by running dev server**

Run: `npm run dev`
Expected: No shader compilation errors in the browser console. The atmosphere will look wrong at this point because TauCetiPlanet.tsx hasn't been updated to pass the new uniforms yet — that's Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/features/planet/shaders/atmosphere.vert.glsl src/features/planet/shaders/atmosphere.frag.glsl src/features/planet/shaders/inner-haze.frag.glsl
git commit -m "feat(planet): rewrite atmosphere shaders with noise texture and sun awareness"
```

---

### Task 3: Update TauCetiPlanet to wire up atmosphere uniforms and increase shell radii

**Files:**
- Modify: `src/features/planet/components/TauCetiPlanet.tsx`

**Reference files (read these first):**
- `src/features/planet/shaders/noise3d.glsl` — noise snippet to prepend to shader sources
- `src/features/planet/shaders/atmosphere.frag.glsl` — expects `uSunDirection`, `uTime` uniforms
- `src/features/planet/shaders/inner-haze.frag.glsl` — expects `uSunDirection`, `uTime` uniforms
- `src/features/planet/shaders/atmosphere.vert.glsl` — now passes `vPosition`

- [ ] **Step 1: Update TauCetiPlanet.tsx**

The key changes:
1. Import `noise3d.glsl` and prepend it to both atmosphere fragment shaders
2. Create shared atmosphere uniforms with `uSunDirection` and `uTime`
3. Update `uTime` in both atmosphere materials each frame
4. Increase outer sphere from 1.02 to 1.06 and inner sphere from 1.01 to 1.03
5. Use refs for both atmosphere materials to update time

Replace the full content of `src/features/planet/components/TauCetiPlanet.tsx`:

```tsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import vertexShader from '../shaders/planet.vert.glsl?raw'
import fragmentShader from '../shaders/planet.frag.glsl?raw'
import atmoVertShader from '../shaders/atmosphere.vert.glsl?raw'
import atmoFragShader from '../shaders/atmosphere.frag.glsl?raw'
import innerHazeFragShader from '../shaders/inner-haze.frag.glsl?raw'
import noise3d from '../shaders/noise3d.glsl?raw'
import { planetSettings } from '../lib/planet-store'

const SUN_DIRECTION = new THREE.Vector3(0.6, 0.3, 0.8).normalize()

// Prepend shared noise code to atmosphere fragment shaders
const atmoFragWithNoise = noise3d + '\n' + atmoFragShader
const innerHazeFragWithNoise = noise3d + '\n' + innerHazeFragShader

export default function TauCetiPlanet() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const outerAtmoRef = useRef<THREE.ShaderMaterial>(null)
  const innerAtmoRef = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWarpStrength: { value: planetSettings.warpStrength },
      uHeatAmount: { value: planetSettings.heatAmount },
      uPolarBias: { value: planetSettings.polarBias },
      uEmissionStrength: { value: planetSettings.emissionStrength },
      uSunDirection: { value: SUN_DIRECTION },
    }),
    []
  )

  const atmoUniforms = useMemo(
    () => ({
      uSunDirection: { value: SUN_DIRECTION },
      uTime: { value: 0 },
    }),
    []
  )

  const innerAtmoUniforms = useMemo(
    () => ({
      uSunDirection: { value: SUN_DIRECTION },
      uTime: { value: 0 },
    }),
    []
  )

  useFrame((_state, delta) => {
    if (!materialRef.current || !meshRef.current) return

    const u = materialRef.current.uniforms
    u.uTime.value += delta * 0.75
    u.uWarpStrength.value = planetSettings.warpStrength
    u.uHeatAmount.value = planetSettings.heatAmount
    u.uPolarBias.value = planetSettings.polarBias
    u.uEmissionStrength.value = planetSettings.emissionStrength

    // Sync time to atmosphere layers
    const t = u.uTime.value
    if (outerAtmoRef.current) outerAtmoRef.current.uniforms.uTime.value = t
    if (innerAtmoRef.current) innerAtmoRef.current.uniforms.uTime.value = t
  })

  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>
      {/* Outer atmosphere glow — thick, noise-textured, sun-aware */}
      <mesh>
        <sphereGeometry args={[1.06, 48, 48]} />
        <shaderMaterial
          ref={outerAtmoRef}
          uniforms={atmoUniforms}
          vertexShader={atmoVertShader}
          fragmentShader={atmoFragWithNoise}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {/* Inner atmospheric haze — textured wisps */}
      <mesh>
        <sphereGeometry args={[1.03, 48, 48]} />
        <shaderMaterial
          ref={innerAtmoRef}
          uniforms={innerAtmoUniforms}
          vertexShader={atmoVertShader}
          fragmentShader={innerHazeFragWithNoise}
          transparent
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Verify atmosphere renders in browser**

Run: `npm run dev`
Open the lost-in-space route. Verify:
- The atmosphere is visibly thicker than before
- The edge has a textured/noisy quality, not a clean geometric line
- The lit side (upper-right, matching sun direction) is brighter
- No shader compilation errors in console

- [ ] **Step 3: Commit**

```bash
git add src/features/planet/components/TauCetiPlanet.tsx
git commit -m "feat(planet): wire atmosphere uniforms, increase shell radii"
```

---

### Task 4: Add scene lighting to PlanetScene

**Files:**
- Modify: `src/features/planet/components/PlanetScene.tsx`

**Current state of PlanetScene.tsx** (after linter formatting):

```tsx
import { PerspectiveCamera } from "@react-three/drei";
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
    </>
  );
}
```

- [ ] **Step 1: Add lights to PlanetScene**

Add three lights after the `<Starfield />` and before the planet group. The sun direction is `(0.6, 0.3, 0.8)` normalized — position the directional light along that vector. The planet glow point light goes near the visible planet limb.

Add these elements after `<Starfield />`:

```tsx
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
```

- [ ] **Step 2: Verify lighting in browser**

Run: `npm run dev`
Open the lost-in-space route. Verify:
- The astronaut is now lit by the directional light (warm white from upper-right)
- There's a subtle green color spill from the planet glow point light
- The starfield and planet surface shader are not adversely affected (they use custom shaders that ignore scene lights)

- [ ] **Step 3: Commit**

```bash
git add src/features/planet/components/PlanetScene.tsx
git commit -m "feat(planet): add directional, ambient, and planet glow lights"
```

---

### Task 5: Add bloom post-processing

**Files:**
- Modify: `src/features/planet/components/PlanetScene.tsx`

**Reference:**
- `@react-three/postprocessing` is already installed (v3.0.4)
- `EffectComposer` and `Bloom` are the two imports needed
- Bloom goes inside the JSX, within the scene — it's per-scene, not global

- [ ] **Step 1: Add bloom to PlanetScene**

Add imports at top of `src/features/planet/components/PlanetScene.tsx`:

```tsx
import { EffectComposer, Bloom } from "@react-three/postprocessing";
```

Add the EffectComposer as the last child inside the fragment, after the FloatGroup closing tag:

```tsx
      {/* Bloom for atmospheric glow bleed */}
      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.4}
          radius={0.5}
        />
      </EffectComposer>
```

- [ ] **Step 2: Verify bloom in browser**

Run: `npm run dev`
Open the lost-in-space route. Verify:
- Bright atmosphere edges glow and bleed into space softly
- Planet surface bright spots have a subtle glow
- The effect is subtle, not overwhelming — adjust `intensity` and `luminanceThreshold` if needed
- Performance is acceptable (bloom is a full-screen pass)

- [ ] **Step 3: Commit**

```bash
git add src/features/planet/components/PlanetScene.tsx
git commit -m "feat(planet): add bloom post-processing for atmospheric glow"
```
