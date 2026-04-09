# Fetch Scene Design

Interactive /fetch route: player controls a butterfly over a rolling grass sphere while a dog chases it autonomously.

## Overview

The /fetch scene replaces the current pointer-following demo with a playful interactive experience. The player controls a butterfly using keyboard (desktop) or virtual joystick (mobile). A dog chases the butterfly across a procedurally generated grass field that covers a 3D sphere. The sphere rotates under the characters to create the illusion of movement, similar to rolling a ball underfoot. When the player stops providing input, the dog catches up and the butterfly lands on the dog's nose.

The scene respects the portfolio's color mode: warm sunlight by day, moonlit field with stars by night.

## Architecture

### Scene Graph

```
<FetchScene>
  ├── Fixed Camera (overhead ~45° angle)
  ├── Lighting (sun or moon, based on colorMode)
  ├── <SphereWorld> (rotating group)
  │   ├── Sphere mesh (ground)
  │   ├── GrassField (InstancedMesh on sphere surface)
  │   └── Dog (child of sphere, chases butterfly in local coords)
  ├── Butterfly (world space, player controlled)
  ├── Sky / Stars (environment, stays fixed)
  └── InputManager (keyboard + virtual joystick)
```

### Key Architectural Decision

The butterfly lives in **world space**. The dog and grass are **children of the sphere group**. Player input rotates the sphere, not the butterfly. The butterfly stays near the center of the scene with a subtle drift in the input direction. The sphere spinning underneath creates the illusion of the butterfly flying over the ground.

This means:
- Camera stays fixed, no chase logic needed
- Dog movement is in sphere-local coordinates
- Grass instances rotate naturally with the sphere
- The butterfly's world position is trivially available for the dog's chase target (project into sphere-local space)

### File Structure

```
src/features/fetch/
  ├── components/
  │   ├── FetchScene.tsx        — top-level scene, lighting, camera
  │   ├── SphereWorld.tsx       — rotating sphere group
  │   ├── GrassField.tsx        — InstancedMesh + custom shader
  │   ├── Dog.tsx               — chase AI, animations
  │   ├── Butterfly.tsx         — player-controlled, flutter animation
  │   ├── DayEnvironment.tsx    — sun lighting, sky
  │   ├── NightEnvironment.tsx  — moon, stars, moonlight
  │   └── VirtualJoystick.tsx   — mobile touch overlay (HTML)
  ├── hooks/
  │   ├── useInput.ts           — unified keyboard + joystick input
  │   └── useDogAI.ts           — chase state machine
  ├── shaders/
  │   ├── grass.vert            — vertex shader for grass bending
  │   └── grass.frag            — fragment shader for grass color
  └── index.ts                  — barrel export
```

The existing `src/features/about/` directory will be renamed to `src/features/fetch/` to match the route rename.

## Sphere World

### Sphere Geometry

A standard sphere mesh serves as the ground. Radius TBD during implementation (likely 3-5 units). The sphere has a simple ground material (earthy brown/green base, no grass texture needed since the instanced grass covers it).

### Rotation Mechanics

Player input maps to sphere rotation:
- W/Up: sphere rotates toward camera (positive X-axis rotation)
- S/Down: sphere rotates away from camera (negative X-axis rotation)
- A/Left: sphere rotates right (positive Z-axis rotation)
- D/Right: sphere rotates left (negative Z-axis rotation)

Rotation speed is applied smoothly via lerp, not instant. The sphere rolls fluidly in response to input. Diagonal input (e.g., W+D) combines both axes.

## Grass System

### Blade Geometry

Each grass blade is a simple tapered triangle strip (3-5 vertices), narrow at the tip and wider at the base. Variation is baked into per-instance attributes at initialization:

- **Height**: 0.3 - 0.8 units (randomized)
- **Width**: 0.02 - 0.05 units
- **Color**: HSL variation around base green (hue 90-140, saturation 40-70%, lightness 25-45%)
- **Lean**: slight random tilt per blade

### Distribution

Grass blades are distributed across the **upper hemisphere only** using Fibonacci sphere sampling (golden angle distribution). This gives even coverage without clustering. The lower hemisphere has no grass since the camera never sees it, saving ~50% of instance count.

Target density: 10,000-20,000 instances. Final count tuned during implementation for visual quality vs. performance.

### Custom Shader Material

A custom `ShaderMaterial` on the `InstancedMesh` handles two effects:

**Wind sway**: A sine wave based on elapsed time + world position creates gentle ambient swaying. The amplitude scales with vertex height (tips move most, roots are fixed).

**Dog interaction**: The dog's position is passed as a `u_dogPosition` uniform each frame. In the vertex shader, each vertex calculates its distance to the dog. Within a repulsion radius, blades bend **away** from the dog, scaled by:
- Distance (closer = more bend)
- Vertex height (tips bend most, roots stay fixed)

Both effects blend additively in the vertex shader.

### Color Mode Adaptation

A `u_nightBlend` uniform (0.0 for day, 1.0 for night) shifts grass colors in the fragment shader: darker values, slight blue tint in night mode.

## Butterfly (Player Controlled)

### Movement

The butterfly does not traverse the scene. It stays near center with a subtle drift (max ~0.5 units) in the input direction, lerped smoothly. The visual effect of movement comes entirely from the sphere rotating underneath.

### Visual Feel

- **Hover height**: ~1.5 units above the sphere surface
- **Flutter**: gentle Y oscillation (bob) + Z rotation (wing tilt), carried over from existing implementation
- **Facing**: rotates toward movement direction with smooth lerp
- **Movement feel**: smooth and responsive, direct control. Goes where you point it.

