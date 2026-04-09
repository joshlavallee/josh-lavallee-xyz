import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type ColorMode = 'light' | 'dark'
export type UIStyle = 'flat' | 'glass' | 'paper'

interface ThemeContextValue {
  colorMode: ColorMode
  uiStyle: UIStyle
  setColorMode: (mode: ColorMode) => void
  setUIStyle: (style: UIStyle) => void
  toggleColorMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const COLOR_MODE_KEY = 'theme-color-mode'
const UI_STYLE_KEY = 'theme-ui-style'

const DEFAULT_COLOR_MODE: ColorMode = 'dark'
const DEFAULT_UI_STYLE: UIStyle = 'glass'

function getInitialColorMode(): ColorMode {
  if (typeof window === 'undefined') return DEFAULT_COLOR_MODE
  const stored = localStorage.getItem(COLOR_MODE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return DEFAULT_COLOR_MODE
}

function getInitialUIStyle(): UIStyle {
  if (typeof window === 'undefined') return DEFAULT_UI_STYLE
  const stored = localStorage.getItem(UI_STYLE_KEY)
  if (stored === 'neumorphism') return 'paper' // migrate old value
  if (stored === 'flat' || stored === 'glass' || stored === 'paper') return stored
  return DEFAULT_UI_STYLE
}

function applyColorMode(mode: ColorMode) {
  const root = document.documentElement
  if (mode === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

function applyUIStyle(style: UIStyle) {
  document.documentElement.setAttribute('data-style', style)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorMode, setColorModeState] = useState<ColorMode>(DEFAULT_COLOR_MODE)
  const [uiStyle, setUIStyleState] = useState<UIStyle>(DEFAULT_UI_STYLE)

  // Sync React state from localStorage after hydration.
  // The anti-flash script already applied the correct DOM attributes,
  // so there's no visual flash — this just catches React state up.
  useEffect(() => {
    const storedMode = getInitialColorMode()
    const storedStyle = getInitialUIStyle()
    setColorModeState(storedMode)
    setUIStyleState(storedStyle)
    applyColorMode(storedMode)
    applyUIStyle(storedStyle)
  }, [])

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode)
    applyColorMode(mode)
    localStorage.setItem(COLOR_MODE_KEY, mode)
  }, [])

  const setUIStyle = useCallback((style: UIStyle) => {
    setUIStyleState(style)
    applyUIStyle(style)
    localStorage.setItem(UI_STYLE_KEY, style)
  }, [])

  const toggleColorMode = useCallback(() => {
    const next = colorMode === 'dark' ? 'light' : 'dark'
    setColorMode(next)
  }, [colorMode, setColorMode])

  return (
    <ThemeContext value={{ colorMode, uiStyle, setColorMode, setUIStyle, toggleColorMode }}>
      {children}
    </ThemeContext>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
