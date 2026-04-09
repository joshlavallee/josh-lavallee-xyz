# Adrian Procedural Shader Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current multi-layer marble planet shader with Adrian's domain-warped procedural shader, add uniform-based tunability, wire into the controls panel, and use hybrid lighting.

**Architecture:** Direct replacement of 5 files in `src/features/planet/`. The fragment shader becomes Adrian's procedural approach with added uniforms for real-time control. The vertex shader adds world-space position for correct view direction. The store and controls panel are rewritten to expose the new parameter set.

**Tech Stack:** GLSL (fragment/vertex shaders), React, Three.js, R3F, TypeScript, Tailwind CSS

**Note:** This is a visual/shader project with no test suite. Verification is done by starting the dev server and visually confirming the shader compiles and renders correctly.

---

### Task 1: Replace planet-store.ts

**Files:**
- Modify: `src/features/planet/lib/planet-store.ts`

- [ ] **Step 1: Replace the full file contents**

```typescript
export interface PlanetSettings {
  rotationSpeed: number
  warpStrength: number
  heatAmount: number
  polarBias: number
  bandingStrength: number
  emissionStrength: number
  rimPower: number
}

export const planetSettings: PlanetSettings = {
  rotationSpeed: 0.005,
  warpStrength: 3.5,
  heatAmount: 0.5,
  polarBias: 0.15,
  bandingStrength: 0.04,
  emissionStrength: 0.12,
  rimPower: 3.0,
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/lib/planet-store.ts
git commit -m "refactor(planet): replace store with adrian shader parameters"
```

---

### Task 2: Replace planet.vert.glsl

**Files:**
- Modify: `src/features/planet/shaders/planet.vert.glsl`

The current vertex shader passes object-space `vPosition` and eye-space `vEyePos`. Adrian's shader needs world-space position for the `cameraPosition - vPosition` view direction calculation. We pass both object-space (for noise sampling, so patterns are consistent regardless of scene composition) and world-space (for view direction).

- [ ] **Step 1: Replace the full file contents**

```glsl
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

Key changes from current:
- `vPosition` is now object-space `position` (was also object-space but using different var name style)
- Added `vWorldPosition` for correct view direction when planet is offset in the scene (PlanetScene positions it at `[-0.7, -0.5, 0]`)
- Removed `vEyePos` (Adrian's shader uses world-space view direction instead)

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/shaders/planet.vert.glsl
git commit -m "refactor(planet): update vertex shader for adrian's world-space approach"
```

---

### Task 3: Replace planet.frag.glsl

**Files:**
- Modify: `src/features/planet/shaders/planet.frag.glsl`

This is the core change. Replace the entire 314-line current shader with Adrian's procedural shader, modified to add uniforms for tunability and hybrid lighting (self-emission + fresnel rim).

- [ ] **Step 1: Replace the full file contents**

