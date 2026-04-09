# Volumetric Planet Shader Redesign

## Goal

Replace the current surface-level FBM shader on the Tau Ceti planet (`/placeholder` route) with a volumetric raymarched atmosphere that closely matches the Project Hail Mary film reference. The reference shows intensely luminous, self-glowing green clouds with complex spiral vortices, deep amber patches in dense storm regions, and extreme contrast from near-black vortex cores to blinding neon green cloud tops.

## Visual Priorities (ranked)

1. **Luminance range** — extreme contrast from near-black vortex cores to blinding neon highlights
2. **Self-luminous glow** — clouds emit light from within, not just reflect it
3. **Vortex structure** — distinct spiral arms and "snail-shell" storm systems via curl noise
4. **Depth in vortex cores** — volumetric raymarching creates real 3D depth
5. **Amber/orange patches** — large, vivid hot regions in the densest storm areas

## Current State

The existing shader (`src/features/planet/shaders/planet.frag.glsl`) uses:
- 3D simplex noise (Gustavson/Ashima)
- 6-octave FBM with rotation per octave
- Nested domain warping (Inigo Quilez q/r pattern)
- A narrow green color ramp with nearly unreachable amber threshold
- Diffuse lighting with high ambient (0.25) and fresnel rim
- No emission, no volumetric depth, no curl noise

### Problems
- **No curl noise** — FBM + domain warp creates organic blobs, not spiral vortex arms
- **Single noise evaluation** — one `warpedNoise()` call per pixel, no depth layering
- **Color ramp too narrow** — smoothstep ranges compress everything into similar greens; amber is almost unreachable
- **No emission term** — color is only multiplied by lighting, no additive self-illumination
- **Contrast too mild** — `pow(nNorm, 1.3)` barely separates values

## Architecture

### Raymarching Pipeline

The fragment shader marches rays through a thin atmospheric shell above the sphere surface.

```
Fragment input: surface position, view direction, normal
        │
        ▼
   Ray Setup
   - Entry: sphere surface (radius 1.0)
   - Exit: outer shell (radius 1.0 + shellThickness)
   - Steps: configurable via uniform (default 12, range 4-24)
        │
   For each step:
        │
        ▼
   Noise Evaluation
   1. Curl noise displaces the sample position (vortex flow)
   2. warpedNoise() at displaced position → raw density
      (internally: domain warp q/r layers + FBM)
        │
        ▼
   Color & Density
   - Map density → color via ramp
   - Add emission term (density × emission factor)
   - Front-to-back compositing
        │
   After all steps:
        │
        ▼
   Post-Processing
   - Fresnel rim glow
   - Contrast curve
   - Gamma correction
```

### Front-to-Back Compositing

At each raymarch step:

```glsl
float alpha = density * stepSize * densityScale;
accumulatedColor += (1.0 - accumulatedAlpha) * stepColor * alpha;
accumulatedAlpha += (1.0 - accumulatedAlpha) * alpha;
```

Early exit when `accumulatedAlpha > 0.95` to save GPU cycles.

### Curl Noise for Vortex Structure

Curl noise computes the curl of a potential field (∇ × F), producing divergence-free flow that creates spiral vortex patterns. This replaces the arbitrary domain warping as the primary source of rotational structure.

Implementation uses finite differences on the existing `snoise3D` function to compute partial derivatives, then takes the cross-product pattern to get the curl vector. The curl displacement is applied to the sample position before FBM evaluation:

```glsl
vec3 samplePos = rayPosition;
samplePos += curlNoise(samplePos * curlScale + time) * curlStrength;
float density = warpedNoise(samplePos, swirlIntensity, time);
```

- `curlScale` controls spiral tightness (lower = bigger storms)
- `curlStrength` controls displacement magnitude

The existing domain warping (q/r pattern) is kept as a secondary layer on top of curl noise for additional organic variation.

### Color Ramp

Density maps to color across the full 0.0-1.0 range:

