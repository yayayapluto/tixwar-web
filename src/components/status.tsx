import { AlertTriangle, Inbox } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/errors'

export function ErrorState({
  error,
  onRetry,
  fallbackTitle = 'Something went wrong.',
  retryLabel = 'Retry',
  formatRetryAfter = (seconds: number) => `Try again in ${seconds}s`,
}: {
  error: unknown
  onRetry?: () => void
  /** Shown when the error carries no message; English default, pass Indonesian per page. */
  fallbackTitle?: string
  /** Retry button label; English default, pass Indonesian per page. */
  retryLabel?: string
  /** Rate-limit hint; English default, pass Indonesian per page. */
  formatRetryAfter?: (seconds: number) => string
}) {
  const message = error instanceof ApiError ? error.detail : fallbackTitle
  const retryAfter = error instanceof ApiError ? error.retryAfterSeconds : undefined
  return (
    <Alert
      variant="destructive"
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl p-8 text-center"
    >
      <AlertTriangle className="animate-shake-once size-8 text-destructive" aria-hidden="true" />
      <p className="text-sm font-medium text-destructive">{message}</p>
      {retryAfter !== undefined && (
        <p className="text-xs text-muted-foreground">{formatRetryAfter(retryAfter)}</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </Alert>
  )
}

export function EmptyState({
  title,
  description,
  action,
  hideIcon,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  hideIcon?: boolean
}) {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center">
      {!hideIcon && <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" className="space-y-3">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static rows, never reordered
        <div key={i} className="space-y-2 rounded-xl border p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  )
}
