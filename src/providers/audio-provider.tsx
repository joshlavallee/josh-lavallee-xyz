import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'

export const TRACKS = [
  { id: 'space', label: 'Space', src: '/audio/space.mp3' },
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
  return 0.25
}

function getInitialTrack(): string {
  if (typeof window === 'undefined') return TRACKS[0].id
  const stored = localStorage.getItem(TRACK_KEY)
  if (stored && TRACKS.some((t) => t.id === stored)) return stored
  return 'space'
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

  // Auto-play: try immediately, fall back to first interaction if browser blocks
  useEffect(() => {
    let started = false
    function startAudio() {
      if (started) return
      started = true
      const audio = getAudio()
      audio.volume = 0
      audio.play().then(() => {
        fade(audio, volume)
        setIsPlaying(true)
        cleanup()
      }).catch(() => {
        // Browser blocked — will retry on first interaction
        started = false
      })
    }
    function cleanup() {
      document.removeEventListener('click', startAudio)
      document.removeEventListener('keydown', startAudio)
      document.removeEventListener('touchstart', startAudio)
    }
    // Try immediately
    startAudio()
    // Also listen for first interaction as fallback
    document.addEventListener('click', startAudio)
    document.addEventListener('keydown', startAudio)
    document.addEventListener('touchstart', startAudio)
    return cleanup
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
