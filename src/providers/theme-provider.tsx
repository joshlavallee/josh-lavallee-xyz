import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type ColorMode = 'light' | 'dark'
export type UIStyle = 'flat' | 'glass' | 'neumorphism'

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
const DEFAULT_UI_STYLE: UIStyle = 'flat'

function getInitialColorMode(): ColorMode {
  if (typeof window === 'undefined') return DEFAULT_COLOR_MODE
  const stored = localStorage.getItem(COLOR_MODE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return DEFAULT_COLOR_MODE
}

function getInitialUIStyle(): UIStyle {
  if (typeof window === 'undefined') return DEFAULT_UI_STYLE
  const stored = localStorage.getItem(UI_STYLE_KEY)
  if (stored === 'flat' || stored === 'glass' || stored === 'neumorphism') return stored
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
  const [colorMode, setColorModeState] = useState<ColorMode>(getInitialColorMode)
  const [uiStyle, setUIStyleState] = useState<UIStyle>(getInitialUIStyle)

  // Sync DOM on mount (needed for SSR hydration where the anti-flash script
  // already set attributes, but React state needs to match)
  useEffect(() => {
    applyColorMode(colorMode)
    applyUIStyle(uiStyle)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
