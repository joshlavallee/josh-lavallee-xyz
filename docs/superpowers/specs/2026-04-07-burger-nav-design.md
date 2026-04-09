# Burger Menu Navigation

## Overview

Replace the bottom dock navigation with a top-left burger menu that slides nav items downward when opened. A persistent page label beside the burger icon acts as a HUD, showing the user which page they're on at all times.

## Design Decisions

- **Burger menu over bottom dock:** Frees up the bottom of the viewport for content and 3D scene interaction. The top-left position mirrors the settings cog (top-right), creating a balanced UI frame.
- **Icon-only nav items with hover labels:** Keeps the menu compact. Labels appear to the right of each icon on hover, matching the natural reading direction and available space.
- **Slide-down drawer animation:** Items slide down smoothly in sequence with staggered delays, consistent with the settings panel's cascading reveal pattern.
- **Auto-close on navigation:** Menu closes after clicking a nav item so it doesn't obstruct the destination page.
- **Pure CSS transitions:** No animation library needed. Matches the existing approach used by the settings panel.

## Component Structure

### BurgerNav (`src/components/burger-nav.tsx`)

Positioned `fixed top-4 left-4 z-50`.

```
BurgerNav
├── Burger button (40x40, surface-btn)
│   ├── Hamburger icon (closed)
│   └── X icon (open), animated rotation
├── Page label HUD (inline right of burger)
│   └── Uppercase, letter-spaced, muted text
└── Nav items container (absolute, below burger)
    └── NavItem x 4 (staggered transitionDelay)
        ├── Icon button (40x40, surface-btn)
        └── Hover label (to the right, opacity transition)
```

### State

- `isOpen: boolean` — toggles the menu open/closed.
- No other state needed. Active route and page label are derived from `useRouterState()`.

### Nav Items

Same items as the current dock:

| Route | Label | Icon |
|---|---|---|
| `/` | Home | Home |
| `/about` | About | PawPrint |
| `/photography` | Photography | Camera |
| `/placeholder` | Placeholder | Box |

### Animation Specification

**Burger icon transition:**
- Closed: Three horizontal lines (hamburger)
- Open: X icon
- Transition: `transform 0.3s ease` (rotation), matching settings cog

**Nav items (open):**
- From: `translateY(-8px)`, `opacity: 0`
- To: `translateY(0)`, `opacity: 1`
- Duration: `200ms` each
- Stagger: `0ms, 50ms, 100ms, 150ms` per item
- Easing: `ease`

**Nav items (close):**
- Reverse: `translateY(0)` to `translateY(-8px)`, opacity to 0
- All items use `transitionDelay: 0ms` on close for a snappy collapse

**Hover labels:**
- `opacity: 0` to `opacity: 1`
- Duration: `150ms ease`

### Styling

- Uses `surface` and `surface-btn` classes for theme consistency
- Active item: `bg-primary/10` border, `text-primary` icon color
- Inactive items: `bg-background/50`, `text-foreground/70`
- Page label HUD: `text-[11px] font-medium uppercase tracking-[2px] text-muted-foreground`
- Gap between nav items: `4px`
- Gap between burger and first nav item: `12px` (top of items container starts at `top-[52px]` relative to the burger)

### Interaction

1. **Click burger** — toggles `isOpen`, items slide down (or up on close)
2. **Hover nav item** — page name fades in to the right
3. **Click nav item** — navigates via TanStack Router `<Link>`, then sets `isOpen` to `false`
4. **Click outside** — closes menu (same `mousedown` listener pattern as settings panel)

## Codebase Changes

| Action | File | Details |
|---|---|---|
| Create | `src/components/burger-nav.tsx` | New burger menu component |
| Delete | `src/components/dock.tsx` | Fully replaced |
| Edit | `src/routes/__root.tsx` | Swap `Dock` import/usage for `BurgerNav` |

No new dependencies. No changes to routing, providers, or other components.
