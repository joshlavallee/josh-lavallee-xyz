# Theme Differentiation & Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three UI themes (flat, glass, paper) dramatically distinct visual languages, replace the homepage with an interactive fluid shader, add ambient music with a unified settings panel, and move the dog scene to `/about`.

**Architecture:** The existing two-dimensional theming system (color mode x UI style) is preserved and deepened with many more CSS custom properties. A new R3F fluid shader scene replaces the homepage. An AudioProvider context manages ambient music. A new SettingsPanel component replaces ThemeControls with a gear-icon panel containing Mode, Style, and Music sections. Routes are reorganized so `/about` renders the dog scene.

**Tech Stack:** React 19, TanStack Start/Router, React Three Fiber + Drei, Three.js, Tailwind CSS 4, GLSL shaders, Web Audio API, Lucide icons

---

### Task 1: Move noise.glsl to shared location

**Files:**
- Create: `src/shaders/noise.glsl` (copy from `src/features/photography/shaders/noise.glsl`)
- Modify: `src/features/photography/components/ParticleSystem.tsx:7`
- Delete: `src/features/photography/shaders/noise.glsl`

- [ ] **Step 1: Create the shared shader directory and copy noise.glsl**

Create `src/shaders/noise.glsl` with the exact contents of the existing file:

```glsl
// Simplex 2D noise - adapted from Ashima Arts (MIT)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,   // (3.0-sqrt(3.0))/6.0
    0.366025403784439,   // 0.5*(sqrt(3.0)-1.0)
   -0.577350269189626,   // -1.0 + 2.0 * C.x
    0.024390243902439    // 1.0 / 41.0
  );

  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);

  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);

  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));

  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;

  return 130.0 * dot(m, g);
}
```

- [ ] **Step 2: Update ParticleSystem.tsx import path**

In `src/features/photography/components/ParticleSystem.tsx`, change line 7 from:

```typescript
import noiseGlsl from '../shaders/noise.glsl?raw'
```

to:

```typescript
import noiseGlsl from '@/shaders/noise.glsl?raw'
```

- [ ] **Step 3: Delete the old noise.glsl file**

```bash
rm src/features/photography/shaders/noise.glsl
```

- [ ] **Step 4: Verify the app builds**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/shaders/noise.glsl src/features/photography/components/ParticleSystem.tsx
git add src/features/photography/shaders/noise.glsl
git commit -m "refactor: move noise.glsl to shared shaders directory"
```

---

### Task 2: Deepen theme CSS custom properties

**Files:**
- Modify: `src/index.css`

This task expands the `[data-style="..."]` CSS blocks with new custom properties for buttons, inputs, focus rings, and hover states so each theme feels dramatically different.

- [ ] **Step 1: Add new CSS custom properties to the flat style blocks**

In `src/index.css`, replace the flat style blocks (both light and dark) with expanded versions. Find the `[data-style="flat"]` block and replace it:

```css
[data-style="flat"],
:root:not([data-style]) {
  --surface-bg: var(--card);
  --surface-blur: 0px;
  --surface-shadow: 0 1px 2px oklch(0 0 0 / 6%), 0 1px 3px oklch(0 0 0 / 10%);
  --surface-shadow-hover: 0 4px 6px oklch(0 0 0 / 7%), 0 2px 4px oklch(0 0 0 / 6%);
  --surface-border: 1px solid var(--border);
  --surface-radius: var(--radius);
  --surface-inset-shadow: inset 0 1px 2px oklch(0 0 0 / 6%);
  --surface-btn-shadow: 0 1px 2px oklch(0 0 0 / 8%);
  --surface-btn-shadow-hover: 0 2px 4px oklch(0 0 0 / 12%);
  --surface-btn-active-shadow: inset 0 1px 2px oklch(0 0 0 / 10%);
  --surface-input-bg: var(--background);
  --surface-input-border: 1px solid var(--input);
  --surface-input-shadow: none;
  --surface-input-focus-shadow: 0 0 0 3px oklch(from var(--ring) l c h / 20%);
  --surface-input-focus-border: 1px solid var(--ring);
  --surface-toggle-bg: var(--muted);
  --surface-toggle-active-bg: var(--primary);
}

