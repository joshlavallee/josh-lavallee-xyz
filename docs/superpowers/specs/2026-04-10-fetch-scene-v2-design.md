# Fetch Scene v2 Design

Interactive /fetch route: player controls a butterfly over an infinite procedural grass field while a dog chases it autonomously. Five switchable biomes, stylized sun/moon celestial bodies, and day/night lighting driven by color mode.

## Overview

This design replaces the v1 sphere-world concept with a flat, infinite grass plane. The player controls a butterfly using keyboard (desktop) or virtual joystick (mobile). A dog chases the butterfly through a dense procedural grass field rendered with a custom instanced shader based on the Nitash-Biswas grass-shader-glsl approach. The dog leaves a visible trail wake in the grass that springs back over time.

The scene features a biome system with 5 switchable environments, each defining grass colors, flower types, glow intensity, and mood. A stylized sun sits on the left horizon in light mode; a bold moon sits on the right horizon in dark mode. Day lighting is warm, night lighting is cool with bioluminescent flora.

## Architecture

### Scene Graph

```
<FetchScene>
  ├── FollowCamera (third-person, behind dog)
  ├── Lighting
  │   ├── Sun (left horizon, light mode) or Moon (right horizon, dark mode)
  │   ├── Directional light (matches celestial body)
  │   ├── Ambient light (warm day / cool night)
  │   └── Hemisphere light
  ├── Sky (gradient background, day/night variant)
  ├── Stars (night mode only, drei <Stars>)
  ├── <GrassField> (single InstancedMesh, recycling around characters)
  │   └── All vegetation: grass blades + flower variants via bladeType attribute
  ├── Ground plane (simple mesh under the grass, scrolls with field)
  ├── Dog (world space, chase AI)
  ├── Butterfly (world space, player controlled)
  ├── BiomeSelector (small UI overlay, HTML)
  └── InputManager (keyboard + virtual joystick)
```

### Key Architectural Decisions

- No sphere. Dog and butterfly both live in world space on a flat plane.
- Camera follows the action (third-person behind dog) instead of staying fixed.
- Grass field recycles around the characters to create the infinite illusion.
- Dog chases the butterfly directly in world coordinates.
- Single unified shader handles all vegetation (grass + flowers) via per-instance `bladeType` attribute.
- Biome switching lerps shader uniforms, no asset swapping.

### File Structure

```
src/features/fetch/
  ├── components/
  │   ├── FetchScene.tsx        — top-level scene, lighting, camera, biome state
  │   ├── GrassField.tsx        — InstancedMesh, LOD, recycling logic
  │   ├── Dog.tsx               — chase AI, animations (adapted from existing)
  │   ├── Butterfly.tsx         — player-controlled (adapted from existing)
  │   ├── Sun.tsx               — emissive sphere + corona rays
  │   ├── Moon.tsx              — emissive sphere + glow halo
  │   ├── BiomeSelector.tsx     — HTML overlay UI for biome cycling
  │   └── VirtualJoystick.tsx   — mobile touch overlay (HTML)
  ├── hooks/
  │   ├── useInput.ts           — unified keyboard + joystick input
  │   └── useTrailWake.ts       — circular buffer of dog positions for shader
  ├── shaders/
  │   ├── grass.vert.glsl       — vertex shader (wind, LOD, trail wake, flower variants)
  │   └── grass.frag.glsl       — fragment shader (biome colors, lighting, glow)
  ├── lib/
  │   └── biomes.ts             — biome data definitions (the 5 biome objects)
  └── index.ts                  — barrel export
```

The existing `src/features/about/` directory will be replaced by `src/features/fetch/`.

## Grass Shader System

### Geometry

Each grass blade is a tapered triangle strip. Two LOD levels:
- **High detail**: 7 segments (14 triangles + 1 tip triangle). Used within ~20 units of camera.
- **Low detail**: 1 segment (2 triangles + 1 tip triangle). Used beyond ~20 units.

Base width: ~0.06 units, tapering progressively to a point via a taper constant. Height normalized to 1.0, scaled per-instance.

Two `InstancedMesh` refs (one per LOD level) share the same `ShaderMaterial`. Each frame, instances are assigned to high or low detail based on camera distance.

### Per-Instance Attributes

