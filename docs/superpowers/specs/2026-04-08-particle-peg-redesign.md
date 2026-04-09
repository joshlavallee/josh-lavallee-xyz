# Particle Peg Redesign

## Overview

Rename the Photography page to "Particle Peg" (Winnipeg landmarks rendered as particles), add 3D depth to the particle system, introduce constrained orbit controls for user exploration, and increase idle particle drift for a more dynamic feel.

## Rename

All user-visible references change from "Photography" to "Particle Peg":

- **Nav item:** label becomes `'Particle Peg'`, icon changes from `Camera` to `Waypoints` (lucide-react), route changes to `/particlepeg`
- **Route file:** `src/routes/photography.tsx` renamed to `src/routes/particlepeg.tsx`
- **Route path:** `/photography` becomes `/particlepeg`
- **Experience router:** path check updates from `'/photography'` to `'/particlepeg'`
- **Display title:** Bottom nav bar on the page shows "Particle Peg" as the header
- **Feature directory:** `src/features/photography/` stays unchanged (internal, not user-facing)

## Camera & Orbit Controls

Switch from orthographic to perspective camera with constrained orbit controls.

### Camera

- Type: PerspectiveCamera (replaces OrthographicCamera)
- Position: `[0, 0, 5]`
- FOV: 50
- Near: 0.1, Far: 100

### OrbitControls (from @react-three/drei)

- Horizontal rotation: full 360 degrees (no azimuth limit)
- Vertical rotation: ±45 degrees from horizontal (`minPolarAngle: Math.PI/4`, `maxPolarAngle: 3*Math.PI/4`)
- Zoom: `minDistance: 2`, `maxDistance: 8`
- `enablePan: false`
- `enableDamping: true`, `dampingFactor: 0.05`
- `autoRotate: false`

### Point Size

With perspective camera, particles need size attenuation so they scale with distance. Add perspective scaling in the vertex shader: `gl_PointSize = (size * pointSizeUniform) * (viewportHeight / length(mvPosition.xyz))` or use a similar perspective projection factor. The `pointSizeUniform` value may need tuning since the orthographic size assumptions no longer apply.

## Particle Depth (Z-Axis)

Currently all particles sit at Z=0. Two layers of depth are added during `imageToParticles` processing:

### Brightness-Based Z Offset

- Map particle brightness to Z position
- Brighter particles pushed forward: `z = brightness * 0.4`
- Range: 0.0 (darkest) to ~0.4 (brightest)
- Gives landmarks a subtle relief/topographic feel

### Random Z Scatter

- Additional random Z per particle: `(Math.random() - 0.5) * 0.15`
- Small enough to preserve image shape, large enough to feel volumetric when orbiting
- Combined with brightness offset for structured organic depth

### Lerp Transitions

The existing lerp system already handles XYZ position arrays (3 floats per particle). Z values will naturally interpolate when switching photos, morphing depth between landmarks.

## Particle Drift (Increased Movement)

The current idle animation is barely visible (`noise * 0.002`). Changes to the vertex shader:

- XY drift amplitude: `0.002` → `0.012` (6x increase)
- New Z drift amplitude: `0.008` (slightly less than XY to preserve depth structure)
- Noise time factor: `0.15` → `0.1` (slower, more floaty)
- Different noise seeds per axis so particles drift independently

Touch displacement also gains a Z component so particles scatter in all three dimensions.

## Touch Interaction Update

The `useTouchInteraction` hook currently maps screen coordinates through the orthographic camera to UV space. With a perspective camera, this mapping changes. The hook will use raycasting against a plane at Z=0 (similar to the homepage shader's mouse mapping) to convert pointer position to world-space UV coordinates for the touch texture.

## Codebase Changes

| Action | File | Details |
|---|---|---|
| Edit | `src/components/burger-nav.tsx` | Nav item: `/particlepeg`, label `'Particle Peg'`, icon `Waypoints` |
| Rename | `src/routes/photography.tsx` → `src/routes/particlepeg.tsx` | Route path, display title |
| Regenerate | `src/routeTree.gen.ts` | Auto-generated after route rename |
| Edit | `src/Experience.tsx` | Path check `'/photography'` → `'/particlepeg'` |
| Edit | `src/features/photography/lib/image-to-particles.ts` | Add brightness Z offset + random Z scatter |
| Edit | `src/features/photography/components/ParticlePhotography.tsx` | PerspectiveCamera, OrbitControls |
| Edit | `src/features/photography/components/ParticleSystem.tsx` | Point size attenuation for perspective |
| Edit | `src/features/photography/shaders/particle.vert.glsl` | Drift amplitude increase, Z drift, Z scatter on touch, perspective point size |
| Edit | `src/features/photography/hooks/useTouchInteraction.ts` | Raycasting for perspective camera coordinate mapping |

No new files. No new dependencies (OrbitControls already available in drei).
