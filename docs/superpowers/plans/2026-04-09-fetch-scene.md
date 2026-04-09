# Fetch Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the /fetch interactive scene where the player controls a butterfly over a rolling grass sphere while a dog chases it autonomously.

**Architecture:** The butterfly lives in world space; the dog and grass are children of a rotating sphere group. Player input rotates the sphere (not the butterfly), creating the illusion of movement. A custom shader material on instanced grass handles wind sway and dog interaction. Day/night lighting reacts to the portfolio's color mode.

**Tech Stack:** React Three Fiber, @react-three/drei, Three.js InstancedMesh, custom GLSL shaders, TanStack Router

**Deferred to polish:** Theme transition crossfade (smoothly lerping `u_nightBlend` over ~1s when color mode toggles instead of snapping). Stretch goals from spec (fireflies, jump anim, accelerometer, sound effects) are not included.

**Note on useInput return type:** Tasks 2-8 use `useInput()` returning a ref directly. Task 10 changes the return to `{ state, setJoystick }` to support the joystick. When implementing Task 10, update all call sites in FetchScene.tsx from `const input = useInput()` to `const { state: input, setJoystick } = useInput()`.

---

### Task 1: Rename `about` feature to `fetch` and update imports

**Files:**
- Rename: `src/features/about/` → `src/features/fetch/`
- Modify: `src/features/fetch/index.ts`
- Modify: `src/Experience.tsx`

- [ ] **Step 1: Rename the directory**

```bash
mv src/features/about src/features/fetch
```

- [ ] **Step 2: Update the barrel export**

Replace the content of `src/features/fetch/index.ts`:

```ts
export { default as FetchScene } from './components/FetchScene'
```

Note: `FetchScene` doesn't exist yet — that's fine, we'll create it in Task 3. For now just rename `AboutScene` to `FetchScene`:

```bash
mv src/features/fetch/components/AboutScene.tsx src/features/fetch/components/FetchScene.tsx
```

Then in `FetchScene.tsx`, rename the export:

```ts
// Change:
export default function AboutScene({ colorMode }: SceneProps) {
// To:
export default function FetchScene({ colorMode }: SceneProps) {
```

- [ ] **Step 3: Update Experience.tsx import**

In `src/Experience.tsx`, change:

```ts
import { AboutScene } from '@/features/about'
```

To:

```ts
import { FetchScene } from '@/features/fetch'
```

And in the JSX, change:

```tsx
{routePath === '/fetch' && (
  <AboutScene colorMode={colorMode} uiStyle={uiStyle} />
)}
```

To:

```tsx
{routePath === '/fetch' && (
  <FetchScene colorMode={colorMode} uiStyle={uiStyle} />
)}
```

- [ ] **Step 4: Verify**

Run: `npm run dev`

Navigate to `/fetch`. The existing pointer-following scene should still work identically.

- [ ] **Step 5: Commit**

```bash
git add src/features/fetch src/Experience.tsx
git add -u src/features/about  # stages deletions from old path
git commit -m "refactor: rename about feature to fetch"
```

---

### Task 2: Create useInput hook

**Files:**
- Create: `src/features/fetch/hooks/useInput.ts`

This hook abstracts keyboard input into a normalized `{ x, y, active }` interface. The joystick will plug into this later (Task 10).

- [ ] **Step 1: Create the hooks directory and useInput file**

Create `src/features/fetch/hooks/useInput.ts`:

```ts
import { useEffect, useRef, useCallback } from 'react'

interface InputState {
  x: number
  y: number
  active: boolean
}

const KEYS_X: Record<string, number> = {
  ArrowLeft: -1,
  a: -1,
  A: -1,
  ArrowRight: 1,
  d: 1,
  D: 1,
}

const KEYS_Y: Record<string, number> = {
  ArrowUp: 1,
  w: 1,
  W: 1,
  ArrowDown: -1,
  s: -1,
  S: -1,
}

export default function useInput() {
  const state = useRef<InputState>({ x: 0, y: 0, active: false })
  const pressed = useRef(new Set<string>())

  const update = useCallback(() => {
    let x = 0
    let y = 0
    for (const key of pressed.current) {
      if (key in KEYS_X) x += KEYS_X[key]
      if (key in KEYS_Y) y += KEYS_Y[key]
    }
    state.current.x = Math.max(-1, Math.min(1, x))
    state.current.y = Math.max(-1, Math.min(1, y))
    state.current.active = pressed.current.size > 0
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key in KEYS_X || e.key in KEYS_Y) {
        pressed.current.add(e.key)
        update()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      pressed.current.delete(e.key)
      update()
    }
    const onBlur = () => {
      pressed.current.clear()
      update()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [update])

  return state
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev`

No visual change yet — the hook isn't wired up. Just confirm no build errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/fetch/hooks/useInput.ts
git commit -m "feat(fetch): add useInput hook for keyboard controls"
```

---

### Task 3: Build SphereWorld with input-driven rotation

**Files:**
- Create: `src/features/fetch/components/SphereWorld.tsx`
- Modify: `src/features/fetch/components/FetchScene.tsx`

- [ ] **Step 1: Create SphereWorld component**

Create `src/features/fetch/components/SphereWorld.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const ROTATION_SPEED = 1.2
const ROTATION_LERP = 0.08
const SPHERE_RADIUS = 4

interface SphereWorldProps {
  input: React.RefObject<{ x: number; y: number; active: boolean }>
  children?: React.ReactNode
}

export default function SphereWorld({ input, children }: SphereWorldProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const velocity = useRef({ x: 0, z: 0 })

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const targetVelX = (input.current?.y ?? 0) * ROTATION_SPEED
    const targetVelZ = -(input.current?.x ?? 0) * ROTATION_SPEED

    velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, targetVelX, ROTATION_LERP)
    velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, targetVelZ, ROTATION_LERP)

    groupRef.current.rotation.x += velocity.current.x * delta
    groupRef.current.rotation.z += velocity.current.z * delta
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 64, 64]} />
        <meshStandardMaterial color="#3a5a2a" roughness={0.9} />
      </mesh>
      {children}
    </group>
  )
}
```

- [ ] **Step 2: Rewrite FetchScene to use SphereWorld**

Replace the content of `src/features/fetch/components/FetchScene.tsx`:

```tsx
import type { SceneProps } from '@/features/photography/types'
import useInput from '../hooks/useInput'
import SphereWorld from './SphereWorld'