.dark[data-style="flat"],
.dark:not([data-style]) {
  --surface-shadow: 0 1px 2px oklch(0 0 0 / 15%), 0 1px 3px oklch(0 0 0 / 25%);
  --surface-shadow-hover: 0 4px 6px oklch(0 0 0 / 20%), 0 2px 4px oklch(0 0 0 / 15%);
  --surface-inset-shadow: inset 0 1px 2px oklch(0 0 0 / 20%);
  --surface-btn-shadow: 0 1px 2px oklch(0 0 0 / 20%);
  --surface-btn-shadow-hover: 0 2px 4px oklch(0 0 0 / 30%);
  --surface-btn-active-shadow: inset 0 1px 2px oklch(0 0 0 / 25%);
  --surface-input-shadow: none;
  --surface-input-focus-shadow: 0 0 0 3px oklch(from var(--ring) l c h / 30%);
}
```

- [ ] **Step 2: Add new CSS custom properties to the glass style blocks**

Replace the `[data-style="glass"]` block with the expanded version:

```css
[data-style="glass"] {
  --surface-bg: oklch(from var(--card) l c h / 18%);
  --surface-blur: 32px;
  --surface-shadow:
    0 8px 32px oklch(0 0 0 / 6%),
    0 2px 8px oklch(0 0 0 / 4%),
    inset 0 1px 0 oklch(1 0 0 / 50%),
    inset 0 -1px 0 oklch(1 0 0 / 10%);
  --surface-shadow-hover:
    0 12px 48px oklch(0.55 0.22 295 / 12%),
    0 4px 16px oklch(0.50 0.20 280 / 8%),
    inset 0 1px 0 oklch(1 0 0 / 60%),
    inset 0 -1px 0 oklch(1 0 0 / 15%);
  --surface-border: 1px solid oklch(1 0 0 / 30%);
  --surface-radius: 1rem;
  --surface-inset-shadow:
    inset 0 2px 6px oklch(0 0 0 / 6%),
    inset 0 1px 0 oklch(1 0 0 / 25%),
    inset 0 -1px 0 oklch(1 0 0 / 10%);
  --surface-btn-shadow:
    0 2px 8px oklch(0 0 0 / 6%),
    inset 0 1px 0 oklch(1 0 0 / 40%);
  --surface-btn-shadow-hover:
    0 4px 20px oklch(0.55 0.22 295 / 18%),
    inset 0 1px 0 oklch(1 0 0 / 50%);
  --surface-btn-active-shadow:
    inset 0 2px 6px oklch(0 0 0 / 10%),
    inset 0 1px 0 oklch(1 0 0 / 20%);
  --surface-input-bg: oklch(from var(--card) l c h / 10%);
  --surface-input-border: 1px solid oklch(1 0 0 / 20%);
  --surface-input-shadow: inset 0 1px 0 oklch(1 0 0 / 10%);
  --surface-input-focus-shadow:
    0 0 0 3px oklch(from var(--ring) l c h / 15%),
    inset 0 0 12px oklch(from var(--ring) l c h / 8%);
  --surface-input-focus-border: 1px solid oklch(1 0 0 / 40%);
  --surface-toggle-bg: oklch(from var(--muted) l c h / 20%);
  --surface-toggle-active-bg: oklch(from var(--primary) l c h / 40%);
}

