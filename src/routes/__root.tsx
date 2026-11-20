import { QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { Bug, CalendarDays, KeyRound, LogOut, Moon, Receipt, Sun, Ticket } from 'lucide-react'
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

function BottomBar() {
  const session = useSession()
  const isAdmin = session?.user.role === 'admin'
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const items: Array<NavItem> = [
    { to: '/events', label: 'Events', icon: CalendarDays, show: true },
    { to: '/orders', label: 'Orders', icon: Receipt, show: Boolean(session) && !isAdmin },
    { to: '/tickets', label: 'Tickets', icon: Ticket, show: Boolean(session) && !isAdmin },
    { to: '/api-keys', label: 'API keys', icon: KeyRound, show: isAdmin },
    { to: '/debug/stream', label: 'Debug', icon: Bug, show: isAdmin },
  ]

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border bg-background/90 p-1.5 shadow-lg backdrop-blur"
    >
      {items
        .filter((item) => item.show)
        .map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full px-4 py-3 text-sm font-medium whitespace-nowrap transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.98]',
                active
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="hidden min-[400px]:inline">{item.label}</span>
            </Link>
          )
        })}
    </nav>
  )
}

function Header() {
  const { theme, toggle } = useTheme()
  const session = useSession()
  const logout = useLogout()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <Link to="/events" className="flex items-center gap-2 font-semibold">
          <Ticket className="size-5" aria-hidden="true" />
          TixWar
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? (
              <Sun
                key="sun"
                className="size-4 animate-in duration-150 ease-out fade-in zoom-in-90"
                aria-hidden="true"
              />
            ) : (
              <Moon
                key="moon"
                className="size-4 animate-in duration-150 ease-out fade-in zoom-in-90"
                aria-hidden="true"
              />
            )}
          </Button>
          {session ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout.mutate()}
              aria-label="Log out"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </Button>
          ) : (
            <Link
              to="/login"
              search={pathname !== '/login' ? { redirect: pathname } : undefined}
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="flex min-h-dvh flex-col">
          <Header />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24">
            <Outlet />
          </main>
          <BottomBar />
          <Toaster />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
