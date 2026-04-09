# Homepage Shader Redesign: 3D Displaced Wireframe Grid

## Overview

Replace the current flat 2D fluid shader on the homepage with a 3D displaced wireframe grid. The grid is a subdivided plane lying in XZ, viewed from a perspective camera at ~35 degrees. Vertices are displaced along Y by layered simplex noise and mouse proximity. Lines glow in retrowave colors (cyan at rest, purple mid, hot pink at peaks) based on displacement height. The background is near-black. The mouse creates a medium-intensity push/pull on the surface that settles back smoothly.

## Design Decisions

- **Wireframe grid over flat shader:** Gives a true 3D interactive feel instead of a 2D color wash. Reads as a tangible surface the user can influence.
- **Displacement-based coloring:** Color shifting with displacement height gives strong visual feedback for mouse interaction and creates natural visual hierarchy (peaks glow hotter).
- **Perspective camera at ~35 degrees:** Provides depth foreshortening so the grid reads as 3D, with lines stretching into the distance.
- **Pure CSS transitions retained for theme:** The shader adapts to color mode and UI style via uniforms, same pattern as the current implementation.
- **No new dependencies:** Uses PlaneGeometry wireframe mode, existing simplex noise, existing shader pipeline.

## Camera

- **Type:** PerspectiveCamera (replaces current OrthographicCamera)
- **Position:** `[0, 4, 7]` (approximate, tunable)
- **LookAt:** `[0, 0, 0]` (center of grid)
- **FOV:** 45 (matches project default)
- **Near/Far:** 0.1 / 100

## Geometry

- **Type:** `PlaneGeometry` rotated to lie in XZ plane (`rotation.x = -Math.PI / 2`)
- **Size:** 10 x 10 units
- **Segments:** 128 x 128 (16,384 vertices, smooth displacement)
- **Material:** `ShaderMaterial` with `wireframe: true`

## Vertex Shader

### Uniforms

```glsl
uniform float uTime;
uniform vec2 uMouse;       // world XZ position of mouse on grid plane
uniform float uColorMode;  // 0.0 dark, 1.0 light
```

### Displacement

Three octaves of simplex noise for organic terrain movement:

1. **Large waves:** `snoise(xz * 0.4 + time * 0.08)` amplitude ~0.8
2. **Medium detail:** `snoise(xz * 1.0 + time * 0.15)` amplitude ~0.3
3. **Small ripple:** `snoise(xz * 2.5 + time * 0.2)` amplitude ~0.1

Total base displacement: sum of all three layers, applied to vertex Y.

### Mouse Influence

- Calculate distance from vertex XZ to `uMouse` XZ
- Smoothstep falloff: full influence at distance 0, zero at ~1.5 units
- Additional Y displacement: `influence * 1.2` (tunable strength)
- Adds a higher-frequency noise ripple within the influence zone for organic feel

### Output

- `vDisplacement`: total Y displacement (base noise + mouse), passed to fragment shader
- Standard `gl_Position` via projection/modelView matrices

## Fragment Shader

### Uniforms

```glsl
uniform float uColorMode;
uniform vec3 uThemeTint;
```

### Color Ramp

Based on `vDisplacement` normalized to a 0-1 range:

| Displacement | Color | RGB |
|---|---|---|
| Low (rest) | Cyan | `(0.13, 0.88, 0.83)` |
| Medium | Purple | `(0.55, 0.24, 0.78)` |
| High (peaks) | Hot Pink | `(1.0, 0.2, 0.6)` |

Interpolation via `smoothstep` between the three stops.

### Glow / Brightness

- Base brightness: 0.4 (grid visible even at rest)
- Peak brightness: 1.0 (full glow at maximum displacement)
- Brightness scales with `abs(vDisplacement)`

### Theme Adaptation

- **Color mode:** In light mode (`uColorMode = 1.0`), increase base brightness to ~0.6, slightly desaturate colors, and the scene clear color lightens to a soft gray.
- **Theme tint:** `uThemeTint` added as subtle RGB shift (same `* 0.15` factor as current shader).

### Background

- Scene clear color: `#050508` (dark mode) / `#E8E8EC` (light mode)
- Wireframe mode means triangle interiors are not rendered, only edges. The clear color shows through.

## Mouse Interaction

### Mapping Pipeline

1. R3F `state.pointer` provides NDC (-1 to 1)
2. Unproject through perspective camera to create a ray
3. Intersect ray with the XZ plane (Y=0) to get world coordinates
4. Smooth lerp (factor 0.05) toward target position
5. Pass as `uMouse` vec2 uniform (X, Z components)

This replaces the current UV-space mouse mapping. The ray-plane intersection gives accurate world-space cursor position on the grid regardless of camera angle.

### Interaction Feel

- Medium intensity: clear push/pull, not subtle, not dramatic
- Mouse displacement strength: ~1.2 units at center of influence
- Influence radius: ~1.5 units with smoothstep falloff
- Settles back as noise evolves (no persistent deformation)

## Codebase Changes

| Action | File | Details |
|---|---|---|
| Rewrite | `src/features/home/components/HomeScene.tsx` | PerspectiveCamera replacing OrthographicCamera, updated position/lookAt |
| Rewrite | `src/features/home/components/FluidShader.tsx` | Subdivided PlaneGeometry in XZ, wireframe ShaderMaterial, mouse ray-plane intersection |
| Rewrite | `src/features/home/shaders/fluid.vert.glsl` | Multi-octave noise Y displacement + mouse influence, output vDisplacement |
| Rewrite | `src/features/home/shaders/fluid.frag.glsl` | Displacement-based color ramp, glow, theme tint, color mode adaptation |

No new files. No new dependencies. Shared `src/shaders/noise.glsl` used as-is.
