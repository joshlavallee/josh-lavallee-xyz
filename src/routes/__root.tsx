/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import ThemeProvider from '@/providers/theme-provider'
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
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
