import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { CopyButton } from '@/components/copy-button'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/status'
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
import { useSession } from '@/features/auth/use-auth'
import type { TicketTier } from '@/features/events/queries'
import { useEvent, useEventStats } from '@/features/events/queries'
import { useCreateOrder } from '@/features/orders/queries'
import { useStockStream } from '@/features/realtime/use-stock-stream'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/events/$eventId')({
  component: EventDetailPage,
})

function TierCard({ tier }: { tier: TicketTier }) {
  const session = useSession()
  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const [quantity, setQuantity] = useState(1)

  const saleStart = new Date(tier.saleStartsAt).getTime()
  const saleEnd = new Date(tier.saleEndsAt).getTime()
  const now = Date.now()
  const saleOpen = now >= saleStart && now <= saleEnd

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{tier.name}</CardTitle>
          <span className="text-lg font-semibold">{formatCurrency(tier.price)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {tier.quota} available · max {tier.maxPerUser} per user
        </p>
        {session?.user.role === 'admin' && (
          <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
            <span className="text-muted-foreground">Tier ID</span>
            <span className="flex items-center gap-1">
              <code className="font-mono">{tier.id}</code>
              <CopyButton value={tier.id} label="Tier ID" className="size-6" />
            </span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Sale: {formatDate(tier.saleStartsAt)} – {formatDate(tier.saleEndsAt)}
        </p>
        {!session ? (
          <Link to="/login" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
            Log in to buy
          </Link>
        ) : (
          <div className="flex gap-2">
            <Select value={String(quantity)} onValueChange={(v) => setQuantity(Number(v))}>
              <SelectTrigger aria-label="Quantity" className="w-24">
                <SelectValue placeholder="Qty" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: Math.min(tier.maxPerUser, 10) }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="flex-1"
              disabled={!saleOpen || createOrder.isPending}
              onClick={() =>
                createOrder.mutate(
                  { tierId: tier.id, quantity },
                  {
                    onSuccess: (order) =>
                      navigate({ to: '/orders/$orderId', params: { orderId: order.id } }),
                  },
                )
              }
            >
              {createOrder.isPending ? 'Reserving…' : saleOpen ? 'Buy' : 'Not on sale'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EventDetailPage() {
  const { eventId } = Route.useParams()
  const event = useEvent(eventId)
  const stats = useEventStats(eventId)
  useStockStream(eventId, true)

  if (event.isPending) return <ListSkeleton rows={2} />
  if (event.isError) return <ErrorState error={event.error} onRetry={() => event.refetch()} />

  const detail = event.data.data

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold">{detail.name}</h1>
          <Badge>{detail.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {detail.category} · {detail.city} · {detail.venue}
        </p>
        <p className="text-sm text-muted-foreground">{formatDate(detail.startsAt)}</p>
        {detail.description && <p className="text-sm">{detail.description}</p>}
      </div>

      {stats.data && (
        <p className="text-sm text-muted-foreground">
          {stats.data.data.sold} sold · {formatCurrency(stats.data.data.revenue)} revenue
        </p>
      )}

      <h2 className="text-lg font-semibold">Tickets</h2>
      {detail.tiers && detail.tiers.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {detail.tiers.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>
      ) : (
        <EmptyState title="No ticket tiers yet" />
      )}
    </div>
  )
}
