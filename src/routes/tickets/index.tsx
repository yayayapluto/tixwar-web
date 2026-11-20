import { useQueries } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { QrCode } from 'lucide-react'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/status'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { requireCustomer } from '@/features/auth/route-guard'
import type { EventDetail } from '@/features/events/queries'
import { type Ticket, useTickets } from '@/features/tickets/queries'
import { getV1EventsById } from '@/lib/client'
import { cn, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/tickets/')({
  beforeLoad: ({ location }) => {
    requireCustomer(location.href)
  },
  component: TicketsPage,
})

function TicketCard({
  ticket,
  event,
  eventPending,
}: {
  ticket: Ticket
  event?: EventDetail
  eventPending: boolean
}) {
  const tier = event?.tiers?.find((t) => t.id === ticket.tierId)
  const isPast = event !== undefined && new Date(event.startsAt).getTime() < Date.now()
  const label = event
    ? `View QR — ${event.name}${tier ? `, ${tier.name}` : ''}, ticket ${ticket.code}`
    : `View QR for ticket ${ticket.code}`

  return (
    <li>
      <Link
        to="/tickets/$ticketId"
        params={{ ticketId: ticket.id }}
        aria-label={label}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Card
          className={cn(
            'transition-[transform,border-color] duration-150 ease-out hover:border-ring active:scale-[0.98]',
            isPast && 'opacity-60',
          )}
        >
          <CardHeader>
            {eventPending ? (
              <Skeleton className="h-5 w-2/3" />
            ) : event ? (
              <CardTitle className="min-w-0 truncate">{event.name}</CardTitle>
            ) : (
              <CardTitle className="min-w-0 truncate font-mono text-sm">{ticket.code}</CardTitle>
            )}
          </CardHeader>
          <CardContent className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              {eventPending ? (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </>
              ) : event ? (
                <>
                  <p className="truncate text-sm">
                    {formatDate(event.startsAt)} · {event.venue}, {event.city}
                  </p>
                  {tier && <p className="text-sm text-muted-foreground">Tier: {tier.name}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Event details unavailable</p>
              )}
              <p className="truncate font-mono text-xs text-muted-foreground">
                {ticket.code} · Issued {formatDate(ticket.issuedAt)}
              </p>
            </div>
            <span
              aria-hidden="true"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
            >
              <QrCode className="size-4" aria-hidden="true" />
              View QR
            </span>
          </CardContent>
        </Card>
      </Link>
    </li>
  )
}

function TicketsPage() {
  const query = useTickets()
  const tickets = query.data?.data

  // Event identity is resolved with the same ['event', id] query useEvent uses,
  // batched with useQueries so the list can sort and group by event date. The
  // cache is shared with the ticket detail page, so no event is fetched twice.
  const eventIds = [...new Set((tickets ?? []).map((t) => t.eventId))]
  const eventQueries = useQueries({
    queries: eventIds.map((id) => ({
      queryKey: ['event', id],
      queryFn: async () =>
        (
          await getV1EventsById({
            path: { id },
            query: { include: 'tiers' },
            throwOnError: true,
          })
        ).data,
      enabled: id.length > 0,
    })),
  })

  const events = new Map<string, EventDetail>()
  const eventsPending = new Set<string>()
  eventIds.forEach((id, i) => {
    const result = eventQueries[i]
    if (result?.data?.data !== undefined) events.set(id, result.data.data)
    if (result?.isPending) eventsPending.add(id)
  })

  // Nearest event first; tickets whose event never resolved go last.
  const now = Date.now()
  const sorted = [...(tickets ?? [])].sort((a, b) => {
    const aStart = events.get(a.eventId)?.startsAt
    const bStart = events.get(b.eventId)?.startsAt
    if (aStart !== undefined && bStart !== undefined)
      return new Date(aStart).getTime() - new Date(bStart).getTime()
    if (aStart !== undefined) return -1
    if (bStart !== undefined) return 1
    return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  })
  const upcoming = sorted.filter((t) => {
    const start = events.get(t.eventId)?.startsAt
    return start === undefined || new Date(start).getTime() >= now
  })
  const past = sorted.filter((t) => {
    const start = events.get(t.eventId)?.startsAt
    return start !== undefined && new Date(start).getTime() < now
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">
        My tickets
        {tickets !== undefined && (
          <span className="ml-2 text-base font-normal text-muted-foreground">
            {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
          </span>
        )}
      </h1>
      {query.isPending ? (
        <ListSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (tickets ?? []).length === 0 ? (
        <EmptyState
          title="No tickets yet"
          description="Your tickets will appear here after payment is confirmed."
          action={
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link to="/events" className="text-sm underline underline-offset-4">
                Browse events
              </Link>
              <Link to="/orders" className="text-sm underline underline-offset-4">
                Check your orders
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section aria-labelledby="tickets-upcoming-heading" className="space-y-3">
              <h2 id="tickets-upcoming-heading" className="text-base font-semibold">
                Upcoming
              </h2>
              <ul className="grid gap-3">
                {upcoming.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    event={events.get(ticket.eventId)}
                    eventPending={eventsPending.has(ticket.eventId)}
                  />
                ))}
              </ul>
            </section>
          )}
          {past.length > 0 && (
            <section aria-labelledby="tickets-past-heading" className="space-y-3">
              <h2 id="tickets-past-heading" className="text-base font-semibold">
                Past events
              </h2>
              <ul className="grid gap-3">
                {past.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    event={events.get(ticket.eventId)}
                    eventPending={eventsPending.has(ticket.eventId)}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
