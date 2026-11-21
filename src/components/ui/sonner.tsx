import { CircleCheck, CircleX } from 'lucide-react'
import type * as React from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheck className="size-4 text-success" aria-hidden="true" />,
        error: <CircleX className="size-4 text-destructive" aria-hidden="true" />,
      }}
      toastOptions={{
        duration: 6000,
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-border': 'var(--border)',
          '--normal-text': 'var(--popover-foreground)',
          '--border-radius': 'var(--radius)',
          // Rich-colors tints are overridden so a toast keeps the app's
          // bg-background surface and only the border carries the variant
          // color, like the previous hand-rolled toaster did.
          '--success-bg': 'var(--background)',
          '--success-border': 'color-mix(in oklch, var(--success) 40%, transparent)',
          '--success-text': 'var(--foreground)',
          '--error-bg': 'var(--background)',
          '--error-border': 'color-mix(in oklch, var(--destructive) 40%, transparent)',
          '--error-text': 'var(--foreground)',
          '--width': '24rem',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