.dark[data-style="glass"] {
  --surface-bg: oklch(from var(--card) l c h / 12%);
  --surface-blur: 32px;
  --surface-shadow:
    0 8px 32px oklch(0 0 0 / 25%),
    0 2px 8px oklch(0 0 0 / 15%),
    inset 0 1px 0 oklch(1 0 0 / 8%),
    inset 0 -1px 0 oklch(1 0 0 / 3%);
  --surface-shadow-hover:
    0 12px 48px oklch(0.65 0.22 295 / 18%),
    0 4px 16px oklch(0.55 0.20 280 / 10%),
    inset 0 1px 0 oklch(1 0 0 / 12%),
    inset 0 -1px 0 oklch(1 0 0 / 5%);
  --surface-border: 1px solid oklch(1 0 0 / 10%);
  --surface-inset-shadow:
    inset 0 2px 6px oklch(0 0 0 / 18%),
    inset 0 1px 0 oklch(1 0 0 / 6%),
    inset 0 -1px 0 oklch(1 0 0 / 3%);
  --surface-btn-shadow:
    0 2px 8px oklch(0 0 0 / 20%),
    inset 0 1px 0 oklch(1 0 0 / 8%);
  --surface-btn-shadow-hover:
    0 4px 20px oklch(0.65 0.22 295 / 22%),
    inset 0 1px 0 oklch(1 0 0 / 12%);
  --surface-btn-active-shadow:
    inset 0 2px 6px oklch(0 0 0 / 25%),
    inset 0 1px 0 oklch(1 0 0 / 5%);
  --surface-input-bg: oklch(from var(--card) l c h / 8%);
  --surface-input-border: 1px solid oklch(1 0 0 / 8%);
  --surface-input-shadow: inset 0 1px 0 oklch(1 0 0 / 4%);
  --surface-input-focus-shadow:
    0 0 0 3px oklch(from var(--ring) l c h / 20%),
    inset 0 0 12px oklch(from var(--ring) l c h / 10%);
  --surface-input-focus-border: 1px solid oklch(1 0 0 / 20%);
  --surface-toggle-bg: oklch(from var(--muted) l c h / 15%);
  --surface-toggle-active-bg: oklch(from var(--primary) l c h / 35%);
}
```

- [ ] **Step 3: Add new CSS custom properties to the paper style blocks**

Replace the `[data-style="paper"]` block with the expanded version:

```css
[data-style="paper"] {
  --surface-bg: var(--background);
  --surface-blur: 0px;
  --surface-shadow:
    6px 6px 14px oklch(0 0 0 / 10%),
    -6px -6px 14px oklch(1 0 0 / 85%),
    2px 2px 4px oklch(0 0 0 / 5%);
  --surface-shadow-hover:
    8px 8px 18px oklch(0 0 0 / 13%),
    -8px -8px 18px oklch(1 0 0 / 95%),
    3px 3px 6px oklch(0 0 0 / 6%);
  --surface-border: none;
  --surface-radius: 1.5rem;
  --surface-inset-shadow:
    inset 3px 3px 6px oklch(0 0 0 / 8%),
    inset -3px -3px 6px oklch(1 0 0 / 65%),
    inset 1px 1px 2px oklch(0 0 0 / 4%);
  --surface-btn-shadow:
    4px 4px 10px oklch(0 0 0 / 10%),
    -4px -4px 10px oklch(1 0 0 / 75%),
    1px 1px 3px oklch(0 0 0 / 5%);
  --surface-btn-shadow-hover:
    3px 3px 7px oklch(0 0 0 / 8%),
    -3px -3px 7px oklch(1 0 0 / 65%);
  --surface-btn-active-shadow:
    inset 3px 3px 6px oklch(0 0 0 / 10%),
    inset -3px -3px 6px oklch(1 0 0 / 60%);
  --surface-input-bg: var(--background);
  --surface-input-border: none;
  --surface-input-shadow:
    inset 2px 2px 5px oklch(0 0 0 / 8%),
    inset -2px -2px 5px oklch(1 0 0 / 65%);
  --surface-input-focus-shadow:
    inset 2px 2px 5px oklch(0 0 0 / 10%),
    inset -2px -2px 5px oklch(1 0 0 / 70%),
    0 0 0 2px oklch(from var(--ring) l c h / 15%);
  --surface-input-focus-border: none;
  --surface-toggle-bg: var(--background);
  --surface-toggle-active-bg: var(--background);
}

.dark[data-style="paper"] {
  --surface-shadow:
    6px 6px 14px oklch(0 0 0 / 50%),
    -6px -6px 14px oklch(1 0 0 / 3.5%),
    2px 2px 4px oklch(0 0 0 / 30%);
  --surface-shadow-hover:
    8px 8px 18px oklch(0 0 0 / 55%),
    -8px -8px 18px oklch(1 0 0 / 4.5%),
    3px 3px 6px oklch(0 0 0 / 35%);
  --surface-inset-shadow:
    inset 3px 3px 6px oklch(0 0 0 / 35%),
    inset -3px -3px 6px oklch(1 0 0 / 2.5%),
    inset 1px 1px 2px oklch(0 0 0 / 20%);
  --surface-btn-shadow:
    4px 4px 10px oklch(0 0 0 / 45%),
    -4px -4px 10px oklch(1 0 0 / 3%),
    1px 1px 3px oklch(0 0 0 / 25%);
  --surface-btn-shadow-hover:
    3px 3px 7px oklch(0 0 0 / 40%),
    -3px -3px 7px oklch(1 0 0 / 2.5%);
  --surface-btn-active-shadow:
    inset 3px 3px 6px oklch(0 0 0 / 40%),
    inset -3px -3px 6px oklch(1 0 0 / 2%);
  --surface-input-shadow:
    inset 2px 2px 5px oklch(0 0 0 / 30%),
    inset -2px -2px 5px oklch(1 0 0 / 2.5%);
  --surface-input-focus-shadow:
    inset 2px 2px 5px oklch(0 0 0 / 35%),
    inset -2px -2px 5px oklch(1 0 0 / 3%),
    0 0 0 2px oklch(from var(--ring) l c h / 20%);
}
```

- [ ] **Step 4: Add surface-input and surface-toggle classes to the components layer**

In `src/index.css`, add these new classes inside the existing `@layer components` block, after the `.surface-btn:active` rule:

```css
  .surface-input {
    background: var(--surface-input-bg);
    border: var(--surface-input-border);
    box-shadow: var(--surface-input-shadow);
    border-radius: var(--surface-radius);
    transition: box-shadow 0.2s ease, border 0.2s ease;
  }
  .surface-input:focus {
    box-shadow: var(--surface-input-focus-shadow);
    border: var(--surface-input-focus-border);
    outline: none;
  }

  .surface-toggle {
    background: var(--surface-toggle-bg);
    border-radius: var(--surface-radius);
    transition: background 0.2s ease, box-shadow 0.2s ease;
  }
  .surface-toggle[data-active="true"] {
    background: var(--surface-toggle-active-bg);
  }
