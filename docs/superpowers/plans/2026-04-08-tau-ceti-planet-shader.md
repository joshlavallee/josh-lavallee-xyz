# Tau Ceti Planet Shader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a procedurally generated planet shader on the `/placeholder` route that recreates Tau Ceti from Project Hail Mary with swirling greens and orange hotspots.

**Architecture:** A new `src/features/planet/` feature module containing a custom GLSL shader (FBM noise + domain warping) applied to a sphere, with a minimal control panel for rotation speed, swirl intensity, and orange intensity. Integrates via the existing `Experience.tsx` route-switching pattern.

**Tech Stack:** React Three Fiber, Three.js ShaderMaterial, GLSL (3D simplex noise, FBM, domain warping), Vite raw imports

---

### Task 1: Planet Store and Barrel Export

**Files:**
- Create: `src/features/planet/lib/planet-store.ts`
- Create: `src/features/planet/index.ts`

- [ ] **Step 1: Create the planet settings store**

Create `src/features/planet/lib/planet-store.ts`:

```typescript
export interface PlanetSettings {
  rotationSpeed: number
  swirlIntensity: number
  orangeIntensity: number
}

export const planetSettings: PlanetSettings = {
  rotationSpeed: 0.15,
  swirlIntensity: 2.0,
  orangeIntensity: 0.35,
}
```

- [ ] **Step 2: Create the barrel export**

Create `src/features/planet/index.ts`:

```typescript
export { default as PlanetScene } from './components/PlanetScene'
export { default as PlanetControls } from './components/PlanetControls'
```

- [ ] **Step 3: Commit**

```bash
git add src/features/planet/lib/planet-store.ts src/features/planet/index.ts
git commit -m "feat(planet): add settings store and barrel export"
```

---

### Task 2: Vertex Shader

**Files:**
- Create: `src/features/planet/shaders/planet.vert.glsl`

- [ ] **Step 1: Write the vertex shader**

Create `src/features/planet/shaders/planet.vert.glsl`:

```glsl
varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

This passes object-space position (for 3D noise sampling) and view-space normal (for lighting) to the fragment shader.

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/shaders/planet.vert.glsl
git commit -m "feat(planet): add vertex shader"
```

---

### Task 3: Fragment Shader

**Files:**
- Create: `src/features/planet/shaders/planet.frag.glsl`

This is the core of the feature. The fragment shader implements: 3D simplex noise, FBM, domain warping, a green-to-orange color ramp, Lambertian diffuse lighting, and Fresnel rim glow.

- [ ] **Step 1: Write the fragment shader**

Create `src/features/planet/shaders/planet.frag.glsl`:

