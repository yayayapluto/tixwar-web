import { useQueryClient } from '@tanstack/react-query'
import { getV1EventsByIdStream } from '@/lib/client'
import { useSse } from '@/lib/sse'

export function useStockStream(eventId: string, enabled: boolean) {
  const queryClient = useQueryClient()
  useSse(enabled, [eventId], (signal) =>
    getV1EventsByIdStream({
      path: { id: eventId },
      signal,
      onSseEvent: (ev) => {
        if (ev.event !== 'message') return
        const msg = ev.data as { type?: string }
        if (msg.type !== 'stock.released') return
        queryClient.invalidateQueries({ queryKey: ['event', eventId] })
        queryClient.invalidateQueries({ queryKey: ['event', eventId, 'stats'] })
      },
    }),
  )
}