```glsl
uniform float uTime;
uniform float uWarpStrength;
uniform float uHeatAmount;
uniform float uPolarBias;
uniform float uBandingStrength;
uniform float uEmissionStrength;
uniform float uRimPower;
uniform vec3 uSunDirection;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

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

// ─── FBM with variable octaves ───

float fbm(vec3 p, int octaves) {
  float val = 0.0;
  float amp = 1.0;
  float freq = 1.0;
  float total = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    val += snoise(p * freq) * amp;
    total += amp;
    amp *= 0.45;
    freq *= 2.1;
  }
  return val / total;
}

// ─── Domain-warped FBM ───

float warpedFbm(vec3 p, float t) {
  float slow = t * 0.0004;
  float qx = fbm(p + vec3(0.0, 0.0, slow), 3);
  float qy = fbm(p + vec3(5.2, 1.3, slow * 0.7), 3);
  float qz = fbm(p + vec3(2.1, 7.8, slow * 0.9), 3);
  vec3 q = vec3(qx, qy, qz);
  float warpQ = uWarpStrength * 0.86;
  float rx = fbm(p + warpQ * q + vec3(1.7, 9.2, slow * 0.5), 3);
  float ry = fbm(p + warpQ * q + vec3(8.3, 2.8, slow * 0.8), 3);
  float rz = fbm(p + warpQ * q + vec3(3.7, 5.1, slow * 0.6), 3);
  vec3 r = vec3(rx, ry, rz);
  return fbm(p + uWarpStrength * r + vec3(0.0, 0.0, slow * 0.3), 3);
}

// ─── Main ───

void main() {
  vec3 nPos = normalize(vPosition);
  vec3 pos = nPos * 0.32;

  // === SWIRL PATTERN ===
  float pattern = warpedFbm(pos, uTime);
  float t = clamp(pattern * 0.5 + 0.5, 0.0, 1.0);

  // Atmospheric depth — second layer at different scale
  float depth = warpedFbm(pos * 1.3 + vec3(7.0, 3.0, 1.0), uTime * 0.7);
  float d = clamp(depth * 0.5 + 0.5, 0.0, 1.0);
  t = t * 0.7 + d * 0.3;
  t = smoothstep(0.15, 0.88, t);
  t = pow(t, 1.5);

  // === HEAT MAP — patches competing with green for space ===
  float hSlow = uTime * 0.00025;
  float h1 = fbm(nPos * 0.8 + vec3(20.0, 10.0, hSlow), 3);
  float h2 = fbm(nPos * 1.1 + vec3(8.0, 15.0, hSlow * 0.5), 3);
  float h3 = fbm(nPos * 1.8 + vec3(14.0, 3.0, hSlow * 0.8), 3);
  float latitude = abs(nPos.y);
  float polarBiasVal = smoothstep(0.2, 0.7, latitude) * uPolarBias;
  float patch1 = smoothstep(0.66, 0.78, h1 * 0.5 + 0.5 + polarBiasVal);
  float patch2 = smoothstep(0.70, 0.82, h2 * 0.5 + 0.5 + polarBiasVal * 0.5);
  float patch3 = smoothstep(0.72, 0.83, h3 * 0.5 + 0.5);
  float orangeAmount = clamp(max(patch1 * 0.85, max(patch2 * 0.7, patch3 * 0.5)), 0.0, 1.0);
  orangeAmount *= uHeatAmount * 2.0;
  orangeAmount = clamp(orangeAmount, 0.0, 1.0);

  // === GREEN RAMP ===
  vec3 gAbyss  = vec3(0.008, 0.032, 0.018);
  vec3 gDeep   = vec3(0.015, 0.06, 0.028);
  vec3 gDark   = vec3(0.03, 0.12, 0.04);
  vec3 gForest = vec3(0.07, 0.24, 0.05);
  vec3 gMid    = vec3(0.14, 0.42, 0.065);
  vec3 gBright = vec3(0.24, 0.60, 0.09);
  vec3 gLime   = vec3(0.38, 0.74, 0.13);
  vec3 gYellow = vec3(0.52, 0.82, 0.19);

  vec3 greenColor;
  if (t < 0.06) greenColor = mix(gAbyss, gDeep, t / 0.06);
  else if (t < 0.14) greenColor = mix(gDeep, gDark, (t - 0.06) / 0.08);
  else if (t < 0.26) greenColor = mix(gDark, gForest, (t - 0.14) / 0.12);
  else if (t < 0.40) greenColor = mix(gForest, gMid, (t - 0.26) / 0.14);
  else if (t < 0.56) greenColor = mix(gMid, gBright, (t - 0.40) / 0.16);
  else if (t < 0.74) greenColor = mix(gBright, gLime, (t - 0.56) / 0.18);
  else greenColor = mix(gLime, gYellow, (t - 0.74) / 0.26);

  // === ORANGE RAMP ===
  vec3 oBrown  = vec3(0.05, 0.02, 0.008);
  vec3 oDark   = vec3(0.18, 0.07, 0.015);
  vec3 oDeep   = vec3(0.38, 0.15, 0.022);
  vec3 oMid    = vec3(0.62, 0.28, 0.035);
  vec3 oBright = vec3(0.80, 0.42, 0.05);
  vec3 oHot    = vec3(0.90, 0.54, 0.07);
  vec3 oGlow   = vec3(0.96, 0.65, 0.10);

  vec3 orangeColor;
  if (t < 0.06) orangeColor = mix(oBrown, oDark, t / 0.06);
  else if (t < 0.14) orangeColor = mix(oDark, oDeep, (t - 0.06) / 0.08);
  else if (t < 0.26) orangeColor = mix(oDeep, oMid, (t - 0.14) / 0.12);
  else if (t < 0.40) orangeColor = mix(oMid, oBright, (t - 0.26) / 0.14);
  else if (t < 0.56) orangeColor = mix(oBright, oHot, (t - 0.40) / 0.16);
  else if (t < 0.74) orangeColor = mix(oHot, oGlow, (t - 0.56) / 0.18);
  else orangeColor = mix(oGlow, oGlow * 1.1, (t - 0.74) / 0.26);

  // === BLEND ===
  vec3 color = mix(greenColor, orangeColor, orangeAmount);

  // === GAS GIANT BANDING ===
  float lat = asin(nPos.y);
  float band = sin(lat * 8.0) * uBandingStrength + sin(lat * 14.0 + 2.0) * uBandingStrength * 0.5;
  color *= 1.0 + band;

  // === DIRECTIONAL SUNLIGHT ===
  vec3 sunDir = normalize(uSunDirection);
  float sunDot = max(dot(nPos, sunDir), 0.0);
  float sunlight = smoothstep(0.0, 1.0, sunDot);
  color *= 0.65 + 0.40 * sunlight;
  color = mix(color, color * vec3(0.9, 0.95, 1.05), (1.0 - sunlight) * 0.15);

  // === ATMOSPHERIC EFFECTS ===
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float viewAngle = max(dot(nPos, viewDir), 0.0);

  // Limb darkening
  float limbDark = smoothstep(0.0, 0.45, viewAngle);
  color *= 0.35 + 0.65 * limbDark;

  // Atmospheric haze at limb
  float fresnel = pow(1.0 - viewAngle, 3.0);
  vec3 hazeColor = vec3(0.06, 0.30, 0.10);
  color = mix(color, hazeColor, fresnel * 0.45);

  // === SELF-EMISSION (hybrid: ported from current shader) ===
  color += color * t * uEmissionStrength;

  // === FRESNEL RIM (hybrid: ported from current shader) ===
  float rimFresnel = pow(1.0 - viewAngle, uRimPower);
  vec3 rimColor = vec3(0.40, 1.0, 0.13);
  color += rimColor * rimFresnel * 0.4;

  gl_FragColor = vec4(color, 1.0);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/shaders/planet.frag.glsl
git commit -m "feat(planet): replace shader with adrian procedural + hybrid lighting"
```

