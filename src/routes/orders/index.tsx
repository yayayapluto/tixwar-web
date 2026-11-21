import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { OrdersGridSkeleton, OrdersPageSkeleton } from '@/components/skeletons'
import { EmptyState, ErrorState } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { requireCustomer } from '@/features/auth/route-guard'
import { useEvent } from '@/features/events/queries'
import { type Order, type OrderStatus, useOrders } from '@/features/orders/queries'
import { getV1EventsById, getV1OrdersById } from '@/lib/client'
import { ORDER_STATUS_VARIANT, STATUS_LABEL } from '@/lib/status'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'
import { formatCurrency, formatDate } from '@/lib/utils'

type OrdersSearch = {
  status?: string
}

export const Route = createFileRoute('/orders/')({
  beforeLoad: ({ location }) => {
    requireCustomer(location.href)
  },
  // The status filter lives in the URL so back and refresh restore the
  // list instead of resetting it to All (same pattern as /events).
  validateSearch: (search: Record<string, unknown>): OrdersSearch => ({
    status: typeof search.status === 'string' ? search.status : '',
  }),
  component: OrdersPage,
  pendingComponent: OrdersPageSkeleton,
})

function OrderCard({ order }: { order: Order }) {
  const queryClient = useQueryClient()
  // Same per-order event fetch as the order detail page: the list endpoint
  // carries only eventId, so the name/tier/date come from the cached event.
  const eventQuery = useEvent(order.eventId)
  const secondsLeft = useCountdown(order.status === 'PENDING_PAYMENT' ? order.expiresAt : undefined)
  const event = eventQuery.data?.data
  const tier = event?.tiers?.find((t) => t.id === order.tierId)

  // The countdown runs locally; when it hits zero the cached badge is stale
  // (the order has expired server-side), so refetch the list once. No new
  // realtime mechanism — just the existing query invalidation.
  const expired = order.status === 'PENDING_PAYMENT' && secondsLeft === 0
  useEffect(() => {
    if (expired) {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }
  }, [expired, queryClient])

  const payAction = order.status === 'PENDING_PAYMENT' || order.status === 'PAYMENT_FAILED'

  // Hover preload: the detail page reads ['order', id] (useOrder) plus the
  // event name/tier from ['event', eventId] (useEvent). Same keys and
  // options, so the detail renders from cache on open.
  const prefetchDetail = () => {
    void queryClient.prefetchQuery({
      queryKey: ['order', order.id],
      queryFn: async () =>
        (await getV1OrdersById({ path: { id: order.id }, throwOnError: true })).data,
    })
    void queryClient.prefetchQuery({
      queryKey: ['event', order.eventId],
      queryFn: async () =>
        (
          await getV1EventsById({
            path: { id: order.eventId },
            query: { include: 'tiers' },
            throwOnError: true,
          })
        ).data,
    })
  }
  const prefetchEvent = () => {
    void queryClient.prefetchQuery({
      queryKey: ['event', order.eventId],
      queryFn: async () =>
        (
          await getV1EventsById({
            path: { id: order.eventId },
            query: { include: 'tiers' },
            throwOnError: true,
          })
        ).data,
    })
  }

  return (
    <Card className="transition-[border-color] duration-150 ease-out hover:border-ring">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate leading-snug">
            <Link
              to="/orders/$orderId"
              params={{ orderId: order.id }}
              preload="intent"
              onMouseEnter={prefetchDetail}
              onFocus={prefetchDetail}
              className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {event?.name ?? `Order #${order.id.slice(-8)}`}
            </Link>
          </CardTitle>
          <Badge variant={ORDER_STATUS_VARIANT[order.status] ?? 'secondary'} className="shrink-0">
            {STATUS_LABEL[order.status] ?? order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        {/* Tier + date lines are always rendered (blank while the event is
            still loading) so the card never grows when useEvent resolves:
            without the reserve, two lines pop in and every card below shifts. */}
        <p className="truncate">{tier?.name ?? ' '}</p>
        <p className="truncate">{event ? formatDate(event.startsAt) : ' '}</p>
        <p className="truncate tabular-nums">
          {order.quantity}× {formatCurrency(order.unitPrice)} = {formatCurrency(order.total)}
        </p>
        <p className="truncate">
          Order #{order.id.slice(-8)} · Created {formatDate(order.createdAt)}
        </p>
        {/* Countdown slot is always rendered at one fixed line height: the
            ticking digits (tabular-nums) and the "Expired" swap at 0 change
            text only, never the card height — and when the refetch flips the
            status to EXPIRED the slot stays as a blank line instead of
            collapsing. */}
        {/* The ticking line is role="timer" with no aria-live: a polite
            live region here would announce every second on every pending
            card at once. Announcements happen only at thresholds, via the
            visually hidden status line below — its text changes only when
            the order crosses 60s or expires, so a screen reader hears at
            most two announcements per card. */}
        <p
          role="timer"
          className={
            order.status === 'PENDING_PAYMENT' && secondsLeft !== null && secondsLeft < 60
              ? 'min-h-5 font-medium tabular-nums text-destructive'
              : 'min-h-5 font-medium tabular-nums'
          }
        >
          {order.status === 'PENDING_PAYMENT' && secondsLeft !== null
            ? secondsLeft === 0
              ? 'Expired'
              : `Expires in ${formatCountdown(secondsLeft)}`
            : ' '}
        </p>
        <p role="status" className="sr-only">
          {order.status === 'PENDING_PAYMENT' && secondsLeft !== null
            ? secondsLeft === 0
              ? 'This order has expired.'
              : secondsLeft <= 60
                ? 'Less than a minute left to pay.'
                : ''
            : ''}
        </p>
      </CardContent>
      {/* Footer slot is always rendered: a pay button for payable orders, a
          "Buy again" action for expired or cancelled orders, an empty h-11
          reserve otherwise. Every card keeps the same height, so a card
          flipping PENDING_PAYMENT -> EXPIRED (pay button swaps for the
          buy-again button) cannot shift the cards below it. */}
      <CardFooter>
        {payAction ? (
          <Link
            to="/orders/$orderId"
            params={{ orderId: order.id }}
            preload="intent"
            onMouseEnter={prefetchDetail}
            onFocus={prefetchDetail}
            className={buttonVariants({ className: 'w-full' })}
          >
            {order.status === 'PAYMENT_FAILED'
              ? `Continue to retry payment · ${formatCurrency(order.total)}`
              : `Continue to pay · ${formatCurrency(order.total)}`}
          </Link>
        ) : order.status === 'EXPIRED' || order.status === 'CANCELLED' ? (
          <Link
            to="/events/$eventId"
            params={{ eventId: order.eventId }}
            preload="intent"
            onMouseEnter={prefetchEvent}
            onFocus={prefetchEvent}
            className={buttonVariants({ variant: 'outline', className: 'w-full' })}
          >
            Buy again
          </Link>
        ) : (
          <div aria-hidden="true" className="h-11 w-full" />
        )}
      </CardFooter>
    </Card>
  )
}

function OrdersPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const status = search.status ?? ''
  const query = useOrders(status ? (status as OrderStatus) : undefined)

  // Filter changes replace the current history entry so they do not spam
  // the back stack; the URL still carries the filter, so back from detail
  // and refresh restore it.
  const updateStatus = (value: string) => {
    navigate({ to: '/orders', search: (prev) => ({ ...prev, status: value }), replace: true })
  }

  // Pending orders that expire soonest first, so the order most at risk is
  // the one the user sees first; everything else keeps the API order.
  const orders = query.data
    ? [...query.data.data].sort((a, b) => {
        const aPending = a.status === 'PENDING_PAYMENT'
        const bPending = b.status === 'PENDING_PAYMENT'
        if (aPending && bPending) return a.expiresAt.localeCompare(b.expiresAt)
        if (aPending) return -1
        if (bPending) return 1
        return 0
      })
    : []
  // The pending-first sort is surfaced by the "Needs payment" badge in
  // the header, not by a section heading above the grid: a heading block
  // is 60px tall (24px title + 4px gap + 20px description + 12px gap),
  // and it only appears once the data arrives, so the grid drops 60px
  // below where the skeleton grid was. That space cannot be reserved —
  // the skeleton cannot know whether pending orders exist — without
  // either this same shift or a permanent 60px gap on pages with no
  // pending orders. The badge fits inside the existing header row, so
  // it appears without moving the title, the filter, or the grid.
  // The rest only get a heading when there is a split to explain,
  // otherwise the list stays as it was.
  const atRisk = orders.filter((o) => o.status === 'PENDING_PAYMENT')
  const rest = orders.filter((o) => o.status !== 'PENDING_PAYMENT')
  const split = atRisk.length > 0 && rest.length > 0
  const restGrid = (
    <div className="grid gap-3">
      {rest.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold">My orders</h1>
          {atRisk.length > 0 && (
            <Badge variant="warning" className="shrink-0">
              Needs payment · {atRisk.length}
            </Badge>
          )}
        </div>
        <Select
          value={status === '' ? 'all' : status}
          onValueChange={(v) => updateStatus(v === 'all' ? '' : v)}
        >
          <SelectTrigger aria-label="Filter by status" className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING_PAYMENT">{STATUS_LABEL.PENDING_PAYMENT}</SelectItem>
            <SelectItem value="PAYMENT_QUEUED">{STATUS_LABEL.PAYMENT_QUEUED}</SelectItem>
            <SelectItem value="PAID">{STATUS_LABEL.PAID}</SelectItem>
            <SelectItem value="CONFIRMED">{STATUS_LABEL.CONFIRMED}</SelectItem>
            <SelectItem value="PAYMENT_FAILED">{STATUS_LABEL.PAYMENT_FAILED}</SelectItem>
            <SelectItem value="EXPIRED">{STATUS_LABEL.EXPIRED}</SelectItem>
            <SelectItem value="CANCELLED">{STATUS_LABEL.CANCELLED}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">
        Your orders, newest first. Pay unpaid ones before the countdown runs out.
      </p>

      {query.isPending ? (
        <OrdersGridSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : orders.length === 0 ? (
        status !== '' ? (
          <EmptyState
            title="No orders with this status."
            description="Try a different filter."
            action={
              <Button variant="outline" size="sm" onClick={() => updateStatus('')}>
                Clear filter
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No orders yet"
            description="Buy a ticket to see your orders here."
            action={
              <Link
                to="/events"
                search={{ q: '', status: '', category: '', page: 1, sort: 'ending' }}
                className="text-sm underline underline-offset-4"
              >
                Browse events
              </Link>
            }
          />
        )
      ) : (
        <div className="space-y-4">
          {atRisk.length > 0 && (
            <div className="grid gap-3">
              {atRisk.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
          {rest.length > 0 &&
            (split ? (
              <section aria-labelledby="other-orders-heading" className="space-y-3">
                <h2 id="other-orders-heading" className="text-base font-semibold">
                  Other orders
                </h2>
                {restGrid}
              </section>
            ) : (
              restGrid
            ))}
        </div>
      )}
    </div>
  )
}
