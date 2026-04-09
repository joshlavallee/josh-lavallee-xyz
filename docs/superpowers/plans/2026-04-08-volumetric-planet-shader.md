# Volumetric Planet Shader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the surface-level FBM planet shader with a volumetric raymarched atmosphere featuring curl noise vortices, emission-based self-glow, and a wide green-to-amber color ramp matching the Project Hail Mary film reference.

**Architecture:** Fragment shader marches rays through a thin atmospheric shell above the sphere surface. Each step samples curl-noise-displaced FBM for density, maps to a wide color ramp, and composites front-to-back with emission. Vertex shader adds eye-space position for view angle correction. Controls panel expands from 3 to 10 grouped sliders.

**Tech Stack:** GLSL ES 1.0 (WebGL), React Three Fiber, Three.js ShaderMaterial, TypeScript, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-08-volumetric-planet-shader-design.md`

---

### Task 1: Update Planet Settings Store

**Files:**
- Modify: `src/features/planet/lib/planet-store.ts`

- [ ] **Step 1: Replace the settings interface and defaults**

Replace the entire file with the expanded settings:

```typescript
export interface PlanetSettings {
  rotationSpeed: number
  swirlIntensity: number
  amberIntensity: number
  raySteps: number
  shellThickness: number
  densityScale: number
  curlScale: number
  curlStrength: number
  emissionStrength: number
  contrast: number
}

export const planetSettings: PlanetSettings = {
  rotationSpeed: 0.04,
  swirlIntensity: 1.8,
  amberIntensity: 0.5,
  raySteps: 12,
  shellThickness: 0.2,
  densityScale: 2.0,
  curlScale: 1.5,
  curlStrength: 1.2,
  emissionStrength: 1.5,
  contrast: 1.5,
}
```

Note: `orangeIntensity` is renamed to `amberIntensity` with a new default of 0.5 (was 0.3).

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: Type errors in `TauCetiPlanet.tsx` and `PlanetControls.tsx` referencing the old `orangeIntensity` field. These are expected and will be fixed in Tasks 4 and 5.

- [ ] **Step 3: Commit**

```bash
git add src/features/planet/lib/planet-store.ts
git commit -m "feat(planet): expand settings store for volumetric shader"
```

---

### Task 2: Update Vertex Shader

**Files:**
- Modify: `src/features/planet/shaders/planet.vert.glsl`

- [ ] **Step 1: Add vEyePos varying for raymarching view angle**

Replace the entire vertex shader:

```glsl
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vEyePos;

void main() {
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);
  vEyePos = (modelViewMatrix * vec4(position, 1.0)).xyz;

  gl_Position = projectionMatrix * vec4(vEyePos, 1.0);
}
```

Changes from current:
- Added `vEyePos` varying: the vertex position in eye/camera space, needed to compute the view angle for raymarching path length correction.
- `gl_Position` now computed from `vEyePos` instead of a separate `modelViewMatrix` multiply (same result, avoids redundant computation).

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/shaders/planet.vert.glsl
git commit -m "feat(planet): add eye-space position varying to vertex shader"
```

---

### Task 3: Rewrite Fragment Shader

**Files:**
- Modify: `src/features/planet/shaders/planet.frag.glsl`

This is the core of the project. Replace the entire fragment shader with the volumetric raymarching implementation.

- [ ] **Step 1: Write the complete new fragment shader**

Replace the entire file with:

