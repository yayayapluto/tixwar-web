import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Activity, ChevronLeft, Timer } from 'lucide-react'
import { useId, useState } from 'react'
import { CopyButton } from '@/components/copy-button'
import { EventDetailSkeleton } from '@/components/skeletons'
import { EmptyState, ErrorState } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useSession } from '@/features/auth/use-auth'
import { LoadGeneratorForm } from '@/features/debug/load-generator-form'
import type { TicketTier } from '@/features/events/queries'
import { useEvent, useEventStats } from '@/features/events/queries'
import { useCreateOrder } from '@/features/orders/queries'
import { useStockStream } from '@/features/realtime/use-stock-stream'
import { useDocumentTitle } from '@/lib/document-title'
import { toApiError } from '@/lib/errors'
import { EVENT_STATUS_VARIANT, STATUS_LABEL } from '@/lib/status'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/events/$eventId')({
  component: EventDetailPage,
  pendingComponent: EventDetailSkeleton,
})

// Display-only title case for raw API values ("music" -> "Music");
// the raw value is still what gets sent to the API.
function titleCase(value: string) {
  return value
    .split(' ')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

function orderErrorMessage(raw: unknown): string {
  const error = toApiError(raw)
  switch (error.code) {
    case 'SOLD_OUT':
      return 'This tier just sold out — try another tier.'
    case 'LIMIT_EXCEEDED':
      return "You've reached the purchase limit for this tier."
    case 'RATE_LIMITED':
      return error.retryAfterSeconds
        ? `Too many requests — try again in ${error.retryAfterSeconds}s.`
        : 'Too many requests — wait a moment and try again.'
    case 'SALE_ENDED':
      return 'The sale for this tier has ended.'
    case 'SALE_NOT_STARTED':
      return "The sale for this tier hasn't started yet."
    default:
      return error.detail || error.title || 'Something went wrong — try again.'
  }
}

function TierCard({
  tier,
  eventId,
  cheapest,
  showSaleWindow,
  onLoadTest,
}: {
  tier: TicketTier
  eventId: string
  cheapest?: boolean
  showSaleWindow?: boolean
  onLoadTest?: (tierId: string) => void
}) {
  const session = useSession()
  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const [quantity, setQuantity] = useState(1)
  const [orderError, setOrderError] = useState<string | null>(null)
  const quantityLabelId = useId()
  const saleSecondsLeft = useCountdown(showSaleWindow ? tier.saleEndsAt : undefined)

  const saleStart = new Date(tier.saleStartsAt).getTime()
  const saleEnd = new Date(tier.saleEndsAt).getTime()
  const now = Date.now()
  const saleOpen = now >= saleStart && now <= saleEnd

  // remaining is server-computed (max(0, quota - sold)); it is only absent
  // on an older API response — then fall back to total quota, never a guess.
  const remaining = typeof tier.remaining === 'number' ? tier.remaining : null
  const soldOut = remaining !== null && remaining <= 0
  const lowStock = remaining !== null && remaining > 0 && remaining <= 10

  return (
    <Card className={cn('flex h-full flex-col', cheapest && 'border-primary ring-1 ring-primary')}>
      <CardHeader className={cn(cheapest && 'rounded-t-xl bg-primary/5')}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate leading-snug">{tier.name}</CardTitle>
          <span className="flex shrink-0 items-center gap-2">
            {cheapest && <Badge>Cheapest</Badge>}
            <span className="text-2xl font-bold tabular-nums">{formatCurrency(tier.price)}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-3">
        {remaining === null ? (
          <p className="min-h-5 text-sm tabular-nums text-muted-foreground">
            Total quota {tier.quota} · max {tier.maxPerUser} per user
          </p>
        ) : soldOut ? (
          <p className="min-h-5 text-sm font-medium tabular-nums text-destructive">Sold out</p>
        ) : (
          <p
            className={cn(
              'min-h-5 text-sm tabular-nums',
              lowStock ? 'font-medium text-destructive' : 'text-muted-foreground',
            )}
          >
            {lowStock ? `Only ${remaining} left` : `${remaining} left`} · max {tier.maxPerUser} per
            user
          </p>
        )}
        {session?.user.role === 'admin' && (
          <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
            <span className="text-muted-foreground">Tier ID</span>
            <span className="flex shrink-0 items-center gap-1">
              <code className="font-mono">{tier.id}</code>
              <CopyButton value={tier.id} label="Tier ID" />
            </span>
          </div>
        )}
        {showSaleWindow &&
          (saleOpen && saleSecondsLeft !== null ? (
            <p
              className={cn(
                'flex min-h-10 items-center gap-2 rounded-md border bg-muted/50 px-3 text-base font-semibold tabular-nums',
                saleSecondsLeft < 3600 && 'text-destructive',
              )}
            >
              <Timer className="size-4 shrink-0" aria-hidden="true" />
              Sale ends in&nbsp;
              <span className="inline-block min-w-[8ch] tabular-nums">
                {formatCountdown(saleSecondsLeft)}
              </span>
            </p>
          ) : (
            <p className="flex min-h-10 items-center gap-2 rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
              <Timer className="size-4 shrink-0" aria-hidden="true" />
              Sale: {formatDate(tier.saleStartsAt)} – {formatDate(tier.saleEndsAt)}
            </p>
          ))}
        {!session ? (
          soldOut ? (
            <Button className="mt-auto w-full" disabled>
              Sold out
            </Button>
          ) : (
            <Link
              to="/login"
              search={{ redirect: `/events/${eventId}` }}
              className={cn(buttonVariants({ variant: 'outline' }), 'mt-auto w-full')}
            >
              Log in to buy
            </Link>
          )
        ) : session.user.role === 'admin' ? (
          <>
            <p className="text-sm text-muted-foreground">
              Admins are view-only. Buying is disabled for admin accounts.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-auto w-full"
              onClick={() => onLoadTest?.(tier.id)}
            >
              <Activity className="size-4" aria-hidden="true" />
              Load test this tier
            </Button>
          </>
        ) : (
          <div className="mt-auto space-y-2">
            <div className="flex gap-2">
              <span id={quantityLabelId} className="sr-only">
                Quantity
              </span>
              <Select
                value={String(quantity)}
                disabled={soldOut}
                onValueChange={(v) => {
                  setQuantity(Number(v))
                  setOrderError(null)
                }}
              >
                <SelectTrigger aria-labelledby={quantityLabelId} className="w-24 shrink-0">
                  <SelectValue placeholder="Qty" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.min(tier.maxPerUser, 10) }, (_, i) => i + 1).map(
                    (n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Button
                className="min-w-0 flex-1"
                disabled={!saleOpen || soldOut || createOrder.isPending}
                onClick={() => {
                  setOrderError(null)
                  createOrder.mutate(
                    { tierId: tier.id, quantity },
                    {
                      onSuccess: (order) =>
                        navigate({ to: '/orders/$orderId', params: { orderId: order.id } }),
                      onError: (error) => setOrderError(orderErrorMessage(error)),
                    },
                  )
                }}
              >
                <span className="truncate">
                  {createOrder.isPending
                    ? 'Reserving…'
                    : soldOut
                      ? 'Sold out'
                      : saleOpen
                        ? `Buy ${quantity} × ${formatCurrency(tier.price)}`
                        : 'Not on sale'}
                </span>
              </Button>
            </div>
            <p className="min-h-5 text-sm tabular-nums text-muted-foreground">
              Total {formatCurrency(tier.price * quantity)}
            </p>
            <p role={orderError ? 'alert' : undefined} className="min-h-5 text-sm text-destructive">
              {orderError ?? ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EventDetailPage() {
  const { eventId } = Route.useParams()
  const session = useSession()
  const navigate = useNavigate()
  const event = useEvent(eventId, true, true)
  const stats = useEventStats(eventId)
  useStockStream(eventId, true)
  useDocumentTitle(event.data?.data.name ?? 'Event')
  const [loadDrawer, setLoadDrawer] = useState<{ open: boolean; tierId?: string }>({
    open: false,
  })
  const isAdmin = session?.user.role === 'admin'

  // Hooks must run before the early returns below, so the sale window is
  // derived from the (possibly still empty) query data here.
  // Cheapest first: the focal point is the cheapest tier.
  const sortedTiers = [...(event.data?.data.tiers ?? [])].sort((a, b) => a.price - b.price)
  const cheapestTierId = sortedTiers[0]?.id
  // One sale window shared by every tier -> one page-level countdown.
  // Per-tier countdowns render only when tiers have different windows.
  const sharedSaleWindow =
    sortedTiers.length > 0 &&
    sortedTiers.every(
      (tier) =>
        tier.saleStartsAt === sortedTiers[0].saleStartsAt &&
        tier.saleEndsAt === sortedTiers[0].saleEndsAt,
    )
  const saleWindow = sharedSaleWindow ? sortedTiers[0] : undefined
  const saleSecondsLeft = useCountdown(saleWindow?.saleEndsAt)

  if (event.isPending) return <EventDetailSkeleton />
  if (event.isError) return <ErrorState error={event.error} onRetry={() => event.refetch()} />

  const detail = event.data.data
  const saleStart = saleWindow ? new Date(saleWindow.saleStartsAt).getTime() : 0
  const saleEnd = saleWindow ? new Date(saleWindow.saleEndsAt).getTime() : 0
  const now = Date.now()
  const saleOpen = Boolean(saleWindow) && now >= saleStart && now <= saleEnd

  // Back keeps the list filters: the list links here without search params,
  // so there is nothing to preserve — history back returns to the filtered
  // list. A deep link (no prior entry) falls back to the unfiltered list.
  const goBackToEvents = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      navigate({
        to: '/events',
        search: { q: '', status: '', category: '', page: 1, sort: 'ending' },
      })
    }
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={goBackToEvents}
        className="-ml-2 h-auto px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to events
      </Button>
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="min-w-0 flex-1 text-2xl font-semibold break-words">{detail.name}</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setLoadDrawer({ open: true })}>
                <Activity className="size-4" aria-hidden="true" />
                Load test
              </Button>
            )}
            <Badge variant={EVENT_STATUS_VARIANT[detail.status] ?? 'secondary'}>
              {STATUS_LABEL[detail.status] ?? detail.status}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {titleCase(detail.category)} · {titleCase(detail.city)} · {detail.venue}
        </p>
        <p className="text-sm text-muted-foreground">{formatDate(detail.startsAt)}</p>
        {detail.description && <p className="text-sm">{detail.description}</p>}
        {saleWindow &&
          (saleOpen && saleSecondsLeft !== null ? (
            <p
              className={cn(
                'flex min-h-10 items-center gap-2 rounded-md border bg-muted/50 px-3 text-base font-semibold tabular-nums',
                saleSecondsLeft < 3600 && 'text-destructive',
              )}
            >
              <Timer className="size-4 shrink-0" aria-hidden="true" />
              Sale ends in&nbsp;
              <span className="inline-block min-w-[8ch] tabular-nums">
                {formatCountdown(saleSecondsLeft)}
              </span>
            </p>
          ) : (
            <p className="flex min-h-10 items-center gap-2 rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
              <Timer className="size-4 shrink-0" aria-hidden="true" />
              Sale: {formatDate(saleWindow.saleStartsAt)} – {formatDate(saleWindow.saleEndsAt)}
            </p>
          ))}
        {session?.user.role === 'admin' && (
          <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
            <span className="text-muted-foreground">Event ID</span>
            <span className="flex shrink-0 items-center gap-1">
              <code className="font-mono">{detail.id}</code>
              <CopyButton value={detail.id} label="Event ID" />
            </span>
          </div>
        )}
      </div>

      {isAdmin && (
        <p className="min-h-5 text-sm tabular-nums text-muted-foreground">
          {stats.data
            ? `${stats.data.data.sold} sold · ${formatCurrency(stats.data.data.revenue)} revenue`
            : ''}
        </p>
      )}

      <h2 className="text-lg font-semibold">Tickets</h2>
      {!isAdmin && (
        <p className="text-sm text-muted-foreground">
          After you buy, you&apos;ll go to your order to complete payment before its countdown runs
          out. Once paid, your tickets are on the Tickets page.
        </p>
      )}
      {sortedTiers.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {sortedTiers.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              eventId={eventId}
              cheapest={tier.id === cheapestTierId}
              showSaleWindow={!sharedSaleWindow}
              onLoadTest={(tierId) => setLoadDrawer({ open: true, tierId })}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No ticket tiers yet" />
      )}

      {isAdmin && (
        <Sheet
          open={loadDrawer.open}
          onOpenChange={(open) => setLoadDrawer((d) => ({ ...d, open }))}
        >
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Load generator</SheetTitle>
              <SheetDescription>Run a load test against {detail.name}.</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-4 pb-4">
              <LoadGeneratorForm
                key={loadDrawer.tierId ?? 'all'}
                initialEventId={detail.id}
                initialTierId={loadDrawer.tierId}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
