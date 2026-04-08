# Music Track Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multiple looping music tracks with a selector in the settings panel, persisted to localStorage.

**Architecture:** Add a `TRACKS` config array and track selection state to the AudioProvider. Expose `track` and `setTrack` on the context. When switching tracks while playing, fade out, swap src, fade in. Add a track selector button row in the settings panel Music section, following the existing Mode/Style button pattern.

**Tech Stack:** React, localStorage, HTML5 Audio API

---

### Task 1: Add track config and selection to AudioProvider

**Files:**
- Modify: `src/providers/audio-provider.tsx`

- [ ] **Step 1: Rewrite audio-provider.tsx**

Replace the entire content of `src/providers/audio-provider.tsx` with:

```tsx
import { createContext, useContext, useRef, useState, useCallback } from 'react'

export const TRACKS = [
  { id: 'relax', label: 'Relax', src: '/audio/relax.mp3' },
  { id: 'chill', label: 'Chill', src: '/audio/chill.mp3' },
]

interface AudioContextValue {
  isPlaying: boolean
  volume: number
  track: string
  toggle: () => void
  setVolume: (v: number) => void
  setTrack: (id: string) => void
}

const AudioContext = createContext<AudioContextValue | null>(null)

const VOLUME_KEY = 'audio-volume'
const TRACK_KEY = 'audio-track'
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

function getInitialTrack(): string {
  if (typeof window === 'undefined') return TRACKS[0].id
  const stored = localStorage.getItem(TRACK_KEY)
  if (stored && TRACKS.some((t) => t.id === stored)) return stored
  return TRACKS[0].id
}

function getTrackSrc(id: string): string {
  return TRACKS.find((t) => t.id === id)?.src ?? TRACKS[0].src
}

export default function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadeRef = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(getInitialVolume)
  const [track, setTrackState] = useState(getInitialTrack)

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(getTrackSrc(track))
      audio.loop = true
      audio.volume = 0
      audioRef.current = audio
    }
    return audioRef.current
  }, [track])

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

  const setTrack = useCallback((id: string) => {
    if (id === track) return
    const src = getTrackSrc(id)
    setTrackState(id)
    localStorage.setItem(TRACK_KEY, id)

    const audio = audioRef.current
    if (audio && isPlaying) {
      // Crossfade: fade out, swap src, fade in
      fade(audio, 0, () => {
        audio.src = src
        audio.loop = true
        audio.volume = 0
        audio.play().then(() => {
          fade(audio, volume)
        }).catch(() => {})
      })
    } else if (audio) {
      // Not playing: just swap the source
      audio.src = src
      audio.loop = true
    }
  }, [track, isPlaying, volume, fade])

  return (
    <AudioContext value={{ isPlaying, volume, track, toggle, setVolume, setTrack }}>
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

Key changes from the original:
- Added `TRACKS` array export at top
- Added `track` state with localStorage persistence (`audio-track` key)
- Added `getInitialTrack()` to read persisted track on load
- Added `getTrackSrc()` helper to look up src by id
- Added `setTrack` function with crossfade logic
- Extended `AudioContextValue` interface with `track` and `setTrack`
- `getAudio()` uses `getTrackSrc(track)` instead of hardcoded `/audio/ambient.mp3`

- [ ] **Step 2: Commit**

```bash
git add src/providers/audio-provider.tsx
git commit -m "feat: add track selection with crossfade to audio provider"
```

---

### Task 2: Add track selector to settings panel

**Files:**
- Modify: `src/components/settings-panel.tsx:4,17,122-150`

- [ ] **Step 1: Update imports and destructuring**

In `src/components/settings-panel.tsx`, change the import on line 4 from:

```tsx
import { useAudio } from '@/providers/audio-provider'
```

to:

```tsx
import { useAudio, TRACKS } from '@/providers/audio-provider'
```

Then change the destructuring on line 17 from:

```tsx
const { isPlaying, volume, toggle, setVolume } = useAudio()
```

to:

```tsx
const { isPlaying, volume, track, toggle, setVolume, setTrack } = useAudio()
```

- [ ] **Step 2: Add track selector buttons in Music section**

In `src/components/settings-panel.tsx`, replace the Music section (lines 122-150) from:

```tsx
          {/* Music section */}
          <div>
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
                  className="surface-input h-1 w-full cursor-pointer appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded [&::-moz-range-track]:bg-muted"
                  aria-label="Volume"
                />
                <Volume2 className="size-3 shrink-0 text-muted-foreground" />
              </div>
            </div>
          </div>
```

with:

```tsx
          {/* Music section */}
          <div>
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Music
            </span>
            <div className="flex gap-1">
              {TRACKS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTrack(id)}
                  className={cn(
                    'surface-btn flex flex-1 items-center justify-center px-2 py-1.5 text-xs font-medium transition-colors',
                    track === id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  style={{ borderRadius: 'var(--surface-radius)' }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
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
                  className="surface-input h-1 w-full cursor-pointer appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded [&::-moz-range-track]:bg-muted"
                  aria-label="Volume"
                />
                <Volume2 className="size-3 shrink-0 text-muted-foreground" />
              </div>
            </div>
          </div>
```

Changes:
- Added a track selector button row above the play/pause controls, using the same pattern as Mode/Style buttons
- Active track uses `bg-primary text-primary-foreground`, inactive uses `text-muted-foreground`
- Play/pause + volume row gets `mt-2` for spacing below the track selector

- [ ] **Step 3: Verify visually**

Run: `npm run dev` (should already be running)

Navigate to http://localhost:3000 and open the settings panel. Verify:
1. Track selector buttons appear in the Music section (Relax and Chill)
2. Active track is highlighted
3. Clicking a track while music is playing crossfades to the new track
4. Clicking a track while paused switches silently
5. Pressing play starts the selected track
6. Refresh the page — selected track persists
7. Volume control still works
8. All three UI styles (glass, flat, paper) render the buttons correctly

- [ ] **Step 4: Commit**

```bash
git add src/components/settings-panel.tsx
git commit -m "feat: add track selector buttons to settings panel"
```
