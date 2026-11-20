import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ListSkeleton } from '@/components/status'
import { routeTree } from './routeTree.gen'
import '@/lib/api'
import './index.css'

const router = createRouter({
  routeTree,
  defaultPendingMs: 0,
  defaultPendingComponent: ListSkeleton,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
