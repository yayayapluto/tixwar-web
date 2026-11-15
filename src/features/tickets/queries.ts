import type { components } from '@api-types'
import { useQuery } from '@tanstack/react-query'
import { getV1Tickets, getV1TicketsById } from '@/lib/client'

export type Ticket = components['schemas']['Ticket']
export type TicketDetail = components['schemas']['TicketDetail']

export function useTickets() {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: async () => (await getV1Tickets({ throwOnError: true })).data,
  })
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => (await getV1TicketsById({ path: { id }, throwOnError: true })).data,
    enabled: id.length > 0,
  })
}
