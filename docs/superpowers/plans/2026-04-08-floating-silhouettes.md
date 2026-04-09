# Floating Silhouettes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add floating astronaut + dog silhouettes in front of the Tau Ceti planet, reposition planet bottom-left.

**Architecture:** Simple Three.js geometry figures (capsules, spheres, cylinders) share a Fresnel rim-light shader. A FloatGroup wrapper animates gentle zero-gravity drift. PlanetScene composes everything with the planet offset.

**Tech Stack:** React Three Fiber, Three.js (SphereGeometry, CapsuleGeometry, CylinderGeometry, BoxGeometry), GLSL shaders, `useFrame` for animation.

---

### Task 1: Silhouette Rim Light Shader

**Files:**
- Create: `src/features/planet/shaders/silhouette.vert.glsl`
- Create: `src/features/planet/shaders/silhouette.frag.glsl`

- [ ] **Step 1: Create vertex shader**

Create `src/features/planet/shaders/silhouette.vert.glsl`:

```glsl
varying vec3 vNormal;
varying vec3 vEyePos;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vEyePos = (modelViewMatrix * vec4(position, 1.0)).xyz;

  gl_Position = projectionMatrix * vec4(vEyePos, 1.0);
}
```

- [ ] **Step 2: Create fragment shader**

Create `src/features/planet/shaders/silhouette.frag.glsl`:

```glsl
uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimIntensity;

varying vec3 vNormal;
varying vec3 vEyePos;

void main() {
  vec3 eyeDir = normalize(-vEyePos);

  // Fresnel rim: bright at edges, dark at face-on
  float fresnel = 1.0 - max(dot(vNormal, eyeDir), 0.0);
  float rim = pow(fresnel, uRimPower) * uRimIntensity;

  // Near-black base with green rim glow
  vec3 baseColor = vec3(0.02, 0.02, 0.02);
  vec3 color = baseColor + uRimColor * rim;

  gl_FragColor = vec4(color, 1.0);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/planet/shaders/silhouette.vert.glsl src/features/planet/shaders/silhouette.frag.glsl
git commit -m "feat(planet): add silhouette rim light shader"
```

---

### Task 2: FloatGroup Animation Wrapper

**Files:**
- Create: `src/features/planet/components/FloatGroup.tsx`

- [ ] **Step 1: Create FloatGroup component**

Create `src/features/planet/components/FloatGroup.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

interface FloatGroupProps {
  children: React.ReactNode
  position?: [number, number, number]
  bobSpeed?: number
  bobAmplitude?: number
  swaySpeed?: number
  swayAmplitude?: number
  rotationSpeed?: number
}

export default function FloatGroup({
  children,
  position = [0, 0, 0],
  bobSpeed = 0.5,
  bobAmplitude = 0.02,
  swaySpeed = 0.35,
  swayAmplitude = 0.01,
  rotationSpeed = 0.05,
}: FloatGroupProps) {
  const groupRef = useRef<Group>(null)
  const timeRef = useRef(0)

  useFrame((_state, delta) => {
    if (!groupRef.current) return
    timeRef.current += delta

    const t = timeRef.current
    groupRef.current.position.set(
      position[0] + Math.sin(t * swaySpeed) * swayAmplitude,
      position[1] + Math.sin(t * bobSpeed) * bobAmplitude,
      position[2]
    )
    groupRef.current.rotation.z = Math.sin(t * rotationSpeed) * 0.03
  })

  return (
    <group ref={groupRef} position={position}>
      {children}
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/components/FloatGroup.tsx
git commit -m "feat(planet): add FloatGroup zero-gravity animation wrapper"
```

---

### Task 3: Astronaut Figure

**Files:**
- Create: `src/features/planet/components/AstronautFigure.tsx`

- [ ] **Step 1: Create AstronautFigure component**

Create `src/features/planet/components/AstronautFigure.tsx`:

```tsx
import { useMemo } from 'react'
import * as THREE from 'three'
import vertexShader from '../shaders/silhouette.vert.glsl?raw'
import fragmentShader from '../shaders/silhouette.frag.glsl?raw'

const RIM_COLOR = new THREE.Vector3(0.24, 0.78, 0.16)

function useSilhouetteMaterial() {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uRimColor: { value: RIM_COLOR },
          uRimPower: { value: 3.0 },
          uRimIntensity: { value: 0.6 },
        },
        vertexShader,
        fragmentShader,
      }),
    []
  )
}

interface AstronautFigureProps {
  scale?: number
}

export default function AstronautFigure({ scale = 0.04 }: AstronautFigureProps) {
  const material = useSilhouetteMaterial()

  return (
    <group scale={scale}>
      {/* Helmet */}
      <mesh position={[0, 1.8, 0]} material={material}>
        <sphereGeometry args={[0.55, 16, 16]} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 0.8, 0]} material={material}>
        <capsuleGeometry args={[0.4, 0.8, 8, 16]} />
      </mesh>

      {/* Backpack */}
      <mesh position={[0, 0.9, -0.45]} material={material}>
        <boxGeometry args={[0.5, 0.7, 0.3]} />
      </mesh>

      {/* Left arm - angled outward */}
      <group position={[-0.55, 1.0, 0]} rotation={[0, 0, 0.4]}>
        <mesh material={material}>
          <capsuleGeometry args={[0.12, 0.7, 6, 12]} />
        </mesh>
      </group>

      {/* Right arm - angled outward */}
      <group position={[0.55, 1.0, 0]} rotation={[0, 0, -0.4]}>
        <mesh material={material}>
          <capsuleGeometry args={[0.12, 0.7, 6, 12]} />
        </mesh>
      </group>

      {/* Left leg - slightly spread */}
      <group position={[-0.2, -0.2, 0]} rotation={[0, 0, 0.15]}>
        <mesh material={material}>
          <capsuleGeometry args={[0.14, 0.8, 6, 12]} />
        </mesh>
      </group>

      {/* Right leg - slightly spread */}
      <group position={[0.2, -0.2, 0]} rotation={[0, 0, -0.15]}>
        <mesh material={material}>
          <capsuleGeometry args={[0.14, 0.8, 6, 12]} />
        </mesh>
      </group>
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/components/AstronautFigure.tsx
git commit -m "feat(planet): add AstronautFigure geometry component"
```

---

### Task 4: Dog Figure

**Files:**
- Create: `src/features/planet/components/DogFigure.tsx`

- [ ] **Step 1: Create DogFigure component**

Create `src/features/planet/components/DogFigure.tsx`:

```tsx
import { useMemo } from 'react'
import * as THREE from 'three'
import vertexShader from '../shaders/silhouette.vert.glsl?raw'
import fragmentShader from '../shaders/silhouette.frag.glsl?raw'

const RIM_COLOR = new THREE.Vector3(0.24, 0.78, 0.16)

function useSilhouetteMaterial() {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uRimColor: { value: RIM_COLOR },
          uRimPower: { value: 3.0 },
          uRimIntensity: { value: 0.6 },
        },
        vertexShader,
        fragmentShader,
      }),
    []
  )
}

interface DogFigureProps {
  scale?: number
}

export default function DogFigure({ scale = 0.03 }: DogFigureProps) {
  const material = useSilhouetteMaterial()

  return (
    <group scale={scale}>
      {/* Body - horizontal capsule */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={material}>
        <capsuleGeometry args={[0.4, 1.2, 8, 16]} />
      </mesh>

      {/* Head */}
      <mesh position={[1.0, 0.2, 0]} material={material}>
        <sphereGeometry args={[0.35, 16, 16]} />
      </mesh>

      {/* Snout */}
      <mesh position={[1.35, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} material={material}>
        <capsuleGeometry args={[0.12, 0.2, 6, 12]} />
      </mesh>

      {/* Left ear */}
      <mesh position={[0.85, 0.55, -0.15]} rotation={[0.3, 0, -0.2]} material={material}>
        <coneGeometry args={[0.1, 0.25, 8]} />
      </mesh>

      {/* Right ear */}
      <mesh position={[0.85, 0.55, 0.15]} rotation={[-0.3, 0, -0.2]} material={material}>
        <coneGeometry args={[0.1, 0.25, 8]} />
      </mesh>

      {/* Front left leg */}
      <mesh position={[0.5, -0.55, -0.2]} material={material}>
        <capsuleGeometry args={[0.08, 0.4, 6, 8]} />
      </mesh>

      {/* Front right leg */}
      <mesh position={[0.5, -0.55, 0.2]} material={material}>
        <capsuleGeometry args={[0.08, 0.4, 6, 8]} />
      </mesh>

      {/* Back left leg */}
      <mesh position={[-0.5, -0.55, -0.2]} material={material}>
        <capsuleGeometry args={[0.08, 0.4, 6, 8]} />
      </mesh>

      {/* Back right leg */}
      <mesh position={[-0.5, -0.55, 0.2]} material={material}>
        <capsuleGeometry args={[0.08, 0.4, 6, 8]} />
      </mesh>

      {/* Tail - angled upward */}
      <group position={[-0.8, 0.3, 0]} rotation={[0, 0, 0.8]}>
        <mesh material={material}>
          <capsuleGeometry args={[0.05, 0.4, 6, 8]} />
        </mesh>
      </group>
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/planet/components/DogFigure.tsx
git commit -m "feat(planet): add DogFigure geometry component"
```