Set once at initialization, randomized:
- `instanceMatrix` - standard THREE.js position, Y-axis rotation (random 0-2pi), and scale
- `bladeType` - float: 0.0 = normal grass, 1.0 = tall grass, 2.0 = flower type A, 3.0 = flower type B. Controls vertex shape in the shader.
- `bladeRand` - float: random 0-1 seed for per-blade variation (lean angle, sway phase offset, color jitter)

### Vertex Shader

Adapted from the Nitash-Biswas reference with additions:

**Bezier bending**: Each blade bends from base to tip using a quadratic Bezier curve. Bend strength and start height are randomized per-instance via a hash of the instance position. The `bezier(t, p1)` function from the reference controls the curvature profile.

**Wind system (dual-layer from reference):**
- Gentle sway: `sin(uTime * uSpeed * 0.8 + hash * 10.0) * 0.1` applied in the xz plane, scaled by vertex height
- Strong wind: Classic Perlin noise (`cnoise()`) sampled at world position with time offset, applied as a directional force with `pow(y, 2.0)` falloff from base

**Billboard rotation**: Blades rotate around Y to face the camera, maximizing visual density. Uses `atan(toCamera2D.y, toCamera2D.x)` to compute the angle, applied via a Y-rotation matrix.

**Dog interaction**: `u_dogPosition` vec3 uniform updated each frame. Blades within a radius (~0.4 units) of the dog bend away from it, scaled by distance and vertex height.

**Trail wake**: `u_trailPositions` uniform (array of ~30 vec3 entries: x, z, age). Each blade checks distance to all trail points. Within trample radius (~0.4 units), the blade flattens (Y scale reduced, bent outward). The flatten amount decays with the trail point's age, springing back over ~2-3 seconds using a smoothstep falloff.

**Flower variants**: When `bladeType >= 2.0`, the vertex shader modifies the geometry: wider petals instead of tapering, shorter stem. The specific widening and shape depend on the `bladeType` value, creating distinct flower silhouettes.

### Fragment Shader

**Color gradient**: `smoothstep` interpolation between `u_baseColor` (ground level) and `u_tipColor` (blade tip) based on `vElevation`.

**Side gradient**: Cross-blade gradient from the reference creates fake curved surface normals for depth.

**Lighting**: Directional light + ambient light, computed in the fragment shader (reference pattern). Light direction and color come from uniforms that change with day/night.

**Night blend**: `u_nightBlend` (0.0 day, 1.0 night) shifts all colors cooler and darker. Applied as a mix toward the biome's night palette.

**Bioluminescence**: For flower bladeTypes, an additive glow term is applied: `flowerColor * u_nightBlend * u_glowIntensity`. Flowers glow at night in biomes that support it.

**Distance fog**: `smoothstep` blend between fragment color and `u_fogColor` based on camera distance. Fog color is biome-specific and changes between day/night variants.

### Recycling (Infinite Plane)

- Field size: 60x60 units, ~100,000-200,000 total instances
- Each frame, compute the "field center" as the midpoint of dog and butterfly positions
- Instances use modular arithmetic on their world position relative to the field center
- When an instance's position falls outside the field bounds, its position wraps to the opposite edge via `setMatrixAt()` update
- Only boundary-crossing instances need matrix updates each frame, not the full set

### Ground Plane

A large flat mesh positioned at Y=0 beneath the grass. Color is biome-specific (`groundColor`) and transitions with biome switches. The plane follows the field center each frame so it always extends beyond the grass boundaries. Sized larger than the grass field (e.g. 80x80) to avoid visible edges.

## Biome System

### Biome Data Structure

```ts
interface Biome {
  name: string
  baseColor: [number, number, number]
  tipColor: [number, number, number]
  flowerColorA: [number, number, number]
  flowerColorB: [number, number, number]
  groundColor: [number, number, number]
  fogColor: [number, number, number]
  fogColorNight: [number, number, number]
  grassHeight: number
  flowerDensity: number
  glowIntensity: number
  windStrength: number
}
```

### Biome Definitions

**Enchanted Meadow**: Deep emerald base, bright lime tips, purple + blue flowers. Medium bioluminescent glow. Spring fantasy feel.

**Golden Prairie**: Dark olive base, warm gold tips, red poppies + blue cornflowers. No glow. Warm wheat field matching the Nitash-Biswas reference palette.

