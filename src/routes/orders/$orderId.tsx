import { createFileRoute, Link } from '@tanstack/react-router'
import { ErrorState, ListSkeleton } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAuth } from '@/features/auth/route-guard'
import { useCancelOrder, useOrder } from '@/features/orders/queries'
import { usePayOrder } from '@/features/payments/queries'
import { useOrderStream } from '@/features/realtime/use-order-stream'
import { ORDER_STATUS_VARIANT } from '@/lib/status'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: ({ location }) => {
    requireAuth(location.href)
  },
  component: OrderDetailPage,
})

function OrderDetailPage() {
  const { orderId } = Route.useParams()
  const query = useOrder(orderId)
  const pay = usePayOrder()
  const cancel = useCancelOrder()
  useOrderStream(orderId, true)

  const secondsLeft = useCountdown(query.data?.data.order.expiresAt)
  const order = query.data?.data.order

  if (query.isPending) return <ListSkeleton rows={2} />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (!order) return <ErrorState error={new Error('Order not found')} />

  const payAction = order.status === 'PENDING_PAYMENT' || order.status === 'PAYMENT_FAILED'
  const cancelAction = order.status === 'PENDING_PAYMENT' || order.status === 'PAYMENT_QUEUED'
  const queued = pay.data?.status === 'QUEUED' || order.status === 'PAYMENT_QUEUED'

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-semibold">Order</h1>
        <Badge variant={ORDER_STATUS_VARIANT[order.status] ?? 'secondary'}>{order.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{order.id}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {order.quantity}× {formatCurrency(order.unitPrice)} ={' '}
            <span className="font-medium text-foreground">{formatCurrency(order.total)}</span>
          </p>
          <p className="text-muted-foreground">Event: {order.eventId}</p>
          <p className="text-muted-foreground">Attempts: {order.paymentAttempts}</p>
          {order.status === 'PENDING_PAYMENT' && secondsLeft !== null && (
            <p
              className={
                secondsLeft < 60 ? 'font-medium text-destructive' : 'text-muted-foreground'
              }
            >
              Expires in {formatCountdown(secondsLeft)}
            </p>
          )}
          {queued && (
            <p className="text-sm text-muted-foreground">
              Payment queued — status updates automatically.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {payAction && (
          <Button
            onClick={() => pay.mutate(order.id)}
            disabled={pay.isPending || secondsLeft === 0}
          >
            {pay.isPending
              ? 'Paying…'
              : order.status === 'PAYMENT_FAILED'
                ? 'Retry payment'
                : 'Pay'}
          </Button>
        )}
        {cancelAction && (
          <Button
            variant="outline"
            onClick={() => cancel.mutate(order.id)}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel order'}
          </Button>
        )}
        {order.status === 'CONFIRMED' && (
          <Link to="/tickets" className={buttonVariants()}>
            View tickets
          </Link>
        )}
      </div>
    </div>
  )
}
