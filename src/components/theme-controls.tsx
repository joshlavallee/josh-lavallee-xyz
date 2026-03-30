import { Sun, Moon, Layers, Square, Circle } from 'lucide-react'
import { useTheme, type UIStyle } from '@/providers/theme-provider'
import { cn } from '@/lib/utils'

const UI_STYLES: { value: UIStyle; label: string; icon: typeof Square }[] = [
  { value: 'flat', label: 'Flat', icon: Square },
  { value: 'glass', label: 'Glass', icon: Layers },
  { value: 'neumorphism', label: 'Neu', icon: Circle },
]

export default function ThemeControls() {
  const { colorMode, uiStyle, toggleColorMode, setUIStyle } = useTheme()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 sm:flex-row sm:items-center">
      {/* Color mode toggle */}
      <button
        onClick={toggleColorMode}
        className="surface flex h-10 w-10 items-center justify-center rounded-xl text-foreground/80 transition-colors hover:text-foreground"
        aria-label={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
      >
        {colorMode === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>

      {/* UI style selector */}
      <div className="surface flex rounded-xl p-1">
        {UI_STYLES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setUIStyle(value)}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
              uiStyle === value
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/60 hover:text-foreground'
            )}
            aria-label={`${label} style`}
            aria-pressed={uiStyle === value}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
