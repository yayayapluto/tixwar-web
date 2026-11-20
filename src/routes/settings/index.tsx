import { createFileRoute } from '@tanstack/react-router'
import { SettingsPageSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ApiKeysManager } from '@/features/api-keys/api-keys-manager'
import { requireAuth } from '@/features/auth/route-guard'
import { useSession } from '@/features/auth/use-auth'

export const Route = createFileRoute('/settings/')({
  beforeLoad: () => {
    requireAuth()
  },
  component: SettingsPage,
  pendingComponent: SettingsPageSkeleton,
})

function SettingsPage() {
  const session = useSession()
  const isAdmin = session?.user.role === 'admin'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section aria-labelledby="account-heading" className="space-y-4">
        <h2 id="account-heading" className="text-lg font-semibold">
          Account
        </h2>
        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="truncate text-sm font-medium">{session?.user.email}</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant={isAdmin ? 'default' : 'secondary'}>
                {isAdmin ? 'Admin' : 'Customer'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="developer-heading" className="space-y-4">
        <h2 id="developer-heading" className="text-lg font-semibold">
          Developer
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage API keys to call the TixWar API from your own apps, services, or scripts.
        </p>
        <ApiKeysManager />
      </section>
    </div>
  )
}