```glsl
uniform float uTime;
uniform float uSwirlIntensity;
uniform float uOrangeIntensity;
uniform vec3 uSunDirection;

varying vec3 vPosition;
varying vec3 vNormal;

//
// 3D Simplex Noise (Stefan Gustavson, adapted from Ashima Arts, MIT license)
//
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise3D(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  // Permutations
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  // Gradients: 7x7 points over a square, mapped onto an octahedron
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

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

//
// FBM (Fractal Brownian Motion)
//
float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise3D(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

//
// Domain Warping
//
vec3 domainWarp(vec3 p, float strength, float time) {
  vec3 offset1 = vec3(1.7, 9.2, 3.4);
  vec3 offset2 = vec3(8.3, 2.8, 5.1);
  vec3 offset3 = vec3(4.6, 7.1, 1.9);

  vec3 warp = vec3(
    snoise3D(p + offset1 + time * 0.03),
    snoise3D(p + offset2 + time * 0.02),
    snoise3D(p + offset3 + time * 0.025)
  );

  return p + strength * warp;
}

//
// Color Ramp: greens with orange patches
//
vec3 colorRamp(float t, float orangeBias) {
  // Normalize t from roughly [-1, 1] to [0, 1]
  float n = clamp(t * 0.5 + 0.5, 0.0, 1.0);

  // Green stops
  vec3 deepGreen   = vec3(0.04, 0.16, 0.04);
  vec3 forestGreen  = vec3(0.10, 0.35, 0.10);
  vec3 midGreen     = vec3(0.29, 0.60, 0.17);
  vec3 limeGreen    = vec3(0.48, 0.80, 0.19);
  vec3 chartreuse   = vec3(0.78, 0.91, 0.25);

  // Orange stops
  vec3 amber  = vec3(0.80, 0.48, 0.13);
  vec3 orange = vec3(0.91, 0.63, 0.19);

  // Base green ramp (5 stops across 0-1)
  vec3 color;
  if (n < 0.25) {
    color = mix(deepGreen, forestGreen, n / 0.25);
  } else if (n < 0.5) {
    color = mix(forestGreen, midGreen, (n - 0.25) / 0.25);
  } else if (n < 0.75) {
    color = mix(midGreen, limeGreen, (n - 0.5) / 0.25);
  } else {
    color = mix(limeGreen, chartreuse, (n - 0.75) / 0.25);
  }

  // Blend in orange at the high end, controlled by orangeBias
  float orangeThreshold = 1.0 - orangeBias;
  float orangeMix = smoothstep(orangeThreshold - 0.15, orangeThreshold + 0.1, n);
  vec3 orangeColor = mix(amber, orange, smoothstep(orangeThreshold, 1.0, n));
  color = mix(color, orangeColor, orangeMix);

  return color;
}

void main() {
  vec3 p = vPosition * 1.5;

  // Domain warp for swirling turbulence
  vec3 warped = domainWarp(p, uSwirlIntensity, uTime);

  // Second layer of warp for extra turbulence
  warped = domainWarp(warped, uSwirlIntensity * 0.5, uTime * 0.7);

  // FBM noise on warped coordinates
  float n = fbm(warped, 6);

  // Color from noise
  vec3 color = colorRamp(n, uOrangeIntensity);

  // Diffuse lighting
  float diffuse = max(dot(vNormal, normalize(uSunDirection)), 0.0);
  float ambient = 0.08;
  float lighting = ambient + diffuse * 0.92;

  // Fresnel rim glow (atmospheric scattering)
  float fresnel = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
  fresnel = pow(fresnel, 3.0);
  vec3 rimColor = vec3(0.3, 0.8, 0.2) * fresnel * 0.6;

  color = color * lighting + rimColor;

  gl_FragColor = vec4(color, 1.0);
}
```

Key design notes for the implementing engineer:
- The 3D simplex noise function is self-contained in this shader (not imported from the shared 2D `noise.glsl`).
- Domain warping is applied twice with different strengths for extra turbulence depth.
- The color ramp has 5 green stops and blends orange at the high end based on `uOrangeIntensity`.
- Lighting uses view-space normals (`vNormal` is transformed by `normalMatrix` in the vertex shader), so the sun direction should also be in view space or the vertex shader should pass world-space normals. The current vertex shader uses `normalMatrix` (model-view), and `uSunDirection` is a constant `vec3(1.0, 1.0, 0.5)` that works as a view-space approximation. If lighting looks wrong, switch the vertex shader to pass `normalize(normal)` (object-space) and use `uSunDirection` as a world-space direction.
- The Fresnel rim assumes the camera looks down -Z, using `vec3(0.0, 0.0, 1.0)` as the view direction. This works because the planet is centered at origin and the default camera looks toward origin.

- [ ] **Step 2: Verify the shader compiles**

Run the dev server (`npm run dev` or equivalent) and load the placeholder route after Task 5 integrates everything. At this point, just commit the shader file.

- [ ] **Step 3: Commit**

```bash
git add src/features/planet/shaders/planet.frag.glsl
git commit -m "feat(planet): add fragment shader with FBM, domain warp, and color ramp"
```

---

### Task 4: TauCetiPlanet Component