| Density | Color | Hex | Purpose |
|---------|-------|-----|---------|
| 0.0 | Near-black green | `#051005` | Vortex core depths |
| 0.2 | Deep forest green | `#0A2A05` | Shadow regions |
| 0.4 | Vivid green | `#2E8B0D` | Mid-atmosphere |
| 0.6 | Chartreuse | `#8CD605` | Active cloud tops |
| 0.8 | Neon lime | `#BFFF00` | Bright highlights, high emission |
| 0.9 | Amber | `#CC6600` | Dense hot patches |
| 1.0 | Hot orange | `#F09000` | Densest storm cores |

Key change: amber/orange is at the high-density end, not behind a nearly unreachable threshold. Dense regions are hot. Thin regions are dark voids.

### Emission Model

Color output splits into lit and emissive components:

```glsl
vec3 litColor = color * lighting;
vec3 emissive = color * emissionStrength * density;
vec3 stepColor = litColor + emissive;
```

Emission is strongest in the neon-lime range (density 0.6-0.8) with a multiplier around 1.5-2.0. Bright green clouds glow even on the dark side, matching the reference where the terminator never goes fully black.

With real emission, ambient drops from 0.25 to ~0.08 for better contrast on the lit side.

### Vertex Shader Changes

New varyings added:
- `vViewDir` — camera-to-surface direction in object space (needed for ray direction)
- `vWorldPos` — for accurate fresnel calculation

Geometry unchanged: `SphereGeometry(1, 64, 64)`.

## Controls Panel

Expanded from 3 to 10 sliders, organized in collapsible groups:

### Raymarching
- `Ray Steps` (4-24, default 12) — quality vs performance
- `Shell Thickness` (0.05-0.5, default 0.2) — atmosphere depth
- `Density Scale` (0.5-5.0, default 2.0) — overall opacity

### Curl Noise / Vortex
- `Curl Scale` (0.5-4.0, default 1.5) — spiral tightness
- `Curl Strength` (0.0-3.0, default 1.2) — flow displacement magnitude
- `Swirl Intensity` (0.5-4.0, default 1.8) — domain warp strength (existing)

### Color & Emission
- `Emission Strength` (0.0-3.0, default 1.5) — self-glow intensity
- `Amber Intensity` (0.0-1.0, default 0.5) — orange patch prominence
- `Contrast` (0.5-3.0, default 1.5) — contrast curve power

### Scene
- `Rotation Speed` (0.0-1.0, default 0.04) — mesh rotation (existing)

## Files Modified

- `src/features/planet/shaders/planet.frag.glsl` — full rewrite (replace in place)
- `src/features/planet/shaders/planet.vert.glsl` — add `vViewDir` and `vWorldPos` varyings
- `src/features/planet/components/TauCetiPlanet.tsx` — add new uniforms for all new controls
- `src/features/planet/components/PlanetControls.tsx` — expand to 10 sliders with collapsible groups
- `src/features/planet/lib/planet-store.ts` — add new settings fields

## Fallback Strategy

The shader is structured so the noise pipeline (curl noise, FBM, color ramp, emission) is a standalone function. The raymarching loop calls it. If performance is unacceptable:

- **Fallback B (Multi-Layer Parallax):** Remove ray loop, evaluate the same noise pipeline at 3-4 parallax-offset depths composited front-to-back. Change ~20 lines in `main()`.
- **Fallback A (Enhanced Surface):** Collapse to single surface evaluation. Same noise pipeline, same color ramp, same emission. One sample point. Change ~10 lines in `main()`.

## Performance Considerations

- Ray step count is the primary performance lever (uniform controlled, adjustable at runtime)
- Early exit when accumulated alpha exceeds 0.95
- Curl noise adds 6 extra `snoise3D` calls per sample (finite differences). At 12 ray steps, that's 72 extra noise calls per pixel. If too expensive, curl noise can be evaluated at lower frequency (every 2nd step) or with fewer FBM octaves.
- The FBM octave count (currently 6) could be reduced to 4 for the inner raymarch steps where fine detail is less visible