```

- [ ] **Step 5: Verify the app builds and themes render**

```bash
npm run build
```

Expected: Build succeeds. Each of the 6 theme combinations (3 styles x 2 modes) now has complete CSS variable coverage for surfaces, buttons, inputs, and toggles.

- [ ] **Step 6: Commit**

```bash
git add src/index.css
git commit -m "feat: deepen theme CSS custom properties for flat, glass, and paper styles"
```

---

### Task 3: Create the `/about` route and move the dog scene

**Files:**
- Create: `src/routes/about.tsx`
- Modify: `src/routes/index.tsx`
- Modify: `src/Experience.tsx`

- [ ] **Step 1: Create the about route file**

Create `src/routes/about.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <div className="flex h-dvh flex-col items-center justify-end p-8 pb-24">
      <div className="surface px-6 py-3">
        <span className="text-sm font-medium text-foreground">
          Josh & Winnie
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Simplify the homepage route**

Replace the contents of `src/routes/index.tsx` with a minimal homepage (the fluid shader will be added in a later task; the R3F scene runs in the background via Experience):

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return <div className="h-dvh" />
}
```

- [ ] **Step 3: Update Experience.tsx to route AboutScene to /about and leave / empty for now**

Replace the contents of `src/Experience.tsx`:

```tsx
import { ParticlePhotography } from '@/features/photography'
import { AboutScene } from '@/features/about'
import type { ColorMode, UIStyle } from '@/providers/theme-provider'

interface ExperienceProps {
  routePath: string
  colorMode: ColorMode
  uiStyle: UIStyle
  photoIndex: number
}

export default function Experience({ routePath, colorMode, uiStyle, photoIndex }: ExperienceProps) {
  return (
    <>
      {routePath === '/photography' && (
        <ParticlePhotography
          colorMode={colorMode}
          uiStyle={uiStyle}
          photoIndex={photoIndex}
        />
      )}
      {routePath === '/about' && (
        <AboutScene colorMode={colorMode} uiStyle={uiStyle} />
      )}
    </>
  )
}
```

- [ ] **Step 4: Verify the app builds and routes work**

```bash
npm run build
```

Expected: Build succeeds. `/about` shows the dog scene with "Josh & Winnie" label. `/` shows an empty page (shader comes later). `/photography` still works.

- [ ] **Step 5: Commit**

```bash
git add src/routes/about.tsx src/routes/index.tsx src/Experience.tsx
git commit -m "feat: move dog scene to /about route, clear homepage for shader"
```

---

### Task 4: Update dock navigation

**Files:**
- Modify: `src/components/dock.tsx`

- [ ] **Step 1: Update DOCK_ITEMS to include Home, About, and Photography**

In `src/components/dock.tsx`, replace the imports and `DOCK_ITEMS` array. Change line 3 imports:

```tsx
import { Home, PawPrint, Camera, Box } from 'lucide-react'
```

Replace the `DOCK_ITEMS` array:

```tsx
const DOCK_ITEMS = [
  { to: '/' as const, label: 'Home', icon: Home },
  { to: '/about' as const, label: 'About', icon: PawPrint },
  { to: '/photography' as const, label: 'Photography', icon: Camera },
  { to: '/placeholder' as const, label: 'Placeholder', icon: Box },
]
```

- [ ] **Step 2: Verify the app builds**

```bash
npm run build
```

Expected: Build succeeds. Dock now shows Home, About, Photography, and Placeholder items.

- [ ] **Step 3: Commit**

```bash
git add src/components/dock.tsx
git commit -m "feat: add Home and About items to dock navigation"
```

---

### Task 5: Create the AudioProvider

**Files:**
- Create: `src/providers/audio-provider.tsx`
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Create the audio provider**

Create `src/providers/audio-provider.tsx`:

```tsx
import { createContext, useContext, useRef, useState, useCallback } from 'react'

