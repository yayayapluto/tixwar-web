import { useQueries } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EventsGridSkeleton, EventsPageSkeleton } from '@/components/skeletons'
import { EmptyState, ErrorState } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Toggle } from '@/components/ui/toggle'
import { type EventListItem, type EventStatus, useEvents } from '@/features/events/queries'
import { getV1Events } from '@/lib/client'
import { STATUS_LABEL } from '@/lib/status'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

const PAGE_SIZE = 12
// Realtime search waits for the user to stop typing before applying.
const DEBOUNCE_MS = 300
// Category chips past the working-memory limit are hidden behind "More".
const VISIBLE_CHIP_COUNT = 4
// The API has no server-side sort, so sorting is client-side over the pages
// loaded so far. Deep-browse guard: at most 20 pages are fetched in parallel
// when restoring a deep ?page= from the URL.
const MAX_PAGES = 20

const SORT_KEYS = ['ending', 'date', 'price-asc', 'price-desc'] as const
type SortKey = (typeof SORT_KEYS)[number]

const SORT_LABELS: Record<SortKey, string> = {
  ending: 'Ending soonest',
  date: 'Event date',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
}

type EventsSearch = {
  q?: string
  status?: string
  category?: string
  page?: number
  sort?: SortKey
}

function isSortKey(value: unknown): value is SortKey {
  return typeof value === 'string' && (SORT_KEYS as readonly string[]).includes(value)
}

function parsePage(value: unknown): number {
  const n =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(Math.floor(n), MAX_PAGES)
}

export const Route = createFileRoute('/events/')({
  // Filter/search/page/category/sort live in the URL so back and refresh
  // restore the list instead of wiping it.
  validateSearch: (search: Record<string, unknown>): EventsSearch => ({
    q: typeof search.q === 'string' ? search.q : '',
    status: typeof search.status === 'string' ? search.status : '',
    category: typeof search.category === 'string' ? search.category : '',
    page: parsePage(search.page),
    sort: isSortKey(search.sort) ? search.sort : 'ending',
  }),
  component: EventsPage,
  pendingComponent: EventsPageSkeleton,
})

