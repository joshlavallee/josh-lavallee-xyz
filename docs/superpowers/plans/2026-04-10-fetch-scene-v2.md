# Fetch Scene v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sphere-world fetch scene with an infinite procedural grass field, third-person camera, biome system, trail wake, and stylized sun/moon celestial bodies.

**Architecture:** Single unified instanced shader renders all vegetation (grass + flower variants). A 60x60 grass field recycles around the characters to create an infinite plane illusion. Third-person camera follows the dog, looking toward the butterfly. Five biomes define shader uniforms that lerp on switch. Day/night lighting driven by the portfolio's color mode.

**Tech Stack:** React Three Fiber, drei, Three.js InstancedMesh, custom GLSL ShaderMaterial, TanStack Router

**Spec:** `docs/superpowers/specs/2026-04-10-fetch-scene-v2-design.md`

**Reference shader:** https://github.com/Nitash-Biswas/grass-shader-glsl (cloned to `/tmp/grass-shader-glsl/` for reference)

**Testing note:** This project has no test infrastructure. All tasks are verified visually via `npm run dev` at `http://localhost:3000/fetch`. Each task includes a visual verification step.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/features/fetch/lib/biomes.ts` | Biome data definitions (5 biomes) |
| Create | `src/features/fetch/hooks/useInput.ts` | Unified keyboard + joystick input |
| Create | `src/features/fetch/hooks/useTrailWake.ts` | Circular buffer of dog positions |
| Create | `src/features/fetch/shaders/grass.vert.glsl` | Grass vertex shader |
| Create | `src/features/fetch/shaders/grass.frag.glsl` | Grass fragment shader |
| Create | `src/features/fetch/components/GrassField.tsx` | InstancedMesh, LOD, recycling |
| Create | `src/features/fetch/components/Butterfly.tsx` | Player-controlled butterfly |
| Create | `src/features/fetch/components/Dog.tsx` | Autonomous chase AI |
| Create | `src/features/fetch/components/Sun.tsx` | Emissive sun + corona |
| Create | `src/features/fetch/components/Moon.tsx` | Emissive moon + glow halo |
| Create | `src/features/fetch/components/BiomeSelector.tsx` | HTML overlay for biome cycling |
| Create | `src/features/fetch/components/VirtualJoystick.tsx` | Mobile touch joystick |
| Create | `src/features/fetch/components/FetchScene.tsx` | Top-level scene assembly |
| Create | `src/features/fetch/index.ts` | Barrel export |
| Modify | `src/Experience.tsx:20-22` | Swap AboutScene for FetchScene |

---

### Task 1: Project Scaffolding & Biome Data

**Files:**
- Create: `src/features/fetch/lib/biomes.ts`
- Create: `src/features/fetch/index.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/features/fetch/{components,hooks,shaders,lib}
```

- [ ] **Step 2: Create biome data definitions**

Create `src/features/fetch/lib/biomes.ts`:

```ts
export interface Biome {
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

export const BIOMES: Biome[] = [
  {
    name: 'Enchanted Meadow',
    baseColor: [0.176, 0.353, 0.118],
    tipColor: [0.494, 0.784, 0.314],
    flowerColorA: [0.608, 0.349, 0.714],
    flowerColorB: [0.365, 0.678, 0.886],
    groundColor: [0.15, 0.25, 0.1],
    fogColor: [0.75, 0.85, 0.95],
    fogColorNight: [0.05, 0.05, 0.15],
    grassHeight: 0.8,
    flowerDensity: 0.15,
    glowIntensity: 0.5,
    windStrength: 1.0,
  },
  {
    name: 'Golden Prairie',
    baseColor: [0.251, 0.278, 0.035],
    tipColor: [0.784, 0.745, 0.612],
    flowerColorA: [0.906, 0.298, 0.235],
    flowerColorB: [0.204, 0.596, 0.859],
    groundColor: [0.2, 0.18, 0.08],
    fogColor: [0.9, 0.92, 0.94],
    fogColorNight: [0.06, 0.06, 0.12],
    grassHeight: 1.0,
    flowerDensity: 0.08,
    glowIntensity: 0.0,
    windStrength: 1.3,
  },
  {
    name: 'Twilight Grove',
    baseColor: [0.102, 0.227, 0.165],
    tipColor: [0.18, 0.545, 0.431],
    flowerColorA: [0.0, 0.898, 1.0],
    flowerColorB: [0.878, 0.251, 0.984],
    groundColor: [0.06, 0.12, 0.1],
    fogColor: [0.4, 0.5, 0.5],
    fogColorNight: [0.02, 0.04, 0.08],
    grassHeight: 0.9,
    flowerDensity: 0.12,
    glowIntensity: 1.0,
    windStrength: 0.7,
  },
  {
    name: 'Cherry Blossom',
    baseColor: [0.227, 0.353, 0.18],
    tipColor: [0.769, 0.541, 0.69],
    flowerColorA: [1.0, 0.412, 0.706],
    flowerColorB: [1.0, 0.941, 0.96],
    groundColor: [0.18, 0.22, 0.12],
    fogColor: [0.95, 0.9, 0.92],
    fogColorNight: [0.06, 0.04, 0.08],
    grassHeight: 0.7,
    flowerDensity: 0.2,
    glowIntensity: 0.3,
    windStrength: 0.8,
  },
  {
    name: 'Volcanic Ashlands',
    baseColor: [0.102, 0.102, 0.102],
    tipColor: [0.545, 0.145, 0.0],
    flowerColorA: [1.0, 0.271, 0.0],
    flowerColorB: [1.0, 0.843, 0.0],
    groundColor: [0.08, 0.06, 0.06],
    fogColor: [0.3, 0.25, 0.2],
    fogColorNight: [0.08, 0.04, 0.02],
    grassHeight: 0.6,
    flowerDensity: 0.1,
    glowIntensity: 0.6,
    windStrength: 0.5,
  },
]

export const DEFAULT_BIOME_INDEX = 2 // Twilight Grove
```

- [ ] **Step 3: Create barrel export**

Create `src/features/fetch/index.ts`:

```ts
export { default as FetchScene } from './components/FetchScene'
```

- [ ] **Step 4: Commit**

```bash
git add src/features/fetch/lib/biomes.ts src/features/fetch/index.ts
git commit -m "feat(fetch): scaffold fetch feature with biome data definitions"
```

---

### Task 2: useInput Hook

**Files:**
- Create: `src/features/fetch/hooks/useInput.ts`

- [ ] **Step 1: Create the useInput hook**

Create `src/features/fetch/hooks/useInput.ts`:

```ts
import { useRef, useEffect } from 'react'

interface InputState {
  x: number
  y: number
  active: boolean
}

const keys = new Set<string>()

export function useInput(): React.RefObject<InputState> {
  const state = useRef<InputState>({ x: 0, y: 0, active: false })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        keys.add(e.key)
        update()
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key)
      update()
    }

    function update() {
      let x = 0
      let y = 0
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1
      if (keys.has('d') || keys.has('ArrowRight')) x += 1
      if (keys.has('w') || keys.has('ArrowUp')) y += 1
      if (keys.has('s') || keys.has('ArrowDown')) y -= 1
      state.current.x = x
      state.current.y = y
      state.current.active = x !== 0 || y !== 0
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      keys.clear()
    }
  }, [])

  return state
}