**Twilight Grove (default)**: Dark teal base, seafoam tips, cyan + magenta flowers. Strong bioluminescent glow. Enchanted forest floor with luminous mushroom-like flora.

**Cherry Blossom**: Soft green base, pink-tipped grass, pink + white flowers. Low glow. Serene Japanese garden feel.

**Volcanic Ashlands**: Charcoal base, ember orange tips, red + gold flowers. Medium glow (ember-like). Dramatic fire field that connects to the planet scene's red mode.

### Biome Selector UI

- HTML overlay in the bottom-right corner
- Small floating pill showing current biome name with left/right arrows to cycle
- Keyboard shortcut: `[` and `]` keys
- Styled to match the portfolio's `uiStyle` (glass/flat/paper)
- Not rendered in 3D, sits on top of the canvas

### Biome Transitions

When the user switches biomes, all relevant uniforms lerp simultaneously over ~1.5 seconds in the `useFrame` loop using `THREE.MathUtils.lerp`:
- Grass colors (`u_baseColor`, `u_tipColor`, `u_flowerColorA`, `u_flowerColorB`)
- Ground plane color
- Fog colors (day and night variants)
- Grass height scale, flower density threshold, glow intensity, wind strength

No hard cuts. Everything blends smoothly.

## Camera System

### Third-Person Follow Cam

- **Target**: Dog's world position
- **Offset**: ~4 units behind the dog (opposite its facing direction), ~3 units above
- **Look-at**: A weighted point between dog (60%) and butterfly (40%), so the butterfly stays visible ahead
- **Smoothing**: Both position and look-at target use lerp with factor ~0.03-0.05 for a floaty, cinematic feel
- **Initial state**: Camera starts at a default position and lerps into the follow position on first frame, no jarring snap

No manual camera controls. The camera is fully automated; the player only controls the butterfly.

### Framing

From this angle, the grass fills the lower 2/3 of the screen. The dog is centered, the butterfly visible ahead, and the sun/moon on the horizon provides a visual anchor. This matches the immersive ground-level feel from the reference screenshot.

## Celestial Bodies & Lighting

### Sun (Light Mode)

- Sphere mesh with emissive material, offset `[-30, 5, 0]` relative to the field center (low on left horizon). Repositioned each frame to stay on the horizon as characters move.
- Corona: a second larger transparent sphere/ring with additive-blend material, soft yellow-orange glow
- Subtle animated pulse on ray intensity (slow sine wave)
- Directional light positioned to match sun direction
- Color: warm white `#FFF5E6`, intensity 1.5

### Moon (Dark Mode)

- Sphere mesh with emissive material, offset `[30, 8, 0]` relative to field center (right horizon, slightly higher). Repositioned each frame like the sun.
- Glow halo: same technique as sun but cool white/blue
- Optional subtle crater detail via noise-based fragment shader on surface
- Directional light matches moon position
- Color: cool blue `#CCE5FF`, intensity 0.6

### Lighting Table

| Property | Day | Night |
|----------|-----|-------|
| Directional color | #FFF5E6 (warm white) | #CCE5FF (cool blue) |
| Directional intensity | 1.5 | 0.6 |
| Ambient color | #B0D4F1 (sky blue) | #1A1A3A (deep navy) |
| Ambient intensity | 0.4 | 0.15 |
| Hemisphere sky | #87CEEB | #0A0A2A |
| Hemisphere ground | #4A8C3F | #1A1A3A |
| Hemisphere intensity | 0.3 | 0.15 |
| Fog | Biome-specific day | Biome-specific night |

### Day/Night Transition

When `colorMode` toggles:
- All lighting values lerp over ~1 second
- Sun fades out (scale to 0 + opacity to 0) while moon fades in, and vice versa
- `u_nightBlend` in grass shader lerps 0 to 1 simultaneously
- Stars (drei `<Stars>`) fade in/out with the moon
- Bioluminescent flower glow scales with `u_nightBlend * glowIntensity`

### Sky Background

- Day: gradient from sky blue at top to warm white near horizon
- Night: dark navy at top to deep blue near horizon
- Transitions smoothly with the rest of the lighting

## Dog (Autonomous Chase AI)

### State Machine

Uses the existing walk/run/idle state machine from the current `Dog.tsx`:
- **Idle**: plays Idle animation, distance to butterfly < 0.5 units
- **Walk**: approaches butterfly at speed 1.2, distance 0.5-1.2 units
- **Run**: sprints toward butterfly at speed 2.2, distance > 1.2 units