interface AudioContextValue {
  isPlaying: boolean
  volume: number
  toggle: () => void
  setVolume: (v: number) => void
}

const AudioContext = createContext<AudioContextValue | null>(null)

const VOLUME_KEY = 'audio-volume'
const FADE_DURATION = 500

function getInitialVolume(): number {
  if (typeof window === 'undefined') return 0.5
  const stored = localStorage.getItem(VOLUME_KEY)
  if (stored !== null) {
    const parsed = parseFloat(stored)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed
  }
  return 0.5
}

export default function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadeRef = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(getInitialVolume)

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio('/audio/ambient.mp3')
      audio.loop = true
      audio.volume = 0
      audioRef.current = audio
    }
    return audioRef.current
  }, [])

  const fade = useCallback((audio: HTMLAudioElement, targetVolume: number, onComplete?: () => void) => {
    if (fadeRef.current !== null) cancelAnimationFrame(fadeRef.current)

    const startVolume = audio.volume
    const startTime = performance.now()

    function step(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / FADE_DURATION, 1)
      audio.volume = startVolume + (targetVolume - startVolume) * progress

      if (progress < 1) {
        fadeRef.current = requestAnimationFrame(step)
      } else {
        fadeRef.current = null
        onComplete?.()
      }
    }

    fadeRef.current = requestAnimationFrame(step)
  }, [])

  const toggle = useCallback(() => {
    const audio = getAudio()

    if (isPlaying) {
      fade(audio, 0, () => {
        audio.pause()
        setIsPlaying(false)
      })
    } else {
      audio.volume = 0
      audio.play().then(() => {
        fade(audio, volume)
        setIsPlaying(true)
      }).catch(() => {
        // Browser blocked autoplay, user needs to interact first
      })
    }
  }, [isPlaying, volume, getAudio, fade])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setVolumeState(clamped)
    localStorage.setItem(VOLUME_KEY, String(clamped))
    if (audioRef.current && isPlaying) {
      audioRef.current.volume = clamped
    }
  }, [isPlaying])

  return (
    <AudioContext value={{ isPlaying, volume, toggle, setVolume }}>
      {children}
    </AudioContext>
  )
}

export function useAudio() {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}
```

- [ ] **Step 2: Add AudioProvider to the root layout**

In `src/routes/__root.tsx`, add the import at the top (after the ThemeProvider import):

```tsx
import AudioProvider from '@/providers/audio-provider'
```

In the `RootDocument` function, wrap the children with `AudioProvider` inside `ThemeProvider`:

```tsx
<ThemeProvider>
  <AudioProvider>
    <SceneBridge />
    <div className="pointer-events-none relative z-10 [&_a,&_button,&_input,&_textarea,&_select]:pointer-events-auto">
      {children}
    </div>
    <ThemeControls />
    <Dock />
  </AudioProvider>
</ThemeProvider>
```

- [ ] **Step 3: Verify the app builds**

```bash
npm run build
```

Expected: Build succeeds. AudioProvider wraps the app. No audio plays until a user clicks play (which will be wired up in the settings panel task).

- [ ] **Step 4: Commit**

```bash
git add src/providers/audio-provider.tsx src/routes/__root.tsx
git commit -m "feat: add AudioProvider with fade in/out and localStorage persistence"
```

---

### Task 6: Create the Settings Panel

**Files:**
- Create: `src/components/settings-panel.tsx`
- Modify: `src/components/index.ts`
- Modify: `src/routes/__root.tsx`
- Delete (later): `src/components/theme-controls.tsx`

- [ ] **Step 1: Create the settings panel component**

Create `src/components/settings-panel.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react'
import { Settings, Sun, Moon, Square, Layers, Circle, Play, Pause, Volume2 } from 'lucide-react'
import { useTheme, type UIStyle } from '@/providers/theme-provider'
import { useAudio } from '@/providers/audio-provider'
import { cn } from '@/lib/utils'

const UI_STYLES: { value: UIStyle; label: string; icon: typeof Square }[] = [
  { value: 'glass', label: 'Glass', icon: Layers },
  { value: 'paper', label: 'Paper', icon: Circle },
  { value: 'flat', label: 'Flat', icon: Square },
]

