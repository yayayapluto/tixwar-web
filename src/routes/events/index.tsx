import { createFileRoute, Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useState } from 'react'
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
  const query = useEvents({
    q: appliedQ,
    status: status ? (status as EventStatus) : undefined,
    page,
    limit: 12,
  })

  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          setAppliedQ(q)
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
      ) : query.data.data.length === 0 ? (
        <EmptyState title="No events found" description="Try a different search or filter." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {query.data.data.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {query.data?.meta && (query.data.meta.nextCursor || query.data.meta.page !== undefined) && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!query.data.meta.hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
