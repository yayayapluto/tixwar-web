import { QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  Bug,
  CalendarDays,
  KeyRound,
  LogOut,
  Moon,
  Receipt,
  Settings,
  Sun,
  Ticket,
} from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { SmoothCursor } from '@/components/smooth-cursor'
import { Toaster } from '@/components/toaster'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLogout, useSession } from '@/features/auth/use-auth'
import { TourProvider } from '@/features/onboarding/tour-context'
import { ThemeProvider, useTheme } from '@/features/theme/theme-context'
import { appScrollViewportRef, scrollAppToTop } from '@/lib/app-scroll'
import { getV1ApiKeys, getV1Events, getV1Orders, getV1Tickets } from '@/lib/client'
import { queryClient } from '@/lib/queryClient'
import { cn } from '@/lib/utils'

export const Route = createRootRoute({
  component: RootComponent,
})

type NavItem = {
  to: '/events' | '/orders' | '/tickets' | '/settings' | '/api-keys' | '/debug/stream'
  label: string
  icon: LucideIcon
  show: boolean
}

// Hover preload: fetch a nav destination's list data into the shared query
// cache so opening the page renders from cache instead of loading. Only
// the hovered destination is fetched, never on render; a fresh cache entry
// (staleTime 30s) is reused, so repeated hovers cost no extra request.
// The JS chunk itself is preloaded by each Link's preload="intent".
function prefetchEventsList() {
  // Same default filters the /events route validates to when navigated
  // without search params, and the same category query the page runs.
  const filters = {
    q: '',
    status: undefined,
    category: undefined,
    sort: 'ending' as const,
    page: 1,
    limit: 12,
  }
  void queryClient.prefetchQuery({
    queryKey: ['events', filters],
    queryFn: async () => (await getV1Events({ query: filters, throwOnError: true })).data,
  })
  void queryClient.prefetchQuery({
    queryKey: ['events', { q: '', status: undefined, limit: 100 }],
    queryFn: async () =>
      (await getV1Events({ query: { q: '', limit: 100 }, throwOnError: true })).data,
  })
}

function prefetchOrdersList() {
  void queryClient.prefetchQuery({
    queryKey: ['orders', 'all'],
    queryFn: async () => (await getV1Orders({ query: {}, throwOnError: true })).data,
  })
}

function prefetchTicketsList() {
  void queryClient.prefetchQuery({
    queryKey: ['tickets'],
    queryFn: async () => (await getV1Tickets({ throwOnError: true })).data,
  })
}

function prefetchApiKeys() {
  // Both /settings (regular users, via ApiKeysManager) and /api-keys
  // render the same ['api-keys'] query.
  void queryClient.prefetchQuery({
    queryKey: ['api-keys'],
    queryFn: async () => (await getV1ApiKeys({ throwOnError: true })).data,
  })
}

function prefetchNav(to: NavItem['to']) {
  switch (to) {
    case '/events':
      prefetchEventsList()
      break
    case '/orders':
      prefetchOrdersList()
      break
    case '/tickets':
      prefetchTicketsList()
      break
    case '/settings':
    case '/api-keys':
      prefetchApiKeys()
      break
    case '/debug/stream':
      // Live SSE stream: nothing cacheable to prefetch, chunk only.
      break
  }
}

function useVisibleNavItems(): Array<NavItem> {
  const session = useSession()
  const isAdmin = session?.user.role === 'admin'
  const items: Array<NavItem> = [
    { to: '/events', label: 'Events', icon: CalendarDays, show: true },
    { to: '/orders', label: 'Orders', icon: Receipt, show: Boolean(session) && !isAdmin },
    { to: '/tickets', label: 'Tickets', icon: Ticket, show: Boolean(session) && !isAdmin },
    { to: '/settings', label: 'Settings', icon: Settings, show: Boolean(session) && !isAdmin },
    { to: '/api-keys', label: 'API keys', icon: KeyRound, show: isAdmin },
    { to: '/debug/stream', label: 'Debug', icon: Bug, show: isAdmin },
  ]
  return items.filter((item) => item.show)
}

