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

// Display-only title case for raw API values ("music" -> "Music");
// the raw value is still what gets sent to the API.
function titleCase(value: string) {
  return value
    .split(' ')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

function EventCard({ event }: { event: EventListItem }) {
  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="animate-fade-up block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            {titleCase(event.category)} · {titleCase(event.city)}
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
  const [category, setCategory] = useState('')
  const [knownCategories, setKnownCategories] = useState<Array<string>>([])
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Array<EventListItem>>([])
  const sentinelRef = useRef<HTMLDivElement>(null)
  const query = useEvents({
    q: appliedQ,
    status: status ? (status as EventStatus) : undefined,
    category: category ? category : undefined,
    page,
    limit: 12,
  })
  const hasMore = query.data?.meta.hasMore ?? false

  useEffect(() => {
    if (!query.data) return
    const pageItems = query.data.data
    // Category chips come from loaded items only, never hardcoded. While a
    // category filter is active every loaded item has that one category, so
    // the known set is only grown from unfiltered-category loads — union
    // only, so switching categories never needs a clear first.
    if (category === '') {
      const fresh = [...new Set(pageItems.map((e) => e.category))]
      if (fresh.length > 0) {
        setKnownCategories((prev) =>
          [...new Set([...prev, ...fresh])].sort((a, b) => a.localeCompare(b)),
        )
      }
    }
    // The list grows without a cap; fine for the current catalog size,
    // revisit windowing once it passes ~100 items.
    setItems((prev) =>
      page === 1
        ? pageItems
        : [...prev, ...pageItems.filter((e) => !prev.some((p) => p.id === e.id))],
    )
  }, [query.data, page, category])

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

  const filtered = appliedQ !== '' || status !== '' || category !== ''
  const clearFilters = () => {
    setQ('')
    setAppliedQ('')
    setStatus('')
    setCategory('')
    setItems([])
    setPage(1)
  }
  const toggleCategory = (value: string) => {
    setCategory((prev) => (prev === value ? '' : value))
    setItems([])
    setPage(1)
  }
  const emptyFilterLabel =
    appliedQ !== ''
      ? appliedQ
      : category !== ''
        ? titleCase(category)
        : (STATUS_LABEL[status] ?? status)

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
      {/* Search applies on submit (server-side, one request per search);
          the status select applies immediately, like a filter. */}
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
            placeholder="Search by event name"
            aria-label="Search by event name"
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
        {filtered && (
          <Button type="button" variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </form>

      {knownCategories.length > 0 && (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Filter by category</legend>
          <Button
            type="button"
            size="sm"
            variant={category === '' ? 'default' : 'outline'}
            aria-pressed={category === ''}
            onClick={() => toggleCategory('')}
            className="rounded-full"
          >
            All
          </Button>
          {knownCategories.map((c) => (
            <Button
              key={c}
              type="button"
              size="sm"
              variant={category === c ? 'default' : 'outline'}
              aria-pressed={category === c}
              onClick={() => toggleCategory(c)}
              className="rounded-full"
            >
              {titleCase(c)}
            </Button>
          ))}
        </fieldset>
      )}

      {query.isPending ? (
        <ListSkeleton rows={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        filtered ? (
          <EmptyState
            title={`No events match "${emptyFilterLabel}".`}
            description="Try a different search or filter."
            hideIcon
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No events yet"
            description="There are no events listed right now. Check back later."
          />
        )
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
            <p role="status" className="text-center text-sm text-muted-foreground">
              You&apos;ve reached the end.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
