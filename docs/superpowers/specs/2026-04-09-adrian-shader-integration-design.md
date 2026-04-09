# Adrian Procedural Shader Integration

## Overview

Replace the current multi-layer marble planet shader with the procedural shader from `planet-adrian.jsx` (Approach 1: Domain-Warped Noise). Add uniforms for real-time tunability and wire them into the existing controls panel. Use hybrid lighting that combines Adrian's directional sun and limb darkening with the current shader's self-emission and fresnel rim effects.

## Decisions

- **Shader approach:** Adrian's procedural shader (domain-warped FBM), not the pre-baked texture or GPU fluid sim approaches
- **Lighting model:** Hybrid. Adrian's directional sunlight + limb darkening as base, plus self-emission and fresnel rim from the current shader. No wrap lighting or fake bloom.
- **Flow style:** Pure Adrian domain-warped FBM. No curl noise reintroduction.
- **Integration strategy:** Direct replacement (Approach A). Clean swap, old shader preserved in git history.

## Shader Changes

### planet.frag.glsl — Full Replacement

Replace entirely with Adrian's procedural fragment shader. Key sections from Adrian's code:

**Noise foundation:**
- Simplex 3D noise (Gustavson/Ashima Arts, same base as current)
- FBM with variable octaves (loop up to 6, hardcoded at 3 per Adrian's defaults)
- Domain-warped FBM: two-pass warp (q → r → final) with gentler multipliers for flowing gas appearance

**Pattern generation:**
- Main swirl pattern via `warpedFbm` on normalized sphere position
- Atmospheric depth: second `warpedFbm` at offset scale/position, blended 70/30 with main pattern
- S-curve contrast via `smoothstep(0.15, 0.88, t)` then `pow(t, 1.5)`

**Heat map system:**
- Three independent FBM layers at different scales (0.8, 1.1, 1.8) for varied patch sizes
- Polar bias: `smoothstep(0.2, 0.7, latitude) * uPolarBias` concentrates heat toward poles
- Max-blend (not additive): patches compete for territory rather than stacking
- Weighted contribution: large patches 0.85, medium 0.7, small 0.5

**Color ramps:**
- Green ramp (8 stops): abyss → deep → dark → forest → mid → bright → lime → yellow-green
- Orange ramp (7 stops): brown → dark → deep → mid → bright → hot → glow
- Final color: `mix(greenColor, orangeColor, orangeAmount)`

**Gas giant banding:**
- Latitude-based sinusoidal bands: `sin(lat * 8.0) * uBandingStrength + sin(lat * 14.0 + 2.0) * (uBandingStrength * 0.5)`
- Applied as multiplicative modulation on final color

**Hybrid lighting:**
- Directional sunlight: `smoothstep(0.0, 1.0, max(dot(nPos, sunDir), 0.0))`, warm sunlit / cool shadow bias
- Limb darkening: `smoothstep(0.0, 0.45, viewAngle)`, multiplied 0.35–1.0
- Atmospheric haze at limb: fresnel^3 blend toward teal-green `vec3(0.06, 0.30, 0.10)`
- **Self-emission** (from current shader): `color += color * t * uEmissionStrength` — brighter areas glow more from within
- **Fresnel rim** (from current shader): `pow(1.0 - viewAngle, uRimPower)` with green-tinted rim glow, additive

**New uniforms:**

| Uniform | Type | Default | Purpose |
|---|---|---|---|
| `uTime` | float | auto | Animation time (incremented per frame) |
| `uWarpStrength` | float | 3.5 | Domain warp multiplier in warpedFbm |
| `uHeatAmount` | float | 0.5 | Scales heat patch smoothstep thresholds |
| `uPolarBias` | float | 0.15 | Polar concentration of heat regions |
| `uBandingStrength` | float | 0.04 | Gas giant band amplitude |
| `uEmissionStrength` | float | 0.12 | Self-glow intensity |
| `uRimPower` | float | 3.0 | Fresnel rim exponent |
| `uSunDirection` | vec3 | normalize(0.6, 0.3, 0.8) | Light direction |

### planet.vert.glsl — Update

Update to match Adrian's vertex shader:
- Keep `vPosition` as object-space `position` (for noise sampling, consistent regardless of scene offset)
- Add `vWorldPosition` via `modelMatrix * vec4(position, 1.0)` for correct `cameraPosition - vWorldPosition` view direction
- Keep `vNormal` via `normalMatrix * normal`
- Drop `vEyePos` (replaced by world-space view direction)

### atmosphere.frag.glsl — Emission multiplier fix

The atmosphere shader reads `uEmissionStrength` from the same store. The old default was `3.0` with multiplier `* 0.08` (effective: `0.24`). New default is `0.12`, so the multiplier changes to `* 2.0` to preserve the same effective value (`0.12 * 2.0 = 0.24`).

## State & Controls

### planet-store.ts — Replace

New interface and defaults:

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

### PlanetControls.tsx — New slider groups

Replace the current 3 groups with 4 new groups:

1. **Flow & Turbulence**
   - `warpStrength`: 0.5–6.0, step 0.1, "Gentle" / "Chaotic"

2. **Heat Regions**
   - `heatAmount`: 0.0–1.0, step 0.01, "None" / "Dominant"
   - `polarBias`: 0.0–0.5, step 0.01, "Uniform" / "Polar"

3. **Atmosphere**
   - `bandingStrength`: 0.0–0.15, step 0.005, "None" / "Banded"
   - `emissionStrength`: 0.0–0.5, step 0.01, "Dark" / "Glowing"
   - `rimPower`: 1.0–6.0, step 0.1, "Soft" / "Sharp"

4. **Scene**
   - `rotationSpeed`: 0.0–1.0, step 0.01, "Still" / "Fast"

### TauCetiPlanet.tsx — Rewire uniforms

- Replace uniform map with new 7 uniforms + `uTime` + `uSunDirection`
- Update `useFrame` to sync new settings keys
- `uSunDirection` stays as a component-level constant (not in store)
- Atmosphere uniform `uEmissionStrength` stays wired

## Files Changed

| File | Action |
|---|---|
| `src/features/planet/shaders/planet.frag.glsl` | Replace with Adrian procedural + hybrid lighting + uniforms |
| `src/features/planet/shaders/planet.vert.glsl` | Update: add vUv, world-space vPosition |
| `src/features/planet/lib/planet-store.ts` | Replace interface and defaults (10 params → 7) |
| `src/features/planet/components/TauCetiPlanet.tsx` | Rewire uniforms to new settings |
| `src/features/planet/shaders/atmosphere.frag.glsl` | Fix emission multiplier for new store range |
| `src/features/planet/components/PlanetControls.tsx` | Replace slider groups with new 4-group layout |

## Not Changed

- `PlanetScene.tsx` — composition unchanged
- `FloatGroup.tsx`, `AstronautFigure.tsx`, `Starfield.tsx` — unrelated
- `atmosphere.vert.glsl` — independent
- Silhouette shaders — independent
- `planet-v1-volumetric.frag.glsl` — stays as archived alternative
- Barrel exports, routes — unchanged
