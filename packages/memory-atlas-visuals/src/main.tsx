import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { visuals } from './config'
import { router } from './routes'

// biome-ignore lint/style/noNonNullAssertion: root element always present in index.html
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider
      attribute="data-theme"
      defaultTheme={visuals.defaultSkin}
      themes={visuals.skins}
      enableSystem={false}
    >
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
)
