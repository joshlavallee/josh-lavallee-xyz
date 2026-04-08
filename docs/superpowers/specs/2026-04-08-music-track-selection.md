# Music Track Selection

## Overview

Add multiple music tracks with a selector in the settings panel. Tracks loop continuously and the selection persists to localStorage.

## Changes

### 1. Track config

Define a `TRACKS` array in the audio provider with `id`, `label`, and `src` for each track. Adding new tracks is just adding an entry.

```ts
const TRACKS = [
  { id: 'relax', label: 'Relax', src: '/audio/relax.mp3' },
  { id: 'chill', label: 'Chill', src: '/audio/chill.mp3' },
]
```

Export `TRACKS` so the settings panel can render selectors from it.

### 2. AudioProvider changes

**State:** Add `track` (string, current track id) to the context. Default to the first track in `TRACKS`. Persist to localStorage under key `audio-track`.

**Context value:** Add `track` and `setTrack(id: string)` to the `AudioContextValue` interface and provider.

**Track switching logic:**
- When `setTrack` is called with a new track id:
  - If currently playing: fade out the current audio, then swap the `src` to the new track's path, then play and fade in
  - If paused: just swap the `src` so the new track plays when the user next hits play
- `audio.loop = true` stays (both tracks loop)

**Initialization:** On first `getAudio()` call, use the persisted track id from localStorage (or default to first track) to set the audio `src`.

### 3. Settings panel track selector

In the Music section of `settings-panel.tsx`, add a row of track selection buttons between the "Music" label and the play/pause + volume row.

**Layout:** Same pattern as the Mode and Style button rows. Flex row with `gap-1`, each button is `flex-1` with `surface-btn` class.

**Active state:** Same as Mode/Style buttons: `bg-primary text-primary-foreground` when selected, `text-muted-foreground hover:text-foreground` when not.

**Data source:** Import `TRACKS` from the audio provider and map over it to render buttons. This means adding a new track only requires adding an entry to `TRACKS`.

## Files affected

| File | Changes |
|------|---------|
| `src/providers/audio-provider.tsx` | Add TRACKS array + export, track state, localStorage persistence, setTrack with crossfade, update context value |
| `src/components/settings-panel.tsx` | Import TRACKS and useAudio track/setTrack, add track selector button row in Music section |

## Out of scope

- No shuffle or auto-advance between tracks
- No track duration display or progress bar
- No per-page track assignment
