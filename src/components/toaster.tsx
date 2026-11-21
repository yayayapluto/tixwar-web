import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { useTheme } from '@/features/theme/theme-context'

// App-level toast host: Sonner (shadcn's toast primitive), top-right. The top
// offset clears the slim header (64px), 16px from the edge, at most 4 toasts
// at once.
export function Toaster() {
  const { theme } = useTheme()
  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      offset={{ top: '64px', right: '16px', bottom: '16px', left: '16px' }}
      mobileOffset={{ top: '64px', left: '16px', right: '16px' }}
      gap={8}
      visibleToasts={4}
      closeButton
      richColors
    />
  )
}
