import type { components } from '@api-types'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getV1Events, getV1EventsById, getV1EventsByIdStats } from '@/lib/client'

export type Event = components['schemas']['Event']
export type EventListItem = components['schemas']['EventListItem']
export type EventDetail = components['schemas']['EventDetail']
export type TicketTier = components['schemas']['TicketTier']
export type EventStatus = Event['status']

export type EventSort = 'ending' | 'date' | 'price-asc' | 'price-desc'

export type EventFilters = {
  q?: string
  category?: string
  city?: string
  status?: EventStatus
  sort?: EventSort
  page?: number
  limit?: number
}

export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: async () => (await getV1Events({ query: filters, throwOnError: true })).data,
    // Same reason as the page queries in routes/events: keep the previous
    // category chips visible while q/status refetches, instead of flashing
    // back to chip-shaped placeholders.
    placeholderData: keepPreviousData,
  })
}

export function useEvent(id: string, includeTiers = true, pollWhileSaleOpen = false) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: async () =>
      (
        await getV1EventsById({
          path: { id },
          query: includeTiers ? { include: 'tiers' } : undefined,
          throwOnError: true,
        })
      ).data,
    enabled: id.length > 0,
    // Other buyers' purchases emit no event on the event stream — only
    // stock.released is published to the stock:{eventId} channel — so while
    // a sale is open, poll every 15s so the remaining stock stays live.
    // Once no tier's sale window is open, polling stops on its own.
    refetchInterval: pollWhileSaleOpen
      ? (query) => {
          const tiers = query.state.data?.data.tiers ?? []
          const now = Date.now()
          const saleOpen = tiers.some(
            (tier) =>
              new Date(tier.saleStartsAt).getTime() <= now &&
              now <= new Date(tier.saleEndsAt).getTime(),
          )
          return saleOpen ? 15_000 : false
        }
      : false,
  })
}

export function useEventStats(id: string) {
  return useQuery({
    queryKey: ['event', id, 'stats'],
    queryFn: async () => (await getV1EventsByIdStats({ path: { id }, throwOnError: true })).data,
    enabled: id.length > 0,
  })
}