```glsl
uniform float uTime;
uniform float uSwirlIntensity;
uniform float uAmberIntensity;
uniform vec3 uSunDirection;
uniform float uRaySteps;
uniform float uShellThickness;
uniform float uDensityScale;
uniform float uCurlScale;
uniform float uCurlStrength;
uniform float uEmissionStrength;
uniform float uContrast;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vEyePos;

// ─── 3D Simplex Noise (Gustavson / Ashima Arts, MIT) ───

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise3D(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
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
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ─── Rotation matrix for vortex shedding per FBM octave ───

mat3 rotationMatrix = mat3(
   0.00,  0.80,  0.60,
  -0.80,  0.36, -0.48,
  -0.60, -0.48,  0.64
);

// ─── FBM with rotation per octave ───

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 6; i++) {
    value += amplitude * snoise3D(p);
    p = rotationMatrix * p * 2.0 + vec3(1.7, 9.2, 3.4);
    amplitude *= 0.5;
  }

  return value;
}

// ─── Curl Noise for vortex structure ───
// Computes curl of a 3-component potential field using finite differences.
// 6 noise evaluations per call. Produces divergence-free flow → spiral vortices.

vec3 curlNoise(vec3 p) {
  float e = 0.1;

  float n1 = snoise3D(p + vec3(0.0, e, -e));
  float n2 = snoise3D(p + vec3(-e, 0.0, e));
  float n3 = snoise3D(p + vec3(e, -e, 0.0));
  float n4 = snoise3D(p + vec3(0.0, -e, e));
  float n5 = snoise3D(p + vec3(e, 0.0, -e));
  float n6 = snoise3D(p + vec3(-e, e, 0.0));

  return vec3(n1 - n4, n2 - n5, n3 - n6) / (2.0 * e);
}

// ─── Domain Warping (single q layer, simplified for raymarching perf) ───

float warpedNoise(vec3 p, float warpStrength, float time) {
  vec3 q = vec3(
    fbm(p + vec3(0.0, 0.0, 0.0) + time * 0.02),
    fbm(p + vec3(5.2, 1.3, 2.8) + time * 0.015),
    fbm(p + vec3(1.7, 9.2, 4.6) + time * 0.018)
  );

  return fbm(p + warpStrength * q);
}

// ─── Atmosphere color ramp ───
// Wide ramp from near-black voids through vivid greens to amber storm cores.
// amberBias controls how early amber appears in the density range.

vec3 atmosphereColor(float density, float amberBias) {
  float n = clamp(density, 0.0, 1.0);

  vec3 voidBlack   = vec3(0.02, 0.04, 0.02);
  vec3 deepForest  = vec3(0.04, 0.16, 0.02);
  vec3 vividGreen  = vec3(0.18, 0.55, 0.05);
  vec3 chartreuse  = vec3(0.55, 0.84, 0.02);
  vec3 neonLime    = vec3(0.75, 1.0, 0.0);
  vec3 amber       = vec3(0.80, 0.40, 0.0);
  vec3 hotOrange   = vec3(0.94, 0.56, 0.0);

  vec3 color = mix(voidBlack, deepForest, smoothstep(0.0, 0.2, n));
  color = mix(color, vividGreen, smoothstep(0.15, 0.4, n));
  color = mix(color, chartreuse, smoothstep(0.35, 0.6, n));
  color = mix(color, neonLime, smoothstep(0.55, 0.8, n));

  float amberStart = 0.75 - amberBias * 0.3;
  float amberMix = smoothstep(amberStart, amberStart + 0.15, n);
  vec3 hotColor = mix(amber, hotOrange, smoothstep(amberStart + 0.1, 1.0, n));
  color = mix(color, hotColor, amberMix);

  return color;
}

// ─── Sample atmosphere at a point ───
// Returns vec4(color.rgb, density). Called once per raymarch step.

vec4 sampleAtmosphere(vec3 p, float time) {
  vec3 curl = curlNoise(p * uCurlScale + time * 0.3);
  vec3 displaced = p + curl * uCurlStrength;

  float density = warpedNoise(displaced, uSwirlIntensity, time);
  density = clamp(density * 0.5 + 0.5, 0.0, 1.0);
  density = pow(density, uContrast);

  vec3 color = atmosphereColor(density, uAmberIntensity);
  return vec4(color, density);
}

// ─── Main: volumetric raymarching ───

void main() {
  vec3 objNormal = normalize(vPosition);
  vec3 eyeViewDir = normalize(vEyePos);
  float slowTime = uTime * 0.02;

  // Path length correction: rays at grazing angles travel through more atmosphere
  float viewDotNormal = max(dot(-eyeViewDir, vNormal), 0.1);
  float totalDist = uShellThickness / viewDotNormal;
  int numSteps = int(uRaySteps + 0.5);
  float stepSize = totalDist / uRaySteps;

  // Lighting (computed once, same for all steps since shell is thin)
  float diffuse = max(dot(vNormal, normalize(uSunDirection)), 0.0);
  float ambient = 0.08;
  float lighting = ambient + diffuse * 0.92;

  // Raymarch through atmosphere shell
  vec3 accColor = vec3(0.0);
  float accAlpha = 0.0;

  for (int i = 0; i < 24; i++) {
    if (i >= numSteps) break;
    if (accAlpha > 0.95) break;

    float t = (float(i) + 0.5) / uRaySteps;
    vec3 samplePos = (vPosition + objNormal * t * totalDist) * 1.6;

    vec4 atmo = sampleAtmosphere(samplePos, slowTime);
    vec3 color = atmo.rgb;
    float density = atmo.a;

    // Lit component + self-luminous emission
    vec3 litColor = color * lighting;
    vec3 emissive = color * uEmissionStrength * density;
    vec3 stepColor = litColor + emissive;

    // Front-to-back compositing
    float alpha = density * stepSize * uDensityScale;
    accColor += (1.0 - accAlpha) * stepColor * alpha;
    accAlpha += (1.0 - accAlpha) * alpha;
  }

  // Fresnel rim: neon green glow at planet edge
  float fresnel = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
  fresnel = pow(fresnel, 2.5);
  vec3 rimColor = vec3(0.5, 0.9, 0.0) * fresnel * 0.8;
  accColor += rimColor;

  // Gamma correction
  accColor = pow(accColor, vec3(0.92));

  gl_FragColor = vec4(accColor, 1.0);
}
```

