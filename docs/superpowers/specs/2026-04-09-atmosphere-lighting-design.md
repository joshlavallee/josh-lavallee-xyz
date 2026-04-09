# Atmosphere & Lighting Polish — Design Spec

## Goal

Transform the lost-in-space scene's atmosphere from thin geometric Fresnel lines into a thick, textured, blended atmospheric glow inspired by realistic Rayleigh scattering references. Add scene lighting for drama and bloom post-processing to sell the effect.

## Current State

- Two atmosphere shells: `atmosphere.frag.glsl` (BackSide, outer glow) and `inner-haze.frag.glsl` (FrontSide, inner haze)
- Both are simple Fresnel-based rim effects with very low opacity (max ~0.48 combined alpha)
- No scene lights — astronaut and scene rely entirely on shader self-illumination
- No post-processing — `@react-three/postprocessing` is installed but unused
- The atmosphere appears as a thin hard line rather than a soft volumetric gradient

## Design

### 1. Atmosphere Shader Rewrite

**Outer atmosphere (`atmosphere.frag.glsl`):**
- Thicker falloff: extend the visible atmosphere further from the limb by using a lower smoothstep start and higher alpha ceiling
- Noise-textured edge: sample 3D simplex noise (same `snoise` function from planet shader) along the rim to break up the geometric perfection, creating a textured/volumetric feel
- Sun-direction-aware brightness: accept `uSunDirection` uniform, dot product with surface normal to make the sunlit limb brighter and the shadow side dimmer
- Color gradient: warm green on lit side transitioning to cooler teal on shadow side
- Increase shell radius from 1.02 to ~1.06 for wider glow

**Inner haze (`inner-haze.frag.glsl`):**
- Thicker and softer: lower the smoothstep threshold so haze extends further across the planet face
- Noise-textured: same simplex noise to add visible wisps/texture to the haze
- Sun-direction-aware: haze is more visible on the lit side
- Increase shell radius from 1.01 to ~1.03

Both shaders will need the simplex noise function. Rather than duplicating the full noise code, we'll add a shared `noise3d.glsl` include that both atmosphere shaders import via Vite's `?raw` and string concatenation (prepend noise code to shader source).

### 2. Scene Lighting

Added to `PlanetScene.tsx`:

- **Directional light**: positioned to match `uSunDirection` (0.6, 0.3, 0.8), warm white color, moderate intensity. Illuminates the astronaut consistently with the planet's own lighting.
- **Ambient light**: very low intensity (~0.08) so the shadow side of the astronaut isn't pure black
- **Planet glow point light**: positioned near the planet's visible limb, green-tinted, low intensity. Casts a subtle color spill onto the astronaut, connecting them to the planet visually.

### 3. Bloom Post-Processing

Added inside `PlanetScene.tsx` (not globally — only the lost-in-space route needs it):

- `EffectComposer` with `Bloom` from `@react-three/postprocessing`
- Conservative settings: low intensity (~0.4), moderate luminance threshold (~0.6), small radius (~0.5)
- This softens the atmosphere edge naturally, makes bright planet surface glow bleed into space, and adds the "light spill" feel from the reference images
- Bloom applied per-scene, not globally, so other routes are unaffected

### 4. TauCetiPlanet Changes

- Pass `uSunDirection` uniform to both atmosphere shader layers
- Update atmosphere vertex shader to also pass `vPosition` for noise sampling
- Increase outer sphere radius from 1.02 to 1.06
- Increase inner sphere radius from 1.01 to 1.03

## Files Changed

| File | Change |
|------|--------|
| `src/features/planet/shaders/noise3d.glsl` | **Create** — extracted simplex noise function for reuse |
| `src/features/planet/shaders/atmosphere.frag.glsl` | **Rewrite** — thick, noise-textured, sun-aware scattering |
| `src/features/planet/shaders/atmosphere.vert.glsl` | **Modify** — pass vPosition for noise sampling |
| `src/features/planet/shaders/inner-haze.frag.glsl` | **Rewrite** — thicker, noise-textured, sun-aware haze |
| `src/features/planet/components/TauCetiPlanet.tsx` | **Modify** — pass uSunDirection to atmosphere layers, increase shell radii |
| `src/features/planet/components/PlanetScene.tsx` | **Modify** — add lights (directional, ambient, point) and bloom EffectComposer |

## Out of Scope

- Raymarching or true volumetric scattering (overkill for this use case, performance concern)
- Lens flare (bloom will provide a similar effect naturally)
- Changes to the planet surface shader itself
