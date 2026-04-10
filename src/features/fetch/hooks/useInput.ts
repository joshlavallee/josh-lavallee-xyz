import { useRef, useEffect } from 'react'

interface InputState {
  x: number
  y: number
  active: boolean
}

const keys = new Set<string>()

export function useInput(): React.RefObject<InputState> {
  const state = useRef<InputState>({ x: 0, y: 0, active: false })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        keys.add(e.key)
        update()
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key)
      update()
    }

    function update() {
      let x = 0
      let y = 0
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1
      if (keys.has('d') || keys.has('ArrowRight')) x += 1
      if (keys.has('w') || keys.has('ArrowUp')) y += 1
      if (keys.has('s') || keys.has('ArrowDown')) y -= 1
      state.current.x = x
      state.current.y = y
      state.current.active = x !== 0 || y !== 0
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      keys.clear()
    }
  }, [])

  return state
}

/** Called by VirtualJoystick to merge touch input */
export function setJoystickInput(ref: React.RefObject<InputState>, x: number, y: number) {
  ref.current.x = x
  ref.current.y = y
  ref.current.active = x !== 0 || y !== 0
}
