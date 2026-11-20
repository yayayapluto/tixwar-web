import { createFileRoute, Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type EventListItem, type EventStatus, useEvents } from '@/features/events/queries'
import { EVENT_STATUS_VARIANT, STATUS_LABEL } from '@/lib/status'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/events/')({
  component: EventsPage,
})

function EventCard({ event, index }: { event: EventListItem; index: number }) {
  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="animate-fade-up block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ animationDelay: `${Math.min(index % 12, 8) * 45}ms` }}
    >
      <Card
        className={cn(
          'transition-[transform,border-color] duration-150 ease-out hover:border-ring active:scale-[0.98]',
          event.status === 'ON_SALE' && 'border-primary/50',
          event.status === 'SOLD_OUT' && 'opacity-60',
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="min-w-0 flex-1 truncate">{event.name}</CardTitle>
            <Badge variant={EVENT_STATUS_VARIANT[event.status] ?? 'secondary'} className="shrink-0">
              {STATUS_LABEL[event.status] ?? event.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            {event.category} · {event.city}
          </p>
          <p>{event.venue}</p>
          <p>{formatDate(event.startsAt)}</p>
          {event.minPrice != null && (
            <p className="pt-1 text-base font-semibold tabular-nums text-foreground">
              From {formatCurrency(event.minPrice)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function EventsPage() {
  const [q, setQ] = useState('')
  const [appliedQ, setAppliedQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Array<EventListItem>>([])
  const sentinelRef = useRef<HTMLDivElement>(null)
  const query = useEvents({
    q: appliedQ,
    status: status ? (status as EventStatus) : undefined,
    page,
    limit: 12,
  })
  const hasMore = query.data?.meta.hasMore ?? false

  useEffect(() => {
    if (!query.data) return
    const pageItems = query.data.data
    // The list grows without a cap; fine for the current catalog size,
    // revisit windowing once it passes ~100 items.
    setItems((prev) =>
      page === 1
        ? pageItems
        : [...prev, ...pageItems.filter((e) => !prev.some((p) => p.id === e.id))],
    )
  }, [query.data, page])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !query.isFetching) {
          setPage((p) => p + 1)
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, query.isFetching])

  const filtered = appliedQ !== '' || status !== ''
  const clearFilters = () => {
    setQ('')
    setAppliedQ('')
    setStatus('')
    setItems([])
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Events</h1>
        {query.data?.meta.total !== undefined && (
          <p className="text-sm text-muted-foreground">
            {query.data.meta.total} events
            {filtered ? ' matching your search' : ''}
          </p>
        )}
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault()
          setAppliedQ(q)
          setItems([])
          setPage(1)
        }}
      >
        <div className="relative flex-1">
          <Search
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events"
            aria-label="Search events"
            className="pl-8"
          />
        </div>
        <Select
          value={status === '' ? 'all' : status}
          onValueChange={(v) => {
            setStatus(v === 'all' ? '' : v)
            setItems([])
            setPage(1)
          }}
        >
          <SelectTrigger aria-label="Filter by status" className="sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ON_SALE">On sale</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="SOLD_OUT">Sold out</SelectItem>
            <SelectItem value="ENDED">Ended</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Search</Button>
      </form>

      {query.isPending ? (
        <ListSkeleton rows={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        filtered ? (
          <EmptyState
            title={`No events match "${appliedQ !== '' ? appliedQ : (STATUS_LABEL[status] ?? status)}".`}
            description="Try a different search or filter."
            hideIcon
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState title="No events found" description="Try a different search or filter." />
        )
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
          <div ref={sentinelRef} aria-hidden="true" className="h-1" />
          {query.isFetching ? (
            <ListSkeleton rows={2} />
          ) : !hasMore ? (
            <p role="status" className="text-center text-sm text-muted-foreground">
              You&apos;ve reached the end.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