export default function FetchScene({ colorMode }: SceneProps) {
  const input = useInput()

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />

      <SphereWorld input={input} />
    </>
  )
}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`

Navigate to `/fetch`. You should see a dark green sphere. Press WASD/arrow keys — the sphere should rotate smoothly in the corresponding direction. Releasing keys should cause the sphere to decelerate.

- [ ] **Step 4: Commit**

```bash
git add src/features/fetch/components/SphereWorld.tsx src/features/fetch/components/FetchScene.tsx
git commit -m "feat(fetch): add SphereWorld with input-driven rotation"
```

---

### Task 4: Add Butterfly with player control

**Files:**
- Modify: `src/features/fetch/components/Butterfly.tsx`
- Modify: `src/features/fetch/components/FetchScene.tsx`

- [ ] **Step 1: Rewrite Butterfly for world-space position with input drift**

Replace the content of `src/features/fetch/components/Butterfly.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: { butterfly: THREE.Mesh }
  materials: { None: THREE.MeshStandardMaterial }
}

const HOVER_HEIGHT = 1.5
const MAX_DRIFT = 0.5
const DRIFT_LERP = 0.04
const FLUTTER_SPEED = 20
const FLUTTER_AMPLITUDE = 0.15
const BOB_SPEED = 3.5
const BOB_AMPLITUDE = 0.12
const ROTATION_LERP = 0.05

interface ButterflyProps {
  input: React.RefObject<{ x: number; y: number; active: boolean }>
}

export default function Butterfly({ input }: ButterflyProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const { nodes, materials } = useGLTF('/models/Butterfly.glb') as GLTFResult
  const drift = useRef({ x: 0, z: 0 })

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    const ix = input.current?.x ?? 0
    const iy = input.current?.y ?? 0

    // Drift toward input direction, max MAX_DRIFT from center
    drift.current.x = THREE.MathUtils.lerp(drift.current.x, ix * MAX_DRIFT, DRIFT_LERP)
    drift.current.z = THREE.MathUtils.lerp(drift.current.z, -iy * MAX_DRIFT, DRIFT_LERP)

    groupRef.current.position.x = drift.current.x
    groupRef.current.position.z = drift.current.z
    groupRef.current.position.y = HOVER_HEIGHT + Math.sin(t * BOB_SPEED) * BOB_AMPLITUDE

    // Face movement direction
    if (Math.abs(ix) > 0.01 || Math.abs(iy) > 0.01) {
      const targetRot = Math.atan2(ix, -iy)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRot,
        ROTATION_LERP,
      )
    }

    // Wing flutter
    groupRef.current.rotation.z = Math.sin(t * FLUTTER_SPEED) * FLUTTER_AMPLITUDE
  })

  return (
    <group ref={groupRef} position={[0, HOVER_HEIGHT, 0]} dispose={null}>
      <mesh
        geometry={nodes.butterfly.geometry}
        material={materials.None}
        scale={0.2}
      />
    </group>
  )
}

useGLTF.preload('/models/Butterfly.glb')
```

- [ ] **Step 2: Add Butterfly to FetchScene (outside SphereWorld)**

Update `src/features/fetch/components/FetchScene.tsx`:

```tsx
import type { SceneProps } from '@/features/photography/types'
import useInput from '../hooks/useInput'
import SphereWorld from './SphereWorld'
import Butterfly from './Butterfly'

export default function FetchScene({ colorMode }: SceneProps) {
  const input = useInput()

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />

      <SphereWorld input={input} />
      <Butterfly input={input} />
    </>
  )
}
```

Note: Butterfly is a sibling of SphereWorld, not a child. It lives in world space.

- [ ] **Step 3: Verify**

Run: `npm run dev`

Navigate to `/fetch`. The butterfly should hover above the sphere. Press WASD — the sphere rotates underneath while the butterfly drifts slightly in the movement direction. The butterfly should bob and flutter continuously.

- [ ] **Step 4: Commit**

```bash
git add src/features/fetch/components/Butterfly.tsx src/features/fetch/components/FetchScene.tsx
git commit -m "feat(fetch): add player-controlled butterfly in world space"
```

---

### Task 5: Add Dog with chase AI on sphere surface

**Files:**
- Create: `src/features/fetch/hooks/useDogAI.ts`
- Modify: `src/features/fetch/components/Dog.tsx`
- Modify: `src/features/fetch/components/FetchScene.tsx`

- [ ] **Step 1: Create the chase AI state machine hook**

Create `src/features/fetch/hooks/useDogAI.ts`:

```ts
import { useRef } from 'react'
import * as THREE from 'three'

type ChaseState = 'idle' | 'sprint' | 'overshoot' | 'trot'

const SPRINT_SPEED = 2.5
const TROT_SPEED = 0.8
const OVERSHOOT_DECEL = 3.0
const SPRINT_THRESHOLD = 0.8
const OVERSHOOT_TRIGGER = 0.4
const OVERSHOOT_MIN_SPEED = 0.2
const SPRINT_DELAY_MIN = 0.1
const SPRINT_DELAY_MAX = 0.3

interface DogAIState {
  state: ChaseState
  speed: number
  theta: number
  phi: number
  direction: THREE.Vector2
  overshootTimer: number
  sprintDelay: number
  sprintDelayTimer: number
}

