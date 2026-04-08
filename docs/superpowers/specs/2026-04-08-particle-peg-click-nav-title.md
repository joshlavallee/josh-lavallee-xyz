# Particle Peg: Click-to-Navigate and Particle-Textured Title

## Overview

Replace the bottom-center navigation panel with click-anywhere-to-advance and a lower-third title overlay using particle-textured text.

## Changes

### 1. Click-to-navigate

Remove the entire bottom-center navigation panel (arrows, title, counter) from `particlepeg.tsx`. Replace with a full-viewport click handler that advances to the next photo.

- Click anywhere on the page advances to the next photo via `navigate()`
- At the last photo (index === PHOTOS.length - 1), wrap to index 0
- The click handler lives on the page-level container div
- Remove the `ChevronLeft`, `ChevronRight` imports from lucide-react (no longer needed)
- Remove the `cn` import if no longer used

### 2. Lower-third particle-textured title

An HTML overlay in the bottom-left corner of the viewport showing the photo title with a stippled particle texture.

**Structure:**
```
<div> (container: fixed bottom-left, pointer-events-none)
  <div> (gradient: soft dark fade from bottom-left corner)
  <div> (text block)
    <span> Photo title — uppercase, tracking-wide, semibold
    <div>  Thin horizontal rule
    <span> Counter "1 / 8" — smaller, more transparent
  </div>
</div>
```

**Stipple texture:** CSS `background-clip: text` with a radial-gradient dot pattern. Background-size ~1.5px for a tight, nearly-solid grain. The text color is `transparent`; the dots provide the visible fill.

```css
/* Title text */
background: radial-gradient(circle, rgba(255,255,255,0.9) 0.6px, transparent 0.6px);
background-size: 1.5px 1.5px;
-webkit-background-clip: text;
background-clip: text;
color: transparent;
```

The counter uses the same pattern but at lower opacity (~0.6).

The separator rule uses the same dot pattern as its background (not as clipped text).

**Gradient backdrop:** A CSS gradient in the bottom-left corner behind the text to ensure readability against any particle image. Fades from `rgba(0,0,0,0.4)` at the corner to transparent.

**Dark mode:** White dots on dark gradient (as described above).

**Light mode:** Dark dots on light gradient. Invert the treatment:
- Dot color: `rgba(0,0,0,0.85)` instead of white
- Gradient: `rgba(255,255,255,0.4)` instead of black

Use the `colorMode` from the theme provider to switch between treatments.

**Animation:** Fade in (`opacity-0` to `opacity-100`) with a slight upward translate (`translate-y-2` to `translate-y-0`) using a CSS transition. The transition triggers on photo change by keying on `clampedIndex`.

**Positioning:** `absolute bottom-8 left-8` within the full-viewport container.

### 3. File changes

| File | Changes |
|------|---------|
| `src/routes/particlepeg.tsx` | Remove nav panel, add click handler, add lower-third title overlay |

No changes to R3F components, particle system, or any other files.

## Out of scope

- No changes to particle transition animation
- No changes to URL-based photo state management
- No touch/swipe gestures
- No keyboard navigation
