import { createFileRoute } from '@tanstack/react-router'
import { ApiKeysPageSkeleton } from '@/components/skeletons'
import { ApiKeysManager } from '@/features/api-keys/api-keys-manager'
import { requireAuth } from '@/features/auth/route-guard'

export const Route = createFileRoute('/api-keys/')({
  beforeLoad: () => {
    // Any logged-in user: the API scopes keys per owner for non-admins.
    requireAuth()
  },
  component: ApiKeysPage,
  pendingComponent: ApiKeysPageSkeleton,
})

function ApiKeysPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">API keys</h1>
      <ApiKeysManager />
    </div>
  )
}