/** Called by VirtualJoystick to merge touch input */
export function setJoystickInput(ref: React.RefObject<InputState>, x: number, y: number) {
  ref.current.x = x
  ref.current.y = y
  ref.current.active = x !== 0 || y !== 0
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/fetch/hooks/useInput.ts
git commit -m "feat(fetch): add useInput hook for keyboard controls"
```

---

### Task 3: Grass Shaders

**Files:**
- Create: `src/features/fetch/shaders/grass.vert.glsl`
- Create: `src/features/fetch/shaders/grass.frag.glsl`

- [ ] **Step 1: Create the vertex shader**

Create `src/features/fetch/shaders/grass.vert.glsl`:

```glsl
uniform float uTime;
uniform float uSpeed;
uniform float uHalfWidth;
uniform float uWindStrength;
uniform float uGrassHeight;
uniform vec3 uDogPosition;
uniform float uTrailPositions[90]; // 30 entries * 3 (x, z, age)
uniform int uTrailCount;

attribute float bladeType;
attribute float bladeRand;

varying float vElevation;
varying float vSideGradient;
varying vec3 vNormal;
varying vec3 vFakeNormal;
varying vec3 vPosition;
varying float vBladeType;
varying float vBladeRand;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

mat3 rotationY(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat3(
    c, 0.0, -s,
    0.0, 1.0, 0.0,
    s, 0.0, c
  );
}

float bezier(float t, float p1) {
  float invT = 1.0 - t;
  return invT * invT * 0.0 + 2.0 * invT * t * p1 + t * t * 1.0;
}

vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec2 fade(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, 289.0);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = 1.79284291400159 - 0.85373472095314 *
    vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

float computeTrailFlatten(vec3 worldPos) {
  float flatten = 0.0;
  for (int i = 0; i < 30; i++) {
    if (i >= uTrailCount) break;
    int idx = i * 3;
    float tx = uTrailPositions[idx];
    float tz = uTrailPositions[idx + 1];
    float age = uTrailPositions[idx + 2];
    float dist = length(worldPos.xz - vec2(tx, tz));
    float radius = 0.4;
    float influence = 1.0 - smoothstep(0.0, radius, dist);
    float decay = 1.0 - smoothstep(0.0, 3.0, age);
    flatten = max(flatten, influence * decay);
  }
  return flatten;
}

vec3 deform(vec3 pos, float hash) {
  vec3 localPosition = pos;

  // Scale height by biome and per-instance variation
  float heightScale = uGrassHeight * mix(0.7, 1.3, bladeRand);
  localPosition.y *= heightScale;

  // Flower variants: wider, shorter
  if (bladeType >= 2.0) {
    localPosition.y *= 0.5;
    float petalWiden = 1.0 + (pos.y * 3.0);
    localPosition.x *= petalWiden;
  }

  // Bezier bending
  float bendStrength = mix(0.3, 0.6, hash);
  float bendStart = mix(0.0, 0.3, hash);
  float normalizedY = pos.y / 1.0;
  float t = clamp((normalizedY - bendStart) / (1.0 - bendStart), 0.0, 1.0);
  float topBendFactor = bezier(t, 0.1);
  vec3 instanceZ = normalize(vec3(0.0, 0.0, instanceMatrix[0].z));
  localPosition += instanceZ * bendStrength * topBendFactor;

  // Gentle sway
  float gentleSway = sin(uTime * uSpeed * 0.8 + hash * 10.0) * 0.1 * uWindStrength;
  vec3 gentleDir = normalize(vec3(1.0, 0.0, 1.0));
  localPosition += gentleDir * gentleSway * normalizedY;

  // Strong wind (Perlin noise)
  vec3 worldPos = (instanceMatrix * vec4(pos, 1.0)).xyz;
  float wave = cnoise(worldPos.xz * 0.3 + vec2(uTime * uSpeed * 0.2, 0.0));
  float strongWind = wave * 0.65 * uWindStrength;
  vec3 strongDir = normalize(vec3(0.0, 0.0, 1.0));
  localPosition += strongDir * strongWind * pow(normalizedY, 2.0);
  localPosition.y -= 0.1 * strongWind * pow(normalizedY, 2.0);

  // Dog interaction: bend away
  vec3 bladeWorldPos = instanceMatrix[3].xyz;
  float dogDist = length(bladeWorldPos.xz - uDogPosition.xz);
  float dogRadius = 0.5;
  if (dogDist < dogRadius) {
    float dogInfluence = (1.0 - dogDist / dogRadius) * normalizedY;
    vec2 awayDir = normalize(bladeWorldPos.xz - uDogPosition.xz);
    localPosition.x += awayDir.x * dogInfluence * 0.4;
    localPosition.z += awayDir.y * dogInfluence * 0.4;
    localPosition.y -= dogInfluence * 0.15;
  }

  // Trail wake: flatten
  float flatten = computeTrailFlatten(bladeWorldPos);
  if (flatten > 0.0) {
    localPosition.y *= (1.0 - flatten * 0.7);
    localPosition.x *= (1.0 + flatten * 0.3);
    localPosition.z *= (1.0 + flatten * 0.3);
  }

  // Billboard rotation toward camera
  vec3 camPos = inverse(viewMatrix)[3].xyz;
  vec2 toCamera2D = normalize(camPos.xz - bladeWorldPos.xz);
  float angleToCamera = atan(toCamera2D.y, toCamera2D.x);
  mat3 billboardRot = rotationY(angleToCamera);
  localPosition = billboardRot * localPosition;

  return localPosition;
}

void main() {
  float hash = rand(vec2(instanceMatrix[3].x, instanceMatrix[3].z));
  vec3 p = deform(position, hash);
  vec3 offsetX = deform(position + vec3(0.01, 0.0, 0.0), hash);
  vec3 offsetY = deform(position + vec3(0.0, 0.01, 0.0), hash);

  vec4 worldPosition = instanceMatrix * vec4(p, 1.0);
  vec4 viewPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * viewPosition;

  vElevation = position.y;
  vPosition = worldPosition.xyz;
  vSideGradient = 1.0 - ((position.x + uHalfWidth) / (2.0 * uHalfWidth));
  vBladeType = bladeType;
  vBladeRand = bladeRand;

  vec3 normalWS = normalize(cross(offsetX - p, offsetY - p));
  vNormal = normalWS;
  vec3 invNormal = vNormal;
  invNormal.x *= -1.0;
  vFakeNormal = mix(vNormal, invNormal, vSideGradient);
}
```

- [ ] **Step 2: Create the fragment shader**

Create `src/features/fetch/shaders/grass.frag.glsl`:

```glsl
uniform vec3 uBaseColor;
uniform vec3 uTipColor;
uniform vec3 uFlowerColorA;
uniform vec3 uFlowerColorB;
uniform vec3 uFogColor;
uniform vec3 uFogColorNight;
uniform float uNightBlend;
uniform float uGlowIntensity;
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uLightIntensity;

varying float vElevation;
varying float vSideGradient;
varying vec3 vNormal;
varying vec3 vFakeNormal;
varying vec3 vPosition;
varying float vBladeType;
varying float vBladeRand;

vec3 directionalLight(vec3 lightColor, float intensity, vec3 normal, vec3 lightDir, vec3 viewDir, float specPower) {
  vec3 ld = normalize(lightDir);
  float shading = max(0.0, dot(normal, ld));
  vec3 refl = reflect(-ld, normal);
  float spec = pow(max(0.0, -dot(refl, viewDir)), specPower) * shading;
  return lightColor * intensity * (shading + spec);
}

void main() {
  float gradient = smoothstep(0.2, 1.0, vElevation);
  float sideGradient = smoothstep(0.2, 1.0, vSideGradient);

  // Base grass color
  vec3 dayColor = mix(uBaseColor, uTipColor, gradient);

  // Night shift: darken and add blue tint
  vec3 nightTint = vec3(0.1, 0.15, 0.3);
  vec3 nightColor = mix(dayColor * 0.4, nightTint, 0.3);
  vec3 baseColor = mix(dayColor, nightColor, uNightBlend);

  // Flower override
  if (vBladeType >= 2.0) {
    vec3 flowerColor = vBladeType < 3.0 ? uFlowerColorA : uFlowerColorB;
    float petalGradient = smoothstep(0.3, 0.8, vElevation);
    baseColor = mix(baseColor, flowerColor, petalGradient);

    // Bioluminescent glow at night
    float glow = uNightBlend * uGlowIntensity * petalGradient;
    baseColor += flowerColor * glow * 0.5;
  }

  // Lighting
  vec3 normal = gl_FrontFacing ? vFakeNormal : -vFakeNormal;
  vec3 viewDir = normalize(cameraPosition - vPosition);
  vec3 light = vec3(0.0);
  float ambientIntensity = mix(0.5, 0.25, uNightBlend);
  light += vec3(1.0) * ambientIntensity;
  light += directionalLight(uLightColor, uLightIntensity, normal, uLightDirection, viewDir, 64.0);

  vec3 finalColor = baseColor * light;

  // Per-blade color jitter
  finalColor *= mix(0.9, 1.1, vBladeRand);

  // Distance fog
  float dist = length(cameraPosition - vPosition);
  float fogFactor = smoothstep(8.0, 30.0, dist);
  vec3 fogColor = mix(uFogColor, uFogColorNight, uNightBlend);
  finalColor = mix(finalColor, fogColor, fogFactor);

  gl_FragColor = vec4(finalColor, 1.0);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/fetch/shaders/grass.vert.glsl src/features/fetch/shaders/grass.frag.glsl
git commit -m "feat(fetch): add grass vertex and fragment shaders"
```

---

### Task 4: GrassField Component

**Files:**
- Create: `src/features/fetch/components/GrassField.tsx`

- [ ] **Step 1: Create the GrassField component**

Create `src/features/fetch/components/GrassField.tsx`:

```tsx
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import grassVertexShader from '../shaders/grass.vert.glsl?raw'
import grassFragmentShader from '../shaders/grass.frag.glsl?raw'
import type { Biome } from '../lib/biomes'

interface GrassFieldProps {
  biome: Biome
  targetBiome: Biome
  biomeTransition: number
  nightBlend: number
  dogPosition: React.RefObject<THREE.Vector3>
  fieldCenter: React.RefObject<THREE.Vector3>
  trailBuffer: React.RefObject<Float32Array>
  trailCount: React.RefObject<number>
}

const FIELD_SIZE = 60
const INSTANCE_COUNT = 150000
const HALF_WIDTH = 0.06
const HEIGHT = 1
const LOD_DISTANCE = 20

function createGrassGeometry(segments: number) {
  const taper = 0.008
  const positions: number[] = []

  for (let i = 0; i < segments; i++) {
    const y0 = (i / (segments + 1)) * HEIGHT
    const y1 = ((i + 1) / (segments + 1)) * HEIGHT
    positions.push(
      -HALF_WIDTH + taper * i, y0, 0,
      HALF_WIDTH - taper * i, y0, 0,
      -HALF_WIDTH + taper * (i + 1), y1, 0,
      -HALF_WIDTH + taper * (i + 1), y1, 0,
      HALF_WIDTH - taper * i, y0, 0,
      HALF_WIDTH - taper * (i + 1), y1, 0,
    )
  }

  // Tip triangle
  const lastY = (segments / (segments + 1)) * HEIGHT
  positions.push(
    -HALF_WIDTH + taper * segments, lastY, 0,
    HALF_WIDTH - taper * segments, lastY, 0,
    0, HEIGHT, 0,
  )

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geo.computeVertexNormals()
  return geo
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function lerpScalar(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export default function GrassField({
  biome,
  targetBiome,
  biomeTransition,
  nightBlend,
  dogPosition,
  fieldCenter,
  trailBuffer,
  trailCount,
}: GrassFieldProps) {
  const highRef = useRef<THREE.InstancedMesh>(null!)
  const lowRef = useRef<THREE.InstancedMesh>(null!)
  const { camera } = useThree()

  const highGeo = useMemo(() => createGrassGeometry(7), [])
  const lowGeo = useMemo(() => createGrassGeometry(1), [])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 3.0 },
        uHalfWidth: { value: HALF_WIDTH },
        uWindStrength: { value: biome.windStrength },
        uGrassHeight: { value: biome.grassHeight },
        uBaseColor: { value: new THREE.Color(...biome.baseColor) },
        uTipColor: { value: new THREE.Color(...biome.tipColor) },
        uFlowerColorA: { value: new THREE.Color(...biome.flowerColorA) },
        uFlowerColorB: { value: new THREE.Color(...biome.flowerColorB) },
        uFogColor: { value: new THREE.Color(...biome.fogColor) },
        uFogColorNight: { value: new THREE.Color(...biome.fogColorNight) },
        uNightBlend: { value: 0.0 },
        uGlowIntensity: { value: biome.glowIntensity },
        uDogPosition: { value: new THREE.Vector3() },
        uTrailPositions: { value: new Float32Array(90) },
        uTrailCount: { value: 0 },
        uLightDirection: { value: new THREE.Vector3(5, 10, 5).normalize() },
        uLightColor: { value: new THREE.Color(1.0, 0.96, 0.9) },
        uLightIntensity: { value: 1.5 },
      },
      side: THREE.DoubleSide,
    })
  }, [])

  // Store blade data: position offsets relative to field center, rotation, bladeType, bladeRand
  const bladeData = useMemo(() => {
    const data = new Float32Array(INSTANCE_COUNT * 5) // x, z, rotation, bladeType, bladeRand
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const idx = i * 5
      data[idx] = (Math.random() - 0.5) * FIELD_SIZE     // x offset
      data[idx + 1] = (Math.random() - 0.5) * FIELD_SIZE // z offset
      data[idx + 2] = Math.random() * Math.PI * 2         // rotation
      // Blade type: mostly grass, some flowers
      const typeRoll = Math.random()
      data[idx + 3] = typeRoll < 0.05 ? 3.0 : typeRoll < 0.12 ? 2.0 : typeRoll < 0.3 ? 1.0 : 0.0
      data[idx + 4] = Math.random() // bladeRand
    }
    return data
  }, [])

  // Set custom attributes on both meshes
  const setupAttributes = (mesh: THREE.InstancedMesh) => {
    const bladeTypeArr = new Float32Array(INSTANCE_COUNT)
    const bladeRandArr = new Float32Array(INSTANCE_COUNT)
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      bladeTypeArr[i] = bladeData[i * 5 + 3]
      bladeRandArr[i] = bladeData[i * 5 + 4]
    }
    mesh.geometry.setAttribute('bladeType', new THREE.InstancedBufferAttribute(bladeTypeArr, 1))
    mesh.geometry.setAttribute('bladeRand', new THREE.InstancedBufferAttribute(bladeRandArr, 1))
  }

  const attrsSet = useRef(false)

  useFrame((state) => {
    if (!highRef.current || !lowRef.current) return

    // One-time attribute setup
    if (!attrsSet.current) {
      setupAttributes(highRef.current)
      setupAttributes(lowRef.current)
      attrsSet.current = true
    }

    const elapsed = state.clock.getElapsedTime()
    const center = fieldCenter.current
    const halfField = FIELD_SIZE / 2

    const dummy = new THREE.Object3D()
    let highIdx = 0
    let lowIdx = 0

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const idx = i * 5
      let bx = bladeData[idx]
      let bz = bladeData[idx + 1]

      // Wrap position relative to field center
      const wx = bx + center.x
      const wz = bz + center.z

      // Modular wrapping
      let finalX = ((wx - center.x + halfField) % FIELD_SIZE + FIELD_SIZE) % FIELD_SIZE - halfField + center.x
      let finalZ = ((wz - center.z + halfField) % FIELD_SIZE + FIELD_SIZE) % FIELD_SIZE - halfField + center.z

      // Update stored offset if wrapped
      bladeData[idx] = finalX - center.x
      bladeData[idx + 1] = finalZ - center.z

      dummy.position.set(finalX, 0, finalZ)
      dummy.rotation.y = bladeData[idx + 2]
      const scale = 0.8 + bladeData[idx + 4] * 0.4
      dummy.scale.set(scale, scale, scale)
      dummy.updateMatrix()

      const dist = camera.position.distanceTo(dummy.position)
      if (dist < LOD_DISTANCE) {
        if (highIdx < INSTANCE_COUNT) {
          highRef.current.setMatrixAt(highIdx++, dummy.matrix)
        }
      } else {
        if (lowIdx < INSTANCE_COUNT) {
          lowRef.current.setMatrixAt(lowIdx++, dummy.matrix)
        }
      }
    }

    highRef.current.count = highIdx
    lowRef.current.count = lowIdx
    highRef.current.instanceMatrix.needsUpdate = true
    lowRef.current.instanceMatrix.needsUpdate = true

    // Update uniforms
    const u = material.uniforms
    u.uTime.value = elapsed
    u.uNightBlend.value = nightBlend

    // Lerp biome uniforms
    const t = biomeTransition
    const bc = lerpColor(biome.baseColor, targetBiome.baseColor, t)
    const tc = lerpColor(biome.tipColor, targetBiome.tipColor, t)
    const fa = lerpColor(biome.flowerColorA, targetBiome.flowerColorA, t)
    const fb = lerpColor(biome.flowerColorB, targetBiome.flowerColorB, t)
    const fc = lerpColor(biome.fogColor, targetBiome.fogColor, t)
    const fn = lerpColor(biome.fogColorNight, targetBiome.fogColorNight, t)

    u.uBaseColor.value.setRGB(...bc)
    u.uTipColor.value.setRGB(...tc)
    u.uFlowerColorA.value.setRGB(...fa)
    u.uFlowerColorB.value.setRGB(...fb)
    u.uFogColor.value.setRGB(...fc)
    u.uFogColorNight.value.setRGB(...fn)
    u.uGrassHeight.value = lerpScalar(biome.grassHeight, targetBiome.grassHeight, t)
    u.uWindStrength.value = lerpScalar(biome.windStrength, targetBiome.windStrength, t)
    u.uGlowIntensity.value = lerpScalar(biome.glowIntensity, targetBiome.glowIntensity, t)

    // Dog position
    if (dogPosition.current) {
      u.uDogPosition.value.copy(dogPosition.current)
    }

    // Trail wake
    if (trailBuffer.current) {
      u.uTrailPositions.value = trailBuffer.current
      u.uTrailCount.value = trailCount.current
    }

    // Lighting direction based on day/night
    const dayDir = new THREE.Vector3(5, 10, 5).normalize()
    const nightDir = new THREE.Vector3(-3, 8, -3).normalize()
    u.uLightDirection.value.lerpVectors(dayDir, nightDir, nightBlend)
    u.uLightColor.value.setRGB(
      THREE.MathUtils.lerp(1.0, 0.8, nightBlend),
      THREE.MathUtils.lerp(0.96, 0.9, nightBlend),
      THREE.MathUtils.lerp(0.9, 1.0, nightBlend),
    )
    u.uLightIntensity.value = THREE.MathUtils.lerp(1.5, 0.6, nightBlend)
  })

  return (
    <>
      <instancedMesh ref={highRef} args={[highGeo, material, INSTANCE_COUNT]} frustumCulled={false} />
      <instancedMesh ref={lowRef} args={[lowGeo, material, INSTANCE_COUNT]} frustumCulled={false} />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/fetch/components/GrassField.tsx
git commit -m "feat(fetch): add GrassField instanced mesh with LOD and recycling"
```

---

### Task 5: FetchScene + Camera + Lighting + Integration

**Files:**
- Create: `src/features/fetch/components/FetchScene.tsx`
- Modify: `src/Experience.tsx:1-2,20-22`

- [ ] **Step 1: Create FetchScene with camera, lighting, and grass**

Create `src/features/fetch/components/FetchScene.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import type { SceneProps } from '@/features/photography/types'
import GrassField from './GrassField'
import { BIOMES, DEFAULT_BIOME_INDEX } from '../lib/biomes'

const GROUND_SIZE = 80

export default function FetchScene({ colorMode }: SceneProps) {
  const { camera } = useThree()
  const fieldCenter = useRef(new THREE.Vector3(0, 0, 0))
  const dogPosition = useRef(new THREE.Vector3(0, 0, 0))
  const butterflyPosition = useRef(new THREE.Vector3(0, 0, 2))
  const trailBuffer = useRef(new Float32Array(90))
  const trailCount = useRef(0)
  const groundRef = useRef<THREE.Mesh>(null!)

  // Biome state
  const biomeIndex = useRef(DEFAULT_BIOME_INDEX)
  const biomeTransition = useRef(0)
  const prevBiomeIndex = useRef(DEFAULT_BIOME_INDEX)
  const currentBiome = BIOMES[DEFAULT_BIOME_INDEX]

  // Night blend
  const nightBlendRef = useRef(colorMode === 'dark' ? 1.0 : 0.0)
  const targetNightBlend = colorMode === 'dark' ? 1.0 : 0.0

  useFrame((_, delta) => {
    // Lerp night blend
    nightBlendRef.current = THREE.MathUtils.lerp(nightBlendRef.current, targetNightBlend, delta * 2.0)

    // Update field center (midpoint of dog and butterfly)
    fieldCenter.current.set(
      (dogPosition.current.x + butterflyPosition.current.x) / 2,
      0,
      (dogPosition.current.z + butterflyPosition.current.z) / 2,
    )

    // Move ground plane to follow field center
    if (groundRef.current) {
      groundRef.current.position.x = fieldCenter.current.x
      groundRef.current.position.z = fieldCenter.current.z
    }

    // Follow camera: behind dog, looking toward butterfly
    const dogPos = dogPosition.current
    const bflyPos = butterflyPosition.current

    // Camera looks at weighted point between dog and butterfly
    const lookAt = new THREE.Vector3(
      dogPos.x * 0.6 + bflyPos.x * 0.4,
      0.5,
      dogPos.z * 0.6 + bflyPos.z * 0.4,
    )

    // Camera offset: behind and above the dog
    const dogFacing = new THREE.Vector3(bflyPos.x - dogPos.x, 0, bflyPos.z - dogPos.z)
    if (dogFacing.length() > 0.01) dogFacing.normalize()
    else dogFacing.set(0, 0, -1)

    const idealPos = new THREE.Vector3(
      dogPos.x - dogFacing.x * 4,
      3,
      dogPos.z - dogFacing.z * 4,
    )

    camera.position.lerp(idealPos, 0.03)
    const currentLookAt = new THREE.Vector3()
    camera.getWorldDirection(currentLookAt)
    const targetLookAtDir = lookAt.clone().sub(camera.position).normalize()
    currentLookAt.lerp(targetLookAtDir, 0.05)
    camera.lookAt(camera.position.clone().add(currentLookAt))
  })

  // Lighting colors
  const nightBlend = nightBlendRef.current
  const ambientColor = new THREE.Color().lerpColors(
    new THREE.Color(0xb0d4f1),
    new THREE.Color(0x1a1a3a),
    targetNightBlend,
  )
  const ambientIntensity = THREE.MathUtils.lerp(0.4, 0.15, targetNightBlend)
  const dirColor = new THREE.Color().lerpColors(
    new THREE.Color(0xfff5e6),
    new THREE.Color(0xcce5ff),
    targetNightBlend,
  )
  const dirIntensity = THREE.MathUtils.lerp(1.5, 0.6, targetNightBlend)
  const dirPos: [number, number, number] = targetNightBlend > 0.5 ? [-3, 8, -3] : [5, 10, 5]

  const groundColor = new THREE.Color(
    ...BIOMES[biomeIndex.current].groundColor as [number, number, number]
  )

  return (
    <>
      {/* Lighting */}
      <ambientLight color={ambientColor} intensity={ambientIntensity} />
      <directionalLight color={dirColor} intensity={dirIntensity} position={dirPos} />
      <hemisphereLight
        args={[
          targetNightBlend > 0.5 ? 0x0a0a2a : 0x87ceeb,
          targetNightBlend > 0.5 ? 0x1a1a3a : 0x4a8c3f,
          THREE.MathUtils.lerp(0.3, 0.15, targetNightBlend),
        ]}
      />

      {/* Sky background color */}
      <color
        attach="background"
        args={[
          targetNightBlend > 0.5 ? '#0A0A2A' : '#87CEEB',
        ]}
      />

      {/* Stars (night only) */}
      {targetNightBlend > 0.3 && (
        <Stars radius={50} count={2000} fade speed={0.5} />
      )}

      {/* Ground plane */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color={groundColor} />
      </mesh>

      {/* Grass */}
      <GrassField
        biome={BIOMES[prevBiomeIndex.current]}
        targetBiome={BIOMES[biomeIndex.current]}
        biomeTransition={biomeTransition.current}
        nightBlend={nightBlendRef.current}
        dogPosition={dogPosition}
        fieldCenter={fieldCenter}
        trailBuffer={trailBuffer}
        trailCount={trailCount}
      />
    </>
  )
}
```

- [ ] **Step 2: Update Experience.tsx to use FetchScene**

In `src/Experience.tsx`, replace the AboutScene import and rendering:

Change the import at the top from:
```ts
import { AboutScene } from '@/features/about'
```
to:
```ts
import { FetchScene } from '@/features/fetch'
```

Change the fetch route branch (lines ~20-22) from:
```tsx
) : routePath === '/fetch' ? (
    <AboutScene colorMode={colorMode} uiStyle={uiStyle} />
```
to:
```tsx
) : routePath === '/fetch' ? (
    <FetchScene colorMode={colorMode} uiStyle={uiStyle} />
```

- [ ] **Step 3: Verify visually**

Run `npm run dev` and navigate to `http://localhost:3000/fetch`. You should see:
- A field of grass blades covering the screen
- Grass swaying with wind animation
- Basic lighting (day or night based on current color mode)
- Camera positioned at the default position looking at the grass

- [ ] **Step 4: Commit**

```bash
git add src/features/fetch/components/FetchScene.tsx src/Experience.tsx
git commit -m "feat(fetch): add FetchScene with grass field, camera, and lighting"
```

---

### Task 6: Butterfly Adaptation

**Files:**
- Create: `src/features/fetch/components/Butterfly.tsx`

- [ ] **Step 1: Create the adapted Butterfly component**

Create `src/features/fetch/components/Butterfly.tsx`. This adapts the existing `src/features/about/components/Butterfly.tsx` to use `useInput()` instead of pointer-following:

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

const MOVE_SPEED = 3.0
const HOVER_HEIGHT = 1.0

interface ButterflyProps {
  input: React.RefObject<{ x: number; y: number; active: boolean }>
  positionRef: React.RefObject<THREE.Vector3>
}

export default function Butterfly({ input, positionRef }: ButterflyProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { nodes, materials } = useGLTF('/models/Butterfly.glb') as GLTFResult

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    if (!groupRef.current) return

    const { x, y } = input.current

    // Move in world space
    if (x !== 0 || y !== 0) {
      groupRef.current.position.x += x * MOVE_SPEED * delta
      groupRef.current.position.z -= y * MOVE_SPEED * delta
    }

    // Hover bob
    groupRef.current.position.y = HOVER_HEIGHT + Math.sin(t * 3.5) * 0.12

    // Face movement direction
    if (Math.abs(x) > 0.01 || Math.abs(y) > 0.01) {
      const targetRot = Math.atan2(x, -y)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRot,
        0.05,
      )
    }

    // Wing flutter
    groupRef.current.rotation.z = Math.sin(t * 20) * 0.15

    // Update shared position ref
    positionRef.current.copy(groupRef.current.position)
  })

  return (
    <group ref={groupRef} position={[0, HOVER_HEIGHT, 2]} dispose={null}>
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

- [ ] **Step 2: Add Butterfly to FetchScene**

In `src/features/fetch/components/FetchScene.tsx`, add the import and the component:

Add import at top:
```ts
import Butterfly from './Butterfly'
import { useInput } from '../hooks/useInput'
```

Add the hook call inside the component, before the `useFrame`:
```ts
const input = useInput()
```

Add `<Butterfly>` to the JSX return, after the `<GrassField>`:
```tsx
<Butterfly input={input} positionRef={butterflyPosition} />
```

- [ ] **Step 3: Verify visually**

Run dev server, navigate to `/fetch`. You should see:
- The butterfly hovering above the grass
- WASD/arrow keys move the butterfly through the field
- Camera follows the movement (since it's tracking the butterfly position via fieldCenter)
- Wing flutter animation working

- [ ] **Step 4: Commit**

```bash
git add src/features/fetch/components/Butterfly.tsx src/features/fetch/components/FetchScene.tsx
git commit -m "feat(fetch): add player-controlled butterfly with keyboard input"
```

---

### Task 7: Dog Adaptation

**Files:**
- Create: `src/features/fetch/components/Dog.tsx`

- [ ] **Step 1: Create the adapted Dog component**

Create `src/features/fetch/components/Dog.tsx`. Adapted from `src/features/about/components/Dog.tsx` with `MAX_RADIUS` removed and `pointerTarget` replaced by `butterflyPosition`:

```tsx
import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'

type ActionName =
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Death'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Headbutt'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Idle'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Idle_Eating'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Jump_Loop'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Jump_Start'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Run'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Walk'

const MOVE_SPEED = 1.2
const RUN_SPEED = 2.2
const STOP_THRESHOLD = 0.5
const RUN_THRESHOLD = 1.2

const IDLE = 'AnimalArmature|AnimalArmature|AnimalArmature|Idle' as ActionName
const WALK = 'AnimalArmature|AnimalArmature|AnimalArmature|Walk' as ActionName
const RUN = 'AnimalArmature|AnimalArmature|AnimalArmature|Run' as ActionName

interface DogProps {
  butterflyPosition: React.RefObject<THREE.Vector3>
  positionRef: React.RefObject<THREE.Vector3>
}

export default function Dog({ butterflyPosition, positionRef }: DogProps) {
  const moveRef = useRef<THREE.Group>(null!)
  const animRef = useRef<THREE.Group>(null!)
  const { scene, animations } = useGLTF('/models/Dog.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { actions } = useAnimations(animations, animRef)

  const stateRef = useRef({
    posX: 0,
    posZ: 0,
    rotY: 0,
    currentAnim: '' as string,
    wasMoving: false,
    shouldRun: false,
  })

  useEffect(() => {
    const idle = actions[IDLE]
    if (idle) {
      idle.reset().fadeIn(0.3).play()
      stateRef.current.currentAnim = IDLE
    }
  }, [actions])

  useFrame((_, delta) => {
    const s = stateRef.current
    if (!moveRef.current || !butterflyPosition.current) return

    const targetX = butterflyPosition.current.x
    const targetZ = butterflyPosition.current.z
    const dx = targetX - s.posX
    const dz = targetZ - s.posZ
    const dist = Math.sqrt(dx * dx + dz * dz)

    const isMoving = dist > STOP_THRESHOLD
    const shouldRun = dist > RUN_THRESHOLD

    if (isMoving) {
      const speed = shouldRun ? RUN_SPEED : MOVE_SPEED
      const moveAmount = Math.min(speed * delta, dist)
      s.posX += (dx / dist) * moveAmount
      s.posZ += (dz / dist) * moveAmount

      const targetRot = Math.atan2(dx, dz)
      s.rotY = THREE.MathUtils.lerp(s.rotY, targetRot, 0.06)
    } else {
      if (dx !== 0 || dz !== 0) {
        const targetRot = Math.atan2(dx, dz)
        s.rotY = THREE.MathUtils.lerp(s.rotY, targetRot, 0.03)
      }
    }

    moveRef.current.position.x = s.posX
    moveRef.current.position.z = s.posZ
    moveRef.current.rotation.y = s.rotY

    // Update shared position ref
    positionRef.current.set(s.posX, 0, s.posZ)

    // Animation transitions
    const desiredAnim = isMoving ? (shouldRun ? RUN : WALK) : IDLE
    if (desiredAnim !== s.currentAnim) {
      const prev = actions[s.currentAnim as ActionName]
      const next = actions[desiredAnim]
      if (next) {
        prev?.fadeOut(0.2)
        next.reset().fadeIn(0.2).play()
        s.currentAnim = desiredAnim
      }
    }
  })

  return (
    <group ref={moveRef} position={[0, 0, 0]} scale={0.5} dispose={null}>
      <group ref={animRef}>
        <primitive object={clone} />
      </group>
    </group>
  )
}

useGLTF.preload('/models/Dog.glb')
```

- [ ] **Step 2: Add Dog to FetchScene**

In `src/features/fetch/components/FetchScene.tsx`, add the import:

```ts
import Dog from './Dog'
```

Add `<Dog>` to the JSX return, after `<Butterfly>`:

```tsx
<Dog
  butterflyPosition={butterflyPosition}
  positionRef={dogPosition}
/>
```

- [ ] **Step 3: Verify visually**

Run dev server, navigate to `/fetch`. You should see:
- Dog standing in the grass at origin
- Move butterfly with WASD, dog chases it
- Dog walks when close, runs when far
- Camera follows behind the dog, looking toward the butterfly
- Grass bends away from the dog as it passes

- [ ] **Step 4: Commit**

```bash
git add src/features/fetch/components/Dog.tsx src/features/fetch/components/FetchScene.tsx
git commit -m "feat(fetch): add dog with chase AI and grass interaction"
```

---

### Task 8: Sun & Moon Celestial Bodies

**Files:**
- Create: `src/features/fetch/components/Sun.tsx`
- Create: `src/features/fetch/components/Moon.tsx`

- [ ] **Step 1: Create the Sun component**

Create `src/features/fetch/components/Sun.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SunProps {
  fieldCenter: React.RefObject<THREE.Vector3>
  nightBlend: number
}

export default function Sun({ fieldCenter, nightBlend }: SunProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const coronaRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    // Follow field center on the left horizon
    const center = fieldCenter.current
    groupRef.current.position.set(center.x - 30, 5, center.z)

    // Fade out during night
    const opacity = 1.0 - nightBlend
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(0, 1, opacity))
    groupRef.current.visible = nightBlend < 0.95

    // Pulse corona
    if (coronaRef.current) {
      const pulse = 1.0 + Math.sin(clock.getElapsedTime() * 0.5) * 0.05
      coronaRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <group ref={groupRef}>
      {/* Sun body */}
      <mesh>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#FFF5E6" toneMapped={false} />
      </mesh>

      {/* Corona glow */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshBasicMaterial
          color="#FFD700"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer glow ring */}
      <mesh>
        <ringGeometry args={[2.5, 5, 64]} />
        <meshBasicMaterial
          color="#FFA500"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Create the Moon component**

Create `src/features/fetch/components/Moon.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface MoonProps {
  fieldCenter: React.RefObject<THREE.Vector3>
  nightBlend: number
}

export default function Moon({ fieldCenter, nightBlend }: MoonProps) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame(() => {
    if (!groupRef.current) return

    // Follow field center on the right horizon
    const center = fieldCenter.current
    groupRef.current.position.set(center.x + 30, 8, center.z)

    // Fade in during night
    const opacity = nightBlend
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(0, 1, opacity))
    groupRef.current.visible = nightBlend > 0.05
  })

  return (
    <group ref={groupRef}>
      {/* Moon body */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#E8E8F0" toneMapped={false} />
      </mesh>

      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[2.8, 32, 32]} />
        <meshBasicMaterial
          color="#CCE5FF"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <ringGeometry args={[2, 4.5, 64]} />
        <meshBasicMaterial
          color="#99BBFF"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 3: Add Sun and Moon to FetchScene**

In `src/features/fetch/components/FetchScene.tsx`, add imports:

```ts
import Sun from './Sun'
import Moon from './Moon'
```

Add them to the JSX return, after the lighting block:

```tsx
<Sun fieldCenter={fieldCenter} nightBlend={nightBlendRef.current} />
<Moon fieldCenter={fieldCenter} nightBlend={nightBlendRef.current} />
```

- [ ] **Step 4: Verify visually**

Run dev server, navigate to `/fetch`:
- Light mode: sun visible on the left horizon with golden corona glow
- Dark mode: moon visible on the right horizon with blue glow halo
- Toggle theme: sun fades out as moon fades in (and vice versa)
- Both celestial bodies follow the field as you move

- [ ] **Step 5: Commit**

```bash
git add src/features/fetch/components/Sun.tsx src/features/fetch/components/Moon.tsx src/features/fetch/components/FetchScene.tsx
git commit -m "feat(fetch): add stylized sun and moon celestial bodies"
```

---

### Task 9: Trail Wake System

**Files:**
- Create: `src/features/fetch/hooks/useTrailWake.ts`

- [ ] **Step 1: Create the useTrailWake hook**

Create `src/features/fetch/hooks/useTrailWake.ts`:

```ts
import { useRef, useCallback } from 'react'

const MAX_TRAIL_POINTS = 30
const BUFFER_STRIDE = 3 // x, z, age
const RECORD_INTERVAL = 0.1 // seconds between position recordings
const MAX_AGE = 3.0

export function useTrailWake() {
  const buffer = useRef(new Float32Array(MAX_TRAIL_POINTS * BUFFER_STRIDE))
  const count = useRef(0)
  const head = useRef(0) // circular buffer head
  const timeSinceLastRecord = useRef(0)

  const addPosition = useCallback((x: number, z: number) => {
    const idx = head.current * BUFFER_STRIDE
    buffer.current[idx] = x
    buffer.current[idx + 1] = z
    buffer.current[idx + 2] = 0 // age starts at 0
    head.current = (head.current + 1) % MAX_TRAIL_POINTS
    if (count.current < MAX_TRAIL_POINTS) count.current++
  }, [])

  const update = useCallback((delta: number, dogX: number, dogZ: number) => {
    // Age all existing entries
    for (let i = 0; i < count.current; i++) {
      const idx = i * BUFFER_STRIDE + 2
      buffer.current[idx] = Math.min(buffer.current[idx] + delta, MAX_AGE)
    }

    // Record new position at throttled interval
    timeSinceLastRecord.current += delta
    if (timeSinceLastRecord.current >= RECORD_INTERVAL) {
      timeSinceLastRecord.current = 0
      addPosition(dogX, dogZ)
    }
  }, [addPosition])

  return {
    buffer,
    count,
    update,
  }
}
```

- [ ] **Step 2: Wire trail wake into FetchScene and Dog**

In `src/features/fetch/components/FetchScene.tsx`, add the import:

```ts
import { useTrailWake } from '../hooks/useTrailWake'
```

Replace the trail buffer refs with the hook. Remove these lines:
```ts
const trailBuffer = useRef(new Float32Array(90))
const trailCount = useRef(0)
```

Add the hook call:
```ts
const trail = useTrailWake()
```

Update the `<GrassField>` props to use the hook's refs:
```tsx
trailBuffer={trail.buffer}
trailCount={trail.count}
```

Add trail update to FetchScene's `useFrame`, after the fieldCenter update:

```ts
trail.update(delta, dogPosition.current.x, dogPosition.current.z)
```

- [ ] **Step 3: Verify visually**

Run dev server, navigate to `/fetch`:
- Move the butterfly so the dog chases it
- Behind the dog, grass should flatten and gradually spring back up
- The trail should be visible as a path through the grass

- [ ] **Step 4: Commit**

```bash
git add src/features/fetch/hooks/useTrailWake.ts src/features/fetch/components/FetchScene.tsx src/features/fetch/components/Dog.tsx
git commit -m "feat(fetch): add trail wake system with spring-back animation"
```

---

### Task 10: Biome Selector UI

**Files:**
- Create: `src/features/fetch/components/BiomeSelector.tsx`

- [ ] **Step 1: Create the BiomeSelector component**

Create `src/features/fetch/components/BiomeSelector.tsx`:

```tsx
import { useEffect } from 'react'
import { BIOMES } from '../lib/biomes'

interface BiomeSelectorProps {
  currentIndex: number
  onBiomeChange: (index: number) => void
}

export default function BiomeSelector({ currentIndex, onBiomeChange }: BiomeSelectorProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '[') {
        onBiomeChange((currentIndex - 1 + BIOMES.length) % BIOMES.length)
      } else if (e.key === ']') {
        onBiomeChange((currentIndex + 1) % BIOMES.length)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [currentIndex, onBiomeChange])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        borderRadius: '9999px',
        color: 'white',
        fontSize: '0.875rem',
        fontFamily: 'inherit',
        userSelect: 'none',
        zIndex: 50,
      }}
    >
      <button
        onClick={() => onBiomeChange((currentIndex - 1 + BIOMES.length) % BIOMES.length)}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '1rem',
          padding: '0 0.25rem',
        }}
        aria-label="Previous biome"
      >
        &larr;
      </button>
      <span style={{ minWidth: '120px', textAlign: 'center' }}>
        {BIOMES[currentIndex].name}
      </span>
      <button
        onClick={() => onBiomeChange((currentIndex + 1) % BIOMES.length)}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '1rem',
          padding: '0 0.25rem',
        }}
        aria-label="Next biome"
      >
        &rarr;
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Add biome state management to FetchScene**

In `src/features/fetch/components/FetchScene.tsx`, this requires converting biome tracking from refs to state for the UI, while keeping refs for per-frame shader updates.

Add imports:
```ts
import { useRef, useState, useCallback } from 'react'
import BiomeSelector from './BiomeSelector'
```

Replace the biome ref section with state + refs:
```ts
const [biomeIdx, setBiomeIdx] = useState(DEFAULT_BIOME_INDEX)
const prevBiomeIdx = useRef(DEFAULT_BIOME_INDEX)
const biomeT = useRef(0) // transition progress 0..1
const transitioning = useRef(false)
```

Add biome change handler:
```ts
const handleBiomeChange = useCallback((newIndex: number) => {
  prevBiomeIdx.current = biomeIdx
  setBiomeIdx(newIndex)
  biomeT.current = 0
  transitioning.current = true
}, [biomeIdx])
```

In the `useFrame`, add biome transition lerp (after the night blend lerp):
```ts
if (transitioning.current) {
  biomeT.current = Math.min(biomeT.current + delta * 0.67, 1.0) // ~1.5s transition
  if (biomeT.current >= 1.0) {
    transitioning.current = false
    prevBiomeIdx.current = biomeIdx
    biomeT.current = 0
  }
}
```

Update the GrassField props:
```tsx
<GrassField
  biome={BIOMES[prevBiomeIdx.current]}
  targetBiome={BIOMES[biomeIdx]}
  biomeTransition={biomeT.current}
  nightBlend={nightBlendRef.current}
  dogPosition={dogPosition}
  fieldCenter={fieldCenter}
  trailBuffer={trail.buffer}
  trailCount={trail.count}
/>
```

Update the ground color to use the active biome:
```ts
const activeBiome = BIOMES[biomeIdx]
const groundColor = new THREE.Color(...activeBiome.groundColor as [number, number, number])
```

Add `<BiomeSelector>` as a sibling to the R3F content. Since FetchScene renders inside a Canvas, the BiomeSelector HTML overlay needs to be rendered via a portal or passed up. The simplest approach: render it via `createPortal` from `@react-three/fiber`'s `Html` component, or better, render it outside the Canvas.

Since FetchScene is rendered inside the R3F Canvas (via Experience.tsx), the HTML overlay needs to use drei's `<Html>` component. However, for a fixed-position overlay, it's cleaner to use `createPortal` to render into document.body.

Add to FetchScene's return, using `createPortal`:

```tsx
import { createPortal } from 'react-dom'
```

Add at the end of the JSX return (inside the fragment):
```tsx
{createPortal(
  <BiomeSelector currentIndex={biomeIdx} onBiomeChange={handleBiomeChange} />,
  document.body,
)}
```

- [ ] **Step 3: Verify visually**

Run dev server, navigate to `/fetch`:
- Biome selector pill visible in bottom-right corner
- Click arrows or press `[` / `]` to cycle biomes
- Grass colors, fog, and ground smoothly transition over ~1.5 seconds
- All 5 biomes work: Enchanted Meadow, Golden Prairie, Twilight Grove, Cherry Blossom, Volcanic Ashlands

- [ ] **Step 4: Commit**

```bash
git add src/features/fetch/components/BiomeSelector.tsx src/features/fetch/components/FetchScene.tsx
git commit -m "feat(fetch): add biome selector with smooth transitions"
```

---

### Task 11: Idle Landing Sequence

**Files:**
- Modify: `src/features/fetch/components/FetchScene.tsx`
- Modify: `src/features/fetch/components/Butterfly.tsx`
- Modify: `src/features/fetch/components/Dog.tsx`

- [ ] **Step 1: Add idle detection to FetchScene**

In `src/features/fetch/components/FetchScene.tsx`, add an idle timer ref:

```ts
const idleTimer = useRef(0)
const isIdle = useRef(false)
```

In the `useFrame`, after updating the field center, add idle detection:

```ts
// Idle detection
if (input.current.active) {
  idleTimer.current = 0
  isIdle.current = false
} else {
  idleTimer.current += delta
  if (idleTimer.current > 2.0) {
    isIdle.current = true
  }
}
```

Pass `isIdle` to both Butterfly and Dog:
```tsx
<Butterfly input={input} positionRef={butterflyPosition} isIdle={isIdle} dogPosition={dogPosition} />
<Dog butterflyPosition={butterflyPosition} positionRef={dogPosition} isIdle={isIdle} />
```

- [ ] **Step 2: Update Butterfly to land on dog when idle**

In `src/features/fetch/components/Butterfly.tsx`, update the interface:

```ts
interface ButterflyProps {
  input: React.RefObject<{ x: number; y: number; active: boolean }>
  positionRef: React.RefObject<THREE.Vector3>
  isIdle: React.RefObject<boolean>
  dogPosition: React.RefObject<THREE.Vector3>
}
```

Update the component signature and useFrame:

```tsx
export default function Butterfly({ input, positionRef, isIdle, dogPosition }: ButterflyProps) {
```

In the `useFrame`, after the movement block, add idle landing logic:

```ts
// Idle landing: descend toward dog
if (isIdle.current && dogPosition.current) {
  const landTarget = dogPosition.current.clone()
  landTarget.y += 0.6 // dog's head height (scaled model)

  groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, landTarget.x, 0.02)
  groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, landTarget.z, 0.02)

  // Descend to head height
  const landY = landTarget.y + Math.sin(t * 3.5) * 0.03 // reduced flutter
  groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, landY, 0.03)

  // Reduce wing flutter when perched
  groupRef.current.rotation.z = Math.sin(t * 20) * 0.04
} else {
  // Normal hover and flutter (existing code)
  groupRef.current.position.y = HOVER_HEIGHT + Math.sin(t * 3.5) * 0.12
  groupRef.current.rotation.z = Math.sin(t * 20) * 0.15
}
```

Move the hover bob and flutter into the else branch (they're currently unconditional). The movement block (WASD) should only run when `!isIdle.current`.

- [ ] **Step 3: Update Dog to idle when sequence triggers**

In `src/features/fetch/components/Dog.tsx`, add `isIdle` to the interface:

```ts
interface DogProps {
  butterflyPosition: React.RefObject<THREE.Vector3>
  positionRef: React.RefObject<THREE.Vector3>
  isIdle: React.RefObject<boolean>
}
```

In the `useFrame`, wrap the chase logic in an `if (!isIdle.current)` check. When idle, transition to IDLE animation:

```ts
if (isIdle.current) {
  // When idle, just face the butterfly and sit
  const dx = butterflyPosition.current.x - s.posX
  const dz = butterflyPosition.current.z - s.posZ
  if (dx !== 0 || dz !== 0) {
    const targetRot = Math.atan2(dx, dz)
    s.rotY = THREE.MathUtils.lerp(s.rotY, targetRot, 0.03)
  }

  const desiredAnim = IDLE
  if (desiredAnim !== s.currentAnim) {
    const prev = actions[s.currentAnim as ActionName]
    const next = actions[desiredAnim]
    if (next) {
      prev?.fadeOut(0.2)
      next.reset().fadeIn(0.2).play()
      s.currentAnim = desiredAnim
    }
  }
} else {
  // ... existing chase logic ...
}
```

- [ ] **Step 4: Verify visually**

Run dev server, navigate to `/fetch`:
- Move butterfly with WASD, then stop pressing keys
- After ~2 seconds, butterfly should slowly drift down toward the dog
- Dog transitions to Idle animation and sits
- Butterfly perches near dog's head with reduced flutter
- Press any key: butterfly lifts back up, dog starts chasing again

- [ ] **Step 5: Commit**

```bash
git add src/features/fetch/components/FetchScene.tsx src/features/fetch/components/Butterfly.tsx src/features/fetch/components/Dog.tsx
git commit -m "feat(fetch): add idle landing sequence (butterfly perches on dog)"
```

---

### Task 12: Virtual Joystick (Mobile)

**Files:**
- Create: `src/features/fetch/components/VirtualJoystick.tsx`

- [ ] **Step 1: Create the VirtualJoystick component**

Create `src/features/fetch/components/VirtualJoystick.tsx`:

```tsx
import { useRef, useEffect, useState } from 'react'

