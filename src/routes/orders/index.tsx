import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { requireAuth } from '@/features/auth/route-guard'
import { type Order, type OrderStatus, useOrders } from '@/features/orders/queries'
import { ORDER_STATUS_VARIANT } from '@/lib/status'
import { formatCurrency, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/orders/')({
  beforeLoad: ({ location }) => {
    requireAuth(location.href)
  },
  component: OrdersPage,
})

function OrderCard({ order }: { order: Order }) {
  return (
    <Link to="/orders/$orderId" params={{ orderId: order.id }} className="block">
      <Card className="transition-colors hover:border-ring">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{order.id}</CardTitle>
            <Badge variant={ORDER_STATUS_VARIANT[order.status] ?? 'secondary'}>
              {order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            {order.quantity}× {formatCurrency(order.unitPrice)} = {formatCurrency(order.total)}
          </p>
          <p>Created {formatDate(order.createdAt)}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function OrdersPage() {
  const [status, setStatus] = useState('')
  const query = useOrders(status ? (status as OrderStatus) : undefined)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My orders</h1>
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-44"
        >
          <option value="">All statuses</option>
          <option value="PENDING_PAYMENT">Pending</option>
          <option value="PAYMENT_QUEUED">Queued</option>
          <option value="PAID">Paid</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PAYMENT_FAILED">Failed</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>

      {query.isPending ? (
        <ListSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Buy a ticket to see your orders here."
          action={
            <Link to="/events" className="text-sm underline underline-offset-4">
              Browse events
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3">
          {query.data.data.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
