import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
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
import { ORDER_STATUS_VARIANT, STATUS_LABEL } from '@/lib/status'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'
import { formatCurrency, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/orders/')({
  beforeLoad: ({ location }) => {
    requireCustomer(location.href)
  },
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

  return (
    <Card className="transition-[border-color] duration-150 ease-out hover:border-ring">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate">
            <Link
              to="/orders/$orderId"
              params={{ orderId: order.id }}
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
        {tier && <p>{tier.name}</p>}
        {event && <p>{formatDate(event.startsAt)}</p>}
        <p>
          {order.quantity}× {formatCurrency(order.unitPrice)} = {formatCurrency(order.total)}
        </p>
        <p>
          Order #{order.id.slice(-8)} · Created {formatDate(order.createdAt)}
        </p>
        {order.status === 'PENDING_PAYMENT' && secondsLeft !== null && (
          <p
            aria-live="polite"
            className={
              secondsLeft < 60
                ? 'font-medium tabular-nums text-destructive'
                : 'font-medium tabular-nums'
            }
          >
            {secondsLeft === 0 ? 'Expired' : `Expires in ${formatCountdown(secondsLeft)}`}
          </p>
        )}
      </CardContent>
      {payAction && (
        <CardFooter>
          <Link
            to="/orders/$orderId"
            params={{ orderId: order.id }}
            className={buttonVariants({ className: 'w-full' })}
          >
            {order.status === 'PAYMENT_FAILED'
              ? `Retry payment · ${formatCurrency(order.total)}`
              : `Pay ${formatCurrency(order.total)}`}
          </Link>
        </CardFooter>
      )}
    </Card>
  )
}

function OrdersPage() {
  const [status, setStatus] = useState('')
  const query = useOrders(status ? (status as OrderStatus) : undefined)

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="min-w-0 text-2xl font-semibold">My orders</h1>
        <Select
          value={status === '' ? 'all' : status}
          onValueChange={(v) => setStatus(v === 'all' ? '' : v)}
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
              <Button variant="outline" size="sm" onClick={() => setStatus('')}>
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
        <div className="grid gap-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