---

### Task 5: Compose Scene - Planet Offset + Figures

**Files:**
- Modify: `src/features/planet/components/PlanetScene.tsx`

- [ ] **Step 1: Update PlanetScene to add planet offset and floating figures**

Replace the contents of `src/features/planet/components/PlanetScene.tsx`:

```tsx
import { PerspectiveCamera } from '@react-three/drei'
import type { ColorMode, UIStyle } from '@/providers/theme-provider'
import TauCetiPlanet from './TauCetiPlanet'
import FloatGroup from './FloatGroup'
import AstronautFigure from './AstronautFigure'
import DogFigure from './DogFigure'

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
      <color attach="background" args={['#020208']} />

      {/* Planet shifted bottom-left */}
      <group position={[-0.4, -0.3, 0]}>
        <TauCetiPlanet />
      </group>

      {/* Floating silhouettes between camera and planet */}
      <FloatGroup position={[0.15, 0.1, 1.2]} bobSpeed={0.5} swaySpeed={0.35}>
        <AstronautFigure scale={0.04} />
      </FloatGroup>

      <FloatGroup position={[0.3, 0.0, 1.15]} bobSpeed={0.4} swaySpeed={0.3}>
        <DogFigure scale={0.03} />
      </FloatGroup>
    </>
  )
}
```

- [ ] **Step 2: Verify the scene renders**

Run: `npm run dev`

Open the `/placeholder` route in the browser. Verify:
- Planet is shifted bottom-left, filling most of the viewport
- Two dark figures with green rim glow are visible floating in front of the planet
- Figures bob gently and sway independently
- Burger nav and planet controls are still accessible

- [ ] **Step 3: Commit**

```bash
git add src/features/planet/components/PlanetScene.tsx
git commit -m "feat(planet): compose scene with offset planet and floating silhouettes"
```

---

### Task 6: Visual Tuning Pass

**Files:**
- Modify: `src/features/planet/components/PlanetScene.tsx` (positions/scales)
- Modify: `src/features/planet/components/AstronautFigure.tsx` (proportions)
- Modify: `src/features/planet/components/DogFigure.tsx` (proportions)
- Modify: `src/features/planet/shaders/silhouette.frag.glsl` (rim intensity/color)

- [ ] **Step 1: Tune figure positions, scales, and shader values**

With the dev server running, adjust these values until the composition looks right:

- Planet group position `[-0.4, -0.3, 0]` — shift x/y if planet isn't filling enough of the viewport
- Astronaut `scale` (default 0.04) and `position` within FloatGroup — should be small but readable against planet
- Dog `scale` (default 0.03) and `position` — should be near the astronaut, slightly lower
- FloatGroup z positions (default ~1.2) — closer to camera = larger silhouettes, closer to planet = smaller
- Rim shader `uRimPower` (default 3.0) — higher = thinner rim, lower = wider glow
- Rim shader `uRimIntensity` (default 0.6) — scale up/down until subtle but visible
- Individual geometry positions within the figures if proportions look off

- [ ] **Step 2: Commit final tuned values**

```bash
git add -A src/features/planet/
git commit -m "fix(planet): tune silhouette positions, scale, and rim shader"
```
