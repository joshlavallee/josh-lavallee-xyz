# Burger Menu Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bottom dock navigation with a top-left burger menu that slides nav items down and shows a persistent page label HUD.

**Architecture:** Single component (`BurgerNav`) replaces `Dock`. Uses the same CSS transition + React state pattern as `SettingsPanel`. No new dependencies.

**Tech Stack:** React, TanStack Router, Tailwind CSS, Lucide icons

**Spec:** `docs/superpowers/specs/2026-04-07-burger-nav-design.md`

---

### Task 1: Create BurgerNav component

**Files:**
- Create: `src/components/burger-nav.tsx`

- [ ] **Step 1: Create the component file with nav items array and basic structure**

```tsx
import { useState, useRef, useEffect } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Home, PawPrint, Camera, Box, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/' as const, label: 'Home', icon: Home },
  { to: '/about' as const, label: 'About', icon: PawPrint },
  { to: '/photography' as const, label: 'Photography', icon: Camera },
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
      {/* Burger button + page label */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'surface surface-btn flex h-10 w-10 items-center justify-center text-foreground/80 transition-all hover:text-foreground',
            isOpen && 'rotate-90'
          )}
          style={{ transition: 'transform 0.3s ease, box-shadow 0.2s ease' }}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>

        <span className="text-[11px] font-medium uppercase tracking-[2px] text-muted-foreground">
          {currentLabel}
        </span>
      </div>

      {/* Nav items */}
      <div className="absolute top-[52px] left-0 flex flex-col gap-1">
        {NAV_ITEMS.map((item, index) => {
          const isActive = currentPath === item.to
          const Icon = item.icon

          return (
            <Link
              key={item.to}
              to={item.to}
              className="group/nav-item flex items-center"
              onClick={() => setIsOpen(false)}
              aria-label={item.label}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center transition-all duration-200',
                  isActive ? 'surface-btn bg-primary/10' : 'surface-btn bg-background/50',
                  isOpen
                    ? 'translate-y-0 opacity-100'
                    : 'pointer-events-none -translate-y-2 opacity-0'
                )}
                style={{
                  borderRadius: 'var(--surface-radius)',
                  transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                }}
              >
                <Icon
                  className={cn(
                    'size-4 transition-colors',
                    isActive ? 'text-primary' : 'text-foreground/70'
                  )}
                />
              </div>

              {/* Hover label */}
              <span
                className={cn(
                  'pointer-events-none ml-2.5 whitespace-nowrap px-2.5 py-1 text-xs font-medium transition-opacity duration-150',
                  'surface',
                  'opacity-0 group-hover/nav-item:opacity-100',
                  !isOpen && 'hidden'
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/burger-nav.tsx
git commit -m "feat: add BurgerNav component with slide-down drawer animation"
```

---

### Task 2: Wire BurgerNav into the app and remove Dock

**Files:**
- Modify: `src/components/index.ts`
- Modify: `src/routes/__root.tsx:15-16,66`
- Delete: `src/components/dock.tsx`

- [ ] **Step 1: Update the components barrel export**

Replace the contents of `src/components/index.ts` with:

```ts
export { default as BurgerNav } from './burger-nav'
export { default as SettingsPanel } from './settings-panel'
```

- [ ] **Step 2: Update __root.tsx to use BurgerNav instead of Dock**

In `src/routes/__root.tsx`, change the import on line 15:

```tsx
// Before:
import { Dock, SettingsPanel } from '@/components'

// After:
import { BurgerNav, SettingsPanel } from '@/components'
```

In the `RootDocument` JSX (line 66), replace `<Dock />`:

```tsx
// Before:
<SettingsPanel />
<Dock />

// After:
<SettingsPanel />
<BurgerNav />
```

- [ ] **Step 3: Delete dock.tsx**

```bash
rm src/components/dock.tsx
```

- [ ] **Step 4: Verify the app compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/components/index.ts src/routes/__root.tsx
git rm src/components/dock.tsx
git commit -m "feat: replace bottom dock with burger menu navigation"
```

---

### Task 3: Manual visual verification

- [ ] **Step 1: Start the dev server and verify**

Run: `npm run dev`

Check the following in the browser:

1. **Closed state:** Burger icon in top-left with page name ("Home") to its right. No bottom dock visible.
2. **Click burger:** Icon rotates and becomes X. Four nav icons slide down smoothly with staggered timing.
3. **Hover a nav item:** Page name label fades in to the right of the icon.
4. **Click a nav item:** Navigates to that page, menu slides closed, HUD label updates to new page name.
5. **Click outside:** Menu closes.
6. **Active state:** Current page's icon shows `bg-primary/10` with `text-primary` color.
7. **Theme consistency:** Burger button and nav items use `surface`/`surface-btn` classes, matching the settings cog visually.
8. **Both themes:** Check light mode and dark mode look correct.

- [ ] **Step 2: Fix any visual issues found during verification**

If adjustments are needed (spacing, timing, colors), update `src/components/burger-nav.tsx` accordingly.

- [ ] **Step 3: Commit any fixes**

```bash
git add src/components/burger-nav.tsx
git commit -m "fix: adjust burger nav styling after visual review"
```
