/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from '@tanstack/react-router'
import { Canvas } from '@react-three/fiber'
import Experience from '@/Experience'
import { CAMERA_SETTINGS, GL_SETTINGS, PIXEL_RATIO } from '@/settings'
import ThemeProvider, { useTheme } from '@/providers/theme-provider'
import AudioProvider from '@/providers/audio-provider'
import { BurgerNav, SettingsPanel } from '@/components'
import '@/index.css'

const ANTI_FLASH_SCRIPT = `
(function() {
  try {
    var mode = localStorage.getItem('theme-color-mode');
    var style = localStorage.getItem('theme-ui-style');
    if (mode === 'dark' || (!mode)) document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-style', style || 'flat');
  } catch(e) {}
})();
`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Josh Lavallee | Dev Portfolio' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/monogram.svg' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <AudioProvider>
            <SceneBridge />
            <div className="pointer-events-none relative z-10 [&_a,&_button,&_input,&_textarea,&_select]:pointer-events-auto">
              {children}
            </div>
            <SettingsPanel />
            <BurgerNav />
          </AudioProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

function SceneBridge() {
  const { colorMode, uiStyle } = useTheme()
  const routerState = useRouterState()
  const routePath = routerState.location.pathname
  const search = routerState.location.search as { photo?: number }
  const photoIndex = Number(search.photo) || 0

  return (
    <Canvas
      gl={GL_SETTINGS}
      camera={CAMERA_SETTINGS}
      dpr={PIXEL_RATIO}
      className="!fixed !inset-0 !-z-10"
    >
      <Experience
        routePath={routePath}
        colorMode={colorMode}
        uiStyle={uiStyle}
        photoIndex={photoIndex}
      />
    </Canvas>
  )
}