export default function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { colorMode, uiStyle, setColorMode, setUIStyle } = useTheme()
  const { isPlaying, volume, toggle, setVolume } = useAudio()

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  return (
    <div
      className="fixed top-4 right-4 z-50"
      ref={panelRef}
    >
      {/* Gear button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'surface surface-btn flex h-10 w-10 items-center justify-center text-foreground/80 transition-all hover:text-foreground',
          isOpen && 'rotate-90'
        )}
        style={{ transition: 'transform 0.3s ease, box-shadow 0.2s ease' }}
        aria-label="Settings"
        aria-expanded={isOpen}
      >
        <Settings className="size-4" />
      </button>

      {/* Panel */}
      <div
        className={cn(
          'surface absolute top-12 right-0 w-56 origin-top-right p-4 transition-all duration-200',
          isOpen
            ? 'scale-100 opacity-100'
            : 'pointer-events-none scale-95 opacity-0'
        )}
      >
        {/* Mode section */}
        <div
          className="transition-all duration-200"
          style={{ transitionDelay: isOpen ? '0ms' : '0ms' }}
        >
          <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Mode
          </span>
          <div className="flex gap-1">
            {(['light', 'dark'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setColorMode(mode)}
                className={cn(
                  'surface-btn flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                  colorMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                style={{ borderRadius: 'var(--surface-radius)' }}
              >
                {mode === 'light' ? <Sun className="size-3" /> : <Moon className="size-3" />}
                {mode === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="my-3 h-px bg-border/50" />

        {/* Style section */}
        <div
          className="transition-all duration-200"
          style={{ transitionDelay: isOpen ? '50ms' : '0ms' }}
        >
          <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Style
          </span>
          <div className="flex gap-1">
            {UI_STYLES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setUIStyle(value)}
                className={cn(
                  'surface-btn flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors',
                  uiStyle === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                style={{ borderRadius: 'var(--surface-radius)' }}
              >
                <Icon className="size-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="my-3 h-px bg-border/50" />

        {/* Music section */}
        <div
          className="transition-all duration-200"
          style={{ transitionDelay: isOpen ? '100ms' : '0ms' }}
        >
          <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Music
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="surface-btn flex h-7 w-7 shrink-0 items-center justify-center text-foreground/80 transition-colors hover:text-foreground"
              style={{ borderRadius: 'var(--surface-radius)' }}
              aria-label={isPlaying ? 'Pause music' : 'Play music'}
            >
              {isPlaying ? <Pause className="size-3" /> : <Play className="size-3" />}
            </button>
            <div className="flex flex-1 items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="surface-input h-1 w-full cursor-pointer appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                aria-label="Volume"
              />
              <Volume2 className="size-3 shrink-0 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update the components barrel export**

Replace the contents of `src/components/index.ts`:

```typescript
export { default as Dock } from './dock'
export { default as SettingsPanel } from './settings-panel'
```

- [ ] **Step 3: Update __root.tsx to use SettingsPanel instead of ThemeControls**

In `src/routes/__root.tsx`, change the import:

```tsx
import { Dock, SettingsPanel } from '@/components'
```

Replace `<ThemeControls />` with `<SettingsPanel />` in the JSX.

- [ ] **Step 4: Delete the old theme-controls.tsx**

```bash
rm src/components/theme-controls.tsx
```

- [ ] **Step 5: Verify the app builds**

```bash
npm run build
```

Expected: Build succeeds. The gear icon appears in the top-right. Clicking it opens a panel with Mode, Style, and Music sections. Switching themes updates the panel's own appearance.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings-panel.tsx src/components/index.ts src/routes/__root.tsx
git add src/components/theme-controls.tsx
git commit -m "feat: replace ThemeControls with SettingsPanel (gear icon + expandable panel)"
```

---

### Task 7: Create the fluid shader GLSL files

**Files:**
- Create: `src/features/home/shaders/fluid.vert.glsl`
- Create: `src/features/home/shaders/fluid.frag.glsl`

- [ ] **Step 1: Create the vertex shader**

Create `src/features/home/shaders/fluid.vert.glsl`:

```glsl
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

- [ ] **Step 2: Create the fragment shader**

Create `src/features/home/shaders/fluid.frag.glsl`. This shader uses multi-octave simplex noise to create layered fluid movement with cursor-driven ripple distortion, mapped to a retrowave color gradient:

```glsl
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uColorMode;
uniform vec3 uThemeTint;

varying vec2 vUv;

NOISE_PLACEHOLDER

// Map a noise value (roughly -1..1) to a 5-stop retrowave gradient
vec3 retroGradient(float t, float brightness) {
  // Remap to 0..1
  t = t * 0.5 + 0.5;

  // 5 color stops: deep purple, neon pink, dark blue, cyan, purple
  vec3 c0 = vec3(0.15, 0.05, 0.30);  // deep purple
  vec3 c1 = vec3(0.70, 0.15, 0.50);  // neon pink
  vec3 c2 = vec3(0.08, 0.08, 0.25);  // dark blue
  vec3 c3 = vec3(0.20, 0.70, 0.75);  // cyan
  vec3 c4 = vec3(0.40, 0.10, 0.55);  // mid purple

  vec3 color;
  if (t < 0.25) {
    color = mix(c0, c1, t / 0.25);
  } else if (t < 0.5) {
    color = mix(c1, c2, (t - 0.25) / 0.25);
  } else if (t < 0.75) {
    color = mix(c2, c3, (t - 0.5) / 0.25);
  } else {
    color = mix(c3, c4, (t - 0.75) / 0.25);
  }

  // Apply brightness for light/dark mode
  color = mix(color, color * 1.6 + 0.15, brightness);

  return color;
}

void main() {
  // Aspect-corrected UV
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 uvAspect = vec2(uv.x * aspect, uv.y);

  // Cursor distance for ripple effect
  vec2 mouseAspect = vec2(uMouse.x * aspect, uMouse.y);
  float cursorDist = distance(uvAspect, mouseAspect);
  float cursorInfluence = smoothstep(0.3, 0.0, cursorDist);

  // Time-varying offsets
  float slowTime = uTime * 0.08;
  float medTime = uTime * 0.15;

  // Multi-octave noise for fluid movement
  float n1 = snoise(uvAspect * 2.0 + vec2(slowTime, slowTime * 0.7));
  float n2 = snoise(uvAspect * 4.0 + vec2(-medTime * 0.5, medTime * 0.8)) * 0.5;
  float n3 = snoise(uvAspect * 8.0 + vec2(medTime * 0.3, -slowTime * 1.2)) * 0.25;

  // Combine octaves
  float noise = n1 + n2 + n3;

  // Cursor creates subtle frequency boost and color shift
  float cursorNoise = snoise(uvAspect * 6.0 + vec2(uTime * 0.2, -uTime * 0.15));
  noise += cursorInfluence * cursorNoise * 0.4;

  // Map noise to retrowave gradient
  vec3 color = retroGradient(noise, uColorMode);

  // Apply theme tint
  color += uThemeTint * 0.15;

  // Subtle vignette
  float vignette = 1.0 - smoothstep(0.4, 1.4, length(uv - 0.5) * 2.0);
  color *= mix(0.7, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/home/shaders/fluid.vert.glsl src/features/home/shaders/fluid.frag.glsl
git commit -m "feat: add fluid shader GLSL files with multi-octave noise and cursor interaction"
```

---

### Task 8: Create the FluidShader and HomeScene components

**Files:**
- Create: `src/features/home/components/FluidShader.tsx`
- Create: `src/features/home/components/HomeScene.tsx`
- Create: `src/features/home/index.ts`
- Modify: `src/Experience.tsx`

- [ ] **Step 1: Create the FluidShader component**

Create `src/features/home/components/FluidShader.tsx`:

```tsx
import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { UIStyle } from '@/providers/theme-provider'
import vertexShader from '../shaders/fluid.vert.glsl?raw'
import fragmentShader from '../shaders/fluid.frag.glsl?raw'
import noiseGlsl from '@/shaders/noise.glsl?raw'

const THEME_TINTS: Record<UIStyle, [number, number, number]> = {
  paper: [0.08, 0.04, -0.02],   // warm amber shift
  glass: [-0.02, 0.02, 0.06],   // cool blue shift
  flat: [0.0, 0.0, 0.0],        // neutral
}

interface FluidShaderProps {
  colorMode: 'light' | 'dark'
  uiStyle: UIStyle
}

export default function FluidShader({ colorMode, uiStyle }: FluidShaderProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5))
  const { size } = useThree()

  const fullFragmentShader = useMemo(
    () => fragmentShader.replace('NOISE_PLACEHOLDER', noiseGlsl),
    []
  )

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uColorMode: { value: colorMode === 'light' ? 1.0 : 0.0 },
      uThemeTint: { value: new THREE.Vector3(...THEME_TINTS[uiStyle]) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useFrame((state, delta) => {
    if (!materialRef.current) return

    materialRef.current.uniforms.uTime.value += delta

    // Smooth mouse lerp
    const pointer = state.pointer
    const targetX = (pointer.x + 1) / 2
    const targetY = (pointer.y + 1) / 2
    mouseRef.current.x += (targetX - mouseRef.current.x) * 0.05
    mouseRef.current.y += (targetY - mouseRef.current.y) * 0.05
    materialRef.current.uniforms.uMouse.value.copy(mouseRef.current)

    // Update reactive uniforms
    materialRef.current.uniforms.uResolution.value.set(state.size.width, state.size.height)
    materialRef.current.uniforms.uColorMode.value = colorMode === 'light' ? 1.0 : 0.0
    const tint = THEME_TINTS[uiStyle]
    materialRef.current.uniforms.uThemeTint.value.set(tint[0], tint[1], tint[2])
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fullFragmentShader}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}
```

- [ ] **Step 2: Create the HomeScene component**

Create `src/features/home/components/HomeScene.tsx`:

```tsx
import { OrthographicCamera } from '@react-three/drei'
import type { ColorMode, UIStyle } from '@/providers/theme-provider'
import FluidShader from './FluidShader'

interface HomeSceneProps {
  colorMode: ColorMode
  uiStyle: UIStyle
}

export default function HomeScene({ colorMode, uiStyle }: HomeSceneProps) {
  return (
    <>
      <OrthographicCamera makeDefault position={[0, 0, 1]} />
      <FluidShader colorMode={colorMode} uiStyle={uiStyle} />
    </>
  )
}
```

- [ ] **Step 3: Create the feature barrel export**

Create `src/features/home/index.ts`:

```typescript
export { default as HomeScene } from './components/HomeScene'
```

- [ ] **Step 4: Wire HomeScene into Experience.tsx**

Replace the contents of `src/Experience.tsx`:

```tsx
import { ParticlePhotography } from '@/features/photography'
import { AboutScene } from '@/features/about'
import { HomeScene } from '@/features/home'
import type { ColorMode, UIStyle } from '@/providers/theme-provider'

interface ExperienceProps {
  routePath: string
  colorMode: ColorMode
  uiStyle: UIStyle
  photoIndex: number
}

export default function Experience({ routePath, colorMode, uiStyle, photoIndex }: ExperienceProps) {
  return (
    <>
      {routePath === '/' && (
        <HomeScene colorMode={colorMode} uiStyle={uiStyle} />
      )}
      {routePath === '/about' && (
        <AboutScene colorMode={colorMode} uiStyle={uiStyle} />
      )}
      {routePath === '/photography' && (
        <ParticlePhotography
          colorMode={colorMode}
          uiStyle={uiStyle}
          photoIndex={photoIndex}
        />
      )}
    </>
  )
}
```

- [ ] **Step 5: Verify the app builds and the shader renders**

```bash
npm run build
```

Expected: Build succeeds. Homepage shows a fullscreen animated fluid shader with retrowave colors. Cursor movement creates subtle ripple distortion. Theme and color mode changes affect the shader's tinting and brightness.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/ src/Experience.tsx
git commit -m "feat: add fluid shader homepage with cursor interaction and theme tinting"
```

---

### Task 9: Add ambient audio track placeholder

**Files:**
- Create: `public/audio/.gitkeep`

The user will provide the actual ambient audio track. This task creates the directory and documents the expected file.

- [ ] **Step 1: Create the audio directory with a placeholder**

```bash
mkdir -p public/audio
touch public/audio/.gitkeep
```

- [ ] **Step 2: Commit**

```bash
git add public/audio/.gitkeep
git commit -m "chore: add public/audio directory for ambient music track"
```

**Note to implementer:** The user needs to provide a royalty-free nature-inspired ambient track (rain, soft wind, gentle tones) and place it at `public/audio/ambient.mp3`. The AudioProvider in `src/providers/audio-provider.tsx` expects this file path. The music controls in the settings panel will not produce sound until this file is added.

---

### Task 10: Final integration verification

**Files:** None (verification only)

- [ ] **Step 1: Run a full build**

```bash
npm run build
```

Expected: Build succeeds with no errors or warnings.

- [ ] **Step 2: Start the dev server and test all routes**

```bash
npm run dev
```

Test the following manually:
1. `/` shows the fluid shader with cursor ripple interaction
2. `/about` shows the dog + butterfly scene with "Josh & Winnie" label
3. `/photography` shows the particle photo gallery
4. Dock navigation works for all routes (Home, About, Photography, Placeholder)
5. Settings panel: gear icon opens/closes the panel
6. Mode toggle switches between light and dark (both affect shader colors)
7. Style toggle switches between flat, glass, and paper (each visually distinct on all surfaces: panel, dock, buttons)
8. Music controls show play/pause and volume slider (audio plays once track file is provided)
9. Theme changes persist across page reloads via localStorage

- [ ] **Step 3: Commit any fixes needed, then tag completion**

If any issues were found and fixed, commit them. Otherwise, no commit needed.
