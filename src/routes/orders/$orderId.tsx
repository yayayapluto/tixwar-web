import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { CopyButton } from '@/components/copy-button'
import { OrderDetailSkeleton } from '@/components/skeletons'
import { ErrorState } from '@/components/status'
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
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireCustomer } from '@/features/auth/route-guard'
import { useEvent } from '@/features/events/queries'
import { useCancelOrder, useOrder } from '@/features/orders/queries'
import { useOrderStream } from '@/features/realtime/use-order-stream'
import { postV1OrdersByIdPay } from '@/lib/client'
import { ORDER_STATUS_VARIANT, STATUS_LABEL } from '@/lib/status'
import { toast } from '@/lib/toast'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'
import { formatCurrency, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: ({ location }) => {
    requireCustomer(location.href)
  },
  component: OrderDetailPage,
  pendingComponent: OrderDetailSkeleton,
})

function OrderDetailPage() {
  const { orderId } = Route.useParams()
  const query = useOrder(orderId)
  const queryClient = useQueryClient()
  const cancel = useCancelOrder()
  useOrderStream(orderId, true)
  const eventQuery = useEvent(query.data?.data.order.eventId ?? '')

  const secondsLeft = useCountdown(query.data?.data.order.expiresAt)
  const order = query.data?.data.order

  // The pay mutation lives here instead of usePayOrder so the idempotency key
  // can be stable per payment attempt. The key is derived from the order id
  // and the attempt counter the API already tracks: a repeated click (or a
  // second tab) while the attempt is in flight reuses the same key, so the
  // API replays the stored 202 / answers 409 in-progress instead of creating
  // a second payment. A plain per-order key would break genuine retries: the
  // API completes the idempotency record when pay returns 202, so after a
  // later PAYMENT_FAILED the same key would replay the old 202 and no new
  // payment would ever start. Because paymentAttempts increments with every
  // real attempt, the retry after a failure gets a fresh key.
  const pay = useMutation({
    mutationFn: async ({ id, key }: { id: string; key: string }) => {
      const res = await postV1OrdersByIdPay({
        path: { id },
        body: {},
        headers: { 'Idempotency-Key': key },
        throwOnError: true,
      })
      return res.data.data
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast('Payment started', { variant: 'success' })
    },
  })

  if (query.isPending) return <OrderDetailSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (!order) return <ErrorState error={new Error('Order not found')} />

  const payable = order.status === 'PENDING_PAYMENT' || order.status === 'PAYMENT_FAILED'
  const cancelable = order.status === 'PENDING_PAYMENT' || order.status === 'PAYMENT_QUEUED'
  const queued = pay.data?.status === 'QUEUED' || order.status === 'PAYMENT_QUEUED'
  // The clock, not just the SSE badge, decides expiry: if the stream drops,
  // the badge can still say "Waiting for payment" past the deadline.
  const locallyExpired = payable && secondsLeft === 0
  const expired = order.status === 'EXPIRED' || locallyExpired
  const countdownSeconds =
    secondsLeft !== null && secondsLeft > 0 && (payable || order.status === 'PAYMENT_QUEUED')
      ? secondsLeft
      : null
  const urgent = countdownSeconds !== null && countdownSeconds < 60
  const showCountdown = payable || order.status === 'PAYMENT_QUEUED'
  // Inside the countdown block the timer reads "Expired" once the clock hits
  // zero, instead of the whole block unmounting (see the block below).
  const timerExpired = showCountdown && countdownSeconds === null
  const payDisabled = pay.isPending || queued || secondsLeft === 0
  const payKey = `pay-${order.id}-attempt-${order.paymentAttempts}`

  const event = eventQuery.data?.data
  const tier = event?.tiers?.find((t) => t.id === order.tierId)

  return (
    <div className="space-y-4">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to orders
      </Link>

      <div className="flex items-start justify-between gap-2">
        <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold">{event?.name ?? 'Order'}</h1>
        <Badge variant={ORDER_STATUS_VARIANT[order.status] ?? 'secondary'} className="shrink-0">
          {STATUS_LABEL[order.status] ?? order.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {showCountdown && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Time left to pay</p>
              {/* The timer line never unmounts: at 0 it reads "Expired" in the
                  same text-3xl tabular-nums line, so the second -> "Expired"
                  transition and the <60s colour change move no element. */}
              <p
                role="timer"
                className={
                  urgent || timerExpired
                    ? 'text-3xl font-semibold tabular-nums whitespace-nowrap text-destructive'
                    : 'text-3xl font-semibold tabular-nums whitespace-nowrap'
                }
              >
                {countdownSeconds !== null ? formatCountdown(countdownSeconds) : 'Expired'}
              </p>
              {/* Warning line is always rendered (invisible when not urgent):
                  it wraps to two lines on narrow screens, and rendering the
                  same text in both states keeps its height identical, so
                  crossing the 60s threshold cannot push the summary down. */}
              <p
                aria-hidden={!urgent}
                className={
                  urgent ? 'font-medium text-destructive' : 'invisible font-medium text-destructive'
                }
              >
                Less than a minute left — pay now or the tickets are released.
              </p>
            </div>
          )}
          <div className="space-y-1">
            {/* Single line: truncate keeps the height fixed when the event
                name/tier swaps in after useEvent resolves. */}
            <p className="truncate font-medium">
              {tier ? `${tier.name} · ` : ''}
              {event ? (
                <Link
                  to="/events/$eventId"
                  params={{ eventId: order.eventId }}
                  className="underline underline-offset-4"
                >
                  {event.name}
                </Link>
              ) : (
                order.eventId
              )}
            </p>
            {/* Date line is always rendered (blank while the event loads) so
                the lines below never drop when useEvent resolves. */}
            <p className="truncate text-muted-foreground">
              {event ? `${formatDate(event.startsAt)} · ${event.venue}, ${event.city}` : ' '}
            </p>
            <p className="truncate text-muted-foreground tabular-nums">
              {order.quantity}× {formatCurrency(order.unitPrice)} ={' '}
              <span className="font-medium text-foreground">{formatCurrency(order.total)}</span>
            </p>
          </div>
          <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="min-w-0 flex-1 truncate">Order {order.id}</span>
            <CopyButton value={order.id} label="Order ID" />
          </p>
          {/* Queued line is always rendered (invisible until a payment is
              queued) so starting a payment cannot push the blocks below the
              card down. The same text in both states keeps its wrapped
              height identical. */}
          <p
            role="status"
            aria-hidden={!queued}
            className={
              queued
                ? 'flex items-center gap-2 text-muted-foreground'
                : 'invisible flex items-center gap-2 text-muted-foreground'
            }
          >
            <span
              className="size-2 shrink-0 animate-pulse rounded-full bg-primary"
              aria-hidden="true"
            />
            Payment processing… Status updates automatically.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {payable && !expired ? (
          <Button
            size="lg"
            className="w-full"
            onClick={() => pay.mutate({ id: order.id, key: payKey })}
            disabled={payDisabled}
          >
            {pay.isPending
              ? 'Paying…'
              : queued
                ? 'Payment processing…'
                : order.status === 'PAYMENT_FAILED'
                  ? `Retry payment · ${formatCurrency(order.total)}`
                  : `Pay ${formatCurrency(order.total)}`}
          </Button>
        ) : cancelable && !expired ? (
          // Reserve the Pay button's h-12 slot while PAYMENT_QUEUED so the
          // Cancel button below keeps its position when Pay unmounts.
          <div aria-hidden="true" className="h-12 w-full" />
        ) : null}
        {cancelable && !expired && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full" disabled={cancel.isPending || queued}>
                {cancel.isPending ? 'Cancelling…' : 'Cancel order'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cancels the order and releases the reservation. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep order</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: 'destructive' })}
                  onClick={() => cancel.mutate(order.id)}
                >
                  Cancel order
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Status blocks live below the buttons on purpose: in every state
          where one of them shows, both buttons are hidden, so a block
          appearing can never push a button down — and nothing below the
          blocks exists to shift. */}
      {expired && (
        <div role="status" className="space-y-2 rounded-lg border p-4">
          <p className="font-medium">This order expired</p>
          <p className="text-sm text-muted-foreground">
            The tickets were released. Book again while there&apos;s still stock.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/events/$eventId"
              params={{ eventId: order.eventId }}
              className={buttonVariants()}
            >
              Book again
            </Link>
            <Link
              to="/events"
              search={{ q: '', status: '', category: '', page: 1, sort: 'ending' }}
              className={buttonVariants({ variant: 'outline' })}
            >
              Browse events
            </Link>
          </div>
        </div>
      )}

      {order.status === 'CONFIRMED' && (
        <div className="space-y-2 rounded-lg border p-4">
          <p className="font-medium">You&apos;re going to {event?.name ?? 'the event'}!</p>
          <p className="text-sm text-muted-foreground">
            {order.quantity} × {tier?.name ?? 'ticket'}
            {event ? ` · ${formatDate(event.startsAt)} · ${event.venue}` : ''}. Show the QR code on
            your ticket at the door.
          </p>
          <Link to="/tickets" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
            View tickets
          </Link>
        </div>
      )}

      {order.status === 'PAID' && (
        <p role="status" className="text-sm text-muted-foreground">
          Payment received — your tickets are being prepared.
        </p>
      )}

      {order.status === 'CANCELLED' && (
        <p className="text-sm text-muted-foreground">
          This order was cancelled and the reservation released.
        </p>
      )}
    </div>
  )
}
