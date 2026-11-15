import type { components } from '@api-types'
import { useQueryClient } from '@tanstack/react-query'
import { getV1OrdersByIdStream } from '@/lib/client'
import { useSse } from '@/lib/sse'

type OrderStatus = components['schemas']['Order']['status']

export function useOrderStream(orderId: string, enabled: boolean) {
  const queryClient = useQueryClient()
  useSse(enabled, [orderId], (signal) =>
    getV1OrdersByIdStream({
      path: { id: orderId },
      signal,
      onSseEvent: (ev) => {
        if (ev.event !== 'message') return
        const msg = ev.data as { type?: string; status?: OrderStatus }
        if (msg.type !== 'order.status' || !msg.status) return
        const status = msg.status
        queryClient.setQueryData<{ data: { order: { status: OrderStatus } } }>(
          ['order', orderId],
          (old) => {
            if (!old?.data?.order) return old
            return { ...old, data: { ...old.data, order: { ...old.data.order, status } } }
          },
        )
        if (status === 'CONFIRMED') {
          queryClient.invalidateQueries({ queryKey: ['tickets'] })
        }
        queryClient.invalidateQueries({ queryKey: ['orders'] })
      },
    }),
  )
}
