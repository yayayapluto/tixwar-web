import { QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  Bug,
  CalendarDays,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Receipt,
  Sun,
  Ticket,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Toaster } from '@/components/toaster'
import { Button, buttonVariants } from '@/components/ui/button'
import { useLogout, useSession } from '@/features/auth/use-auth'
import { ThemeProvider, useTheme } from '@/features/theme/theme-context'
import { queryClient } from '@/lib/queryClient'
import { cn } from '@/lib/utils'

export const Route = createRootRoute({
  component: RootComponent,
})

type NavItem = {
  to: '/events' | '/orders' | '/tickets' | '/api-keys' | '/debug/stream'
  label: string
  icon: LucideIcon
  show: boolean
}

function SidebarNav({ onNavigate }: { onNavigate: () => void }) {
  const session = useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const items: Array<NavItem> = [
    { to: '/events', label: 'Events', icon: CalendarDays, show: true },
    { to: '/orders', label: 'Orders', icon: Receipt, show: Boolean(session) },
    { to: '/tickets', label: 'Tickets', icon: Ticket, show: Boolean(session) },
    { to: '/api-keys', label: 'API keys', icon: KeyRound, show: Boolean(session) },
    { to: '/debug/stream', label: 'Debug', icon: Bug, show: session?.user.role === 'admin' },
  ]

  return (
    <nav aria-label="Primary" className="space-y-1 px-3">
      {items
        .filter((item) => item.show)
        .map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
    </nav>
  )
}

function SidebarFooter() {
  const { theme, toggle } = useTheme()
  const session = useSession()
  const logout = useLogout()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="space-y-1 border-t p-3">
      <Button variant="ghost" className="w-full justify-start" onClick={toggle}>
        {theme === 'dark' ? (
          <Sun className="size-4" aria-hidden="true" />
        ) : (
          <Moon className="size-4" aria-hidden="true" />
        )}
        {theme === 'dark' ? 'Light theme' : 'Dark theme'}
      </Button>
      {session ? (
        <Button variant="ghost" className="w-full justify-start" onClick={() => logout.mutate()}>
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </Button>
      ) : (
        <Link
          to="/login"
          search={pathname !== '/login' ? { redirect: pathname } : undefined}
          className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}
        >
          Log in
        </Link>
      )}
    </div>
  )
}

function RootComponent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = () => setSidebarOpen(false)

  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="flex min-h-dvh flex-col lg:pl-64">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
            <Link to="/events" className="flex items-center gap-2 font-semibold">
              <Ticket className="size-5" aria-hidden="true" />
              TixWar
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
            <Outlet />
          </main>
          <Toaster />
        </div>
        {sidebarOpen && (
          <div
            aria-hidden="true"
            onClick={closeSidebar}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          />
        )}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-background transition-transform duration-200 lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <Link
              to="/events"
              onClick={closeSidebar}
              className="flex items-center gap-2 font-semibold"
            >
              <Ticket className="size-5" aria-hidden="true" />
              TixWar
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeSidebar}
              aria-label="Close menu"
              className="lg:hidden"
            >
              <X className="size-5" aria-hidden="true" />
            </Button>
          </div>
          <SidebarNav onNavigate={closeSidebar} />
          <div className="flex-1" />
          <SidebarFooter />
        </aside>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
