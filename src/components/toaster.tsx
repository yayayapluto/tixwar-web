import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { useTheme } from '@/features/theme/theme-context'

// App-level toast host: Sonner (shadcn's toast primitive), bottom-right so it
// never covers the sticky header. The bottom offset clears the floating
// bottom bar (bar top edge sits ~72px up on desktop, ~90px with a phone
// home-indicator safe area), 16px from the edge, at most 4 toasts at once.
export function Toaster() {
  const { theme } = useTheme()
  return (
    <SonnerToaster
      theme={theme}
      position="bottom-right"
      offset={{ top: '16px', right: '16px', bottom: '104px', left: '16px' }}
      mobileOffset={{ bottom: '104px', left: '16px', right: '16px' }}
      gap={8}
      visibleToasts={4}
      closeButton
      richColors
    />
  )
}