---

### Task 4: Fix atmosphere emission multiplier

**Files:**
- Modify: `src/features/planet/shaders/atmosphere.frag.glsl`

The atmosphere shader reads `uEmissionStrength` from the same store. The old default was `3.0` with multiplier `0.08` (effective: `0.24`). The new default is `0.12`, so adjust the multiplier to `2.0` to preserve the same effective value at default (`0.12 * 2.0 = 0.24`).

- [ ] **Step 1: Change the emission multiplier on line 22**

Change line 22 from:
```glsl
  float emission = uEmissionStrength * 0.08;
```
to:
```glsl
  float emission = uEmissionStrength * 2.0;
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/shaders/atmosphere.frag.glsl
git commit -m "fix(planet): adjust atmosphere emission multiplier for new store range"
```

---

### Task 5: Rewire TauCetiPlanet.tsx

**Files:**
- Modify: `src/features/planet/components/TauCetiPlanet.tsx`

Replace the uniform map and `useFrame` sync to match the new 7-parameter store. Keep `uSunDirection` as a component-level constant.

- [ ] **Step 1: Replace the full file contents**

```tsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import vertexShader from '../shaders/planet.vert.glsl?raw'
import fragmentShader from '../shaders/planet.frag.glsl?raw'
import atmoVertShader from '../shaders/atmosphere.vert.glsl?raw'
import atmoFragShader from '../shaders/atmosphere.frag.glsl?raw'
import { planetSettings } from '../lib/planet-store'

const SUN_DIRECTION = new THREE.Vector3(0.6, 0.3, 0.8).normalize()

export default function TauCetiPlanet() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWarpStrength: { value: planetSettings.warpStrength },
      uHeatAmount: { value: planetSettings.heatAmount },
      uPolarBias: { value: planetSettings.polarBias },
      uBandingStrength: { value: planetSettings.bandingStrength },
      uEmissionStrength: { value: planetSettings.emissionStrength },
      uRimPower: { value: planetSettings.rimPower },
      uSunDirection: { value: SUN_DIRECTION },
    }),
    []
  )

  const atmoUniforms = useMemo(
    () => ({
      uSunDirection: { value: SUN_DIRECTION },
      uEmissionStrength: { value: planetSettings.emissionStrength },
    }),
    []
  )

  useFrame((_state, delta) => {
    if (!materialRef.current || !meshRef.current) return

    const u = materialRef.current.uniforms

    u.uTime.value += delta
    u.uWarpStrength.value = planetSettings.warpStrength
    u.uHeatAmount.value = planetSettings.heatAmount
    u.uPolarBias.value = planetSettings.polarBias
    u.uBandingStrength.value = planetSettings.bandingStrength
    u.uEmissionStrength.value = planetSettings.emissionStrength
    u.uRimPower.value = planetSettings.rimPower

    meshRef.current.rotation.y += delta * planetSettings.rotationSpeed
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>
      {/* Atmosphere glow: thin shell, additive, FrontSide so it renders outside the planet */}
      <mesh>
        <sphereGeometry args={[1.008, 48, 48]} />
        <shaderMaterial
          uniforms={atmoUniforms}
          vertexShader={atmoVertShader}
          fragmentShader={atmoFragShader}
          transparent
          side={THREE.FrontSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
```

