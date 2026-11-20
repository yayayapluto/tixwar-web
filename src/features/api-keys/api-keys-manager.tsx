import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { CopyButton } from '@/components/copy-button'
import { ApiKeysListSkeleton } from '@/components/skeletons'
import { EmptyState, ErrorState } from '@/components/status'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  type ApiKey,
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from '@/features/api-keys/queries'
import { API_BASE_URL } from '@/lib/api'
import { ApiError } from '@/lib/errors'
import { toast } from '@/lib/toast'
import { formatDate } from '@/lib/utils'

function mutationErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.detail : 'Something went wrong. Please try again.'
}

// The global MutationCache.onError already toasts 4xx errors, so a per-mutation
// onError only needs to cover the rest (5xx, network, unknown) to avoid a double toast.
function toastMutationError(error: unknown) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return
  toast(mutationErrorMessage(error))
}

function ApiKeyRow({ apiKey }: { apiKey: ApiKey }) {
  const revoke = useRevokeApiKey()
  const [revokeOpen, setRevokeOpen] = useState(false)
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium" title={apiKey.name}>
          {apiKey.name}
        </p>
        <p className="font-mono text-xs text-muted-foreground">{apiKey.prefix}…</p>
        <p className="text-xs text-muted-foreground">Created {formatDate(apiKey.createdAt)}</p>
        {!apiKey.active && apiKey.revokedAt && (
          <p className="text-xs text-muted-foreground">Revoked {formatDate(apiKey.revokedAt)}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={apiKey.active ? 'success' : 'secondary'}>
          {apiKey.active ? 'Active' : 'Revoked'}
        </Badge>
        {apiKey.active && (
          <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
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
              {revoke.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {mutationErrorMessage(revoke.error)}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>Keep key</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: 'destructive' })}
                  disabled={revoke.isPending}
                  onClick={() =>
                    revoke.mutate(apiKey.id, {
                      // Close only on success, so a failed revoke never looks done.
                      onSuccess: () => setRevokeOpen(false),
                      onError: toastMutationError,
                    })
                  }
                >
                  {revoke.isPending ? 'Revoking…' : 'Revoke key'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}

// Shared by the /api-keys page (admin shortcut) and the Developer section of
// /settings (regular users). The API scopes keys per owner for non-admins, so
// the same UI is correct for both: admins see every key, users see only theirs.
export function ApiKeysManager() {
  const query = useApiKeys()
  const create = useCreateApiKey()
  const [name, setName] = useState('')
  const [created, setCreated] = useState<{ name: string; apiKey: string } | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [dismissOpen, setDismissOpen] = useState(false)
  // null = auto: open for a first-timer or while a fresh key is on screen,
  // collapsed for a returning user who already has keys. A manual toggle wins.
  const [explainerOpen, setExplainerOpen] = useState<boolean | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const hasKeys = (query.data?.data.length ?? 0) > 0
  const showExplainer = explainerOpen ?? (!hasKeys || created !== null)
  const exampleCurl = `curl -H "X-API-Key: ${created?.apiKey ?? '<your-key>'}" ${API_BASE_URL}/v1/events`

  return (
    <div className="space-y-4">
      <Collapsible open={showExplainer} onOpenChange={(open) => setExplainerOpen(open)}>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>What are API keys for?</CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {showExplainer ? 'Hide explanation' : 'Show explanation'}
                {showExplainer ? (
                  <ChevronUp className="size-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="size-4" aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                API keys let external apps, services, or scripts call the TixWar API without a user
                login. Send the key as the{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">X-API-Key</code>{' '}
                header on every request.
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
                    {exampleCurl}
                  </code>
                  <CopyButton
                    value={exampleCurl}
                    label="Example request"
                    onCopied={() => toast('Example copied', { variant: 'success' })}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                A key is shown only once when created, so store it safely. Revoking a key stops
                every integration using it, and can&apos;t be undone.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle>Create key</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              create.mutate(name.trim(), {
                onSuccess: (data) => {
                  setCreated({ name: data.name, apiKey: data.apiKey })
                  setKeyCopied(false)
                  setName('')
                  toast('API key created', { variant: 'success' })
                },
                onError: toastMutationError,
              })
            }}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="key-name" className="sr-only">
                Key name
              </Label>
              <Input
                ref={nameInputRef}
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
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Copy your key now</CardTitle>
            <Badge>New key</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This key is shown only once. Store it safely — the example above is already filled in
              with this key.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded bg-muted p-2 font-mono text-sm">
                {created.apiKey}
              </code>
              <CopyButton
                value={created.apiKey}
                label="API key"
                onCopied={() => {
                  setKeyCopied(true)
                  toast('API key copied', { variant: 'success' })
                }}
              />
            </div>
            <AlertDialog open={dismissOpen} onOpenChange={setDismissOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={!keyCopied}>
                  Dismiss
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Dismiss this key?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You won&apos;t see this key again. Make sure you&apos;ve stored it somewhere
                    safe — there&apos;s no way to recover it after this.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep key</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setCreated(null)
                      setKeyCopied(false)
                    }}
                  >
                    Dismiss key
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {!keyCopied && (
              <p className="text-xs text-muted-foreground">
                Copy the key first — once dismissed, it can&apos;t be shown again.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {query.isPending ? (
        <ApiKeysListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          title="No API keys"
          description="Create one to integrate with the API."
          action={
            <Button variant="outline" size="sm" onClick={() => nameInputRef.current?.focus()}>
              Create your first key
            </Button>
          }
        />
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
