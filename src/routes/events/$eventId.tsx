import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Activity } from 'lucide-react'
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
import { STATUS_LABEL } from '@/lib/status'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/events/$eventId')({
  component: EventDetailPage,
})

function TierCard({
  tier,
  cheapest,
  onLoadTest,
}: {
  tier: TicketTier
  cheapest?: boolean
  onLoadTest?: (tierId: string) => void
}) {
  const session = useSession()
  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const [quantity, setQuantity] = useState(1)
  const saleSecondsLeft = useCountdown(tier.saleEndsAt)

  const saleStart = new Date(tier.saleStartsAt).getTime()
  const saleEnd = new Date(tier.saleEndsAt).getTime()
  const now = Date.now()
  const saleOpen = now >= saleStart && now <= saleEnd
  const lowStock = tier.quota > 0 && tier.quota <= 10

  return (
    <Card className={cn(cheapest && 'border-primary')}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate">{tier.name}</CardTitle>
          <span className="flex shrink-0 items-center gap-2">
            {cheapest && <Badge>Cheapest</Badge>}
            <span className="text-2xl font-bold tabular-nums">{formatCurrency(tier.price)}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {lowStock ? (
          <p className="text-sm font-medium text-destructive">
            Only {tier.quota} left · max {tier.maxPerUser} per user
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {tier.quota} left · max {tier.maxPerUser} per user
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
        {saleOpen && saleSecondsLeft !== null ? (
          <p className={cn('text-sm font-medium', saleSecondsLeft < 3600 && 'text-destructive')}>
            Sale ends in {formatCountdown(saleSecondsLeft)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Sale: {formatDate(tier.saleStartsAt)} – {formatDate(tier.saleEndsAt)}
          </p>
        )}
        {!session ? (
          <Link to="/login" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
            Log in to buy
          </Link>
        ) : session.user.role === 'admin' ? (
          <>
            <p className="text-sm text-muted-foreground">
              Admins are view-only. Buying is disabled for admin accounts.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onLoadTest?.(tier.id)}
            >
              <Activity className="size-4" aria-hidden="true" />
              Load test this tier
            </Button>
          </>
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
              {createOrder.isPending
                ? 'Reserving…'
                : saleOpen
                  ? `Buy ${quantity} × ${formatCurrency(tier.price)}`
                  : 'Not on sale'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EventDetailPage() {
  const { eventId } = Route.useParams()
  const session = useSession()
  const event = useEvent(eventId)
  const stats = useEventStats(eventId)
  useStockStream(eventId, true)
  const [loadDrawer, setLoadDrawer] = useState<{ open: boolean; tierId?: string }>({
    open: false,
  })
  const isAdmin = session?.user.role === 'admin'

  if (event.isPending) return <ListSkeleton rows={2} />
  if (event.isError) return <ErrorState error={event.error} onRetry={() => event.refetch()} />

  const detail = event.data.data
  const cheapestTierId =
    detail.tiers && detail.tiers.length > 0
      ? detail.tiers.reduce((a, b) => (a.price <= b.price ? a : b)).id
      : undefined

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold">{detail.name}</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setLoadDrawer({ open: true })}>
                <Activity className="size-4" aria-hidden="true" />
                Load test
              </Button>
            )}
            <Badge>{STATUS_LABEL[detail.status] ?? detail.status}</Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {detail.category} · {detail.city} · {detail.venue}
        </p>
        <p className="text-sm text-muted-foreground">{formatDate(detail.startsAt)}</p>
        {detail.description && <p className="text-sm">{detail.description}</p>}
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

      {stats.data && (
        <p className="text-sm text-muted-foreground">
          {stats.data.data.sold} sold · {formatCurrency(stats.data.data.revenue)} revenue
        </p>
      )}

      <h2 className="text-lg font-semibold">Tickets</h2>
      {detail.tiers && detail.tiers.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {detail.tiers.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              cheapest={tier.id === cheapestTierId}
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
