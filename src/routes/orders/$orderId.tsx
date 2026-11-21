import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
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
import { Card, CardContent } from '@/components/ui/card'
import { requireCustomer } from '@/features/auth/route-guard'
import { useEvent } from '@/features/events/queries'
import { useCancelOrder, useOrder } from '@/features/orders/queries'
import { useOrderStream } from '@/features/realtime/use-order-stream'
import { postV1OrdersByIdPay } from '@/lib/client'
import { useDocumentTitle } from '@/lib/document-title'
import { ApiError } from '@/lib/errors'
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
  const navigate = useNavigate()
  const query = useOrder(orderId)
  const queryClient = useQueryClient()
  const cancel = useCancelOrder()
  useOrderStream(orderId, true)
  const eventQuery = useEvent(query.data?.data.order.eventId ?? '')
  useDocumentTitle(eventQuery.data?.data.name ?? 'Order')

  const secondsLeft = useCountdown(query.data?.data.order.expiresAt)
  const order = query.data?.data.order
  // Set when a pay attempt fails without a user-facing signal: the global
  // MutationCache.onError only toasts 4xx, so a 5xx or a dropped connection
  // would otherwise leave the button silently re-enabled with no word on
  // whether the user was charged. Cleared when a new attempt starts.
  const [payError, setPayError] = useState(false)

  // The pay mutation lives here so the idempotency key
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
    onMutate: () => {
      setPayError(false)
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast('Payment started', { variant: 'success' })
    },
    onError: (error) => {
      // 4xx faults already get a toast from the global MutationCache.onError;
      // only 5xx and network failures (ApiError status 0) need the inline
      // message, so a user fault is never reported twice.
      if (!(error instanceof ApiError && error.status >= 400 && error.status < 500)) {
        setPayError(true)
      }
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
  // The badge follows the same clock the timer does: once the local clock
  // declares expiry it must read "Expired", not keep the amber
  // "Waiting for payment" while the timer already says "Expired".
  const displayStatus = expired ? 'EXPIRED' : order.status
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

  // Back keeps the list filter: the list links here without search params,
  // so there is nothing to preserve — history back returns to the filtered
  // list. A deep link (no prior entry) falls back to the unfiltered list.
  const goBackToOrders = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      navigate({ to: '/orders', search: { status: '' } })
    }
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={goBackToOrders}
        className="-ml-2 h-auto px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to orders
      </Button>

      <div className="flex items-start justify-between gap-2">
        <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold">{event?.name ?? 'Order'}</h1>
        <Badge variant={ORDER_STATUS_VARIANT[displayStatus] ?? 'secondary'} className="shrink-0">
          {STATUS_LABEL[displayStatus] ?? displayStatus}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Pay here before time runs out. Your ticket appears here once payment is confirmed.
      </p>

      <section aria-labelledby="payment-heading" className="space-y-4">
        <h2 id="payment-heading" className="text-lg font-semibold">
          Payment
        </h2>
        <p className="text-sm text-muted-foreground">Countdown and payment status.</p>
        <Card>
          <CardContent className="space-y-4 pt-6 text-sm">
            {order.status === 'PAID' ? (
              // PAID occupies the countdown slot with the same three-line shape
              // (label, large line, muted line) so the card keeps its height
              // when the countdown unmounts at the moment of success. The PAID
              // lines measure 16 + 32 + 20 + 8 = 76px (text-2xl = 32px) against
              // the countdown's 16 + 36 + 20 + 8 = 80px (text-3xl = 36px), so
              // min-h-[80px] closes the 4px gap on the QUEUED -> PAID flip.
              <div className="min-h-[80px] space-y-1">
                <p className="text-xs text-muted-foreground">Payment status</p>
                <p className="text-2xl font-semibold whitespace-nowrap">Payment received</p>
                <p className="text-sm text-muted-foreground">Paid {formatCurrency(order.total)}</p>
              </div>
            ) : (
              showCountdown && (
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
                      urgent
                        ? 'font-medium text-destructive'
                        : 'invisible font-medium text-destructive'
                    }
                  >
                    Less than a minute left — pay now or the tickets are released.
                  </p>
                </div>
              )
            )}
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
      </section>

      <section aria-labelledby="order-summary-heading" className="space-y-4">
        <h2 id="order-summary-heading" className="text-lg font-semibold">
          Order summary
        </h2>
        <p className="text-sm text-muted-foreground">Event, tier, and total.</p>
        <Card>
          <CardContent className="space-y-4 pt-6 text-sm">
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
          </CardContent>
        </Card>
      </section>

      <div className="space-y-2">
        {payable && !expired ? (
          <>
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
            {/* Error/hint slot keeps a fixed one-line height (text-sm = 20px)
                whether or not a message shows, so a failed payment cannot
                push the reassurance line down by 28px (20px line + 8px gap). */}
            <div className="min-h-5">
              {payError && (
                <p role="alert" className="text-sm text-destructive">
                  Payment didn&apos;t go through — you haven&apos;t been charged. Try again.
                </p>
              )}
              {order.status === 'PAYMENT_FAILED' && !payError && (
                <p className="text-sm text-muted-foreground">
                  Payment didn&apos;t go through. You haven&apos;t been charged.
                </p>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              One tap — retrying never charges you twice.
            </p>
          </>
        ) : order.status === 'PAID' ? (
          // PAID as a bordered status card in the CONFIRMED/expired pattern,
          // occupying the button slot: min-h-124px matches the QUEUED area
          // exactly (48 Pay slot + 8 gap + 16 reassurance line + 8 gap + 44
          // Cancel button), so the QUEUED -> PAID flip moves nothing.
          <div role="status" className="flex min-h-[124px] items-center rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Your tickets are being prepared — they&apos;ll appear under Tickets once confirmed.
            </p>
          </div>
        ) : cancelable && !expired ? (
          <>
            {/* Reserve the Pay button's h-12 slot while PAYMENT_QUEUED so the
                Cancel button below keeps its position when Pay unmounts. */}
            <div aria-hidden="true" className="h-12 w-full" />
            {/* Invisible twin of the reassurance line, so Cancel keeps its
                position across the payable -> QUEUED transition. */}
            <p aria-hidden="true" className="invisible text-center text-xs text-muted-foreground">
              One tap — retrying never charges you twice.
            </p>
          </>
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

      {order.status === 'CANCELLED' && (
        <p className="text-sm text-muted-foreground">
          This order was cancelled and the reservation released.
        </p>
      )}
    </div>
  )
}