function BottomBar() {
  const visible = useVisibleNavItems()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const activeTo = visible.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  )?.to
  const navRef = useRef<HTMLElement>(null)
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>())
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const el = activeTo ? itemRefs.current.get(activeTo) : undefined
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeTo])

  // A single nav item is not navigation: the header already links to Events,
  // so a one-item pill would only take up space.
  if (visible.length <= 1) return null

  return (
    <nav
      ref={navRef}
      id="tour-nav"
      tabIndex={-1}
      aria-label="Primary"
      className="animate-bar-in fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border bg-background/90 p-1.5 shadow-lg backdrop-blur"
    >
      {pill && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 bottom-1.5 left-0 rounded-full bg-secondary transition-[transform,width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(${pill.left}px)`, width: pill.width }}
        />
      )}
      {visible.map((item) => {
        const active = item.to === activeTo
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            preload="intent"
            onMouseEnter={() => prefetchNav(item.to)}
            onFocus={() => prefetchNav(item.to)}
            ref={(el) => {
              if (el) itemRefs.current.set(item.to, el)
              else itemRefs.current.delete(item.to)
            }}
            aria-current={active ? 'page' : undefined}
            aria-label={item.label}
            className={cn(
              'relative z-10 flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-[transform,color] duration-150 ease-out active:scale-[0.98]',
              active ? 'text-secondary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span key={String(active)} className={active ? 'animate-pop' : undefined}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span>{item.label}</span>
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
  const [logoutOpen, setLogoutOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <header className="z-10 border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <Link
          to="/events"
          preload="intent"
          onMouseEnter={prefetchEventsList}
          onFocus={prefetchEventsList}
          className="flex items-center gap-2 font-semibold"
        >
          <Ticket className="size-5" aria-hidden="true" />
          TixWar
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              // The wipe spreads from the button's center; reading the rect
              // (instead of the click point) keeps it centered for keyboard
              // activation too, where the click has no coordinates.
              const rect = e.currentTarget.getBoundingClientRect()
              toggle({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
            }}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? (
              <Sun
                key="sun"
                className="size-4 animate-in duration-200 ease-out fade-in zoom-in-90 spin-in-90"
                aria-hidden="true"
              />
            ) : (
              <Moon
                key="moon"
                className="size-4 animate-in duration-200 ease-out fade-in zoom-in-90 spin-in-90"
                aria-hidden="true"
              />
            )}
          </Button>
          {session ? (
            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Log out">
                  <LogOut className="size-4" aria-hidden="true" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You&apos;ll be signed out on this device and need to log in again to continue.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: 'destructive' })}
                    onClick={() => logout.mutate()}
                  >
                    Log out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
  // Same rule as BottomBar: reserve bottom space only when the bar renders.
  const showBottomBar = useVisibleNavItems().length > 1
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // The window never scrolls (the shell below is h-dvh with internal
  // scrolling), so the router cannot restore window scroll: the shell
  // resets its own viewport on every navigation instead.
  // biome-ignore lint/correctness/useExhaustiveDependencies: effect intentionally re-runs when pathname changes; body only scrolls.
  useLayoutEffect(() => {
    scrollAppToTop()
  }, [pathname])
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TourProvider>
          <div className="relative flex h-dvh flex-col overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex flex-col items-start gap-2 p-4">
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:pointer-events-auto focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Skip to main content
              </a>
              {showBottomBar && (
                <a
                  href="#tour-nav"
                  className="sr-only focus:not-sr-only focus:pointer-events-auto focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Skip to navigation
                </a>
              )}
            </div>
            <Header />
            <ScrollArea viewportRef={appScrollViewportRef} className="min-h-0 flex-1">
              <main
                id="main"
                tabIndex={-1}
                className={cn(
                  'mx-auto w-full max-w-5xl px-4 pt-6',
                  showBottomBar ? 'pb-24' : 'pb-6',
                )}
              >
                <Outlet />
              </main>
            </ScrollArea>
            <BottomBar />
            <Toaster />
            <SmoothCursor />
          </div>
        </TourProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
