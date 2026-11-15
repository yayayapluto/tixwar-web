import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          if (error.status === 401 || error.status === 403 || error.status === 404) return false
          if (error.code === 'SOLD_OUT' || error.code === 'ORDER_EXPIRED') return false
          if (error.status === 429) return failureCount < 2
        }
        return failureCount < 2
      },
      staleTime: 30_000,
    },
  },
})
