import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { requireCustomer } from '@/features/auth/route-guard'
import { type Order, type OrderStatus, useOrders } from '@/features/orders/queries'
import { ORDER_STATUS_VARIANT, STATUS_LABEL } from '@/lib/status'
import { formatCurrency, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/orders/')({
  beforeLoad: ({ location }) => {
    requireCustomer(location.href)
  },
  component: OrdersPage,
})

function OrderCard({ order, index }: { order: Order; index: number }) {
  return (
    <Link
      to="/orders/$orderId"
      params={{ orderId: order.id }}
      className="animate-fade-up block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ animationDelay: `${Math.min(index % 12, 8) * 45}ms` }}
    >
      <Card className="transition-[transform,border-color] duration-150 ease-out hover:border-ring active:scale-[0.98]">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="min-w-0 flex-1 truncate">Order #{order.id.slice(-8)}</CardTitle>
            <Badge variant={ORDER_STATUS_VARIANT[order.status] ?? 'secondary'} className="shrink-0">
              {STATUS_LABEL[order.status] ?? order.status}
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
            <SelectItem value="PENDING_PAYMENT">Pending</SelectItem>
            <SelectItem value="PAYMENT_QUEUED">Queued</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="PAYMENT_FAILED">Failed</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isPending ? (
        <ListSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.data.length === 0 ? (
        status !== '' ? (
          <EmptyState
            title="No orders with this status."
            description="Try a different filter."
            hideIcon
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
              <Link to="/events" className="text-sm underline underline-offset-4">
                Browse events
              </Link>
            }
          />
        )
      ) : (
        <div className="grid gap-3">
          {query.data.data.map((order, i) => (
            <OrderCard key={order.id} order={order} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
