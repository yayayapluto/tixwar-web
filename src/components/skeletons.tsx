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
    <Card className="border-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          {/* Same height as the real title: two lines of text-base with
              leading-snug (2 x 22px), so the bar is h-[44px], not h-4. */}
          <Skeleton className="h-[44px] min-w-0 flex-1" />
          <Skeleton className="h-[22px] w-16 shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-2/5" />
        <div className="space-y-1 border-t pt-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
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

export function EventsGridSkeleton({ count = 12 }: { count?: number }) {
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
        <Skeleton className="h-5 w-32" />
        {/* Orientation line: real text-sm line (20px), always rendered. */}
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 sm:w-44" />
        <Skeleton className="h-11 sm:w-48" />
        <Skeleton className="h-11 w-20" />
        {/* Always-mounted Clear filters button (default h-11). */}
        <Skeleton className="h-11 w-32" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-14 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-20 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-16 rounded-full" />
        {/* 6th element: the "More (N)" button (h-10, min-w-20, rounded-full). */}
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
      <EventsGrid count={12} />
    </SkeletonShell>
  )
}

function TierCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          {/* Real title: CardTitle leading-snug (22px line). */}
          <Skeleton className="h-[22px] w-24" />
          <Skeleton className="h-8 w-24 shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-5 w-2/3" />
        {/* Same shape as the real buy block: button row + Total line
            (min-h-5) + error slot (min-h-5), space-y-2 between them. */}
        <div className="mt-auto space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-11 flex-1" />
          </div>
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </CardContent>
    </Card>
  )
}

export function EventDetailSkeleton() {
  return (
    <SkeletonShell>
      {/* Real back link is a ghost Button h-auto py-1 text-sm: 20 + 8 = 28px. */}
      <Skeleton className="h-7 w-28" />
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Skeleton className="h-8 min-w-0 flex-1" />
          <Skeleton className="h-[22px] w-20 shrink-0" />
        </div>
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="h-7 w-24" />
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
          {/* Same height as the real title: text-base with leading-snug
              (22px line), so the bar is h-[22px], not h-4. */}
          <Skeleton className="h-[22px] min-w-0 flex-1" />
          <Skeleton className="h-5 w-20 shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-40" />
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
      {/* Real back link is a ghost Button h-auto py-1 text-sm: 20 + 8 = 28px. */}
      <Skeleton className="h-7 w-28" />
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-8 min-w-0 flex-1" />
        {/* Real Badge: text-xs line (16) + py-0.5 (4) + border (2) = 22px. */}
        <Skeleton className="h-[22px] w-24 shrink-0" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            {/* Real label is text-xs (16px line), not h-3. */}
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
          {/* Real order-ID line: font-mono text-xs (16px) + CopyButton h-8. */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="h-8 w-8 shrink-0" />
          </div>
          <Skeleton className="h-5 w-72" />
        </CardContent>
      </Card>
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        {/* Real payable block: min-h-5 error slot + text-xs reassurance line. */}
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-11 w-full" />
      </div>
    </SkeletonShell>
  )
}

function TicketCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        {/* Same height as the real title: text-base with leading-snug
            (22px line), so the bar is h-[22px], not h-4. */}
        <Skeleton className="h-[22px] w-2/3" />
      </CardHeader>
      <CardContent className="flex items-start justify-between gap-3 pb-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-1/2" />
        </div>
        <Skeleton className="h-10 w-24 shrink-0" />
      </CardContent>
      {/* Code row below the link: text-xs (16px) + CopyButton h-8 w-8
          (-mt-1.5, -mr-2). Row height: pt-1 + 26 + pb-6 = 54px. */}
      <div className="flex items-start gap-1 px-6 pb-6 pt-1">
        <Skeleton className="h-4 min-w-0 flex-1" />
        <Skeleton className="-mr-2 -mt-1.5 h-8 w-8 shrink-0" />
      </div>
    </Card>
  )
}

