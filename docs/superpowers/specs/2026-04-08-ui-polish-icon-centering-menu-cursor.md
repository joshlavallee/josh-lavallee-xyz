# UI Polish: Icon Centering, Hamburger Menu, Cursor Pointer

## Overview

Three targeted UI improvements to fix visual inconsistencies across the settings panel, shader controls, and hamburger menu.

## Changes

### 1. Fix icon centering in flat/paper mode

**Problem**: The `.surface` class applies `border: 1px solid ...` in flat and paper UI styles. The toggle buttons in `settings-panel.tsx` and `ShaderControls.tsx` have an explicit `w-[52px]` inside a `.surface` container that is also `w-[52px]`. The 1px border on each side reduces the inner space to 50px, causing the icon to shift off-center.

**Solution**: Remove `w-[52px]` from the toggle buttons inside the `.surface` container. The buttons already have `h-[52px]` for height. Let them fill the container width naturally since the `.surface` container constrains to `w-[52px]` when collapsed.

**Files**: `src/components/settings-panel.tsx`, `src/features/home/components/ShaderControls.tsx`

### 2. Hamburger menu as integrated dropdown

**Problem**: The burger nav items are absolutely positioned as separate floating buttons below the toggle. This is inconsistent with the settings panel and shader controls, which use a single expanding `.surface` container.

**Solution**: Restructure `burger-nav.tsx` to match the settings panel pattern:

- Wrap the toggle button and nav items in a single `.surface` container
- When closed: the surface is `w-[52px]` and `maxHeight: 52px`, showing only the burger icon
- When open: the surface expands downward via `maxHeight` transition to reveal nav items
- Nav items are full-width rows inside the surface with icon + label text (always visible when open)
- Active route highlighted with `bg-primary/10`
- Keep the staggered fade-in animation on each item (index * 50ms delay)
- Keep the page label span outside the `.surface` container, positioned to the right of it
- Click-outside-to-close behavior stays the same

**File**: `src/components/burger-nav.tsx`

### 3. Cursor pointer on toggle buttons

**Problem**: The toggle buttons in settings-panel and ShaderControls don't use the `surface-btn` class (which provides `cursor: pointer` via CSS). They show the default cursor on hover.

**Solution**: Add the `cursor-pointer` Tailwind class to:

- Settings panel toggle button (`settings-panel.tsx`)
- ShaderControls toggle button (`ShaderControls.tsx`)

**Files**: `src/components/settings-panel.tsx`, `src/features/home/components/ShaderControls.tsx`

## Files affected

| File | Changes |
|------|---------|
| `src/components/settings-panel.tsx` | Remove `w-[52px]` from toggle button, add `cursor-pointer` |
| `src/features/home/components/ShaderControls.tsx` | Remove `w-[52px]` from toggle button, add `cursor-pointer` |
| `src/components/burger-nav.tsx` | Restructure to integrated dropdown pattern |

## Out of scope

- No changes to the `.surface` CSS classes or theme variables
- No changes to the settings panel or shader controls dropdown structure (only the toggle button fix)
- No new shared components
