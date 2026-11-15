import { MutationCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './errors'
import { toast } from './toast'

function userFaultMessage(error: ApiError): string {
  if (error.errors?.length) {
    return error.errors
      .map((item) => (item.field ? `${item.field}: ${item.message}` : item.message))
      .join(' · ')
  }
  return error.detail
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        toast(userFaultMessage(error))
      }
    },
  }),
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