export default function useDogAI(sphereRadius: number) {
  const ai = useRef<DogAIState>({
    state: 'idle',
    speed: 0,
    theta: Math.PI / 4,
    phi: Math.PI / 2,
    direction: new THREE.Vector2(0, 1),
    overshootTimer: 0,
    sprintDelay: 0,
    sprintDelayTimer: 0,
  })

  const tempVec3 = useRef(new THREE.Vector3())
  const tempVec3b = useRef(new THREE.Vector3())

  function sphericalToCartesian(theta: number, phi: number): THREE.Vector3 {
    return tempVec3.current.set(
      sphereRadius * Math.sin(phi) * Math.sin(theta),
      sphereRadius * Math.cos(phi),
      sphereRadius * Math.sin(phi) * Math.cos(theta),
    )
  }

  function getTargetAngles(
    butterflyWorldPos: THREE.Vector3,
    sphereGroup: THREE.Group,
  ): { theta: number; phi: number } {
    const local = tempVec3b.current.copy(butterflyWorldPos)
    sphereGroup.worldToLocal(local)
    local.normalize().multiplyScalar(sphereRadius)

    const phi = Math.acos(Math.max(-1, Math.min(1, local.y / sphereRadius)))
    const theta = Math.atan2(local.x, local.z)
    return { theta, phi }
  }

  function update(
    delta: number,
    butterflyWorldPos: THREE.Vector3,
    sphereGroup: THREE.Group,
    inputActive: boolean,
  ): {
    position: THREE.Vector3
    state: ChaseState
    speed: number
  } {
    const s = ai.current
    const target = getTargetAngles(butterflyWorldPos, sphereGroup)

    const dTheta = target.theta - s.theta
    const dPhi = target.phi - s.phi
    const angularDist = Math.sqrt(dTheta * dTheta + dPhi * dPhi)

    switch (s.state) {
      case 'idle':
        s.speed = 0
        if (inputActive && angularDist > SPRINT_THRESHOLD) {
          s.state = 'sprint'
          s.sprintDelay = SPRINT_DELAY_MIN + Math.random() * (SPRINT_DELAY_MAX - SPRINT_DELAY_MIN)
          s.sprintDelayTimer = 0
        }
        break

      case 'sprint':
        s.sprintDelayTimer += delta
        if (s.sprintDelayTimer < s.sprintDelay) {
          s.speed = 0
          break
        }
        s.speed = SPRINT_SPEED
        if (angularDist > 0.001) {
          s.direction.set(dTheta / angularDist, dPhi / angularDist)
        }
        if (angularDist < OVERSHOOT_TRIGGER) {
          s.state = 'overshoot'
          s.overshootTimer = 0
        }
        break

      case 'overshoot':
        s.overshootTimer += delta
        s.speed = Math.max(s.speed - OVERSHOOT_DECEL * delta, 0)
        if (s.speed < OVERSHOOT_MIN_SPEED) {
          s.state = inputActive ? 'trot' : 'idle'
          s.speed = inputActive ? TROT_SPEED : 0
        }
        break

      case 'trot':
        s.speed = TROT_SPEED
        if (angularDist > 0.001) {
          s.direction.set(dTheta / angularDist, dPhi / angularDist)
        }
        if (angularDist > SPRINT_THRESHOLD) {
          s.state = 'sprint'
          s.sprintDelay = SPRINT_DELAY_MIN + Math.random() * (SPRINT_DELAY_MAX - SPRINT_DELAY_MIN)
          s.sprintDelayTimer = 0
        }
        if (!inputActive && angularDist < OVERSHOOT_TRIGGER) {
          s.state = 'idle'
          s.speed = 0
        }
        break
    }

    // Apply movement in spherical coordinates
    const step = s.speed * delta
    s.theta += s.direction.x * step
    s.phi += s.direction.y * step

    // Clamp phi to upper hemisphere (don't let dog go underneath)
    s.phi = Math.max(0.15, Math.min(Math.PI / 2 + 0.5, s.phi))

    const position = sphericalToCartesian(s.theta, s.phi)

    return { position: position.clone(), state: s.state, speed: s.speed }
  }

  return { update, ai }
}
```

- [ ] **Step 2: Rewrite Dog component for sphere-surface movement**

Replace the content of `src/features/fetch/components/Dog.tsx`:

```tsx
import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import useDogAI from '../hooks/useDogAI'

type ActionName =
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Idle'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Run'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Walk'

const IDLE = 'AnimalArmature|AnimalArmature|AnimalArmature|Idle' as ActionName
const WALK = 'AnimalArmature|AnimalArmature|AnimalArmature|Walk' as ActionName
const RUN = 'AnimalArmature|AnimalArmature|AnimalArmature|Run' as ActionName

const SPHERE_RADIUS = 4

interface DogProps {
  butterflyRef: React.RefObject<THREE.Group>
  sphereRef: React.RefObject<THREE.Group>
  inputActive: React.RefObject<{ active: boolean }>
}

export default function Dog({ butterflyRef, sphereRef, inputActive }: DogProps) {
  const moveRef = useRef<THREE.Group>(null!)
  const animRef = useRef<THREE.Group>(null!)
  const { scene, animations } = useGLTF('/models/Dog.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { actions } = useAnimations(animations, animRef)
  const currentAnim = useRef<string>('')
  const { update: updateAI } = useDogAI(SPHERE_RADIUS)
  const up = useRef(new THREE.Vector3())
  const lookTarget = useRef(new THREE.Vector3())

  useEffect(() => {
    const idle = actions[IDLE]
    if (idle) {
      idle.reset().fadeIn(0.3).play()
      currentAnim.current = IDLE
    }
  }, [actions])

  useFrame((_, delta) => {
    if (!moveRef.current || !butterflyRef.current || !sphereRef.current) return

    const butterflyWorldPos = butterflyRef.current.getWorldPosition(new THREE.Vector3())
    const active = inputActive.current?.active ?? false

    const result = updateAI(delta, butterflyWorldPos, sphereRef.current, active)

    // Position on sphere surface
    moveRef.current.position.copy(result.position)

    // Orient along sphere surface: up = normal, look toward movement
    up.current.copy(result.position).normalize()

    // Calculate look direction along the surface tangent
    const butterflyLocal = butterflyWorldPos.clone()
    sphereRef.current.worldToLocal(butterflyLocal)
    lookTarget.current.copy(butterflyLocal).normalize().multiplyScalar(SPHERE_RADIUS)

    // Make the dog face the butterfly along the surface
    moveRef.current.up.copy(up.current)
    if (result.speed > 0.1) {
      moveRef.current.lookAt(lookTarget.current)
    }

    // Animation transitions
    let desiredAnim: ActionName = IDLE
    if (result.state === 'sprint') desiredAnim = RUN
    else if (result.state === 'overshoot') desiredAnim = result.speed > 0.5 ? RUN : WALK
    else if (result.state === 'trot') desiredAnim = WALK

    if (desiredAnim !== currentAnim.current) {
      const prev = actions[currentAnim.current as ActionName]
      const next = actions[desiredAnim]
      if (next) {
        prev?.fadeOut(0.2)
        next.reset().fadeIn(0.2).play()
        currentAnim.current = desiredAnim
      }
    }
  })

  return (
    <group ref={moveRef} scale={0.5} dispose={null}>
      <group ref={animRef}>
        <primitive object={clone} />
      </group>
    </group>
  )
}

useGLTF.preload('/models/Dog.glb')
```

- [ ] **Step 3: Wire up Dog in FetchScene as a child of SphereWorld**

Update `src/features/fetch/components/FetchScene.tsx`:

```tsx
import { useRef } from 'react'
import * as THREE from 'three'
import type { SceneProps } from '@/features/photography/types'
import useInput from '../hooks/useInput'
import SphereWorld from './SphereWorld'
import Butterfly from './Butterfly'
import Dog from './Dog'

export default function FetchScene({ colorMode }: SceneProps) {
  const input = useInput()
  const butterflyRef = useRef<THREE.Group>(null!)
  const sphereRef = useRef<THREE.Group>(null!)

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />

      <SphereWorld input={input} ref={sphereRef}>
        <Dog
          butterflyRef={butterflyRef}
          sphereRef={sphereRef}
          inputActive={input}
        />
      </SphereWorld>
      <Butterfly input={input} ref={butterflyRef} />
    </>
  )
}
```

- [ ] **Step 4: Add forwardRef to SphereWorld**

Update `src/features/fetch/components/SphereWorld.tsx` to forward the ref:

```tsx
import { useRef, forwardRef, useImperativeHandle } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const ROTATION_SPEED = 1.2
const ROTATION_LERP = 0.08
const SPHERE_RADIUS = 4