Key changes from the old shader:
- Added curl noise function (6 `snoise3D` calls) for spiral vortex structure
- Simplified domain warping to single q layer (removed r layer) since curl noise handles vortex structure
- New wide color ramp: near-black voids → vivid greens → neon lime → amber/orange at high density
- `sampleAtmosphere()` encapsulates curl displacement + warped noise + color mapping
- Raymarching loop in `main()`: marches through atmospheric shell with front-to-back compositing
- Emission model: `litColor + emissive` per step instead of just `color * lighting`
- Ambient reduced from 0.25 to 0.08 (emission compensates on dark side)
- Path length correction using `vEyePos` for natural limb thickening

- [ ] **Step 2: Verify the shader parses correctly with the dev server**

Run: `npx vite dev 2>&1 | head -5`

Open `http://localhost:5173/placeholder` in a browser. The planet should render (may look wrong if uniforms aren't wired up yet, but no shader compilation errors in the browser console).

If there are GLSL compilation errors, check the browser console for the specific line number and fix.

- [ ] **Step 3: Commit**

```bash
git add src/features/planet/shaders/planet.frag.glsl
git commit -m "feat(planet): rewrite fragment shader with volumetric raymarching"
```

---

### Task 4: Wire Up New Uniforms in TauCetiPlanet

**Files:**
- Modify: `src/features/planet/components/TauCetiPlanet.tsx`

- [ ] **Step 1: Update the component with all new uniforms**

Replace the entire file with:

```tsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import vertexShader from '../shaders/planet.vert.glsl?raw'
import fragmentShader from '../shaders/planet.frag.glsl?raw'
import { planetSettings } from '../lib/planet-store'

const SUN_DIRECTION = new THREE.Vector3(1.0, 1.0, 0.5).normalize()

export default function TauCetiPlanet() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSwirlIntensity: { value: planetSettings.swirlIntensity },
      uAmberIntensity: { value: planetSettings.amberIntensity },
      uSunDirection: { value: SUN_DIRECTION },
      uRaySteps: { value: planetSettings.raySteps },
      uShellThickness: { value: planetSettings.shellThickness },
      uDensityScale: { value: planetSettings.densityScale },
      uCurlScale: { value: planetSettings.curlScale },
      uCurlStrength: { value: planetSettings.curlStrength },
      uEmissionStrength: { value: planetSettings.emissionStrength },
      uContrast: { value: planetSettings.contrast },
    }),
    []
  )

  useFrame((_state, delta) => {
    if (!materialRef.current || !meshRef.current) return

    const u = materialRef.current.uniforms

    u.uTime.value += delta
    u.uSwirlIntensity.value = planetSettings.swirlIntensity
    u.uAmberIntensity.value = planetSettings.amberIntensity
    u.uRaySteps.value = planetSettings.raySteps
    u.uShellThickness.value = planetSettings.shellThickness
    u.uDensityScale.value = planetSettings.densityScale
    u.uCurlScale.value = planetSettings.curlScale
    u.uCurlStrength.value = planetSettings.curlStrength
    u.uEmissionStrength.value = planetSettings.emissionStrength
    u.uContrast.value = planetSettings.contrast

    meshRef.current.rotation.y += delta * planetSettings.rotationSpeed
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  )
}
```

Changes: `uOrangeIntensity` renamed to `uAmberIntensity`, added 7 new uniform bindings (`uRaySteps`, `uShellThickness`, `uDensityScale`, `uCurlScale`, `uCurlStrength`, `uEmissionStrength`, `uContrast`), all synced from `planetSettings` each frame.

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/components/TauCetiPlanet.tsx
git commit -m "feat(planet): wire new volumetric shader uniforms"
```

---

### Task 5: Expand PlanetControls with Grouped Sliders

**Files:**
- Modify: `src/features/planet/components/PlanetControls.tsx`

- [ ] **Step 1: Replace with grouped slider panel**

Replace the entire file with:

```tsx
import { useState } from 'react'
import { Globe, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { planetSettings, type PlanetSettings } from '../lib/planet-store'

interface SliderConfig {
  key: keyof PlanetSettings
  label: string
  min: number
  max: number
  step: number
  labelLow: string
  labelHigh: string
}

interface SliderGroup {
  label: string
  sliders: SliderConfig[]
}

const SLIDER_GROUPS: SliderGroup[] = [
  {
    label: 'Raymarching',
    sliders: [
      { key: 'raySteps', label: 'Ray Steps', min: 4, max: 24, step: 1, labelLow: 'Fast', labelHigh: 'Quality' },
      { key: 'shellThickness', label: 'Shell Thickness', min: 0.05, max: 0.5, step: 0.01, labelLow: 'Thin', labelHigh: 'Deep' },
      { key: 'densityScale', label: 'Density Scale', min: 0.5, max: 5.0, step: 0.1, labelLow: 'Transparent', labelHigh: 'Opaque' },
    ],
  },
  {
    label: 'Curl Noise / Vortex',
    sliders: [
      { key: 'curlScale', label: 'Curl Scale', min: 0.5, max: 4.0, step: 0.1, labelLow: 'Large storms', labelHigh: 'Tight spirals' },
      { key: 'curlStrength', label: 'Curl Strength', min: 0.0, max: 3.0, step: 0.1, labelLow: 'Calm', labelHigh: 'Chaotic' },
      { key: 'swirlIntensity', label: 'Swirl Intensity', min: 0.5, max: 4.0, step: 0.1, labelLow: 'Smooth', labelHigh: 'Turbulent' },
    ],
  },
  {
    label: 'Color & Emission',
    sliders: [
      { key: 'emissionStrength', label: 'Emission Strength', min: 0.0, max: 3.0, step: 0.1, labelLow: 'Dark', labelHigh: 'Glowing' },
      { key: 'amberIntensity', label: 'Amber Intensity', min: 0.0, max: 1.0, step: 0.01, labelLow: 'Subtle', labelHigh: 'Dominant' },
      { key: 'contrast', label: 'Contrast', min: 0.5, max: 3.0, step: 0.1, labelLow: 'Flat', labelHigh: 'Punchy' },
    ],
  },
  {
    label: 'Scene',
    sliders: [
      { key: 'rotationSpeed', label: 'Rotation Speed', min: 0.0, max: 1.0, step: 0.01, labelLow: 'Still', labelHigh: 'Fast' },
    ],
  },
]

export default function PlanetControls() {
  const [isOpen, setIsOpen] = useState(false)
  const [values, setValues] = useState<PlanetSettings>({ ...planetSettings })
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  function updateValue(key: keyof PlanetSettings, value: number) {
    planetSettings[key] = value
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={cn(
          'surface flex flex-col-reverse overflow-hidden transition-all duration-300 ease-out',
          isOpen ? 'w-64' : 'w-[52px]'
        )}
        style={{ maxHeight: isOpen ? '80vh' : '52px' }}
      >
        {/* Toggle button row (at bottom due to flex-col-reverse) */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'flex h-[52px] shrink-0 items-center justify-center cursor-pointer text-foreground/60 transition-all hover:text-foreground',
              isOpen ? 'w-[52px]' : 'w-full'
            )}
            aria-label={isOpen ? 'Close planet controls' : 'Open planet controls'}
          >
            <Globe className={cn('size-5 transition-transform duration-300', isOpen && 'rotate-90')} />
          </button>
        </div>

        {/* Panel content (above button due to flex-col-reverse) */}
        <div
          className={cn(
            'overflow-y-auto px-3 pt-3 transition-all duration-200',
            isOpen
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-2 opacity-0'
          )}
          style={{ transitionDelay: isOpen ? '100ms' : '0ms' }}
        >
          <span className="mb-3 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Planet
          </span>

          <div className="flex flex-col gap-1">
            {SLIDER_GROUPS.map((group) => (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full cursor-pointer items-center justify-between py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground"
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      'size-3 transition-transform duration-200',
                      collapsedGroups[group.label] && '-rotate-90'
                    )}
                  />
                </button>

                <div
                  className={cn(
                    'flex flex-col gap-2.5 overflow-hidden transition-all duration-200',
                    collapsedGroups[group.label] ? 'max-h-0 opacity-0' : 'max-h-96 pb-2 opacity-100'
                  )}
                >
                  {group.sliders.map((config) => (
                    <div key={config.key}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{config.label}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {values[config.key].toFixed(config.step >= 1 ? 0 : 2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        value={values[config.key]}
                        onChange={(e) => updateValue(config.key, parseFloat(e.target.value))}
                        className="surface-input h-1 w-full cursor-pointer appearance-none [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded [&::-moz-range-track]:bg-muted [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                      />
                      <div className="mt-0.5 flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground/50">{config.labelLow}</span>
                        <span className="text-[9px] text-muted-foreground/50">{config.labelHigh}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

Changes from current:
- `SLIDER_CONFIGS` flat array → `SLIDER_GROUPS` with collapsible sections
- Added `ChevronDown` icon import for group toggle indicators
- `collapsedGroups` state tracks which groups are collapsed
- Panel width increased from `w-60` to `w-64` for the extra labels
- `maxHeight` increased from `600px` to `80vh` to accommodate 10 sliders
- Added `overflow-y-auto` on the content area for scrolling when panel is tall
- `Ray Steps` slider displays integer values (`.toFixed(0)`)
- All 10 slider configs with descriptive low/high labels

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`

Expected: No errors. All settings keys now match between the store, component, and controls.

- [ ] **Step 3: Commit**

```bash
git add src/features/planet/components/PlanetControls.tsx
git commit -m "feat(planet): expand controls panel with grouped sliders"
```

---

### Task 6: Visual Verification

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

Open `http://localhost:5173/placeholder` in a browser.

- [ ] **Step 2: Verify the planet renders**

Check:
- No errors in the browser console (especially GLSL compilation errors)
- The planet is visible as a sphere with swirling green/amber atmosphere
- The atmosphere has visible depth (edges should look thicker than center)
- Rotation works when adjusting the Rotation Speed slider

- [ ] **Step 3: Verify all controls work**

Test each slider group:

**Raymarching:**
- Ray Steps: lowering to 4 should show visible banding/stepping artifacts. 12+ should look smooth.
- Shell Thickness: increasing should make the atmosphere look deeper/thicker, especially at the edges.
- Density Scale: increasing should make the planet more opaque/bright. Decreasing should make it more transparent/dark.

**Curl Noise / Vortex:**
- Curl Scale: low values (0.5) should produce large, sweeping storms. High values (4.0) should produce tight spirals.
- Curl Strength: 0.0 should look similar to the old shader (no spiral structure). 1.0+ should show distinct vortex arms.
- Swirl Intensity: should control the organic turbulence level as before.

**Color & Emission:**
- Emission Strength: 0.0 should make the dark side of the planet very dark. 1.5+ should make clouds glow on the dark side.
- Amber Intensity: 0.0 should be all green. 0.5+ should show distinct amber/orange patches in the dense regions.
- Contrast: low values should look flat/washed out. High values should create deep dark vortex cores and bright highlights.

**Scene:**
- Rotation Speed: should spin the planet as before.

- [ ] **Step 4: Tune defaults if needed**

If the defaults don't look good against the reference image, adjust the default values in `planet-store.ts`. The goal is for the default state to approximate the reference as closely as possible.

Key visual targets to match:
1. Extreme luminance range (dark vortex cores to blinding neon highlights)
2. Self-luminous green glow (visible on the dark side)
3. Distinct spiral vortex arms (not amorphous blobs)
4. Visible depth in the atmosphere (thicker at edges)
5. Amber/orange patches in the densest storm regions

- [ ] **Step 5: Commit final tuned defaults**

```bash
git add -A
git commit -m "feat(planet): tune volumetric shader defaults"
```
