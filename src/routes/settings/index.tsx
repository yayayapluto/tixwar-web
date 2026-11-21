import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { SettingsPageSkeleton } from '@/components/skeletons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ApiKeysManager } from '@/features/api-keys/api-keys-manager'
import { requireAuth } from '@/features/auth/route-guard'
import { useLogout, useSession } from '@/features/auth/use-auth'
import { useTour } from '@/features/onboarding/tour-context'
import { useDocumentTitle } from '@/lib/document-title'

export const Route = createFileRoute('/settings/')({
  beforeLoad: () => {
    const session = requireAuth()
    // One canonical home for API keys: admins go to /api-keys, where they
    // see every key. /settings stays the regular user's home, so nobody
    // lands on a key list with no owner shown.
    if (session.user.role === 'admin') {
      throw redirect({ to: '/api-keys' })
    }
  },
  component: SettingsPage,
  pendingComponent: SettingsPageSkeleton,
})

function SettingsPage() {
  useDocumentTitle('Settings')
  const session = useSession()
  const logout = useLogout()
  const tour = useTour()
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Your account and developer tools in one place.
      </p>

      <section aria-labelledby="account-heading" className="space-y-4">
        <h2 id="account-heading" className="text-lg font-semibold">
          Account
        </h2>
        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex items-center justify-between gap-2">
              <p className="shrink-0 text-sm text-muted-foreground">Email</p>
              <p className="min-h-5 min-w-0 truncate text-sm font-medium">{session?.user.email}</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="shrink-0 text-sm text-muted-foreground">Password</p>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Change password
              </Link>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="shrink-0 text-sm text-muted-foreground">Sign out</p>
              <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Sign out
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Log out?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You&apos;ll be signed out on this device and need to log in again to continue.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className={buttonVariants({ variant: 'destructive' })}
                      onClick={() => logout.mutate()}
                    >
                      Log out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            {/* Admins never reach this page (redirected to /api-keys), but
                the row is guarded anyway: the tour is for regular users. */}
            {session?.user.role !== 'admin' && (
              <div className="flex items-center justify-between gap-2">
                <p className="shrink-0 text-sm text-muted-foreground">Show Onboarding</p>
                <Button variant="outline" size="sm" onClick={() => void tour.startTour()}>
                  Start tour
                </Button>
              </div>
            )}
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