interface VirtualJoystickProps {
  onInput: (x: number, y: number) => void
}

const JOYSTICK_SIZE = 120
const KNOB_SIZE = 48
const MAX_DISTANCE = (JOYSTICK_SIZE - KNOB_SIZE) / 2

export default function VirtualJoystick({ onInput }: VirtualJoystickProps) {
  const [visible, setVisible] = useState(false)
  const [center, setCenter] = useState({ x: 0, y: 0 })
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const touchId = useRef<number | null>(null)
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window

  useEffect(() => {
    if (!isTouchDevice) return

    const onTouchStart = (e: TouchEvent) => {
      if (touchId.current !== null) return
      const touch = e.changedTouches[0]
      // Only activate in the bottom-left quadrant
      if (touch.clientX > window.innerWidth / 2 || touch.clientY < window.innerHeight / 2) return

      touchId.current = touch.identifier
      setCenter({ x: touch.clientX, y: touch.clientY })
      setKnob({ x: 0, y: 0 })
      setVisible(true)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (touchId.current === null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        if (touch.identifier !== touchId.current) continue

        let dx = touch.clientX - center.x
        let dy = touch.clientY - center.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > MAX_DISTANCE) {
          dx = (dx / dist) * MAX_DISTANCE
          dy = (dy / dist) * MAX_DISTANCE
        }

        setKnob({ x: dx, y: dy })
        onInput(dx / MAX_DISTANCE, -dy / MAX_DISTANCE)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId.current) {
          touchId.current = null
          setVisible(false)
          setKnob({ x: 0, y: 0 })
          onInput(0, 0)
        }
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [isTouchDevice, center.x, center.y, onInput])

  if (!isTouchDevice || !visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: center.x - JOYSTICK_SIZE / 2,
        top: center.y - JOYSTICK_SIZE / 2,
        width: JOYSTICK_SIZE,
        height: JOYSTICK_SIZE,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.15)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: JOYSTICK_SIZE / 2 - KNOB_SIZE / 2 + knob.x,
          top: JOYSTICK_SIZE / 2 - KNOB_SIZE / 2 + knob.y,
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.4)',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Wire VirtualJoystick into FetchScene**

In `src/features/fetch/components/FetchScene.tsx`, add the import:

```ts
import VirtualJoystick from './VirtualJoystick'
import { setJoystickInput } from '../hooks/useInput'
```

Add a joystick callback:
```ts
const handleJoystickInput = useCallback((x: number, y: number) => {
  setJoystickInput(input, x, y)
}, [input])
```

Add `<VirtualJoystick>` to the portal alongside `<BiomeSelector>`:

```tsx
{createPortal(
  <>
    <BiomeSelector currentIndex={biomeIdx} onBiomeChange={handleBiomeChange} />
    <VirtualJoystick onInput={handleJoystickInput} />
  </>,
  document.body,
)}
```

- [ ] **Step 3: Verify**

Test on a touch device or Chrome DevTools mobile emulation:
- Touch the bottom-left area of the screen to summon the joystick
- Drag to move the butterfly
- Release to dismiss the joystick

- [ ] **Step 4: Commit**

```bash
git add src/features/fetch/components/VirtualJoystick.tsx src/features/fetch/components/FetchScene.tsx
git commit -m "feat(fetch): add virtual joystick for mobile controls"
```

---

### Task 13: Cleanup & Final Integration

**Files:**
- Modify: `src/features/fetch/index.ts`

- [ ] **Step 1: Verify the barrel export is correct**

`src/features/fetch/index.ts` should already have:
```ts
export { default as FetchScene } from './components/FetchScene'
```

No changes needed unless it's out of date.

- [ ] **Step 2: Full integration test**

Run `npm run dev` and verify the complete feature:

1. Navigate to `/fetch`
2. Grass field renders with Twilight Grove biome (dark teal, bioluminescent flowers)
3. WASD/arrows move the butterfly
4. Dog chases the butterfly through the grass
5. Grass bends away from the dog
6. Trail wake visible behind the dog, springs back after ~3 seconds
7. Camera follows smoothly behind the dog
8. Sun on left (light mode) / Moon on right (dark mode)
9. Toggle theme: smooth lighting transition, celestial body swap
10. `[` and `]` keys cycle biomes with smooth color transitions
11. Biome selector pill visible in bottom-right
12. Stop pressing keys for ~2 seconds: idle landing sequence triggers
13. Press keys again: butterfly lifts, dog resumes chase

- [ ] **Step 3: Build check**

```bash
npm run build
```

Fix any TypeScript errors that appear.

- [ ] **Step 4: Commit any fixes**

```bash
git add -u
git commit -m "fix(fetch): address build errors and final integration cleanup"
```

Only create this commit if there were fixes needed. Skip if the build was clean.
