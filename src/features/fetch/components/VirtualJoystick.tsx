import { useRef, useCallback, useEffect, useState } from 'react'

const JOYSTICK_SIZE = 120
const KNOB_SIZE = 50
const MAX_DISTANCE = (JOYSTICK_SIZE - KNOB_SIZE) / 2

interface VirtualJoystickProps {
  onInput: (x: number, y: number) => void
}

export default function VirtualJoystick({ onInput }: VirtualJoystickProps) {
  const [isTouch, setIsTouch] = useState(false)
  const [active, setActive] = useState(false)
  const [origin, setOrigin] = useState({ x: 0, y: 0 })
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsTouch('ontouchstart' in window)
  }, [])

  const handleStart = useCallback((clientX: number, clientY: number) => {
    setActive(true)
    setOrigin({ x: clientX, y: clientY })
    setKnobOffset({ x: 0, y: 0 })
  }, [])

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!active) return
      let dx = clientX - origin.x
      let dy = clientY - origin.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > MAX_DISTANCE) {
        dx = (dx / dist) * MAX_DISTANCE
        dy = (dy / dist) * MAX_DISTANCE
      }

      setKnobOffset({ x: dx, y: dy })
      onInput(dx / MAX_DISTANCE, -dy / MAX_DISTANCE)
    },
    [active, origin, onInput],
  )

  const handleEnd = useCallback(() => {
    setActive(false)
    setKnobOffset({ x: 0, y: 0 })
    onInput(0, 0)
  }, [onInput])

  useEffect(() => {
    if (!isTouch) return

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (touch.clientX < window.innerWidth / 2 && touch.clientY > window.innerHeight / 2) {
        handleStart(touch.clientX, touch.clientY)
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      handleMove(touch.clientX, touch.clientY)
    }
    const onTouchEnd = () => handleEnd()

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [isTouch, handleStart, handleMove, handleEnd])

  if (!isTouch || !active) return null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: origin.x - JOYSTICK_SIZE / 2,
        top: origin.y - JOYSTICK_SIZE / 2,
        width: JOYSTICK_SIZE,
        height: JOYSTICK_SIZE,
        borderRadius: '50%',
        background: 'rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: JOYSTICK_SIZE / 2 + knobOffset.x - KNOB_SIZE / 2,
          top: JOYSTICK_SIZE / 2 + knobOffset.y - KNOB_SIZE / 2,
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      />
    </div>
  )
}
