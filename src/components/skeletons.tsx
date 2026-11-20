import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Layout-matched loading skeletons: each one mirrors the shape, position and
// size of the real content (same Card padding, same control heights — Input
// and Button are h-11 here, sm buttons h-10, lg h-12), only without text.
// No spinner anywhere (skeleton-only rule); the shimmer lives in the shared
// Skeleton primitive. No entrance animation and no stagger on lists
// (DESIGN.md motion budget).
//
// Every exported skeleton is one role="status" region with a single sr-only
// "Loading…" announcement; the Skeleton bars themselves are aria-hidden, so
// screen readers never hear fake text. The small building blocks below are
// unexported on purpose — a page skeleton composes them inside one shell.

function SkeletonShell({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  )
}

function EventCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 min-w-0 flex-1" />
          <Skeleton className="h-5 w-16 shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/5" />
        <div className="space-y-1 border-t pt-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </CardContent>
    </Card>
  )
}

function EventsGrid({ count }: { count: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static rows, never reordered
        <EventCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function EventsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonShell>
      <EventsGrid count={count} />
    </SkeletonShell>
  )
}

export function EventsPageSkeleton() {
  return (
    <SkeletonShell>
      <div className="space-y-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 sm:w-44" />
        <Skeleton className="h-11 sm:w-48" />
        <Skeleton className="h-11 w-20" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-14 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-20 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-16 rounded-full" />
      </div>
      <EventsGrid count={6} />
    </SkeletonShell>
  )
}

function TierCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-24 shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-11 w-24" />
          <Skeleton className="h-11 flex-1" />
        </div>
      </CardContent>
    </Card>
  )
}

export function EventDetailSkeleton() {
  return (
    <SkeletonShell>
      <Skeleton className="h-4 w-28" />
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Skeleton className="h-8 min-w-0 flex-1" />
          <Skeleton className="h-5 w-20 shrink-0" />
        </div>
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-6 w-24" />
      <div className="grid gap-3 sm:grid-cols-2">
        <TierCardSkeleton />
        <TierCardSkeleton />
        <TierCardSkeleton />
      </div>
    </SkeletonShell>
  )
}

function OrderCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 min-w-0 flex-1" />
          <Skeleton className="h-5 w-20 shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-40" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-11 w-full" />
      </CardFooter>
    </Card>
  )
}

function OrdersGrid({ count }: { count: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static rows, never reordered
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function OrdersGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonShell>
      <OrdersGrid count={count} />
    </SkeletonShell>
  )
}

export function OrdersPageSkeleton() {
  return (
    <SkeletonShell>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-11 w-full sm:w-44" />
      </div>
      <OrdersGrid count={3} />
    </SkeletonShell>
  )
}

export function OrderDetailSkeleton() {
  return (
    <SkeletonShell>
      <Skeleton className="h-4 w-28" />
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-8 min-w-0 flex-1" />
        <Skeleton className="h-5 w-24 shrink-0" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-48" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </SkeletonShell>
  )
}

function TicketCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="h-10 w-24 shrink-0" />
      </CardContent>
    </Card>
  )
}

function TicketsList({ count }: { count: number }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="grid gap-3">
          {Array.from({ length: count }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static rows, never reordered
            <TicketCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  )
}

export function TicketsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonShell>
      <TicketsList count={count} />
    </SkeletonShell>
  )
}

export function TicketsPageSkeleton() {
  return (
    <SkeletonShell>
      <Skeleton className="h-8 w-48" />
      <TicketsList count={3} />
    </SkeletonShell>
  )
}

export function TicketDetailSkeleton() {
  return (
    <SkeletonShell>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-2/3" />
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <Skeleton className="h-4 w-32" />
          <span className="flex shrink-0 items-center gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-11 w-11" />
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="mx-auto aspect-square w-full max-w-56" />
          <div className="space-y-1 text-center">
            <Skeleton className="mx-auto h-9 w-40" />
            <Skeleton className="mx-auto h-4 w-48" />
          </div>
          <Skeleton className="mx-auto h-4 w-56" />
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </SkeletonShell>
  )
}

function ApiKeyRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
      <div className="min-w-0 space-y-0.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  )
}

function ApiKeyRows({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static rows, never reordered
        <ApiKeyRowSkeleton key={i} />
      ))}
    </div>
  )
}

export function ApiKeysListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonShell>
      <ApiKeyRows count={count} />
    </SkeletonShell>
  )
}

export function ApiKeysManagerSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-32 shrink-0" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-11 min-w-0 flex-1" />
            <Skeleton className="h-11 w-11 shrink-0" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-11 min-w-0 flex-1" />
            <Skeleton className="h-11 w-11 shrink-0" />
          </div>
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 min-w-0 flex-1" />
            <Skeleton className="h-11 w-20" />
          </div>
        </CardContent>
      </Card>
      <ApiKeyRows count={3} />
    </div>
  )
}

export function ApiKeysPageSkeleton() {
  return (
    <SkeletonShell>
      <Skeleton className="h-8 w-32" />
      <ApiKeysManagerSkeleton />
    </SkeletonShell>
  )
}

export function SettingsPageSkeleton() {
  return (
    <SkeletonShell>
      <Skeleton className="h-8 w-32" />
      <Card>
        <CardContent className="space-y-2 pt-6">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardContent>
      </Card>
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-4 w-2/3" />
      <ApiKeysManagerSkeleton />
    </SkeletonShell>
  )
}

function TraceRowSkeleton() {
  return (
    <article className="rounded border bg-muted/50 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-3 w-12" />
        <span className="ml-auto">
          <Skeleton className="h-11 w-11" />
        </span>
      </div>
      <div className="mt-1 space-y-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </article>
  )
}

export function TraceListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" className="space-y-1">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static rows, never reordered
        <TraceRowSkeleton key={i} />
      ))}
    </div>
  )
}

function FormFieldSkeleton({ hint }: { hint?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-11 w-full" />
      {hint && <Skeleton className="h-3 w-40" />}
    </div>
  )
}

export function DebugPageSkeleton() {
  return (
    <SkeletonShell>
      <div className="space-y-1">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-8" />
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 min-w-40 flex-1" />
            <Skeleton className="h-11 w-44" />
          </div>
          <TraceListSkeleton count={3} />
        </CardContent>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <FormFieldSkeleton />
            <FormFieldSkeleton />
            <FormFieldSkeleton />
            <Skeleton className="h-11 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <FormFieldSkeleton />
            <FormFieldSkeleton />
            <FormFieldSkeleton />
            <Skeleton className="h-11 w-full" />
          </CardContent>
        </Card>
      </div>
    </SkeletonShell>
  )
}

export type AuthSkeletonVariant = 'login' | 'register' | 'forgot' | 'reset'

export function AuthPageSkeleton({ variant }: { variant: AuthSkeletonVariant }) {
  return (
    <div className="mx-auto max-w-sm pt-8">
      <SkeletonShell>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
            <div className="space-y-1 pt-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {variant !== 'reset' && <FormFieldSkeleton />}
              {variant !== 'forgot' && (
                <FormFieldSkeleton hint={variant === 'register' || variant === 'reset'} />
              )}
              {variant === 'login' && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              )}
              <Skeleton className="h-11 w-full" />
            </div>
          </CardContent>
        </Card>
      </SkeletonShell>
    </div>
  )
}
