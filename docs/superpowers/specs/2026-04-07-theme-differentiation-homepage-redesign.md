# Theme Differentiation & Homepage Redesign

## Overview

Redesign the portfolio's three UI styles (glass, paper, flat) to be dramatically distinct visual languages, replace the homepage with an interactive fluid shader, add ambient nature-inspired music with persistent controls, and reorganize routing to give the dog scene its own `/about` page.

## 1. Theme Differentiation

The three UI styles currently differ only by surface CSS variables. This redesign deepens the differentiation across every visual dimension so each style feels like a completely different design language.

### Flat (default shadcn)
- Solid opaque backgrounds, clean 1px borders
- Subtle drop shadows (`0 1px 2px`)
- Standard border-radius from shadcn (`var(--radius)`)
- Crisp, no blur, no texture
- Buttons: solid fills with standard hover darkening
- Inputs: bordered with clean focus rings

### Glass (glassmorphism / liquid glass)
- Semi-transparent backgrounds (`oklch(... / 12-18%)`)
- Heavy backdrop blur (`32-48px`)
- Prismatic inset highlights (`inset 0 1px 0 oklch(1 0 0 / 50%)`)
- Luminous borders (`1px solid oklch(1 0 0 / 20-30%)`)
- Larger border-radius (`1rem`)
- Buttons: translucent with glow on hover, border shimmer
- Inputs: frosted glass with subtle inner glow on focus
- Surfaces feel like floating panels of frosted glass over the content beneath

### Paper (neumorphism)
- Background matches the page background (elements extrude from the surface, not sit on top)
- Dual directional shadows: light source top-left creates dark shadow bottom-right + light highlight top-left (`6px 6px 14px dark, -6px -6px 14px light`)
- No visible borders (shadow creates the boundary)
- Large border-radius (`1.5rem`)
- Buttons: pressed/extruded states using inverted shadows (inset on active)
- Inputs: inset/recessed appearance (sunken into the surface)
- Surfaces feel tactile, like soft clay or embossed paper

### Implementation
- Expand `[data-style="..."]` blocks in `src/index.css` with additional CSS custom properties for button shadows, input styles, focus rings, and hover states
- Add style-specific variants to the button component
- `.surface`, `.surface-btn`, `.surface-inset` classes adapt to all styles automatically
- All UI elements (dock, settings panel, controls) inherit these treatments via the existing CSS custom property system

## 2. Homepage Fluid Shader

### Architecture
A fullscreen R3F `<mesh>` with a plane geometry and custom `shaderMaterial`, rendered as the homepage scene in the `Experience` router (replacing the current `AboutScene` on `/`).

### Shader Design
- **Fragment shader** (`fluid.frag.glsl`): Multi-octave simplex noise sampled at different scales and speeds to create layered, organic fluid movement resembling ink in water. Colors mapped from noise values to a gradient palette derived from retrowave tokens.
- **Vertex shader** (`fluid.vert.glsl`): Simple passthrough for fullscreen quad UV coordinates.
- **Noise**: Move the existing `noise.glsl` simplex implementation to a shared location (`src/shaders/noise.glsl`) so both the home and photography features can import it.

### Uniforms

| Uniform | Type | Purpose |
|---------|------|---------|
| `uTime` | float | Drives animation, incremented via `useFrame` |
| `uMouse` | vec2 | Normalized cursor position (0-1) |
| `uResolution` | vec2 | Viewport dimensions for aspect correction |
| `uColorMode` | float | 0.0 = dark, 1.0 = light (shifts brightness) |
| `uThemeTint` | vec3 | Theme-specific color offset |

### Cursor Interaction
- Mouse position tracked via R3F pointer events on the fullscreen mesh
- Distance from `uMouse` to each fragment creates localized distortion: noise frequency increases and color shifts slightly near the cursor
- Effect is subtle, like touching still water
- Smoothstep falloff over ~15-20% of the screen keeps it gentle
- On mobile, last touch position lingers and slowly fades

### Color Mapping
- Base palette: 4-5 color stops from retrowave tokens (deep purple, neon pink, cyan, dark blue)
- Noise value maps to a position along this gradient
- `uThemeTint` nudges the palette: paper adds warmth (slight orange/amber shift), glass adds cool translucency (slight blue shift + reduced saturation), flat stays neutral
- Light mode: brighter overall, lighter color stops
- Dark mode: deeper, more saturated, richer contrast

### File Structure
```
src/features/home/
  components/
    HomeScene.tsx        # R3F scene component (renders on /)
    FluidShader.tsx      # shaderMaterial + mesh + useFrame animation
  shaders/
    fluid.vert.glsl
    fluid.frag.glsl
```

## 3. Audio System

### Implementation
- Web Audio API directly (no external library)
- A React context provider (`AudioProvider`) wraps the app, managing playback of a single looping ambient track
- Audio source: a royalty-free nature-inspired ambient track (rain, soft wind, gentle tones) bundled in `public/audio/`. The user will source and provide the track file as a prerequisite before audio integration can be completed.

### Hook API
```typescript
useAudio() => {
  isPlaying: boolean
  volume: number        // 0-1
  toggle: () => void
  setVolume: (v: number) => void
}
```

### Behavior
- No autoplay (respects browser policies)
- First play requires user gesture (clicking play in settings panel)
- Volume and playing state persisted to `localStorage`, resumes on return visits
- Audio continues across route navigation (provider at root level)
- Smooth fade-in on play, fade-out on pause (~500ms)

### File Structure
```
src/providers/
  audio-provider.tsx
```

## 4. Settings Panel (Controls Hub)

Replaces the current `ThemeControls` component.

### Collapsed State
- Single gear icon button in top-right corner
- Uses `.surface-btn` class (adapts to active theme)
- Subtle spin animation on hover

### Expanded State
- Floating panel anchored top-right, below the gear icon
- Three labeled sections stacked vertically: **Mode**, **Style**, **Music**
- Panel uses `.surface` class for theme-adaptive styling
- Click outside or click gear again to close

### Sections
- **Mode**: Two toggle buttons (Light / Dark), active highlighted with primary color
- **Style**: Three toggle buttons (Glass / Paper / Flat), active highlighted with primary color
- **Music**: Play/pause circle button + horizontal volume slider, themed to match active style

### Animation
- Panel opens with scale + opacity CSS transition (transform-origin top-right, ~200ms ease-out)
- Sections stagger in via CSS transition-delay (50ms increments)
- Closing reverses the animation
- Theme switches live-update the panel's own appearance via CSS transitions
- All animations use CSS transitions (no motion library dependency)

### File Structure
```
src/components/
  settings-panel.tsx     # Replaces theme-controls.tsx
```

## 5. Route Changes

### Dog Scene to `/about`
- `AboutScene` (dog + butterfly) renders when route is `/about`
- `Experience.tsx` scene router adds `/about` case
- Homepage (`/`) renders `HomeScene` (fluid shader)
- "Josh & Winnie" label moves to `/about` page content

### Dock Navigation Update
- Add "About" item to the dock linking to `/about`
- Dock items: **Home** (house icon), **About** (paw/user icon), **Photography** (camera icon)

### Experience Router Map
```
/              → HomeScene (fluid shader)
/about         → AboutScene (dog + butterfly)
/photography   → ParticlePhotography
```
