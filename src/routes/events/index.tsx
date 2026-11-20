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
import { type Event, type EventStatus, useEvents } from '@/features/events/queries'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/events/')({
  component: EventsPage,
})

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'secondary'> = {
  ON_SALE: 'success',
  SCHEDULED: 'secondary',
  SOLD_OUT: 'warning',
  ENDED: 'secondary',
  DRAFT: 'secondary',
}

function EventCard({ event }: { event: Event }) {
  return (
    <Link to="/events/$eventId" params={{ eventId: event.id }} className="block">
      <Card className="transition-[transform,border-color] duration-150 ease-out hover:border-ring active:scale-[0.98]">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{event.name}</CardTitle>
            <Badge variant={STATUS_VARIANT[event.status] ?? 'secondary'}>{event.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            {event.category} · {event.city}
          </p>
          <p>{event.venue}</p>
          <p>{formatDate(event.startsAt)}</p>
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
  const [items, setItems] = useState<Array<Event>>([])
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

  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          setAppliedQ(q)
          setItems([])
          setPage(1)
        }}
      >
        <div className="relative flex-1">
          <Search
            className="absolute left-2.5 top-2.5 size-4 text-muted-foreground"
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
        <EmptyState title="No events found" description="Try a different search or filter." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          <div ref={sentinelRef} aria-hidden="true" className="h-1" />
          {query.isFetching ? (
            <ListSkeleton rows={2} />
          ) : !hasMore ? (
            <p className="text-center text-sm text-muted-foreground">
              You&apos;ve reached the end.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
