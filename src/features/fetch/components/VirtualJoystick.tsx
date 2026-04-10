import { useRef, useEffect, useState } from 'react'

interface VirtualJoystickProps {
  onInput: (x: number, y: number) => void
}

const JOYSTICK_SIZE = 120
const KNOB_SIZE = 48
const MAX_DISTANCE = (JOYSTICK_SIZE - KNOB_SIZE) / 2

export default function VirtualJoystick({ onInput }: VirtualJoystickProps) {
  const [visible, setVisible] = useState(false)
  const [center, setCenter] = useState({ x: 0, y: 0 })
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const touchId = useRef<number | null>(null)
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window

  useEffect(() => {
    if (!isTouchDevice) return

    const onTouchStart = (e: TouchEvent) => {
      if (touchId.current !== null) return
      const touch = e.changedTouches[0]
      // Only activate in the bottom-left quadrant
      if (touch.clientX > window.innerWidth / 2 || touch.clientY < window.innerHeight / 2) return

      touchId.current = touch.identifier
      setCenter({ x: touch.clientX, y: touch.clientY })
      setKnob({ x: 0, y: 0 })
      setVisible(true)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (touchId.current === null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        if (touch.identifier !== touchId.current) continue

        let dx = touch.clientX - center.x
        let dy = touch.clientY - center.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > MAX_DISTANCE) {
          dx = (dx / dist) * MAX_DISTANCE
          dy = (dy / dist) * MAX_DISTANCE
        }

        setKnob({ x: dx, y: dy })
        onInput(dx / MAX_DISTANCE, -dy / MAX_DISTANCE)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId.current) {
          touchId.current = null
          setVisible(false)
          setKnob({ x: 0, y: 0 })
          onInput(0, 0)
        }
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [isTouchDevice, center.x, center.y, onInput])

  if (!isTouchDevice || !visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: center.x - JOYSTICK_SIZE / 2,
        top: center.y - JOYSTICK_SIZE / 2,
        width: JOYSTICK_SIZE,
        height: JOYSTICK_SIZE,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.15)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: JOYSTICK_SIZE / 2 - KNOB_SIZE / 2 + knob.x,
          top: JOYSTICK_SIZE / 2 - KNOB_SIZE / 2 + knob.y,
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.4)',
        }}
      />
    </div>
  )
}
