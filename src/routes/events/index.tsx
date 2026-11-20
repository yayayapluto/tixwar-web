import { createFileRoute, Link } from '@tanstack/react-router'
import { Flame, Search, Ticket } from 'lucide-react'
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
import { categoryGradient } from '@/lib/event-art'
import { EVENT_STATUS_VARIANT, STATUS_LABEL } from '@/lib/status'
import { cn, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/events/')({
  component: EventsPage,
})

function EventCard({ event, index }: { event: Event; index: number }) {
  const start = new Date(event.startsAt)
  const day = start.getDate()
  const month = start.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="animate-fade-up group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ animationDelay: `${Math.min(index % 12, 8) * 45}ms` }}
    >
      <Card
        className={cn(
          'overflow-hidden transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:border-ring hover:shadow-xl hover:shadow-orange-500/10 active:scale-[0.98]',
          event.status === 'ON_SALE' && 'border-primary/50',
          event.status === 'SOLD_OUT' && 'opacity-60',
        )}
      >
        <div
          className={cn(
            'relative h-28 overflow-hidden bg-gradient-to-br',
            categoryGradient(event.category),
          )}
        >
          <Ticket
            className="absolute -right-3 -bottom-4 size-24 rotate-12 text-white/20 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-6"
            aria-hidden="true"
          />
          <div className="absolute bottom-3 left-4 text-white">
            <p className="text-3xl leading-none font-extrabold tabular-nums">{day}</p>
            <p className="mt-1 text-xs font-extrabold tracking-widest uppercase">{month}</p>
          </div>
          <Badge
            variant={EVENT_STATUS_VARIANT[event.status] ?? 'secondary'}
            className="absolute top-3 right-3 gap-1.5 bg-white/95 text-zinc-900 shadow-sm"
          >
            {event.status === 'ON_SALE' && (
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
            )}
            {STATUS_LABEL[event.status] ?? event.status}
          </Badge>
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="min-w-0 flex-1 truncate text-lg font-bold">{event.name}</CardTitle>
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
      <section className="animate-fade-up relative overflow-hidden rounded-3xl bg-brand-gradient px-5 py-7 sm:px-8 sm:py-9">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="animate-float absolute -top-8 -right-8 size-36 rounded-full bg-white/15 blur-xl" />
          <span className="animate-float-slow absolute bottom-4 left-1/3 size-20 rounded-full bg-white/10 blur-lg" />
          <Ticket className="animate-float absolute top-6 right-10 size-10 rotate-12 text-white/25" />
        </div>
        <div className="relative">
          <p className="flex items-center gap-1.5 text-xs font-extrabold tracking-widest text-white/85 uppercase">
            <Flame className="size-4" aria-hidden="true" />
            Flash sale tickets
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Tickets sell out fast.
          </h1>
          <p className="mt-1 text-sm font-medium text-white/85">
            {query.data?.meta.total !== undefined
              ? `${query.data.meta.total} events live right now — grab yours before the countdown ends.`
              : 'Grab yours before the countdown ends.'}
          </p>
          <form
            className="mt-5 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg sm:flex-row sm:items-center"
            onSubmit={(e) => {
              e.preventDefault()
              setAppliedQ(q)
              setItems([])
              setPage(1)
            }}
          >
            <div className="relative flex-1">
              <Search
                className="absolute left-2.5 top-2.5 size-4 text-zinc-400"
                aria-hidden="true"
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search events"
                aria-label="Search events"
                className="border-zinc-200 bg-white pl-8 text-zinc-900 placeholder:text-zinc-400"
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
              <SelectTrigger
                aria-label="Filter by status"
                className="border-zinc-200 bg-white text-zinc-900 sm:w-44"
              >
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
        </div>
      </section>

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
