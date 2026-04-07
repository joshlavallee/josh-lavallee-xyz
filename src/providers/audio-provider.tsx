import { createContext, useContext, useRef, useState, useCallback } from 'react'

interface AudioContextValue {
  isPlaying: boolean
  volume: number
  toggle: () => void
  setVolume: (v: number) => void
}

const AudioContext = createContext<AudioContextValue | null>(null)

const VOLUME_KEY = 'audio-volume'
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

export default function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadeRef = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(getInitialVolume)

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio('/audio/ambient.mp3')
      audio.loop = true
      audio.volume = 0
      audioRef.current = audio
    }
    return audioRef.current
  }, [])

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

  return (
    <AudioContext value={{ isPlaying, volume, toggle, setVolume }}>
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