function TicketsList({ count }: { count: number }) {
  return (
    <div className="space-y-6">
      {/* Search + filter row: Input h-11, three Toggle sm h-10 pills.
          Desktop 44px, mobile 44 + 8 + 40 = 92px. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-11 flex-1" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-12 rounded-full" />
          <Skeleton className="h-10 w-20 rounded-full" />
          <Skeleton className="h-10 w-14 rounded-full" />
        </div>
      </div>
      <section className="space-y-3">
        <Skeleton className="h-6 w-24" />
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
      <div className="space-y-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-32" />
      </div>
      <TicketsList count={3} />
    </SkeletonShell>
  )
}

export function TicketDetailSkeleton() {
  return (
    <SkeletonShell>
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-8 w-2/3" />
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          {/* Real code: font-mono text-sm leading-snug (20px line). */}
          <Skeleton className="h-5 w-32" />
          <span className="flex shrink-0 items-center gap-1">
            {/* Real Badge is 22px tall; CopyButton with textLabel is size sm (h-10). */}
            <Skeleton className="h-[22px] w-16" />
            <Skeleton className="h-10 w-11" />
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="min-h-11 space-y-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
          {/* Same fixed slot as the real QR box: h-[258px] (224px image +
              2x16px padding + 2px border). The old aspect-square + max-w-56
              math undershot on very narrow viewports. */}
          <div className="h-[258px]">
            <div className="flex h-full justify-center rounded-none border bg-white p-4">
              <Skeleton className="size-56" />
            </div>
          </div>
          <div className="rounded-none border border-transparent p-3">
            <Skeleton className="mx-auto h-9 w-40" />
            <Skeleton className="mx-auto h-10 w-48" />
          </div>
          <Skeleton className="mx-auto h-5 w-56" />
          <Skeleton className="mx-auto h-5 w-64" />
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </SkeletonShell>
  )
}

function ApiKeyRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2 rounded-none border p-3">
      <div className="min-w-0 space-y-0.5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
        {/* 5th line: the reserved Revoked slot (6th with expiry). */}
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Real right column is w-72: Badge + Rotate + Revoke buttons. */}
      <div className="flex w-72 shrink-0 items-center justify-between gap-2">
        <Skeleton className="h-[22px] w-[4.75rem] shrink-0" />
        <Skeleton className="h-10 w-[5.5rem] shrink-0" />
        <Skeleton className="h-10 w-[5.5rem] shrink-0" />
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
      {/* Collapsed by default: header + one-line summary only. */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-10 w-36 shrink-0" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-5 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-11 w-full" />
            </div>
            <div className="w-44 shrink-0 space-y-2">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-11 w-full" />
            </div>
            <Skeleton className="h-11 w-28 shrink-0" />
          </div>
          {/* Reserved error slot (min-h-5) below the form. */}
          <Skeleton className="h-5 w-2/3" />
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
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-32" />
      <section className="space-y-4">
        <Skeleton className="h-7 w-20" />
        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-[5.5rem]" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-20 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="space-y-4">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-5 w-2/3" />
        <ApiKeysManagerSkeleton />
      </section>
    </div>
  )
}

function TraceRowSkeleton() {
  return (
    <article className="rounded-none border bg-muted/50 p-2">
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
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
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
      {/* Real Label is text-sm leading-none (14px); real hint is text-xs (16px). */}
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-11 w-full" />
      {hint && <Skeleton className="h-4 w-40" />}
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
      <Skeleton className="h-[114px] w-full sm:h-[66px]" />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-4 w-32" />
            {/* Real Badge is 22px tall. */}
            <Skeleton className="h-[22px] w-32" />
            <Skeleton className="h-[22px] w-12" />
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-10 w-16" />
              {/* Real Pause/Resume button is w-[9.5rem] (size sm, h-10). */}
              <Skeleton className="h-10 w-[9.5rem]" />
            </div>
          </div>
          {/* Real CardDescription reserves min-h-10 (40px). */}
          <Skeleton className="h-10 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 min-w-40 flex-1" />
            <Skeleton className="h-11 w-44" />
          </div>
          <Skeleton className="h-[114px] w-full sm:h-[66px]" />
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
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-4 w-32" />
              {/* "Check current state" button (size sm, h-10). */}
              <Skeleton className="ml-auto h-10 w-36 shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Note box: text-xs (16px) + p-3 (24px) = 40px. */}
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-11 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-11 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-11 w-full" />
              {/* Hint reserves min-h-16 (64px). */}
              <Skeleton className="h-16 w-full" />
            </div>
            {/* Error slot reserves min-h-4 (16px). */}
            <Skeleton className="h-4 w-32" />
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
              {/* Reset has two password fields (new + confirm). */}
              {variant === 'reset' && <FormFieldSkeleton hint />}
              {variant === 'login' && (
                <>
                  <Skeleton className="h-3 w-20 ml-auto" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </>
              )}
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-11 w-full" />
              {variant === 'register' && <Skeleton className="h-9 w-40 mx-auto" />}
              {variant === 'forgot' && <Skeleton className="h-4 w-32 mx-auto" />}
              {variant === 'reset' && <Skeleton className="h-5 w-40 mx-auto" />}
            </div>
          </CardContent>
        </Card>
      </SkeletonShell>
    </div>
  )
}