### Existing Butterfly.glb

The current Butterfly component uses a static mesh. The flutter is simulated via scale pulsing and rotation in the useFrame loop. This approach carries forward, potentially enhanced with more convincing wing animation if the model supports it.

## Dog (Autonomous Chase AI)

### State Machine

The dog uses a 4-state chase behavior:

**IDLE**: Dog sits, plays Idle animation. Transitions to SPRINT when butterfly moves (input detected or distance increases past threshold).

**SPRINT**: Dog runs directly at the butterfly's position projected into sphere-local space. Speed is 2.5-3x base speed. Uses Run animation. Has a slight randomized delay before starting (0.1-0.3s) for personality. Transitions to OVERSHOOT when close enough to the butterfly.

**OVERSHOOT**: Dog keeps momentum past the target, decelerating gradually. Creates a skidding/bounding feel. Duration 0.3-0.6s. Transitions Run to Walk animation during deceleration. Transitions to TROT when speed drops below threshold.

**TROT**: Dog walks at base speed, re-acquires butterfly position, approaches smoothly. Uses Walk animation. If the butterfly bolts (distance suddenly increases), transitions back to SPRINT.

### Sphere-Local Movement

The dog is a child of the sphere group, so it moves in local coordinates. Its position is stored as a point on the sphere surface using spherical coordinates (theta, phi). Each frame, the dog steps toward the target by adjusting theta/phi, then converts to Cartesian (x, y, z) at the sphere's radius. The dog's "up" vector is the sphere normal at its position, and it faces its movement direction projected onto the tangent plane. The chase target is the butterfly's world position transformed into the sphere group's local space, then projected onto the sphere surface.

### Animation Integration

The existing Dog.glb includes these animations: Idle, Walk, Run, Jump_Start, Jump_Loop, Death, Headbutt, Idle_Eating. The chase system uses Idle, Walk, and Run with crossfade transitions (0.2s). Jump_Start could be used for the initial sprint burst as a stretch goal.

## Idle Landing Sequence

When no input is received for ~2 seconds:

1. **0-2s**: Butterfly slows drift, hovers in place. Dog approaches at trot speed.
2. **2-3s**: Dog reaches butterfly, transitions to Idle animation, sits.
3. **3-4s**: Butterfly descends, lerps toward the dog's head bone world position over ~1s.
4. **4s+**: Butterfly perched on dog's nose. Wing flutter reduced in amplitude. Both characters idle.

**Resume**: Any input immediately lifts the butterfly back to hover height. The dog has a brief reaction delay (0.2-0.4s) before transitioning to SPRINT. This beat makes the dog feel like it's reacting, not teleporting.

**Implementation**: The dog's head bone (from AnimalArmature skeleton) provides the landing target. Each frame during the landing sequence, get the bone's world position and lerp the butterfly toward it.

## Lighting & Environment

### Day Mode (Light Theme)

- **Directional light**: Position [5, 10, 5], intensity 1.5, warm white (#FFF5E6). Acts as the sun.
- **Ambient light**: Intensity 0.4, sky blue tint (#B0D4F1)
- **Hemisphere light**: Sky #87CEEB, ground #4A8C3F, intensity 0.3
- **Background**: Soft sky gradient (drei Sky component or gradient texture)
- **Shadow**: Subtle directional shadow from the sun

### Night Mode (Dark Theme)

- **Directional light**: Position [-3, 8, -3], intensity 0.6, cool moonlight (#CCE5FF)
- **Ambient light**: Intensity 0.15, deep blue (#1A1A3A)
- **Stars**: drei `<Stars>` component, radius 50, count ~2000, fade enabled
- **Moon**: Simple sphere with emissive material, positioned in the sky
- **Background**: Dark navy gradient
- **Grass**: Colors shift darker with blue tint via `u_nightBlend` shader uniform

### Theme Transitions

When the user toggles color mode, lighting crossfades smoothly. The `u_nightBlend` uniform lerps from 0 to 1 (or vice versa) over ~1 second.

## Mobile Controls

### Virtual Joystick

An HTML overlay rendered on top of the R3F canvas, visible only on touch devices.

- **Position**: Bottom-left corner
- **Behavior**: Touch start shows the joystick base at the touch point. Touch move calculates direction and magnitude from the center. Touch end hides and zeros input.
- **Output**: Normalized x/y values (-1 to 1), same interface as keyboard

### useInput Hook

A shared `useInput()` hook abstracts both input sources:

```ts
function useInput(): { x: number; y: number; active: boolean }
```

- Keyboard: WASD/arrow keys set x/y to -1, 0, or 1
- Joystick: touch position maps to continuous -1..1 range
- `active`: true when any input is being received (used by idle detection)
- Both sources are merged; the most recent input source takes priority

### Device Detection

Use pointer events and `'ontouchstart' in window` to detect touch capability. The joystick overlay renders conditionally. Keyboard input works on all devices.

## Scope and Stretch Goals

### Core (must have)

- Sphere world with rotation mechanics
- Procedural grass field with instanced rendering
- Grass wind sway animation
- Dog chase AI (4-state machine)
- Butterfly keyboard controls
- Day/night lighting matching color mode
- useInput hook (keyboard only for first pass)

### Polish (should have)

- Grass interaction (dog pushing blades aside)
- Idle landing sequence (butterfly on dog's nose)
- Theme transition crossfade
- Virtual joystick for mobile

### Stretch

- Firefly particles in night mode
- Jump animation on sprint start
- Accelerometer mobile controls
- Grass rustling sound effects