interface SphereWorldProps {
  input: React.RefObject<{ x: number; y: number; active: boolean }>
  children?: React.ReactNode
}

const SphereWorld = forwardRef<THREE.Group, SphereWorldProps>(
  function SphereWorld({ input, children }, ref) {
    const groupRef = useRef<THREE.Group>(null!)
    const velocity = useRef({ x: 0, z: 0 })

    useImperativeHandle(ref, () => groupRef.current)

    useFrame((_, delta) => {
      if (!groupRef.current) return

      const targetVelX = (input.current?.y ?? 0) * ROTATION_SPEED
      const targetVelZ = -(input.current?.x ?? 0) * ROTATION_SPEED

      velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, targetVelX, ROTATION_LERP)
      velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, targetVelZ, ROTATION_LERP)

      groupRef.current.rotation.x += velocity.current.x * delta
      groupRef.current.rotation.z += velocity.current.z * delta
    })

    return (
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[SPHERE_RADIUS, 64, 64]} />
          <meshStandardMaterial color="#3a5a2a" roughness={0.9} />
        </mesh>
        {children}
      </group>
    )
  },
)

export default SphereWorld
```

- [ ] **Step 5: Add forwardRef to Butterfly**

Update `src/features/fetch/components/Butterfly.tsx` to forward the ref. Wrap the component with `forwardRef<THREE.Group, ButterflyProps>` and use `useImperativeHandle` to expose `groupRef.current`, same pattern as SphereWorld above.

- [ ] **Step 6: Verify**

Run: `npm run dev`

Navigate to `/fetch`. The dog should be standing on the sphere surface. Press WASD — the sphere rotates, the butterfly drifts, and the dog should chase the butterfly with sprint/overshoot/trot behavior. The dog should transition between Idle, Walk, and Run animations.

- [ ] **Step 7: Commit**

```bash
git add src/features/fetch/hooks/useDogAI.ts src/features/fetch/components/Dog.tsx src/features/fetch/components/FetchScene.tsx src/features/fetch/components/SphereWorld.tsx src/features/fetch/components/Butterfly.tsx
git commit -m "feat(fetch): add dog chase AI on sphere surface"
```

---

### Task 6: Add procedural grass field with instanced rendering and wind sway

**Files:**
- Create: `src/features/fetch/shaders/grass.vert.glsl`
- Create: `src/features/fetch/shaders/grass.frag.glsl`
- Create: `src/features/fetch/components/GrassField.tsx`
- Modify: `src/features/fetch/components/FetchScene.tsx`

- [ ] **Step 1: Create the grass vertex shader**

Create `src/features/fetch/shaders/grass.vert.glsl`:

```glsl
uniform float u_time;
uniform vec3 u_dogPosition;
uniform float u_nightBlend;

attribute vec3 instanceColor;
attribute float instanceHeight;
attribute float instanceLean;
attribute vec3 instanceOffset;

varying vec3 vColor;
varying float vHeight;

const float WIND_STRENGTH = 0.08;
const float WIND_SPEED = 2.0;
const float DOG_RADIUS = 0.8;
const float DOG_BEND_STRENGTH = 0.6;

void main() {
  // The vertex Y position (0 at root, 1 at tip) controls bend amount
  float heightFactor = position.y;

  // Wind sway based on time + world position
  vec3 worldOffset = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float windPhase = u_time * WIND_SPEED + worldOffset.x * 1.5 + worldOffset.z * 0.7;
  float windX = sin(windPhase) * WIND_STRENGTH * heightFactor;
  float windZ = cos(windPhase * 0.7 + 1.3) * WIND_STRENGTH * 0.5 * heightFactor;

  // Dog interaction: bend away from dog
  vec3 toDog = worldOffset - u_dogPosition;
  float dogDist = length(toDog);
  vec3 dogBend = vec3(0.0);
  if (dogDist < DOG_RADIUS && dogDist > 0.001) {
    float bendAmount = (1.0 - dogDist / DOG_RADIUS) * DOG_BEND_STRENGTH * heightFactor;
    dogBend = normalize(toDog) * bendAmount;
  }

  // Apply initial lean
  float leanX = sin(instanceLean) * 0.05 * heightFactor;
  float leanZ = cos(instanceLean) * 0.05 * heightFactor;

  // Scale the blade by its instance height
  vec3 pos = position;
  pos.y *= instanceHeight;

  // Apply all bends
  pos.x += windX + dogBend.x + leanX;
  pos.z += windZ + dogBend.z + leanZ;

  // Instance transform
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  vColor = instanceColor;
  vHeight = heightFactor;
}
```

- [ ] **Step 2: Create the grass fragment shader**

Create `src/features/fetch/shaders/grass.frag.glsl`:

```glsl
uniform float u_nightBlend;