Key changes:
- `SUN_DIRECTION` uses `(0.6, 0.3, 0.8)` to match Adrian's hardcoded direction (was `(1.0, 1.0, 0.5)`)
- Uniform map replaced: 10 old uniforms → 8 new (`uTime` + 7 settings + `uSunDirection`)
- `useFrame` syncs the 6 mutable settings (not `uTime` which increments, not `uSunDirection` which is constant)

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/components/TauCetiPlanet.tsx
git commit -m "refactor(planet): rewire component uniforms for adrian shader"
```

---

### Task 6: Update PlanetControls.tsx

**Files:**
- Modify: `src/features/planet/components/PlanetControls.tsx`

Replace the `SLIDER_GROUPS` array with 4 new groups matching the new store parameters. The component structure, styling, and interaction logic stay the same — only the data changes.

- [ ] **Step 1: Replace the SLIDER_GROUPS constant (lines 21–44)**

Replace from `const SLIDER_GROUPS` through its closing `]` with:

```typescript
const SLIDER_GROUPS: SliderGroup[] = [
  {
    label: 'Flow & Turbulence',
    sliders: [
      { key: 'warpStrength', label: 'Warp Strength', min: 0.5, max: 6.0, step: 0.1, labelLow: 'Gentle', labelHigh: 'Chaotic' },
    ],
  },
  {
    label: 'Heat Regions',
    sliders: [
      { key: 'heatAmount', label: 'Heat Amount', min: 0.0, max: 1.0, step: 0.01, labelLow: 'None', labelHigh: 'Dominant' },
      { key: 'polarBias', label: 'Polar Bias', min: 0.0, max: 0.5, step: 0.01, labelLow: 'Uniform', labelHigh: 'Polar' },
    ],
  },
  {
    label: 'Atmosphere',
    sliders: [
      { key: 'bandingStrength', label: 'Banding', min: 0.0, max: 0.15, step: 0.005, labelLow: 'None', labelHigh: 'Banded' },
      { key: 'emissionStrength', label: 'Emission', min: 0.0, max: 0.5, step: 0.01, labelLow: 'Dark', labelHigh: 'Glowing' },
      { key: 'rimPower', label: 'Rim Power', min: 1.0, max: 6.0, step: 0.1, labelLow: 'Soft', labelHigh: 'Sharp' },
    ],
  },
  {
    label: 'Scene',
    sliders: [
      { key: 'rotationSpeed', label: 'Rotation Speed', min: 0.0, max: 1.0, step: 0.01, labelLow: 'Still', labelHigh: 'Fast' },
    ],
  },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/components/PlanetControls.tsx
git commit -m "refactor(planet): update controls for adrian shader parameters"
```

---

### Task 7: Start dev server and verify

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open browser and navigate to `/lost-in-space`**

Verify:
- Planet renders without shader compilation errors (no black sphere, no console errors)
- Green/orange gas patterns are visible and animated
- Heat patches appear as distinct orange regions
- Gas giant banding subtly visible
- Atmospheric glow shell renders around the planet
- Astronaut silhouette is still visible

- [ ] **Step 3: Test each control slider**

Open the control panel (globe icon, bottom-right) and verify each slider has a visible effect:
- **Warp Strength**: low = smooth flowing gas, high = more turbulent/chaotic
- **Heat Amount**: 0 = all green, 1 = lots of orange patches
- **Polar Bias**: 0 = heat evenly distributed, 0.5 = concentrated near poles
- **Banding**: 0 = no bands, 0.15 = visible latitude bands
- **Emission**: 0 = dark planet, 0.5 = strong inner glow
- **Rim Power**: 1 = wide soft rim, 6 = thin sharp rim
- **Rotation Speed**: 0 = still, 1 = fast spin

- [ ] **Step 4: Commit all work if any final tweaks were needed**

```bash
git add -A
git commit -m "feat(planet): complete adrian shader integration"
```