**Files:**
- Create: `src/features/planet/components/TauCetiPlanet.tsx`

- [ ] **Step 1: Create the planet mesh component**

Create `src/features/planet/components/TauCetiPlanet.tsx`:

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
      uOrangeIntensity: { value: planetSettings.orangeIntensity },
      uSunDirection: { value: SUN_DIRECTION },
    }),
    []
  )

  useFrame((_state, delta) => {
    if (!materialRef.current || !meshRef.current) return

    const u = materialRef.current.uniforms

    u.uTime.value += delta * 0.3
    u.uSwirlIntensity.value = planetSettings.swirlIntensity
    u.uOrangeIntensity.value = planetSettings.orangeIntensity

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

Key details:
- `sphereGeometry` radius 1, 64x64 segments.
- Time advances at `delta * 0.3` for slow atmospheric animation.
- Rotation is applied to the mesh via `meshRef.current.rotation.y`, not a uniform.
- Settings are read from the mutable `planetSettings` object each frame (same pattern as `FluidShader.tsx` reading from `shaderSettings`).

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/components/TauCetiPlanet.tsx
git commit -m "feat(planet): add TauCetiPlanet component with shader material"
```

---

### Task 5: PlanetScene Component

**Files:**
- Create: `src/features/planet/components/PlanetScene.tsx`

- [ ] **Step 1: Create the scene wrapper**

Create `src/features/planet/components/PlanetScene.tsx`:

```tsx
import { PerspectiveCamera } from '@react-three/drei'
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
    </>
  )
}
```

Notes:
- Camera at `[0, 0, 3]` looking at origin gives a clean centered view of the unit sphere.
- Background is always `#020208` (deep blue-black space) regardless of theme.
- `colorMode` and `uiStyle` are accepted as props for portability but unused for now (prefixed with `_`).

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/components/PlanetScene.tsx
git commit -m "feat(planet): add PlanetScene wrapper with camera and dark background"
```

---

### Task 6: PlanetControls Component

**Files:**
- Create: `src/features/planet/components/PlanetControls.tsx`

- [ ] **Step 1: Create the control panel**

Create `src/features/planet/components/PlanetControls.tsx`. This follows the exact pattern of `src/features/home/components/ShaderControls.tsx`:

```tsx
import { useState } from 'react'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { planetSettings } from '../lib/planet-store'

const SLIDER_CONFIGS = [
  { key: 'rotationSpeed' as const, label: 'Rotation Speed', min: 0.0, max: 1.0, step: 0.01, labelLow: 'Still', labelHigh: 'Fast' },
  { key: 'swirlIntensity' as const, label: 'Swirl Intensity', min: 0.5, max: 4.0, step: 0.1, labelLow: 'Smooth', labelHigh: 'Turbulent' },
  { key: 'orangeIntensity' as const, label: 'Orange Intensity', min: 0.0, max: 1.0, step: 0.01, labelLow: 'Subtle', labelHigh: 'Dominant' },
] as const

