# Floating Silhouettes Design Spec

## Overview

Add two floating silhouette figures (human astronaut + dog) to the planet scene, built from simple Three.js geometry with a green rim light shader. Reposition the planet toward the bottom-left to fill more of the viewport.

## Planet Repositioning

- Shift the planet group position to approximately `[-0.4, -0.3, 0]` (tunable) so it sits in the bottom-left portion of the viewport
- The planet should fill most of the screen while leaving room for the burger nav (top-left, `fixed top-4 left-4 z-50`) and planet controls (bottom-right, `fixed bottom-4 right-4 z-50`)
- Camera stays at `[0, 0, 3]` with 45 FOV

## Silhouette Figures

### Visual Style

- Near-black fill (`#0a0a0a`) with green Fresnel rim light matching the planet's atmosphere color
- Small scale relative to the planet, positioned between the camera and planet surface (z between camera and planet)
- The figures should read as dark shapes silhouetted against the glowing green atmosphere

### Astronaut (Human) Geometry

Built from composed basic Three.js geometries inside a single group:

- **Head**: SphereGeometry (helmet)
- **Torso**: CapsuleGeometry or BoxGeometry with rounded edges
- **Backpack**: Small BoxGeometry attached to the back
- **Arms**: CylinderGeometry, angled slightly outward (zero-gravity pose)
- **Legs**: CylinderGeometry, slightly spread

All meshes share the same silhouette ShaderMaterial.

### Dog Geometry

Built from composed basic Three.js geometries:

- **Body**: CapsuleGeometry (horizontal, elongated)
- **Head**: SphereGeometry, attached at front
- **Ears**: Two small ConeGeometry or flattened SphereGeometry
- **Legs**: Four short CylinderGeometry
- **Tail**: CylinderGeometry, angled upward

All meshes share the same silhouette ShaderMaterial.

### Rim Light Shader

A shared `silhouette.frag.glsl` / `silhouette.vert.glsl` pair:

- **Fill**: Near-black base color
- **Rim**: Fresnel-based edge glow using the planet's green (`~rgba(60, 200, 40)`)
- **Light direction**: Use the same `uSunDirection` uniform as the planet, or derive from the planet's position relative to the figure
- The rim intensity should be subtle, not overpowering

Vertex shader passes `vNormal` and `vViewPosition` (or eye direction) to the fragment shader for Fresnel calculation.

## Float Animation

### Wrapper: FloatGroup

A `FloatGroup` React component that wraps children in a `<group>` and animates position via `useFrame`:

- **Vertical bob**: `sin(time * speed) * amplitude` on the y-axis
- **Lateral sway**: `sin(time * speed * 0.7 + offset) * amplitude * 0.5` on the x-axis
- **Gentle rotation**: Very slow rotation on z-axis for a tumbling-in-space feel
- Each figure gets its own `FloatGroup` with different speed/offset/amplitude parameters so they move independently but stay near each other

### Animation Parameters (defaults)

- Bob amplitude: ~0.02 units
- Bob speed: ~0.5 (slow, dreamy)
- Sway amplitude: ~0.01 units
- Rotation speed: ~0.05 rad/s on z-axis

## Scene Composition

All changes in `PlanetScene.tsx`:

```
<group position={[-0.4, -0.3, 0]}>
  <TauCetiPlanet />
</group>

<FloatGroup position={[0.15, 0.1, 1.2]} bobSpeed={0.5} swaySpeed={0.35}>
  <AstronautFigure scale={0.04} />
</FloatGroup>

<FloatGroup position={[0.3, 0.0, 1.15]} bobSpeed={0.4} swaySpeed={0.3}>
  <DogFigure scale={0.03} />
</FloatGroup>
```

The figures are at z ~1.2 (between camera at z=3 and planet at z=0), positioned slightly right and above center so they overlap the planet's bright face.

## File Structure

New files:
- `src/features/planet/shaders/silhouette.vert.glsl`
- `src/features/planet/shaders/silhouette.frag.glsl`
- `src/features/planet/components/AstronautFigure.tsx`
- `src/features/planet/components/DogFigure.tsx`
- `src/features/planet/components/FloatGroup.tsx`

Modified files:
- `src/features/planet/components/PlanetScene.tsx` (add planet offset, import and render figures)

## Out of Scope

- Interactive controls for figure position/scale (can be added later via PlanetControls)
- Multiple figures or figure variety
- Figure animation beyond floating (no walking, waving, etc.)
