import { useQueries } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { QrCode, Search, X } from 'lucide-react'
import { useState } from 'react'
import { CopyButton } from '@/components/copy-button'
import { TicketsListSkeleton, TicketsPageSkeleton } from '@/components/skeletons'
import { EmptyState, ErrorState } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Toggle } from '@/components/ui/toggle'
import { requireCustomer } from '@/features/auth/route-guard'
import type { EventDetail } from '@/features/events/queries'
import { type Ticket, useTickets } from '@/features/tickets/queries'
import { getV1EventsById } from '@/lib/client'
import { EVENT_STATUS_VARIANT, STATUS_LABEL } from '@/lib/status'
import { cn, formatDate, formatRelativeDay } from '@/lib/utils'

export const Route = createFileRoute('/tickets/')({
  beforeLoad: ({ location }) => {
    requireCustomer(location.href)
  },
  component: TicketsPage,
  pendingComponent: TicketsPageSkeleton,
})

type TicketTab = 'all' | 'upcoming' | 'past'

function TicketCard({
  ticket,
  event,
  eventPending,
  index,
  total,
}: {
  ticket: Ticket
  event?: EventDetail
  eventPending: boolean
  /** Position inside its event group, for "Ticket 1 of 2" numbering. */
  index: number
  /** Number of tickets in the same event group. */
  total: number
}) {
  const tier = event?.tiers?.find((t) => t.id === ticket.tierId)
  const isPast = event !== undefined && new Date(event.startsAt).getTime() < Date.now()
  const ended = event?.status === 'ENDED' || isPast
  const label = event
    ? `View QR — ${event.name}${tier ? `, ${tier.name}` : ''}, ticket ${ticket.code}`
    : `View QR for ticket ${ticket.code}`
  // The group heading already carries the event name, so the card title
  // names the ticket itself: its number when siblings share the event,
  // otherwise its tier. The code is the only identifier when the event
  // never resolved.
  const title = total > 1 ? `Ticket ${index + 1} of ${total}` : (tier?.name ?? 'Ticket')
  const relativeDay = event ? formatRelativeDay(event.startsAt) : undefined

  return (
    <li>
      <Card className="transition-[transform,border-color] duration-150 ease-out hover:border-ring active:scale-[0.98]">
        <Link
          to="/tickets/$ticketId"
          params={{ ticketId: ticket.id }}
          aria-label={label}
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              {eventPending ? (
                // Same height as the real title: CardTitle is text-base
                // leading-snug (16px font, 22px line), so the bar is
                // h-[22px], not h-4.
                <Skeleton className="h-[22px] w-2/3" />
              ) : (
                <CardTitle
                  className={cn(
                    'min-w-0 flex-1 truncate leading-snug',
                    // min-h-[22px] reserves the 22px title line so the
                    // fallback (text-sm, 14px) does not shrink the header.
                    !event && 'min-h-[22px] font-mono text-sm',
                  )}
                >
                  {event ? title : ticket.code}
                </CardTitle>
              )}
              {ended && (
                <Badge variant={EVENT_STATUS_VARIANT.ENDED ?? 'secondary'} className="shrink-0">
                  {STATUS_LABEL.ENDED ?? 'Ended'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex items-start justify-between gap-3 pb-2">
            {eventPending ? (
              // Same two rows as the loaded state: text-sm lines are
              // 20px tall, so the bars are h-5 (not h-4).
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            ) : event ? (
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm">
                  {relativeDay !== undefined ? `${relativeDay} · ` : ''}
                  {formatDate(event.startsAt)} · {event.venue}, {event.city}
                </p>
                {/* Tier row is always rendered (min-h-5) so a ticket
                    without a tier keeps the same card height. */}
                <p className="min-h-5 truncate text-sm text-muted-foreground">
                  {tier ? `Tier: ${tier.name}` : ''}
                </p>
              </div>
            ) : (
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm text-muted-foreground">Event details unavailable</p>
                {/* Reserved tier row: same height as pending/loaded. */}
                <p className="min-h-5" aria-hidden="true" />
              </div>
            )}
            <span
              aria-hidden="true"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
            >
              <QrCode className="size-4" aria-hidden="true" />
              View QR
            </span>
          </CardContent>
        </Link>
        {/* Outside the link: a <button> inside the whole-card <a> is
            invalid HTML, so the code row (with its copy button) sits
            below the link. The full code wraps instead of truncating,
            so it is never cut off. */}
        <div className="flex items-start gap-1 px-6 pb-6 pt-1">
          <p className="min-w-0 flex-1 break-all font-mono text-xs text-muted-foreground">
            {ticket.code} · Issued {formatDate(ticket.issuedAt)}
          </p>
          <CopyButton
            value={ticket.code}
            label="ticket code"
            className="-mr-2 -mt-1.5 h-8 w-8 shrink-0"
          />
        </div>
      </Card>
    </li>
  )
}

function groupByEvent(list: Ticket[]): Array<{ eventId: string; tickets: Ticket[] }> {
  const groups = new Map<string, Ticket[]>()
  for (const ticket of list) {
    const group = groups.get(ticket.eventId)
    if (group) group.push(ticket)
    else groups.set(ticket.eventId, [ticket])
  }
  return [...groups.entries()].map(([eventId, tickets]) => ({ eventId, tickets }))
}

function EventTicketGroup({
  tickets,
  event,
  eventPending,
}: {
  tickets: Ticket[]
  event?: EventDetail
  eventPending: boolean
}) {
  const count = tickets.length
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        {eventPending ? (
          // Same height as the heading: text-base leading-snug is a
          // 22px line, so the bar is h-[22px].
          <Skeleton className="h-[22px] w-1/3" />
        ) : (
          <h3 className="min-w-0 flex-1 truncate text-base font-semibold leading-snug">
            {event ? event.name : 'Event details unavailable'}
          </h3>
        )}
        <span className="shrink-0 text-sm text-muted-foreground">
          {count} {count === 1 ? 'ticket' : 'tickets'}
        </span>
      </div>
      <ul className="grid gap-3">
        {tickets.map((ticket, i) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            event={event}
            eventPending={eventPending}
            index={i}
            total={count}
          />
        ))}
      </ul>
    </section>
  )
}

const TAB_LABELS: Record<TicketTab, string> = {
  all: 'All',
  upcoming: 'Upcoming',
  past: 'Past',
}

function TicketsPage() {
  const query = useTickets()
  const tickets = query.data?.data
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<TicketTab>('all')

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
  const isUpcoming = (ticket: Ticket) => {
    const start = events.get(ticket.eventId)?.startsAt
    return start === undefined || new Date(start).getTime() >= now
  }
  // Client-side search: event name when it resolved, ticket code always.
  const normalizedQ = q.trim().toLowerCase()
  const matchesQuery = (ticket: Ticket) => {
    if (normalizedQ === '') return true
    if (ticket.code.toLowerCase().includes(normalizedQ)) return true
    const name = events.get(ticket.eventId)?.name
    return name?.toLowerCase().includes(normalizedQ) ?? false
  }
  const visible = sorted.filter(
    (ticket) =>
      matchesQuery(ticket) &&
      (tab === 'all' || (tab === 'upcoming' ? isUpcoming(ticket) : !isUpcoming(ticket))),
  )
  const upcoming = visible.filter(isUpcoming)
  const past = visible.filter((ticket) => !isUpcoming(ticket))
  const filtering = normalizedQ !== '' || tab !== 'all'
  const total = tickets?.length ?? 0

  const clearFilters = () => {
    setQ('')
    setTab('all')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">
          My tickets
          {tickets !== undefined && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {total} {total === 1 ? 'ticket' : 'tickets'}
            </span>
          )}
        </h1>
        {/* Always rendered: the line is a blank placeholder until a
            search or filter is active, so it never pops in and pushes
            the list down. */}
        <p className="text-sm text-muted-foreground">
          {filtering ? `${visible.length} of ${total} tickets` : ' '}
        </p>
      </div>
      {query.isPending ? (
        <TicketsListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : total === 0 ? (
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by event name or ticket code"
                aria-label="Search by event name or ticket code"
                className="pl-8 pr-10"
              />
              {q !== '' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setQ('')}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X aria-hidden="true" />
                </Button>
              )}
            </div>
            <fieldset className="flex gap-2">
              <legend className="sr-only">Show upcoming, past, or all tickets</legend>
              {(Object.keys(TAB_LABELS) as TicketTab[]).map((value) => (
                <Toggle
                  key={value}
                  size="sm"
                  variant="outline"
                  pressed={tab === value}
                  onPressedChange={() => setTab(value)}
                  aria-label={`Show ${TAB_LABELS[value].toLowerCase()} tickets`}
                  className="rounded-full data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground"
                >
                  {TAB_LABELS[value]}
                </Toggle>
              ))}
            </fieldset>
          </div>
          {visible.length === 0 ? (
            <EmptyState
              title={
                normalizedQ !== ''
                  ? `No tickets match "${q.trim()}".`
                  : tab === 'upcoming'
                    ? 'No upcoming tickets.'
                    : 'No past tickets.'
              }
              description="Try a different search or filter."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear search and filters
                </Button>
              }
            />
          ) : (
            <div className="space-y-6">
              {upcoming.length > 0 && (
                <section aria-labelledby="tickets-upcoming-heading" className="space-y-3">
                  <h2 id="tickets-upcoming-heading" className="text-base font-semibold">
                    Upcoming
                  </h2>
                  <div className="space-y-6">
                    {groupByEvent(upcoming).map((group) => (
                      <EventTicketGroup
                        key={group.eventId}
                        tickets={group.tickets}
                        event={events.get(group.eventId)}
                        eventPending={eventsPending.has(group.eventId)}
                      />
                    ))}
                  </div>
                </section>
              )}
              {past.length > 0 && (
                <section aria-labelledby="tickets-past-heading" className="space-y-3">
                  <h2 id="tickets-past-heading" className="text-base font-semibold">
                    Past events
                  </h2>
                  <div className="space-y-6">
                    {groupByEvent(past).map((group) => (
                      <EventTicketGroup
                        key={group.eventId}
                        tickets={group.tickets}
                        event={events.get(group.eventId)}
                        eventPending={eventsPending.has(group.eventId)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
