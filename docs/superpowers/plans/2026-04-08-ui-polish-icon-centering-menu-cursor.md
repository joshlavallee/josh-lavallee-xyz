# UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix icon centering in flat/paper modes, restructure hamburger menu as an integrated dropdown, and add cursor pointer to toggle buttons.

**Architecture:** Three independent changes across three files. Tasks 1 and 2 fix the settings panel and shader controls toggle buttons (centering + cursor). Task 3 restructures the burger nav to use the same expanding `.surface` container pattern as the other two panels.

**Tech Stack:** React, Tailwind CSS, Lucide icons, TanStack Router

---

### Task 1: Fix settings panel toggle button (centering + cursor)

**Files:**
- Modify: `src/components/settings-panel.tsx:41-52`

- [ ] **Step 1: Remove `w-[52px]` from toggle button and add `cursor-pointer`**

In `src/components/settings-panel.tsx`, change the toggle button className from:

```tsx
'flex h-[52px] w-[52px] shrink-0 items-center justify-center text-foreground/80 transition-all hover:text-foreground',
```

to:

```tsx
'flex h-[52px] w-full shrink-0 items-center justify-center cursor-pointer text-foreground/80 transition-all hover:text-foreground',
```

The container `.surface` is already `w-[52px]` when collapsed, so the button fills it. Removing the explicit width prevents the 1px border from squeezing the icon off-center.

- [ ] **Step 2: Verify visually**

Run: `npm run dev`

Check the settings gear icon in all three UI styles (flat, paper, glass). The icon should be perfectly centered in the 52px square in all modes. The cursor should show as a pointer on hover.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings-panel.tsx
git commit -m "fix: center settings icon and add cursor pointer"
```

---

### Task 2: Fix shader controls toggle button (centering + cursor)

**Files:**
- Modify: `src/features/home/components/ShaderControls.tsx:42-43`

- [ ] **Step 1: Remove `w-[52px]` from toggle button and add `cursor-pointer`**

In `src/features/home/components/ShaderControls.tsx`, change the toggle button className from:

```tsx
"flex h-[52px] w-[52px] shrink-0 items-center justify-center text-foreground/60 transition-all hover:text-foreground"
```

to:

```tsx
"flex h-[52px] w-full shrink-0 items-center justify-center cursor-pointer text-foreground/60 transition-all hover:text-foreground"
```

Same rationale as Task 1: the parent `.surface` container constrains width when collapsed.

- [ ] **Step 2: Verify visually**

Run: `npm run dev`

Navigate to the homepage. Check the shader controls slider icon in all three UI styles. The icon should be perfectly centered. The cursor should show as a pointer on hover.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/components/ShaderControls.tsx
git commit -m "fix: center shader controls icon and add cursor pointer"
```

---

### Task 3: Restructure hamburger menu as integrated dropdown

**Files:**
- Modify: `src/components/burger-nav.tsx` (full rewrite of the JSX return)

- [ ] **Step 1: Rewrite burger-nav.tsx**

Replace the entire content of `src/components/burger-nav.tsx` with:

```tsx
import { useState, useRef, useEffect } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Home, PawPrint, Waypoints, Box, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/' as const, label: 'Home', icon: Home },
  { to: '/about' as const, label: 'About', icon: PawPrint },
  { to: '/particlepeg' as const, label: 'Particle Peg', icon: Waypoints },
  { to: '/placeholder' as const, label: 'Placeholder', icon: Box },
]

export default function BurgerNav() {
  const [isOpen, setIsOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const currentLabel = NAV_ITEMS.find((item) => item.to === currentPath)?.label ?? ''

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  return (
    <nav
      className="fixed top-4 left-4 z-50"
      ref={navRef}
      aria-label="Main navigation"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'surface overflow-hidden transition-all duration-300 ease-out',
            isOpen ? 'w-48' : 'w-[52px]'
          )}
          style={{ maxHeight: isOpen ? '500px' : '52px' }}
        >
          {/* Burger toggle button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'flex h-[52px] w-full shrink-0 items-center justify-center cursor-pointer text-foreground/80 transition-all hover:text-foreground',
              isOpen && 'rotate-90'
            )}
            style={{ transition: 'transform 0.3s ease' }}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          {/* Nav items */}
          <div
            className={cn(
              'px-2 pb-2 transition-all duration-200',
              isOpen
                ? 'translate-y-0 opacity-100'
                : 'pointer-events-none -translate-y-2 opacity-0'
            )}
            style={{ transitionDelay: isOpen ? '100ms' : '0ms' }}
          >
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item, index) => {
                const isActive = currentPath === item.to
                const Icon = item.icon

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'surface-btn flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground',
                      isOpen
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none -translate-y-2 opacity-0'
                    )}
                    style={{
                      borderRadius: 'var(--surface-radius)',
                      transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                    }}
                    aria-label={item.label}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        <span className="text-[11px] font-medium uppercase tracking-[2px] text-muted-foreground">
          {currentLabel}
        </span>
      </div>
    </nav>
  )
}
```

Key changes from the original:
- The `.surface` container wraps both the toggle and nav items (instead of nav items being absolutely positioned outside)
- `overflow-hidden` with `maxHeight` transition for the expand/collapse animation
- Nav items are `Link` elements with `surface-btn` class, icon + always-visible label
- Toggle button uses `w-full` instead of `w-[52px]` (same centering fix as Tasks 1-2)
- Toggle button has `cursor-pointer`
- Page label span remains outside the `.surface`, to the right

- [ ] **Step 2: Verify visually**

Run: `npm run dev`

Check all three UI styles. Verify:
1. Closed state: 52px square button with centered hamburger icon
2. Open state: surface expands downward, nav items fade in with stagger
3. Active route has `bg-primary/10` highlight
4. Clicking a nav item navigates and closes the menu
5. Clicking outside closes the menu
6. Page label still shows next to the button
7. Cursor is pointer on the toggle button and nav items

- [ ] **Step 3: Commit**

```bash
git add src/components/burger-nav.tsx
git commit -m "feat: restructure hamburger menu as integrated dropdown"
```
