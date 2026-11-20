import { createFileRoute, Link } from '@tanstack/react-router'
import { CopyButton } from '@/components/copy-button'
import { ErrorState, ListSkeleton } from '@/components/status'
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
import { usePayOrder } from '@/features/payments/queries'
import { useOrderStream } from '@/features/realtime/use-order-stream'
import { ORDER_STATUS_VARIANT, STATUS_LABEL } from '@/lib/status'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: ({ location }) => {
    requireCustomer(location.href)
  },
  component: OrderDetailPage,
})

function OrderDetailPage() {
  const { orderId } = Route.useParams()
  const query = useOrder(orderId)
  const pay = usePayOrder()
  const cancel = useCancelOrder()
  useOrderStream(orderId, true)
  const eventQuery = useEvent(query.data?.data.order.eventId ?? '', false)

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
        <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold">
          {eventQuery.data?.data.name ?? 'Order'}
        </h1>
        <Badge
          key={order.status}
          variant={ORDER_STATUS_VARIANT[order.status] ?? 'secondary'}
          className="shrink-0 animate-in duration-200 ease-out fade-in zoom-in-95"
        >
          {STATUS_LABEL[order.status] ?? order.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <span className="min-w-0 flex-1 truncate">{order.id}</span>
            <CopyButton value={order.id} label="Order ID" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {order.quantity}× {formatCurrency(order.unitPrice)} ={' '}
            <span className="font-medium text-foreground">{formatCurrency(order.total)}</span>
          </p>
          <p className="text-muted-foreground">
            Event:{' '}
            {eventQuery.data ? (
              <Link
                to="/events/$eventId"
                params={{ eventId: order.eventId }}
                className="underline underline-offset-4"
              >
                {eventQuery.data.data.name}
              </Link>
            ) : (
              order.eventId
            )}
          </p>
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
              Payment queued. Status updates automatically.
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
                ? `Retry payment · ${formatCurrency(order.total)}`
                : `Pay ${formatCurrency(order.total)}`}
          </Button>
        )}
        {cancelAction && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={cancel.isPending}>
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
        {order.status === 'CONFIRMED' && (
          <Link to="/tickets" className={buttonVariants()}>
            View tickets
          </Link>
        )}
      </div>
    </div>
  )
}
