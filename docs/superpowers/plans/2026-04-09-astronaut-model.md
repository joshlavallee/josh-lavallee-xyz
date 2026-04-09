# Astronaut Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating astronaut model to the lost-in-space scene, positioned just outside the planet's limb in the bottom-right, with rim-lit material reflecting planet glow, FloatGroup bobbing, and mouse-driven parallax tilt + drift.

**Architecture:** Download the "Little Astronaut" GLB from Sketchfab (Jellever, CC-BY) to `/public/models/`. Create a new `Astronaut.tsx` component that loads it via `useGLTF`, replaces its material with the existing silhouette rim-light shader (tuned for warm orange/green planet glow), wraps it in `FloatGroup` for bobbing, and adds mouse-driven rotation/drift via `useFrame` + R3F's `useThree` pointer state. Integrate into `PlanetScene.tsx`.

**Tech Stack:** React Three Fiber, @react-three/drei (useGLTF), Three.js ShaderMaterial, existing silhouette shaders

---

### Task 1: Download and place the astronaut GLB

**Files:**
- Create: `public/models/Astronaut.glb`

- [ ] **Step 1: Download the model from Sketchfab**

Go to https://sketchfab.com/3d-models/12184db58b1f44c987537b5607c32098 and download the GLB format. Place the file at `public/models/Astronaut.glb`.

Note: This is a manual step — Sketchfab requires authentication to download. The engineer must download this themselves.

- [ ] **Step 2: Verify the file is in place**

Run: `ls -la public/models/Astronaut.glb`
Expected: File exists, roughly 0.6MB

- [ ] **Step 3: Commit**

```bash
git add public/models/Astronaut.glb
git commit -m "feat(planet): add Little Astronaut GLB model (Jellever, CC-BY)"
```

---

### Task 2: Create the Astronaut component with rim-lit material

**Files:**
- Create: `src/features/planet/components/Astronaut.tsx`

**Reference files (read these first):**
- `src/features/planet/components/AstronautFigure.tsx` — existing silhouette material pattern (`useSilhouetteMaterial`)
- `src/features/planet/shaders/silhouette.vert.glsl` — vertex shader (passes normals + eye position)
- `src/features/planet/shaders/silhouette.frag.glsl` — fragment shader (Fresnel rim glow)
- `src/features/about/components/Butterfly.tsx` — GLB loading pattern with typed nodes/materials

- [ ] **Step 1: Create the Astronaut component**

Create `src/features/planet/components/Astronaut.tsx`:

```tsx
import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import vertexShader from '../shaders/silhouette.vert.glsl?raw'
import fragmentShader from '../shaders/silhouette.frag.glsl?raw'

// Warm orange-green rim to reflect planet glow
const RIM_COLOR = new THREE.Vector3(0.85, 0.55, 0.15)

function useAstronautMaterial() {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uRimColor: { value: RIM_COLOR },
          uRimPower: { value: 2.5 },
          uRimIntensity: { value: 0.8 },
        },
        vertexShader,
        fragmentShader,
      }),
    []
  )
}

interface AstronautProps {
  position?: [number, number, number]
  scale?: number
}

export default function Astronaut({
  position = [0, 0, 0],
  scale = 0.15,
}: AstronautProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/Astronaut.glb')
  const material = useAstronautMaterial()
  const { pointer } = useThree()

  // Smooth mouse tracking values
  const smoothMouse = useRef({ x: 0, y: 0 })

  // Apply custom material to all meshes in the model
  useMemo(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material
      }
    })
  }, [scene, material])

  useFrame((_state, delta) => {
    if (!groupRef.current) return

    // Lerp toward current mouse position for smooth feel
    const lerpFactor = 1 - Math.pow(0.05, delta)
    smoothMouse.current.x += (pointer.x - smoothMouse.current.x) * lerpFactor
    smoothMouse.current.y += (pointer.y - smoothMouse.current.y) * lerpFactor

    const mx = smoothMouse.current.x
    const my = smoothMouse.current.y

    // Parallax tilt — subtle rotation toward cursor
    groupRef.current.rotation.y = mx * 0.15
    groupRef.current.rotation.x = -my * 0.1

    // Gentle drift — mouse position nudges the astronaut
    groupRef.current.position.x = position[0] + mx * 0.08
    groupRef.current.position.y = position[1] + my * 0.05
    groupRef.current.position.z = position[2]
  })

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/models/Astronaut.glb')
```

