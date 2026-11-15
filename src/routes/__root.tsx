import { QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { LogOut, Moon, Sun, Ticket } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { useLogout, useSession } from '@/features/auth/use-auth'
import { ThemeProvider, useTheme } from '@/features/theme/theme-context'
import { queryClient } from '@/lib/queryClient'
import { cn } from '@/lib/utils'

export const Route = createRootRoute({
  component: RootComponent,
})

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const active = pathname === to || pathname.startsWith(`${to}/`)
  return (
    <Link
      to={to}
      className={cn(
        'rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-secondary text-secondary-foreground'
          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
      )}
    >
      {children}
    </Link>
  )
}

function Header() {
  const { theme, toggle } = useTheme()
  const session = useSession()
  const logout = useLogout()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
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
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          {session ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout.mutate()}
              aria-label="Log out"
            >
              <LogOut className="size-4" />
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
      <nav aria-label="Primary" className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
        <NavLink to="/events">Events</NavLink>
        {session && <NavLink to="/orders">Orders</NavLink>}
        {session && <NavLink to="/tickets">Tickets</NavLink>}
        {session && <NavLink to="/api-keys">API keys</NavLink>}
        {session?.user.role === 'admin' && <NavLink to="/debug/stream">Debug</NavLink>}
      </nav>
    </header>
  )
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="flex min-h-dvh flex-col">
          <Header />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
            <Outlet />
          </main>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