// Display-only title case for raw API values ("music" -> "Music");
// the raw value is still what gets sent to the API.
function titleCase(value: string) {
  return value
    .split(' ')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

function compareEvents(a: EventListItem, b: EventListItem, sort: SortKey): number {
  switch (sort) {
    case 'date':
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    case 'price-asc':
      return (a.minPrice ?? Number.POSITIVE_INFINITY) - (b.minPrice ?? Number.POSITIVE_INFINITY)
    case 'price-desc':
      return (b.minPrice ?? Number.NEGATIVE_INFINITY) - (a.minPrice ?? Number.NEGATIVE_INFINITY)
    default: {
      const aEnd = a.saleEndsAt ? new Date(a.saleEndsAt).getTime() : Number.POSITIVE_INFINITY
      const bEnd = b.saleEndsAt ? new Date(b.saleEndsAt).getTime() : Number.POSITIVE_INFINITY
      return aEnd - bEnd || new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    }
  }
}

function EventCard({ event }: { event: EventListItem }) {
  // Same deadline-based countdown as the ticket detail page: the interval
  // recomputes from saleEndsAt every second, so it never drifts when the
  // tab is backgrounded.
  const saleSecondsLeft = useCountdown(event.saleEndsAt ?? undefined)
  const saleLive = saleSecondsLeft !== null && saleSecondsLeft > 0
  // Destructive token only for a sale ending in under an hour (DESIGN.md).
  const saleEndingSoon = saleLive && saleSecondsLeft < 3600
  const lowStock = event.remaining > 0 && event.remaining <= 10
  // Honest always-on stock signal: on real data remaining is 349-350 of 350,
  // so the old "Only N left" cliff (remaining <= 10) rendered on zero cards.
  // The neutral count shows scarcity before the cliff; the destructive line
  // is kept for genuinely low stock.
  const showStock = event.status !== 'SOLD_OUT' && event.remaining > 0 && event.totalQuota > 0
  const showSaleGroup = saleLive || showStock || event.minPrice != null
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
            <h2 className="min-w-0 flex-1 truncate text-base font-semibold leading-none tracking-tight">
              {event.name}
            </h2>
            <Badge
              variant={event.status === 'ON_SALE' ? 'default' : 'secondary'}
              className="shrink-0"
            >
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
          {showSaleGroup && (
            <div className="space-y-1 border-t pt-2">
              {saleLive && (
                <p
                  className={cn(
                    'text-sm font-semibold tabular-nums text-foreground',
                    saleEndingSoon && 'text-destructive',
                  )}
                >
                  Sale ends in {formatCountdown(saleSecondsLeft)}
                </p>
              )}
              {showStock &&
                (lowStock ? (
                  <p className="text-sm font-medium text-destructive">
                    Only {event.remaining} left
                  </p>
                ) : (
                  <p className="text-sm tabular-nums">
                    {event.remaining} of {event.totalQuota} tickets left
                  </p>
                ))}
              {event.minPrice != null && (
                <p className="text-sm font-medium tabular-nums">
                  {event.maxPrice != null && event.maxPrice !== event.minPrice
                    ? `From ${formatCurrency(event.minPrice)} – ${formatCurrency(event.maxPrice)}`
                    : `From ${formatCurrency(event.minPrice)}`}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function EventsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  // The search input is realtime with a debounce: typing only updates the
  // input, the query is applied 300ms after the last keystroke. The input
  // is re-seeded whenever ?q= changes (apply, clear, back/forward).
  const [q, setQ] = useState(search.q)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<number | undefined>(undefined)

  const appliedQ = search.q ?? ''
  const status = search.status ?? ''
  const category = search.category ?? ''
  const page = search.page ?? 1
  const sort = search.sort ?? 'ending'

  useEffect(() => {
    setQ(search.q)
  }, [search.q])

  // Cancel a pending debounced search (submit, clear, new keystroke,
  // unmount). Without this a stale timer could re-apply an old query
  // after the user already moved on.
  const cancelPendingSearch = useCallback(() => {
    window.clearTimeout(searchTimerRef.current)
    searchTimerRef.current = undefined
  }, [])

  // Debounced apply: while the user keeps typing the timer is reset on
  // every keystroke (effect cleanup); it only fires once typing stops.
  // The timer holds the latest input value, so the applied query is
  // never older than what the user last typed.
  useEffect(() => {
    if (q === appliedQ) return
    searchTimerRef.current = window.setTimeout(() => {
      navigate({ to: '/events', search: (prev) => ({ ...prev, q, page: 1 }), replace: true })
    }, DEBOUNCE_MS)
    return () => cancelPendingSearch()
  }, [q, appliedQ, navigate, cancelPendingSearch])

  // Filter/search/sort/page changes replace the current history entry so
  // scrolling through pages does not spam the back stack; the URL still
  // carries the full state, so back from detail restores it.
  const updateSearch = (patch: Partial<EventsSearch>) => {
    navigate({ to: '/events', search: (prev) => ({ ...prev, ...patch }), replace: true })
  }

  // One query per loaded page (pages 1..page), so a restored ?page=3 fetches
  // pages 1-3 instead of only page 3. New pages append; filter changes reset
  // page to 1, which drops the extra queries.
  const pages = useQueries({
    queries: Array.from({ length: page }, (_, i) => {
      const pageNo = i + 1
      const filters = {
        q: appliedQ,
        status: status ? (status as EventStatus) : undefined,
        category: category ? category : undefined,
        page: pageNo,
        limit: PAGE_SIZE,
      }
      return {
        queryKey: ['events', filters],
        queryFn: async () => (await getV1Events({ query: filters, throwOnError: true })).data,
      }
    }),
  })

  // Categories come from a separate query WITHOUT the category filter:
  // deriving them from the filtered list shrank the chips to just the
  // active category (All + Conference). Same q/status, limit 100 is the
  // API maximum, so one page covers the whole catalog while it stays
  // under 100 events. Union with the loaded items so the chips never
  // shrink below what the list itself shows.
  const categoryQuery = useEvents({
    q: appliedQ,
    status: status ? (status as EventStatus) : undefined,
    limit: 100,
  })

  const loadedItems: Array<EventListItem> = []
  for (const p of pages) {
    if (!p.data) continue
    for (const event of p.data.data) {
      if (!loadedItems.some((m) => m.id === event.id)) loadedItems.push(event)
    }
  }
  const items = [...loadedItems].sort((a, b) => compareEvents(a, b, sort))

  const firstPage = pages[0]
  const lastLoaded = [...pages].reverse().find((p) => p.data !== undefined)
  const hasMore = lastLoaded?.data?.meta.hasMore ?? false
  const total = firstPage?.data?.meta.total
  const isPending = firstPage?.isPending ?? true
  const isFetching = pages.some((p) => p.isFetching)
  const firstError = pages.find((p) => p.isError)?.error

  // Category chips come from loaded items only, never hardcoded. While a
  // category filter is active every loaded item has that one category, so the
  // active category is always kept visible.
  const categorySet = new Set([
    ...loadedItems.map((e) => e.category),
    ...(categoryQuery.data?.data.map((e) => e.category) ?? []),
  ])
  if (category !== '') categorySet.add(category)
  const knownCategories = [...categorySet].sort((a, b) => a.localeCompare(b))
  const visibleCategories = showAllCategories
    ? knownCategories
    : knownCategories.slice(0, VISIBLE_CHIP_COUNT)
  const shownCategories = [
    ...visibleCategories,
    // The applied category is always kept visible, so a clicked chip
    // never vanishes from the row.
    ...(category !== '' && !visibleCategories.includes(category) ? [category] : []),
  ]

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isFetching) {
          navigate({
            to: '/events',
            search: (prev) => ({ ...prev, page: page + 1 }),
            replace: true,
          })
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isFetching, page, navigate])

  const filtered = appliedQ !== '' || status !== '' || category !== ''
  const clearFilters = () => {
    cancelPendingSearch()
    setQ('')
    updateSearch({ q: '', status: '', category: '', page: 1 })
  }
  // Category chips apply immediately; the list refetches on every click.
  const toggleCategory = (value: string) => {
    updateSearch({ category: category === value ? '' : value, page: 1 })
  }
  // Clearing the search input cancels the pending debounce and, if the
  // input is the query currently applied, clears the active query too
  // (one refetch without q). Otherwise it only clears the input.
  const clearSearch = () => {
    cancelPendingSearch()
    setQ('')
    if (appliedQ !== '') {
      updateSearch({ q: '', page: 1 })
    }
  }
  const refetchAll = () => {
    void Promise.all(pages.map((p) => p.refetch()))
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
        {total !== undefined && (
          <p className="text-sm text-muted-foreground">
            {total} events
            {filtered ? ' matching your search' : ''}
          </p>
        )}
      </div>
      {/* Realtime: status, category and sort apply the moment they change.
          Search is realtime too, debounced 300ms. Submit applies the
          current input at once (cancelling a pending debounce); Clear
          filters applies at once as well. */}
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault()
          cancelPendingSearch()
          updateSearch({ q, page: 1 })
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
            className="pl-8 pr-10"
          />
          {q !== '' && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </div>
        <Select
          value={status === '' ? 'all' : status}
          onValueChange={(v) => {
            updateSearch({ status: v === 'all' ? '' : v, page: 1 })
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
        <Select
          value={sort}
          onValueChange={(v) => {
            updateSearch({ sort: v as SortKey, page: 1 })
          }}
        >
          <SelectTrigger aria-label="Sort events" className="sm:w-48">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {(SORT_KEYS as readonly SortKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_LABELS[key]}
              </SelectItem>
            ))}
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
          <Toggle
            size="sm"
            variant="outline"
            pressed={category === ''}
            onPressedChange={() => toggleCategory('')}
            aria-label="Show all categories"
            className="rounded-full data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground"
          >
            All
          </Toggle>
          {shownCategories.map((c) => (
            <Toggle
              key={c}
              size="sm"
              variant="outline"
              pressed={category === c}
              onPressedChange={() => toggleCategory(c)}
              aria-label={`Filter by ${titleCase(c)}`}
              className="rounded-full data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground"
            >
              {titleCase(c)}
            </Toggle>
          ))}
          {knownCategories.length > VISIBLE_CHIP_COUNT && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-expanded={showAllCategories}
              onClick={() => setShowAllCategories((v) => !v)}
              className="rounded-full"
            >
              {showAllCategories
                ? 'Fewer'
                : `More (${knownCategories.length - VISIBLE_CHIP_COUNT})`}
            </Button>
          )}
        </fieldset>
      )}

      {isPending ? (
        <EventsGridSkeleton />
      ) : firstError ? (
        <ErrorState error={firstError} onRetry={refetchAll} />
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
          {isFetching ? (
            <EventsGridSkeleton count={2} />
          ) : !hasMore ? (
            <div className="flex flex-col items-center gap-2">
              <p role="status" className="text-center text-sm text-muted-foreground">
                You&apos;ve reached the end.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Back to top
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
