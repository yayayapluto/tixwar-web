import { CircleCheck, CircleX, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dismissToast, pauseToast, resumeToast, useToasts } from '@/lib/toast'
import { cn } from '@/lib/utils'

export function Toaster() {
  const toasts = useToasts()
  if (toasts.length === 0) return null

  return (
    // z-[60] sits above Radix Dialog/Sheet overlays (z-50), so a toast fired
    // while a dialog or drawer is open stays visible. top-16 clears the
    // sticky header instead of covering its theme/login buttons.
    <div className="pointer-events-none fixed inset-x-4 top-16 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:w-96">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          aria-atomic="true"
          onMouseEnter={() => pauseToast(toast.id)}
          onMouseLeave={() => resumeToast(toast.id)}
          onFocus={() => pauseToast(toast.id)}
          onBlur={(event) => {
            // Focus moving between the toast and its dismiss button is still
            // inside the toast; only resume once focus leaves it entirely.
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              resumeToast(toast.id)
            }
          }}
          className={cn(
            'pointer-events-auto flex w-full animate-in items-start gap-3 rounded-lg border bg-background p-3 shadow-lg duration-200 ease-out fade-in slide-in-from-top-4 zoom-in-95',
            toast.variant === 'success' ? 'border-success/40' : 'border-destructive/40',
          )}
        >
          {toast.variant === 'success' ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          )}
          <p className="flex-1 text-sm text-foreground">{toast.message}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
    </div>
  )
}
