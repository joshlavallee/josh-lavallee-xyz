import { useRef, useCallback } from 'react'

const MAX_TRAIL_POINTS = 30
const BUFFER_STRIDE = 3 // x, z, age
const RECORD_INTERVAL = 0.1 // seconds between position recordings
const MAX_AGE = 3.0

export function useTrailWake() {
  const buffer = useRef(new Float32Array(MAX_TRAIL_POINTS * BUFFER_STRIDE))
  const count = useRef(0)
  const head = useRef(0) // circular buffer head
  const timeSinceLastRecord = useRef(0)

  const addPosition = useCallback((x: number, z: number) => {
    const idx = head.current * BUFFER_STRIDE
    buffer.current[idx] = x
    buffer.current[idx + 1] = z
    buffer.current[idx + 2] = 0 // age starts at 0
    head.current = (head.current + 1) % MAX_TRAIL_POINTS
    if (count.current < MAX_TRAIL_POINTS) count.current++
  }, [])

  const update = useCallback((delta: number, dogX: number, dogZ: number) => {
    // Age all existing entries
    for (let i = 0; i < count.current; i++) {
      const idx = i * BUFFER_STRIDE + 2
      buffer.current[idx] = Math.min(buffer.current[idx] + delta, MAX_AGE)
    }

    // Record new position at throttled interval
    timeSinceLastRecord.current += delta
    if (timeSinceLastRecord.current >= RECORD_INTERVAL) {
      timeSinceLastRecord.current = 0
      addPosition(dogX, dogZ)
    }
  }, [addPosition])

  return {
    buffer,
    count,
    update,
  }
}
