import type { components } from '@api-types'
import { useQuery } from '@tanstack/react-query'
import { getV1Events, getV1EventsById, getV1EventsByIdStats } from '@/lib/client'

export type Event = components['schemas']['Event']
export type EventDetail = components['schemas']['EventDetail']
export type TicketTier = components['schemas']['TicketTier']
export type EventStatus = Event['status']

export type EventFilters = {
  q?: string
  category?: string
  city?: string
  status?: EventStatus
  page?: number
  limit?: number
}

export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: async () => (await getV1Events({ query: filters, throwOnError: true })).data,
  })
}

export function useEvent(id: string, includeTiers = true) {
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
  })
}

export function useEventStats(id: string) {
  return useQuery({
    queryKey: ['event', id, 'stats'],
    queryFn: async () => (await getV1EventsByIdStats({ path: { id }, throwOnError: true })).data,
    enabled: id.length > 0,
  })
}
