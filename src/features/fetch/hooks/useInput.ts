import { useEffect, useRef, useCallback } from 'react'

interface InputState {
  x: number
  y: number
  active: boolean
}

const KEYS_X: Record<string, number> = {
  ArrowLeft: -1,
  a: -1,
  A: -1,
  ArrowRight: 1,
  d: 1,
  D: 1,
}

const KEYS_Y: Record<string, number> = {
  ArrowUp: 1,
  w: 1,
  W: 1,
  ArrowDown: -1,
  s: -1,
  S: -1,
}

export default function useInput() {
  const state = useRef<InputState>({ x: 0, y: 0, active: false })
  const pressed = useRef(new Set<string>())
  const joystick = useRef({ x: 0, y: 0, active: false })

  const update = useCallback(() => {
    let x = 0
    let y = 0
    for (const key of pressed.current) {
      if (key in KEYS_X) x += KEYS_X[key]
      if (key in KEYS_Y) y += KEYS_Y[key]
    }

    // Joystick overrides if active
    if (joystick.current.active) {
      x = joystick.current.x
      y = joystick.current.y
    }

    state.current.x = Math.max(-1, Math.min(1, x))
    state.current.y = Math.max(-1, Math.min(1, y))
    state.current.active = pressed.current.size > 0 || joystick.current.active
  }, [])

  const setJoystick = useCallback(
    (x: number, y: number) => {
      joystick.current.x = x
      joystick.current.y = y
      joystick.current.active = Math.abs(x) > 0.01 || Math.abs(y) > 0.01
      update()
    },
    [update],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key in KEYS_X || e.key in KEYS_Y) {
        pressed.current.add(e.key)
        update()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      pressed.current.delete(e.key)
      update()
    }
    const onBlur = () => {
      pressed.current.clear()
      update()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [update])

  return { state, setJoystick }
}