- [ ] **Step 2: Verify the component compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/features/planet/components/Astronaut.tsx
git commit -m "feat(planet): add Astronaut component with rim-lit material and mouse interaction"
```

---

### Task 3: Integrate astronaut into the scene

**Files:**
- Modify: `src/features/planet/components/PlanetScene.tsx`

**Reference files (read these first):**
- `src/features/planet/components/FloatGroup.tsx` — bobbing/swaying wrapper
- `src/features/planet/components/Astronaut.tsx` — the component from Task 2

- [ ] **Step 1: Add the astronaut to PlanetScene**

Edit `src/features/planet/components/PlanetScene.tsx` to add the astronaut wrapped in FloatGroup, positioned just outside the planet's limb in the bottom-right of the viewport:

```tsx
import { PerspectiveCamera } from '@react-three/drei'
import type { ColorMode, UIStyle } from '@/providers/theme-provider'
import TauCetiPlanet from './TauCetiPlanet'
import Starfield from './Starfield'
import FloatGroup from './FloatGroup'
import Astronaut from './Astronaut'

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
      <Starfield />

      {/* Planet massive, limb arc from left-center to bottom-right */}
      <group position={[-3.0, 3.0, -2.5]} scale={6.0}>
        <TauCetiPlanet />
      </group>

      {/* Astronaut floating just outside the planet limb, bottom-right */}
      <FloatGroup
        position={[1.2, -0.8, 0.5]}
        bobSpeed={0.3}
        bobAmplitude={0.015}
        swaySpeed={0.2}
        swayAmplitude={0.008}
        rotationSpeed={0.04}
      >
        <Astronaut scale={0.15} />
      </FloatGroup>
    </>
  )
}
```

Key position reasoning:
- `[1.2, -0.8, 0.5]` places the astronaut bottom-right of the viewport, just outside the planet's limb arc
- Camera is at `[0, 0, 3]` so z=0.5 keeps it well in front
- FloatGroup params are slower/smaller than defaults for a gentle, dreamy float
- Scale `0.15` keeps the astronaut small relative to the massive planet

- [ ] **Step 2: Verify the scene renders**

Run: `npm run dev`
Open the browser at the lost-in-space route. Verify:
- The astronaut model loads and is visible bottom-right
- It has a warm orange rim-light glow (not green)
- It bobs gently via FloatGroup
- Moving the mouse subtly tilts the astronaut and drifts its position
- Planet is unchanged

- [ ] **Step 3: Tune position and scale if needed**

The astronaut position `[1.2, -0.8, 0.5]` and scale `0.15` are starting values. Adjust based on visual inspection:
- Move the position along X/Y to sit just outside the planet limb
- Adjust scale if the astronaut feels too large or too small against the planet
- Tweak the mouse influence multipliers in `Astronaut.tsx` (rotation: `0.15`/`0.1`, drift: `0.08`/`0.05`) if the effect feels too strong or too subtle

- [ ] **Step 4: Commit**

```bash
git add src/features/planet/components/PlanetScene.tsx
git commit -m "feat(planet): integrate floating astronaut into lost-in-space scene"
```

---

### Task 4: Add CC-BY attribution

**Files:**
- Modify or create: Attribution in an appropriate location (e.g. a credits section, or a comment in the component)

- [ ] **Step 1: Add attribution comment to Astronaut.tsx**

Add a comment at the top of `src/features/planet/components/Astronaut.tsx`:

```tsx
/**
 * "Little Astronaut" model by Jellever (Jelle Vermandere)
 * https://sketchfab.com/3d-models/12184db58b1f44c987537b5607c32098
 * License: CC-BY 4.0
 */
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/components/Astronaut.tsx
git commit -m "feat(planet): add CC-BY attribution for Little Astronaut model"
```