Animation crossfades at 0.2 seconds (existing behavior).

### Changes from Current Implementation

- Remove `MAX_RADIUS` constraint (no longer bounded)
- Replace `pointerTarget` prop with a ref to the butterfly's world position
- Each frame, push current position into the trail wake buffer (via `useTrailWake` hook)

### Existing Assets

Dog.glb with animations: Idle, Walk, Run, Jump_Start, Jump_Loop, Death, Headbutt, Idle_Eating. Chase system uses Idle, Walk, Run.

## Butterfly (Player Controlled)

### Movement

- Controlled via `useInput()` hook (WASD/arrows/joystick)
- Moves in world space at ~3 units/second
- Hover height: ~1.0 unit above ground
- Smooth movement, position updated each frame: `pos += input * speed * delta`

### Animation

Carried over from existing implementation:
- Y-axis bob: `sin(t * 3.5) * 0.12`
- Wing flutter: Z-rotation `sin(t * 20) * 0.15`
- Facing: smooth lerp toward movement direction

### Changes from Current Implementation

- Replace pointer-follow (`pointerTarget` lerp) with direct `useInput()` driven position
- Keep all flutter/animation logic as-is

## Idle Landing Sequence

When no input is received for ~2 seconds:
1. Butterfly slows drift, hovers in place
2. Dog approaches, transitions to Idle animation, sits
3. Butterfly descends toward dog's head bone world position over ~1 second
4. Both idle: butterfly perched, wing flutter reduced in amplitude

Resume: any input lifts butterfly back to hover height. Dog reacts with 0.2-0.4s delay before transitioning to chase.

## Input System

### useInput Hook

```ts
function useInput(): { x: number; y: number; active: boolean }
```

- Keyboard: WASD/arrow keys set x/y to -1, 0, or 1
- Joystick: touch position maps to continuous -1 to 1 range
- `active`: true when any input is being received
- Both sources merged; most recent input source takes priority

### Virtual Joystick

- HTML overlay, bottom-left corner, visible only on touch devices
- Touch start shows joystick base at touch point
- Touch move calculates direction and magnitude from center
- Touch end hides and zeros input
- Device detection via `'ontouchstart' in window`

## Trail Wake System

### useTrailWake Hook

Returns a `Float32Array` uniform value and an `addPosition(x, z)` function.

- Circular buffer of ~30 entries, each storing `[x, z, age]`
- New position appended every ~0.1 seconds (throttled, not every frame)
- Ages increment each frame by delta
- Entries older than ~3 seconds are marked stale (age clamped, shader ignores them)
- The `Float32Array` is passed as `u_trailPositions` uniform to the grass shader

### Shader Integration

In the vertex shader, each blade iterates over the trail buffer. For each entry within the trample radius (~0.4 units), the blade flattens proportionally. Flatten amount decays with age via `smoothstep(0.0, 3.0, age)`, creating a spring-back effect.

## What Gets Reused vs. Rewritten

| Component | Status |
|-----------|--------|
| Dog.tsx | Adapted: remove MAX_RADIUS, swap pointerTarget for butterfly position ref |
| Butterfly.tsx | Adapted: replace pointer-follow with useInput() movement |
| AboutScene.tsx | Replaced entirely by FetchScene.tsx |
| Noise utility (src/shaders/noise.glsl) | Reused via NOISE_PLACEHOLDER pattern |
| Shader import pattern (?raw) | Followed for new grass shaders |
| useFrame/uniform update pattern | Followed for all new components |

## Scope

### Core (must have)
- Infinite grass plane with recycling
- Grass shader (wind, Bezier bending, billboard, LOD)
- Dog chase AI (existing state machine, adapted)
- Butterfly keyboard controls via useInput()
- Third-person follow camera
- Day/night lighting with sun/moon
- Twilight Grove biome (default)

### Polish (should have)
- All 5 biomes with selector UI and smooth transitions
- Flower variants in the shader
- Dog trail wake
- Idle landing sequence
- Bioluminescent glow at night
- Virtual joystick for mobile

### Stretch
- Moon surface crater detail shader
- Sun animated ray particles
- Biome-specific ambient particles (fireflies, embers, petals)
- Sound effects
