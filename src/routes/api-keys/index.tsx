import { createFileRoute } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CopyButton } from '@/components/copy-button'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/status'
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
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  type ApiKey,
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from '@/features/api-keys/queries'
import { requireAdmin } from '@/features/auth/route-guard'
import { API_BASE_URL } from '@/lib/api'
import { toast } from '@/lib/toast'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/api-keys/')({
  beforeLoad: () => {
    requireAdmin()
  },
  component: ApiKeysPage,
})

function ApiKeyRow({ apiKey }: { apiKey: ApiKey }) {
  const revoke = useRevokeApiKey()
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium">{apiKey.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{apiKey.prefix}…</p>
        <p className="text-xs text-muted-foreground">Created {formatDate(apiKey.createdAt)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={apiKey.active ? 'success' : 'secondary'}>
          {apiKey.active ? 'Active' : 'Revoked'}
        </Badge>
        {apiKey.active && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={revoke.isPending}
                aria-label={`Revoke ${apiKey.name}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Revoke
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke {apiKey.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Integrations using this key will stop working. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep key</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: 'destructive' })}
                  onClick={() => revoke.mutate(apiKey.id)}
                >
                  Revoke key
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}

function ApiKeysPage() {
  const query = useApiKeys()
  const create = useCreateApiKey()
  const [name, setName] = useState('')
  const [created, setCreated] = useState<{ name: string; apiKey: string } | null>(null)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">API keys</h1>

      <Card>
        <CardHeader>
          <CardTitle>What are API keys for?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            API keys let external apps, services, or scripts call the TixWar API without a user
            login. Send the key as the{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">X-API-Key</code> header
            on every request.
          </p>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Base URL</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
                {API_BASE_URL}
              </code>
              <CopyButton
                value={API_BASE_URL}
                label="Base URL"
                onCopied={() => toast('Base URL copied', { variant: 'success' })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Example</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
                {`curl -H "X-API-Key: <your-key>" ${API_BASE_URL}/v1/events`}
              </code>
              <CopyButton
                value={`curl -H "X-API-Key: <your-key>" ${API_BASE_URL}/v1/events`}
                label="Example request"
                onCopied={() => toast('Example copied', { variant: 'success' })}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            A key is shown only once when created, so store it safely. Revoking a key stops every
            integration using it, and can&apos;t be undone.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create key</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              create.mutate(name, {
                onSuccess: (data) => {
                  setCreated({ name: data.name, apiKey: data.apiKey })
                  setName('')
                },
              })
            }}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="key-name" className="sr-only">
                Key name
              </Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Key name"
                required
              />
            </div>
            <Button type="submit" disabled={create.isPending || name.trim().length === 0}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {created && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Copy your key now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This key is shown only once. Store it safely.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded bg-muted p-2 text-xs">
                {created.apiKey}
              </code>
              <CopyButton
                value={created.apiKey}
                label="API key"
                onCopied={() => toast('API key copied', { variant: 'success' })}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCreated(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {query.isPending ? (
        <ListSkeleton rows={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState title="No API keys" description="Create one to integrate with the API." />
      ) : (
        <div className="space-y-2">
          {query.data.data.map((key) => (
            <ApiKeyRow key={key.id} apiKey={key} />
          ))}
        </div>
      )}
    </div>
  )
}
