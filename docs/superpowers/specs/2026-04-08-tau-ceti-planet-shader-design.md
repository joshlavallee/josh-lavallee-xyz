# Tau Ceti Planet Shader — Design Spec

## Overview

A procedurally generated planet shader inspired by Tau Ceti from *Project Hail Mary*. The planet features dense, turbulent green swirls with embedded orange/amber patches, rendered as a sphere centered in the canvas with atmospheric rim glow. Built with React Three Fiber and custom GLSL shaders, following the existing feature-based architecture.

**Route:** `/placeholder` (candidate for future homepage promotion)
**Reference:** [jsulpis/realtime-planet-shader](https://github.com/jsulpis/realtime-planet-shader)

## Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Shader approach | Layered FBM noise + domain warping | Best balance of visual quality and GPU performance; matches existing noise infrastructure |
| Control panel | Minimal (3 sliders) | Rotation speed, swirl intensity, orange intensity. Enough to dial in the look without overwhelming |
| Planet framing | Full planet in view | Classic "planet from space" presentation, dark space background, atmospheric rim glow |
| Theme handling | Dark only | Space scenes are inherently dark; always renders dark background regardless of theme setting |
| Portability | Lightly portable | Accepts `colorMode`/`uiStyle` props following existing scene pattern for easy route migration |

## File Structure

```
src/features/planet/
├── components/
│   ├── PlanetScene.tsx       — scene setup: camera, background, light
│   ├── TauCetiPlanet.tsx     — sphere mesh + shaderMaterial, useFrame updates
│   └── PlanetControls.tsx    — bottom-right collapsible control panel
├── shaders/
│   ├── planet.vert.glsl      — vertex shader (passes position, normal, UV to fragment)
│   └── planet.frag.glsl      — fragment shader (FBM + domain warp + color ramp + lighting)
├── lib/
│   └── planet-store.ts       — mutable settings object for control panel
└── index.ts                  — barrel export of PlanetScene
```

## Shader Architecture

### Vertex Shader (`planet.vert.glsl`)

Minimal vertex shader for a `sphereGeometry`. Passes to the fragment shader:
- `vPosition` — object-space vertex position (used as 3D noise coordinate)
- `vNormal` — object-space normal (for lighting)
- `vUv` — UV coordinates (available but primary noise input is 3D position to avoid pole seams)

### Fragment Shader (`planet.frag.glsl`)

The fragment shader pipeline has five stages:

**1. 3D Noise Coordinates**
Use `vPosition` (the sphere surface point) as the input to noise functions. This avoids UV seam artifacts at the poles since noise is sampled in continuous 3D space.

**2. Domain Warping**
Apply domain warping to distort the noise coordinates before sampling FBM. This creates the organic, swirling turbulence patterns visible in the movie reference. The warp uses the same noise function applied recursively:
```
p' = p + warpStrength * vec3(snoise3D(p + offset1), snoise3D(p + offset2), snoise3D(p + offset3))
```
The `uSwirlIntensity` uniform controls `warpStrength`. Slow time-based offsets animate the warp, creating the impression of atmospheric movement.

**3. FBM (Fractal Brownian Motion)**
Layer 5-6 octaves of 3D simplex noise on the warped coordinates. Each octave doubles frequency and halves amplitude, building detail from large-scale bands down to fine turbulent wisps. Constants: lacunarity ~2.0, gain ~0.5.

**4. Color Ramp**
Map the FBM output (approximately -1 to 1) through a multi-stop color ramp:
- Deep forest green (`#0a2a0a`) at the lowest values
- Mid green (`#4a9a2a`) in the middle range
- Bright lime/chartreuse (`#c8e840`) at higher values
- Amber/orange (`#cc7a20` to `#e8a030`) at the highest peaks

The `uOrangeIntensity` uniform biases the ramp threshold, controlling how much of the surface shows orange patches vs. green.

**5. Lighting**
- **Diffuse:** Simple Lambertian shading from a fixed sun direction (e.g., upper-right). Dot product of surface normal with light direction.
- **Rim glow:** Fresnel-based atmospheric glow at the planet edges. Adds a subtle green-tinted halo where the view angle is grazing, simulating atmospheric scattering.
- **Ambient:** Low ambient term so the dark side isn't pure black.

### Noise Function

The existing `src/shaders/noise.glsl` provides 2D simplex noise. The planet shader needs **3D simplex noise** since we sample noise in 3D space (sphere surface positions). A 3D simplex noise function will be added to the planet's fragment shader directly (not to the shared noise file, since only this shader needs it). The shared 2D noise file remains unchanged.

### Uniforms

| Uniform | Type | Source | Purpose |
|---------|------|--------|---------|
| `uTime` | float | `useFrame` delta accumulation | Animates noise offsets for slow atmospheric movement |
| `uRotationSpeed` | float | `planet-store.ts` | Planet Y-axis rotation speed |
| `uSwirlIntensity` | float | `planet-store.ts` | Domain warp strength (smooth to turbulent) |
| `uOrangeIntensity` | float | `planet-store.ts` | Bias of color ramp toward orange patches |
| `uSunDirection` | vec3 | Constant | Light direction for diffuse shading |

## Components

### PlanetScene

Scene wrapper component. Signature: `PlanetScene({ colorMode, uiStyle }: SceneProps)`.

Responsibilities:
- Override background to dark space color (`#020208` or similar deep blue-black) regardless of `colorMode`
- Render `TauCetiPlanet` centered at origin
- No orbit controls (static camera, planet rotates on its own)

### TauCetiPlanet

The core rendering component. Creates a `sphereGeometry` (64x64 segments for smooth curvature) wrapped in a `shaderMaterial`.

Responsibilities:
- Import vertex and fragment shaders as raw strings via Vite `?raw`
- Create uniforms with `useMemo`
- In `useFrame`: accumulate time, apply rotation speed, read values from `planet-store.ts` and update uniforms
- Rotate the mesh on the Y-axis each frame based on `uRotationSpeed`

### PlanetControls

Collapsible control panel in the bottom-right corner. Follows the exact same pattern as the existing `ShaderControls.tsx`:
- `fixed bottom-4 right-4 z-50` positioning
- `surface` CSS class for themed backdrop
- `flex-col-reverse` layout with toggle button at bottom
- Icon: a planet/globe icon from Lucide (e.g., `Globe` or `Orbit`)

Three sliders:
| Control | Key | Min | Max | Default | Labels |
|---------|-----|-----|-----|---------|--------|
| Rotation Speed | `rotationSpeed` | 0.0 | 1.0 | 0.15 | Still / Fast |
| Swirl Intensity | `swirlIntensity` | 0.5 | 4.0 | 2.0 | Smooth / Turbulent |
| Orange Intensity | `orangeIntensity` | 0.0 | 1.0 | 0.35 | Subtle / Dominant |

### planet-store.ts

Mutable settings object, same pattern as `shader-store.ts`:

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

## Integration Points

### Experience.tsx

Add a new conditional render:
```tsx
{routePath === '/placeholder' && (
  <PlanetScene colorMode={colorMode} uiStyle={uiStyle} />
)}
```

### placeholder.tsx (Route)

Remove the existing placeholder HTML content. The Canvas already renders full-screen behind the route, so the route component only needs to render `PlanetControls`:

```tsx
function Placeholder() {
  return <PlanetControls />
}
```

### Navigation

No changes needed. The existing burger nav already links to `/placeholder`.

## Visual Target

The planet should evoke the dense atmospheric turbulence of Tau Ceti as depicted in the *Project Hail Mary* film: layers of swirling greens ranging from deep forest to bright chartreuse, with scattered orange/amber hotspots that look like volcanic or thermal features beneath the cloud layer. The swirls should move slowly enough to feel atmospheric rather than chaotic. The rim glow gives the planet a sense of scale and atmosphere against the dark space backdrop.

## Performance Considerations

- 3D simplex noise with 5-6 FBM octaves + domain warping is moderately expensive but well within GPU capabilities for a single sphere
- The sphere geometry (64x64 segments) is lightweight
- No post-processing passes needed
- No additional render targets or textures
- The `dpr` clamp of [1, 2] from the existing Canvas config keeps fragment shader cost reasonable on high-DPI displays
