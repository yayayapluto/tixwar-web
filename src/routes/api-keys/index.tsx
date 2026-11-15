import { createFileRoute } from '@tanstack/react-router'
import { Copy, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  type ApiKey,
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from '@/features/api-keys/queries'
import { requireAuth } from '@/features/auth/route-guard'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/api-keys/')({
  beforeLoad: ({ location }) => {
    requireAuth(location.href)
  },
  component: ApiKeysPage,
})

function ApiKeyRow({ apiKey }: { apiKey: ApiKey }) {
  const revoke = useRevokeApiKey()
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{apiKey.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{apiKey.prefix}…</p>
        <p className="text-xs text-muted-foreground">Created {formatDate(apiKey.createdAt)}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={apiKey.active ? 'success' : 'secondary'}>
          {apiKey.active ? 'Active' : 'Revoked'}
        </Badge>
        {apiKey.active && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => revoke.mutate(apiKey.id)}
            disabled={revoke.isPending}
            aria-label={`Revoke ${apiKey.name}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Revoke
          </Button>
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
  const [copied, setCopied] = useState(false)

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key)
    setCopied(true)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">API keys</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create key</CardTitle>
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
            <CardTitle className="text-base">Copy your key now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This key is shown only once. Store it safely.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-muted p-2 text-xs">
                {created.apiKey}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyKey(created.apiKey)}
                aria-label="Copy API key"
              >
                {copied ? (
                  <span aria-hidden="true">✓</span>
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
              </Button>
            </div>
            {copied && <p className="text-xs text-muted-foreground">Copied.</p>}
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