export default function PlanetControls() {
  const [isOpen, setIsOpen] = useState(false)
  const [values, setValues] = useState({
    rotationSpeed: planetSettings.rotationSpeed,
    swirlIntensity: planetSettings.swirlIntensity,
    orangeIntensity: planetSettings.orangeIntensity,
  })

  function updateValue(key: keyof typeof planetSettings, value: number) {
    planetSettings[key] = value
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={cn(
          'surface flex flex-col-reverse overflow-hidden transition-all duration-300 ease-out',
          isOpen ? 'w-60' : 'w-[52px]'
        )}
        style={{ maxHeight: isOpen ? '600px' : '52px' }}
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
            'px-3 pt-3 transition-all duration-200',
            isOpen
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-2 opacity-0'
          )}
          style={{ transitionDelay: isOpen ? '100ms' : '0ms' }}
        >
          <span className="mb-3 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Planet
          </span>

          <div className="flex flex-col gap-2.5">
            {SLIDER_CONFIGS.map((config) => (
              <div key={config.key}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{config.label}</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {values[config.key].toFixed(2)}
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
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/components/PlanetControls.tsx
git commit -m "feat(planet): add PlanetControls panel with rotation, swirl, and orange sliders"
```

---

### Task 7: Integration (Experience + Route)

**Files:**
- Modify: `src/Experience.tsx`
- Modify: `src/routes/placeholder.tsx`

- [ ] **Step 1: Add PlanetScene to Experience.tsx**

In `src/Experience.tsx`, add the import and conditional render. The file currently has imports for `ParticlePhotography`, `AboutScene`, and `HomeScene`, plus a component with three conditional blocks.

Add import at the top:
```tsx
import { PlanetScene } from '@/features/planet'
```

Add conditional render after the existing `ParticlePhotography` block (before the closing `</>`):
```tsx
{routePath === '/placeholder' && (
  <PlanetScene colorMode={colorMode} uiStyle={uiStyle} />
)}
```

- [ ] **Step 2: Update the placeholder route**

Replace the contents of `src/routes/placeholder.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { PlanetControls } from '@/features/planet'

export const Route = createFileRoute('/placeholder')({
  component: Placeholder,
})

function Placeholder() {
  return <PlanetControls />
}
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev` (or the project's dev command)

Open http://localhost:3000/placeholder (or the project's dev port).

Expected:
- Dark space background (`#020208`)
- A sphere centered in the viewport with swirling green/orange procedural texture
- The planet slowly rotates
- Bottom-right: a collapsed control panel with a globe icon
- Clicking the icon opens a panel with 3 sliders
- Moving "Rotation Speed" changes how fast the planet spins
- Moving "Swirl Intensity" changes the turbulence of the surface pattern
- Moving "Orange Intensity" shifts the color balance toward orange patches
- Atmospheric rim glow visible at the planet edges

If the planet appears all black or has no visible pattern, check the browser console for GLSL compilation errors. Common issues:
- The `normalMatrix` transform may need adjustment if lighting looks flat. Try replacing `normalize(normalMatrix * normal)` with `normalize(normal)` in the vertex shader.
- If the Fresnel rim doesn't look right, the view direction assumption `vec3(0.0, 0.0, 1.0)` may need to use the actual camera direction.

- [ ] **Step 4: Commit**

```bash
git add src/Experience.tsx src/routes/placeholder.tsx
git commit -m "feat(planet): integrate planet scene on placeholder route"
```

---

### Task 8: Visual Tuning

This is a non-code task. After the planet is rendering, visually compare against the reference image (the Tau Ceti movie still) and adjust shader constants if needed.

- [ ] **Step 1: Evaluate and tune**

Areas to check:
- **Swirl density:** If swirls are too sparse, increase the frequency multiplier in `vPosition * 1.5` (try `2.0` or `2.5`).
- **Swirl turbulence:** The double domain warp should produce dense, organic patterns. If it looks too smooth, increase the default `swirlIntensity` in `planet-store.ts`.
- **Color balance:** The greens should range from deep to bright. If the palette looks too uniform, adjust the color stops in `colorRamp()`.
- **Orange patches:** Should appear as scattered hotspots, not dominating the surface. Adjust the default `orangeIntensity` value (currently `0.35`).
- **Rim glow:** Should be subtle. Adjust the `0.6` multiplier on `rimColor` if too strong/weak.
- **Animation speed:** The `delta * 0.3` multiplier on time controls how fast the atmosphere swirls. Adjust if too fast or too slow.
- **Planet size:** If the planet appears too small or too large, adjust the camera Z position in `PlanetScene.tsx` (`position={[0, 0, 3]}`). Closer = larger, further = smaller.

- [ ] **Step 2: Commit any tuning changes**

```bash
git add -A
git commit -m "fix(planet): tune shader parameters for visual fidelity"
```
