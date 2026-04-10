import { useRef, useEffect } from 'react'

interface InputState {
  x: number
  y: number
  active: boolean
  distance: number // 0-1 normalized distance from center
}

export function useInput(): React.RefObject<InputState> {
  const state = useRef<InputState>({ x: 0, y: 0, active: false, distance: 0 })

  useEffect(() => {
    let mouseActive = false

    const onMouseMove = (e: MouseEvent) => {
      // Normalize mouse position: center of screen = (0,0), edges = (-1,-1) to (1,1)
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = -((e.clientY / window.innerHeight) * 2 - 1) // flip Y so up is positive

      // Distance from center (0-1, clamped)
      const dist = Math.min(Math.sqrt(nx * nx + ny * ny), 1)

      // Dead zone in the center (no movement when mouse is near center)
      const deadZone = 0.08
      if (dist < deadZone) {
        state.current.x = 0
        state.current.y = 0
        state.current.active = false
        state.current.distance = 0
        return
      }

      // Normalize direction
      const dirX = nx / dist
      const dirY = ny / dist

      // Scale by distance (further = faster input)
      const strength = (dist - deadZone) / (1 - deadZone)
      state.current.x = dirX * strength
      state.current.y = dirY * strength
      state.current.active = true
      state.current.distance = strength
      mouseActive = true
    }

    const onMouseLeave = () => {
      state.current.x = 0
      state.current.y = 0
      state.current.active = false
      state.current.distance = 0
      mouseActive = false
    }

    // Keep keyboard as fallback
    const keys = new Set<string>()
    const onKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        keys.add(e.key)
        updateKeys()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key)
      updateKeys()
    }
    function updateKeys() {
      if (mouseActive) return // mouse takes priority
      let x = 0
      let y = 0
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1
      if (keys.has('d') || keys.has('ArrowRight')) x += 1
      if (keys.has('w') || keys.has('ArrowUp')) y += 1
      if (keys.has('s') || keys.has('ArrowDown')) y -= 1
      state.current.x = x
      state.current.y = y
      state.current.active = x !== 0 || y !== 0
      state.current.distance = state.current.active ? 0.7 : 0
    }

    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      keys.clear()
    }
  }, [])

  return state
}

/** Called by VirtualJoystick to merge touch input */
export function setJoystickInput(ref: React.RefObject<InputState>, x: number, y: number) {
  const dist = Math.sqrt(x * x + y * y)
  ref.current.x = x
  ref.current.y = y
  ref.current.active = dist > 0.05
  ref.current.distance = Math.min(dist, 1)
}