varying vec3 vColor;
varying float vHeight;

void main() {
  // Darken at the base, brighter at tips
  float brightness = 0.6 + vHeight * 0.4;

  vec3 dayColor = vColor * brightness;

  // Night: darken and add blue tint
  vec3 nightTint = vec3(0.1, 0.15, 0.3);
  vec3 nightColor = vColor * brightness * 0.3 + nightTint * 0.2;

  vec3 finalColor = mix(dayColor, nightColor, u_nightBlend);

  gl_FragColor = vec4(finalColor, 1.0);
}
```

- [ ] **Step 3: Create the GrassField component**

Create `src/features/fetch/components/GrassField.tsx`:

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import grassVertexShader from '../shaders/grass.vert.glsl?raw'
import grassFragmentShader from '../shaders/grass.frag.glsl?raw'

const BLADE_COUNT = 15000
const SPHERE_RADIUS = 4
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

interface GrassFieldProps {
  dogPositionRef: React.RefObject<THREE.Vector3>
  nightBlend: number
}

function createBladeGeometry(): THREE.BufferGeometry {
  // Simple 3-segment tapered blade
  const positions = new Float32Array([
    -0.015, 0, 0,   // bottom-left
     0.015, 0, 0,   // bottom-right
    -0.008, 0.5, 0, // mid-left
     0.008, 0.5, 0, // mid-right
     0.0, 1.0, 0,   // tip
  ])
  const indices = [0, 1, 2, 2, 1, 3, 2, 3, 4]
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export default function GrassField({ dogPositionRef, nightBlend }: GrassFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const { geometry, matricesArray } = useMemo(() => {
    const geo = createBladeGeometry()
    const colors = new Float32Array(BLADE_COUNT * 3)
    const heights = new Float32Array(BLADE_COUNT)
    const leans = new Float32Array(BLADE_COUNT)
    const offsets = new Float32Array(BLADE_COUNT * 3)
    const matrices = new Float32Array(BLADE_COUNT * 16)
    const dummy = new THREE.Object3D()
    const normal = new THREE.Vector3()

    for (let i = 0; i < BLADE_COUNT; i++) {
      // Fibonacci sphere distribution — upper hemisphere only
      const y = 1 - (i / (BLADE_COUNT - 1)) * 1.0 // 1.0 to 0.0 (upper half)
      const radiusFactor = Math.sqrt(1 - y * y)
      const angle = GOLDEN_ANGLE * i

      const px = radiusFactor * Math.cos(angle) * SPHERE_RADIUS
      const py = y * SPHERE_RADIUS
      const pz = radiusFactor * Math.sin(angle) * SPHERE_RADIUS

      // Surface normal
      normal.set(px, py, pz).normalize()

      // Position blade on sphere surface
      dummy.position.set(px, py, pz)

      // Orient blade along surface normal
      dummy.up.set(0, 1, 0)
      dummy.lookAt(px + normal.x, py + normal.y, pz + normal.z)
      dummy.rotateX(Math.PI / 2)

      // Random rotation around normal
      dummy.rotateZ(Math.random() * Math.PI * 2)

      dummy.updateMatrix()
      dummy.matrix.toArray(matrices, i * 16)

      // Random height
      heights[i] = 0.3 + Math.random() * 0.5

      // Random lean angle
      leans[i] = Math.random() * Math.PI * 2

      // Store world offset for shader
      offsets[i * 3] = px
      offsets[i * 3 + 1] = py
      offsets[i * 3 + 2] = pz

      // Random color variation (greens)
      const hue = 90 + Math.random() * 50
      const sat = 0.4 + Math.random() * 0.3
      const light = 0.25 + Math.random() * 0.2
      const color = new THREE.Color().setHSL(hue / 360, sat, light)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    geo.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3))
    geo.setAttribute('instanceHeight', new THREE.InstancedBufferAttribute(heights, 1))
    geo.setAttribute('instanceLean', new THREE.InstancedBufferAttribute(leans, 1))
    geo.setAttribute('instanceOffset', new THREE.InstancedBufferAttribute(offsets, 3))

    return { geometry: geo, matricesArray: matrices }
  }, [])

  useFrame(({ clock }) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.u_time.value = clock.getElapsedTime()
    materialRef.current.uniforms.u_nightBlend.value = nightBlend

    if (dogPositionRef.current) {
      materialRef.current.uniforms.u_dogPosition.value.copy(dogPositionRef.current)
    }
  })

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_dogPosition: { value: new THREE.Vector3() },
      u_nightBlend: { value: 0 },
    }),
    [],
  )

  return (
    <instancedMesh
      ref={(mesh) => {
        if (mesh && meshRef.current !== mesh) {
          meshRef.current = mesh
          // Set instance matrices
          for (let i = 0; i < BLADE_COUNT; i++) {
            const m = new THREE.Matrix4()
            m.fromArray(matricesArray, i * 16)
            mesh.setMatrixAt(i, m)
          }
          mesh.instanceMatrix.needsUpdate = true
        }
      }}
      args={[undefined, undefined, BLADE_COUNT]}
      frustumCulled={false}
    >
      <bufferGeometry attach="geometry" {...geometry} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={grassVertexShader}
        fragmentShader={grassFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  )
}
```

- [ ] **Step 4: Add GrassField to FetchScene inside SphereWorld**

Update `src/features/fetch/components/FetchScene.tsx` to include GrassField:

```tsx
import { useRef } from 'react'
import * as THREE from 'three'
import type { SceneProps } from '@/features/photography/types'
import useInput from '../hooks/useInput'
import SphereWorld from './SphereWorld'
import Butterfly from './Butterfly'
import Dog from './Dog'
import GrassField from './GrassField'

export default function FetchScene({ colorMode }: SceneProps) {
  const input = useInput()
  const butterflyRef = useRef<THREE.Group>(null!)
  const sphereRef = useRef<THREE.Group>(null!)
  const dogPositionRef = useRef(new THREE.Vector3())
  const nightBlend = colorMode === 'dark' ? 1.0 : 0.0

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />

      <SphereWorld input={input} ref={sphereRef}>
        <GrassField dogPositionRef={dogPositionRef} nightBlend={nightBlend} />
        <Dog
          butterflyRef={butterflyRef}
          sphereRef={sphereRef}
          inputActive={input}
          positionRef={dogPositionRef}
        />
      </SphereWorld>
      <Butterfly input={input} ref={butterflyRef} />
    </>
  )
}
```

- [ ] **Step 5: Update Dog to write its world position to positionRef**

Add a `positionRef` prop to the Dog component. In the `useFrame` callback, after positioning the dog, write the dog's world position to `positionRef`:

```ts
// Add to DogProps interface:
positionRef: React.RefObject<THREE.Vector3>

// Add at end of useFrame, after moveRef.current.position.copy(result.position):
if (positionRef.current) {
  moveRef.current.getWorldPosition(positionRef.current)
}
```

- [ ] **Step 6: Verify**

Run: `npm run dev`

Navigate to `/fetch`. The sphere should be covered in grass blades on the upper hemisphere. Grass should sway gently in the wind. When the dog runs near grass, blades should bend away from it. Toggle dark mode — grass should darken with a blue tint.

- [ ] **Step 7: Commit**

```bash
git add src/features/fetch/shaders/ src/features/fetch/components/GrassField.tsx src/features/fetch/components/FetchScene.tsx src/features/fetch/components/Dog.tsx
git commit -m "feat(fetch): add procedural grass field with wind and dog interaction"
```

---

### Task 7: Add day/night lighting and environment

**Files:**
- Create: `src/features/fetch/components/DayEnvironment.tsx`
- Create: `src/features/fetch/components/NightEnvironment.tsx`
- Modify: `src/features/fetch/components/FetchScene.tsx`

- [ ] **Step 1: Create DayEnvironment**

Create `src/features/fetch/components/DayEnvironment.tsx`:

```tsx
import { Sky } from '@react-three/drei'

export default function DayEnvironment() {
  return (
    <>
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.5}
        color="#FFF5E6"
        castShadow
      />
      <ambientLight intensity={0.4} color="#B0D4F1" />
      <hemisphereLight
        color="#87CEEB"
        groundColor="#4A8C3F"
        intensity={0.3}
      />
      <Sky
        sunPosition={[5, 10, 5]}
        turbidity={8}
        rayleigh={2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
    </>
  )
}
```

- [ ] **Step 2: Create NightEnvironment**

Create `src/features/fetch/components/NightEnvironment.tsx`:

```tsx
import { Stars } from '@react-three/drei'

export default function NightEnvironment() {
  return (
    <>
      <directionalLight
        position={[-3, 8, -3]}
        intensity={0.6}
        color="#CCE5FF"
      />
      <ambientLight intensity={0.15} color="#1A1A3A" />
      <Stars
        radius={50}
        depth={50}
        count={2000}
        factor={4}
        fade
        speed={0.5}
      />
      {/* Moon */}
      <mesh position={[-15, 25, -20]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#F5F5DC" />
      </mesh>
    </>
  )
}
```

- [ ] **Step 3: Update FetchScene to switch environments**

Update `src/features/fetch/components/FetchScene.tsx`, replacing the hardcoded lights with environment components:

```tsx
import { useRef } from 'react'
import * as THREE from 'three'
import type { SceneProps } from '@/features/photography/types'
import useInput from '../hooks/useInput'
import SphereWorld from './SphereWorld'
import Butterfly from './Butterfly'
import Dog from './Dog'
import GrassField from './GrassField'
import DayEnvironment from './DayEnvironment'
import NightEnvironment from './NightEnvironment'

export default function FetchScene({ colorMode }: SceneProps) {
  const input = useInput()
  const butterflyRef = useRef<THREE.Group>(null!)
  const sphereRef = useRef<THREE.Group>(null!)
  const dogPositionRef = useRef(new THREE.Vector3())
  const nightBlend = colorMode === 'dark' ? 1.0 : 0.0

  return (
    <>
      {colorMode === 'light' ? <DayEnvironment /> : <NightEnvironment />}

      <SphereWorld input={input} ref={sphereRef}>
        <GrassField dogPositionRef={dogPositionRef} nightBlend={nightBlend} />
        <Dog
          butterflyRef={butterflyRef}
          sphereRef={sphereRef}
          inputActive={input}
          positionRef={dogPositionRef}
        />
      </SphereWorld>
      <Butterfly input={input} ref={butterflyRef} />
    </>
  )
}
```

- [ ] **Step 4: Set scene background color based on mode**

In `FetchScene.tsx`, add a `useEffect` (or `useThree`) to set the scene background:

```tsx
import { useThree } from '@react-three/fiber'

// Inside FetchScene, before the return:
const { scene } = useThree()
scene.background = colorMode === 'light'
  ? new THREE.Color('#87CEEB')
  : new THREE.Color('#0a0a1a')
```

Note: `Sky` component in day mode will override the background, so this is mainly for night mode.

- [ ] **Step 5: Verify**

Run: `npm run dev`

Navigate to `/fetch` in light mode — warm sunlit meadow with blue sky. Toggle to dark mode — moonlit scene with stars, blue-tinted grass, moon visible in sky.

- [ ] **Step 6: Commit**

```bash
git add src/features/fetch/components/DayEnvironment.tsx src/features/fetch/components/NightEnvironment.tsx src/features/fetch/components/FetchScene.tsx
git commit -m "feat(fetch): add day/night environment based on color mode"
```

---

### Task 8: Add idle landing sequence (butterfly on dog's nose)

**Files:**
- Modify: `src/features/fetch/components/FetchScene.tsx`
- Modify: `src/features/fetch/components/Butterfly.tsx`
- Modify: `src/features/fetch/components/Dog.tsx`

This task adds the idle detection and butterfly-landing-on-nose behavior. When no input is received for ~2 seconds, the dog approaches, sits, and the butterfly descends to perch on the dog's head bone.

