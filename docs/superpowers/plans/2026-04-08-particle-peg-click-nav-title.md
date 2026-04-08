# Particle Peg Click-to-Navigate and Title Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the particle peg bottom nav panel with click-to-advance (wrapping) and a lower-third particle-textured title overlay.

**Architecture:** Single file change to `src/routes/particlepeg.tsx`. Remove the nav panel JSX and imports, add a full-viewport click handler that wraps at the last photo, and add an absolutely-positioned lower-third title overlay with stippled text via CSS `background-clip: text`. Theme-aware (light/dark) via `useTheme`.

**Tech Stack:** React, TanStack Router, Tailwind CSS, CSS background-clip

---

### Task 1: Replace nav panel with click-to-advance and lower-third title

**Files:**
- Modify: `src/routes/particlepeg.tsx` (full rewrite of component body)

- [ ] **Step 1: Rewrite particlepeg.tsx**

Replace the entire content of `src/routes/particlepeg.tsx` with:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTheme } from '@/providers/theme-provider'
import { PHOTOS } from '@/features/photography'

export const Route = createFileRoute('/particlepeg')({
  validateSearch: (search: Record<string, unknown>) => ({
    photo: Number(search.photo) || 0,
  }),
  component: ParticlePeg,
})

function ParticlePeg() {
  const { photo } = Route.useSearch()
  const navigate = useNavigate()
  const { colorMode } = useTheme()
  const clampedIndex = Math.max(0, Math.min(photo, PHOTOS.length - 1))
  const currentPhoto = PHOTOS[clampedIndex]
  const isDark = colorMode === 'dark'

  function advance() {
    const next = (clampedIndex + 1) % PHOTOS.length
    navigate({ to: '/particlepeg', search: { photo: next } })
  }

  return (
    <div
      className="relative h-dvh w-full cursor-pointer"
      onClick={advance}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') advance() }}
      aria-label="Next photo"
    >
      {/* Lower-third title overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        {/* Gradient backdrop */}
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)'
              : 'linear-gradient(to top, rgba(255,255,255,0.4) 0%, transparent 100%)',
          }}
        />

        {/* Text block */}
        <div
          key={clampedIndex}
          className="relative px-8 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          {/* Title */}
          <span
            className="block text-sm font-semibold uppercase tracking-[4px]"
            style={{
              color: 'transparent',
              background: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)'} 0.6px, transparent 0.6px)`,
              backgroundSize: '1.5px 1.5px',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }}
          >
            {currentPhoto.title}
          </span>

          {/* Separator */}
          <div
            className="mt-2 h-px w-10"
            style={{
              background: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} 0.6px, transparent 0.6px)`,
              backgroundSize: '1.5px 1.5px',
            }}
          />

          {/* Counter */}
          <span
            className="mt-1.5 block text-xs tracking-[3px]"
            style={{
              color: 'transparent',
              background: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} 0.6px, transparent 0.6px)`,
              backgroundSize: '1.5px 1.5px',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }}
          >
            {clampedIndex + 1} / {PHOTOS.length}
          </span>
        </div>
      </div>
    </div>
  )
}
```

Key implementation details:
- `advance()` uses modulo `%` to wrap from last photo back to first
- The outer `div` captures clicks with `cursor-pointer` and keyboard support (`Enter`/`Space`)
- The title overlay is `pointer-events-none` so it doesn't interfere with the click handler
- `key={clampedIndex}` on the text block remounts it on photo change, re-triggering the `animate-in` animation
- The `animate-in fade-in slide-in-from-bottom-2` classes come from Tailwind CSS animate plugin (shadcn includes this). The `animationDelay: 300ms` waits for the particle transition to begin before fading in the title
- `isDark` switches between white dots on dark gradient and dark dots on light gradient
- Removed: `ChevronLeft`, `ChevronRight`, `cn` imports (no longer needed)

- [ ] **Step 2: Verify the animate-in classes are available**

Check that `tailwindcss-animate` is configured (shadcn projects include it by default):

Run: `grep -l "tailwindcss-animate" package.json`

If not present, the animation can fall back to a manual Tailwind transition. But it should be there in a shadcn project.

- [ ] **Step 3: Verify visually**

Run: `npm run dev` (should already be running)

Navigate to http://localhost:3000/particlepeg and verify:
1. No bottom-center navigation panel
2. Click anywhere advances to next photo
3. At the last photo (Exchange District, #8), clicking wraps to photo #1
4. Title appears bottom-left with stippled particle texture
5. Separator rule and counter appear below with same texture
6. Title fades in with upward slide after each photo change
7. Switch to light mode — dots become dark, gradient becomes light
8. Switch between glass/flat/paper — text remains readable in all styles

- [ ] **Step 4: Commit**

```bash
git add src/routes/particlepeg.tsx
git commit -m "feat: click-to-advance navigation and particle-textured title overlay"
```
