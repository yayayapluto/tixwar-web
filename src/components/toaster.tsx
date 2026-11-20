import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dismissToast, useToasts } from '@/lib/toast'

export function Toaster() {
  const toasts = useToasts()
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:w-96"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className="pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-destructive/40 bg-background p-3 shadow-lg"
        >
          <p className="flex-1 text-sm text-foreground">{toast.message}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
    </div>
  )
}