- [ ] **Step 1: Add idle timer and state to FetchScene**

In `FetchScene.tsx`, add idle tracking state that both Dog and Butterfly can read:

```tsx
const idleState = useRef<'active' | 'settling' | 'perched'>('active')
const idleTimer = useRef(0)
const IDLE_TIMEOUT = 2.0

// Add a useFrame to FetchScene for idle detection:
import { useFrame } from '@react-three/fiber'

useFrame((_, delta) => {
  const active = input.current?.active ?? false
  if (active) {
    idleTimer.current = 0
    idleState.current = 'active'
  } else {
    idleTimer.current += delta
    if (idleTimer.current > IDLE_TIMEOUT && idleState.current === 'active') {
      idleState.current = 'settling'
    }
  }
})
```

Pass `idleState` as a prop to both Dog and Butterfly.

- [ ] **Step 2: Add head bone tracking to Dog**

In `Dog.tsx`, find and expose the head bone's world position:

```tsx
const headBoneRef = useRef<THREE.Bone | null>(null)
const headWorldPos = useRef(new THREE.Vector3())

// After clone is created, find the head bone:
useEffect(() => {
  clone.traverse((child) => {
    if (child instanceof THREE.Bone && child.name.toLowerCase().includes('head')) {
      headBoneRef.current = child
    }
  })
}, [clone])

// In useFrame, after positioning the dog:
if (headBoneRef.current) {
  headBoneRef.current.getWorldPosition(headWorldPos.current)
}
```

Add a `headPositionRef` prop (a `React.RefObject<THREE.Vector3>`) and write `headWorldPos` to it each frame.

When `idleState` is `'settling'`, the dog AI should transition to trot (if not already close) and then idle when it reaches the butterfly.

- [ ] **Step 3: Update Butterfly for landing behavior**

In `Butterfly.tsx`, add logic that reads `idleState` and `dogHeadPosition`:

```tsx
interface ButterflyProps {
  input: React.RefObject<{ x: number; y: number; active: boolean }>
  idleState: React.RefObject<'active' | 'settling' | 'perched'>
  dogHeadPosition: React.RefObject<THREE.Vector3>
}

// In useFrame:
const idle = idleState.current ?? 'active'
const headPos = dogHeadPosition.current

if (idle === 'settling' && headPos) {
  // Descend toward dog's head
  groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, headPos.x, 0.02)
  groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, headPos.y + 0.3, 0.02)
  groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, headPos.z, 0.02)

  // Reduce flutter when close
  const distToHead = groupRef.current.position.distanceTo(headPos)
  if (distToHead < 0.3) {
    idleState.current = 'perched'
  }

  // Dampen flutter
  const flutterScale = Math.max(0.1, distToHead / 1.5)
  groupRef.current.rotation.z = Math.sin(t * FLUTTER_SPEED) * FLUTTER_AMPLITUDE * flutterScale
} else if (idle === 'perched' && headPos) {
  // Stay on the head
  groupRef.current.position.copy(headPos)
  groupRef.current.position.y += 0.3
  groupRef.current.rotation.z = Math.sin(t * FLUTTER_SPEED * 0.3) * FLUTTER_AMPLITUDE * 0.2
} else {
  // Normal movement (existing drift code)
}
```

When input resumes (`idle === 'active'`), the butterfly returns to normal hover behavior — the existing drift code handles this naturally.

- [ ] **Step 4: Wire up idle refs in FetchScene**

Update the FetchScene return to pass the new refs:

```tsx
const dogHeadPosition = useRef(new THREE.Vector3())

// In JSX:
<Dog
  butterflyRef={butterflyRef}
  sphereRef={sphereRef}
  inputActive={input}
  positionRef={dogPositionRef}
  headPositionRef={dogHeadPosition}
  idleState={idleState}
/>
<Butterfly
  input={input}
  ref={butterflyRef}
  idleState={idleState}
  dogHeadPosition={dogHeadPosition}
/>
```

- [ ] **Step 5: Verify**

Run: `npm run dev`

Navigate to `/fetch`. Move the butterfly with WASD, then stop. After ~2 seconds, the dog should approach and sit. The butterfly should slowly descend to the dog's head. When perched, the flutter should be minimal. Press any key — the butterfly should lift off and the dog should resume chasing.

- [ ] **Step 6: Commit**

```bash
git add src/features/fetch/components/FetchScene.tsx src/features/fetch/components/Dog.tsx src/features/fetch/components/Butterfly.tsx
git commit -m "feat(fetch): add idle landing sequence - butterfly perches on dog's nose"
```

---

### Task 9: Adjust camera for the fetch scene

**Files:**
- Modify: `src/features/fetch/components/FetchScene.tsx`

The global camera is at `[3, 2, 6]` which is fine for other scenes, but the fetch scene needs an overhead ~45° angle looking down at the sphere.

- [ ] **Step 1: Override camera position in FetchScene**

At the top of the FetchScene component, use `useThree` to adjust the camera:

```tsx
import { useThree, useFrame } from '@react-three/fiber'

// Inside FetchScene, before the return:
const { camera } = useThree()
useEffect(() => {
  camera.position.set(0, 8, 8)
  camera.lookAt(0, 0, 0)
}, [camera])
```

This positions the camera above and in front of the sphere, looking down at ~45°. The exact values may need tuning during visual review.

- [ ] **Step 2: Verify**

Run: `npm run dev`

Navigate to `/fetch`. The camera should look down at the sphere from an overhead angle, giving a clear view of both the butterfly and dog.

- [ ] **Step 3: Commit**

```bash
git add src/features/fetch/components/FetchScene.tsx
git commit -m "feat(fetch): set overhead camera angle for fetch scene"
```

---

### Task 10: Add virtual joystick for mobile

**Files:**
- Create: `src/features/fetch/components/VirtualJoystick.tsx`
- Modify: `src/features/fetch/hooks/useInput.ts`
- Modify: `src/routes/fetch.tsx`

- [ ] **Step 1: Create VirtualJoystick component**

Create `src/features/fetch/components/VirtualJoystick.tsx`:

```tsx
import { useRef, useCallback, useEffect, useState } from 'react'

const JOYSTICK_SIZE = 120
const KNOB_SIZE = 50
const MAX_DISTANCE = (JOYSTICK_SIZE - KNOB_SIZE) / 2

interface VirtualJoystickProps {
  onInput: (x: number, y: number) => void
}

export default function VirtualJoystick({ onInput }: VirtualJoystickProps) {
  const [isTouch, setIsTouch] = useState(false)
  const [active, setActive] = useState(false)
  const [origin, setOrigin] = useState({ x: 0, y: 0 })
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsTouch('ontouchstart' in window)
  }, [])

  const handleStart = useCallback((clientX: number, clientY: number) => {
    setActive(true)
    setOrigin({ x: clientX, y: clientY })
    setKnobOffset({ x: 0, y: 0 })
  }, [])

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!active) return
      let dx = clientX - origin.x
      let dy = clientY - origin.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > MAX_DISTANCE) {
        dx = (dx / dist) * MAX_DISTANCE
        dy = (dy / dist) * MAX_DISTANCE
      }

      setKnobOffset({ x: dx, y: dy })
      onInput(dx / MAX_DISTANCE, -dy / MAX_DISTANCE)
    },
    [active, origin, onInput],
  )

  const handleEnd = useCallback(() => {
    setActive(false)
    setKnobOffset({ x: 0, y: 0 })
    onInput(0, 0)
  }, [onInput])

  useEffect(() => {
    if (!isTouch) return

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      // Only activate in the lower-left quadrant
      if (touch.clientX < window.innerWidth / 2 && touch.clientY > window.innerHeight / 2) {
        handleStart(touch.clientX, touch.clientY)
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      handleMove(touch.clientX, touch.clientY)
    }
    const onTouchEnd = () => handleEnd()

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [isTouch, handleStart, handleMove, handleEnd])

  if (!isTouch || !active) return null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: origin.x - JOYSTICK_SIZE / 2,
        top: origin.y - JOYSTICK_SIZE / 2,
        width: JOYSTICK_SIZE,
        height: JOYSTICK_SIZE,
        borderRadius: '50%',
        background: 'rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: JOYSTICK_SIZE / 2 + knobOffset.x - KNOB_SIZE / 2,
          top: JOYSTICK_SIZE / 2 + knobOffset.y - KNOB_SIZE / 2,
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Add joystick input setter to useInput**

Update `src/features/fetch/hooks/useInput.ts` to accept external joystick values:

Add to the hook, after the `pressed` ref:

```ts
const joystick = useRef({ x: 0, y: 0, active: false })

const setJoystick = useCallback((x: number, y: number) => {
  joystick.current.x = x
  joystick.current.y = y
  joystick.current.active = Math.abs(x) > 0.01 || Math.abs(y) > 0.01
}, [])
```

Update the `update` function to merge joystick input:

```ts
const update = useCallback(() => {
  let x = 0
  let y = 0
  for (const key of pressed.current) {
    if (key in KEYS_X) x += KEYS_X[key]
    if (key in KEYS_Y) y += KEYS_Y[key]
  }

  // Joystick overrides if active
  if (joystick.current.active) {
    x = joystick.current.x
    y = joystick.current.y
  }

  state.current.x = Math.max(-1, Math.min(1, x))
  state.current.y = Math.max(-1, Math.min(1, y))
  state.current.active = pressed.current.size > 0 || joystick.current.active
}, [])
```

Also call `update()` inside `setJoystick`:

```ts
const setJoystick = useCallback((x: number, y: number) => {
  joystick.current.x = x
  joystick.current.y = y
  joystick.current.active = Math.abs(x) > 0.01 || Math.abs(y) > 0.01
  update()
}, [update])
```

Change the return to: `return { state, setJoystick }`

Update all call sites to destructure: `const { state: input, setJoystick } = useInput()`

- [ ] **Step 3: Add VirtualJoystick to the fetch route**

Update `src/routes/fetch.tsx` to include the joystick overlay. Since the joystick needs to communicate with the R3F scene through the input hook, and the hook lives in the scene, we need to lift the joystick callback. The simplest approach is to render the VirtualJoystick from the route file and communicate via a shared ref on the window or a context.

Alternative simpler approach — render the joystick from within FetchScene using drei's `Html` component:

In `FetchScene.tsx`, add:

```tsx
import { Html } from '@react-three/drei'
import VirtualJoystick from './VirtualJoystick'

// In the return, after the Butterfly:
<Html fullscreen style={{ pointerEvents: 'none' }}>
  <VirtualJoystick onInput={setJoystick} />
</Html>
```

- [ ] **Step 4: Verify**

Run: `npm run dev`

On desktop — keyboard should still work. Open DevTools → toggle device toolbar to simulate touch. Touch and drag in the lower-left area — a joystick should appear and control the butterfly/sphere.

- [ ] **Step 5: Commit**

```bash
git add src/features/fetch/components/VirtualJoystick.tsx src/features/fetch/hooks/useInput.ts src/features/fetch/components/FetchScene.tsx
git commit -m "feat(fetch): add virtual joystick for mobile controls"
```

---

### Task 11: Update barrel exports and clean up

**Files:**
- Modify: `src/features/fetch/index.ts`

- [ ] **Step 1: Ensure barrel export is correct**

Confirm `src/features/fetch/index.ts` contains:

```ts
export { default as FetchScene } from './components/FetchScene'
```

- [ ] **Step 2: Remove any leftover about references**

Search the codebase for any remaining references to "about" or "AboutScene" and update them. Check:
- `src/Experience.tsx` — should import `FetchScene` from `@/features/fetch`
- No other files should reference `@/features/about`

- [ ] **Step 3: Verify full flow**

Run: `npm run dev`

Test the complete flow:
1. Navigate to `/fetch` — scene loads with grass-covered sphere
2. WASD moves the butterfly / rotates sphere
3. Dog chases with sprint/overshoot/trot behavior
4. Grass sways in wind and bends away from dog
5. Stop input — dog approaches, butterfly lands on nose
6. Resume input — butterfly lifts off, chase resumes
7. Toggle light/dark mode — environment switches between sun and moon
8. Navigate away and back — scene reinitializes cleanly

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(fetch): clean up exports and references"
```
