import { AlertTriangle, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/errors'

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.detail : 'Something went wrong.'
  const retryAfter = error instanceof ApiError ? error.retryAfterSeconds : undefined
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
    >
      <AlertTriangle className="animate-shake-once size-8 text-destructive" aria-hidden="true" />
      <p className="text-sm font-medium text-destructive">{message}</p>
      {retryAfter !== undefined && (
        <p className="text-xs text-muted-foreground">Try again in {retryAfter}s</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
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
