import { ChevronDown, ChevronUp, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

function ApiKeyRow({
  apiKey,
  onRotated,
}: {
  apiKey: ApiKey
  onRotated: (created: { name: string; apiKey: string }, oldKey: ApiKey) => void
}) {
  const revoke = useRevokeApiKey()
  const rotate = useCreateApiKey()
  const [revokeOpen, setRevokeOpen] = useState(false)
  // Expiry re-derived on a timer and on window focus, not just once per
  // render: a key that expires while the page sits open must flip to
  // Expired without waiting for a refetch.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, 60_000)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', tick)
    }
  }, [])
  // The API stores active:true until revoked, so expiry is derived here from
  // expiresAt; the row is a snapshot until the list refetches.
  const isExpired = apiKey.expiresAt !== null && new Date(apiKey.expiresAt).getTime() <= now
  // A successor inherits the old key's expiry, so rotation is only offered
  // while the key is still live: rotating an expired key would create a
  // successor that is born expired.
  const canRotate = apiKey.active && !isExpired
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium" title={apiKey.name}>
          {apiKey.name}
        </p>
        <p className="font-mono text-xs text-muted-foreground">{apiKey.prefix}…</p>
        <p className="text-xs text-muted-foreground">Created {formatDate(apiKey.createdAt)}</p>
        <p className="text-xs text-muted-foreground">
          {apiKey.lastUsedAt ? `Last used ${formatDate(apiKey.lastUsedAt)}` : 'Never used'}
        </p>
        {apiKey.expiresAt && (
          <p className="text-xs text-muted-foreground">
            {isExpired ? 'Expired' : 'Expires'} {formatDate(apiKey.expiresAt)}
          </p>
        )}
        {!apiKey.active && apiKey.revokedAt ? (
          <p className="text-xs text-muted-foreground">Revoked {formatDate(apiKey.revokedAt)}</p>
        ) : (
          // Reserved slot: keep the row height identical after a revoke, so
          // the rows below never jump when the Revoked line appears.
          <p aria-hidden="true" className="invisible text-xs text-muted-foreground">
            Revoked —
          </p>
        )}
      </div>
      <div className="flex w-72 shrink-0 items-center justify-between gap-2">
        <Badge
          variant={!apiKey.active ? 'secondary' : isExpired ? 'warning' : 'success'}
          className="min-w-[4.75rem] shrink-0 justify-center"
        >
          {!apiKey.active ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
        </Badge>
        {canRotate && (
          <Button
            variant="outline"
            size="sm"
            disabled={rotate.isPending}
            aria-label={`Rotate ${apiKey.name}`}
            onClick={() =>
              rotate.mutate(
                { name: apiKey.name, expiresAt: apiKey.expiresAt ?? undefined },
                {
                  onSuccess: (data) => onRotated({ name: data.name, apiKey: data.apiKey }, apiKey),
                  onError: toastMutationError,
                },
              )
            }
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {rotate.isPending ? 'Rotating…' : 'Rotate'}
          </Button>
        )}
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
              <p
                role="alert"
                aria-hidden={!revoke.isError}
                className={`min-h-5 text-sm ${revoke.isError ? 'text-destructive' : 'invisible'}`}
              >
                {revoke.isError ? mutationErrorMessage(revoke.error) : ''}
              </p>
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

// Shared by /api-keys (every logged-in user; admins land here from /settings)
// and the Developer section of /settings (regular users only). The API scopes
// keys per owner for non-admins, so the same UI is correct for both: admins
// see every key, users see only theirs.
export function ApiKeysManager() {
  const query = useApiKeys()
  const create = useCreateApiKey()
  const revokeOld = useRevokeApiKey()
  const [name, setName] = useState('')
  const [expiry, setExpiry] = useState<'never' | '7' | '30' | '90'>('never')
  const [created, setCreated] = useState<{ name: string; apiKey: string } | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [dismissOpen, setDismissOpen] = useState(false)
  // The key this fresh key replaces, while its old key is still active.
  // Set only by rotation; cleared once the old key is revoked or the new
  // key is dismissed (the old key then simply stays active).
  const [rotating, setRotating] = useState<{ id: string; name: string } | null>(null)
  // null = auto: collapsed by default. A first-timer gets the one-line
  // summary below instead of the full explainer, so the explainer no longer
  // competes with the create form on first paint; a fresh key still opens
  // it (created !== null). A manual toggle wins.
  const [explainerOpen, setExplainerOpen] = useState<boolean | null>(null)
  // Auto value captured once at mount — never re-derived from the live
  // query: while the list is loading the query has no data, so re-deriving
  // after it resolves would collapse the explainer under a returning user
  // and shove the Create card and the list down. A manual toggle wins.
  const [autoExplainerOpen] = useState(() => false)
  const showExplainer = explainerOpen ?? (autoExplainerOpen || created !== null)
  const exampleCurl = `curl -H "X-API-Key: ${created?.apiKey ?? '<your-key>'}" ${API_BASE_URL}/v1/events`
  const trimmedName = name.trim()
  const duplicateName =
    trimmedName.length > 0 &&
    (query.data?.data.some((key) => key.name.toLowerCase() === trimmedName.toLowerCase()) ?? false)

  function handleRotated(createdKey: { name: string; apiKey: string }, oldKey: ApiKey) {
    setCreated(createdKey)
    setRotating({ id: oldKey.id, name: oldKey.name })
    setKeyCopied(false)
    toast('API key rotated', { variant: 'success' })
  }

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
          {!showExplainer && (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                API keys let your apps call the TixWar API without a user login.
              </p>
            </CardContent>
          )}
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
                  <code className="min-w-0 flex-1 overflow-x-auto rounded bg-muted p-2 font-mono text-xs whitespace-nowrap">
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
                  <code className="min-w-0 flex-1 overflow-x-auto rounded bg-muted p-2 font-mono text-xs whitespace-nowrap">
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
        <CardContent className="space-y-2">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              const expiresAt =
                expiry === 'never'
                  ? undefined
                  : new Date(Date.now() + Number(expiry) * 24 * 60 * 60 * 1000).toISOString()
              create.mutate(
                { name: trimmedName, expiresAt },
                {
                  onSuccess: (data) => {
                    setCreated({ name: data.name, apiKey: data.apiKey })
                    setRotating(null)
                    setKeyCopied(false)
                    setName('')
                    setExpiry('never')
                    toast('API key created', { variant: 'success' })
                  },
                  onError: toastMutationError,
                },
              )
            }}
          >
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="key-name">Key name</Label>
                <Input
                  id="key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Key name"
                  required
                />
              </div>
              <div className="w-44 shrink-0 space-y-2">
                <Label htmlFor="key-expiry">Expiry</Label>
                <Select value={expiry} onValueChange={(value) => setExpiry(value as typeof expiry)}>
                  <SelectTrigger id="key-expiry" aria-label="Expiry">
                    <SelectValue placeholder="Expiry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">No expiry</SelectItem>
                    <SelectItem value="7">Expires in 7 days</SelectItem>
                    <SelectItem value="30">Expires in 30 days</SelectItem>
                    <SelectItem value="90">Expires in 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={create.isPending || trimmedName.length === 0}
            >
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </form>
          {/* Reserved slot mirroring the revoke dialog's: a failed create, or
              a name that already exists, never shoves the list below down. */}
          <p
            role="alert"
            aria-hidden={!create.isError && !duplicateName}
            className={`min-h-5 text-sm ${
              create.isError ? 'text-destructive' : duplicateName ? 'text-warning' : 'invisible'
            }`}
          >
            {create.isError
              ? mutationErrorMessage(create.error)
              : duplicateName
                ? `A key named "${trimmedName}" already exists.`
                : ''}
          </p>
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
              <code className="min-w-0 flex-1 overflow-x-auto rounded bg-muted p-2 font-mono text-sm whitespace-nowrap">
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
            {rotating && (
              <p className="text-sm text-muted-foreground">
                This key replaces {rotating.name}. Copy it, update your integrations, then revoke
                the old key — both keys work until then.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton
                value={exampleCurl}
                label="Example request"
                textLabel="Copy example request"
                onCopied={() => toast('Example copied', { variant: 'success' })}
              />
              {rotating && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!keyCopied || revokeOld.isPending}
                  onClick={() =>
                    revokeOld.mutate(rotating.id, {
                      onSuccess: () => setRotating(null),
                      onError: toastMutationError,
                    })
                  }
                >
                  {revokeOld.isPending ? 'Revoking…' : 'Revoke old key'}
                </Button>
              )}
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
                      setRotating(null)
                      toast('Key dismissed', { variant: 'success' })
                    }}
                  >
                    Dismiss key
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p
              aria-hidden={keyCopied}
              className={`text-xs text-muted-foreground ${keyCopied ? 'invisible' : ''}`}
            >
              Copy the key first — once dismissed, it can&apos;t be shown again.
            </p>
          </CardContent>
        </Card>
      )}

      {query.isPending ? (
        <ApiKeysListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState title="No API keys" description="Create one to integrate with the API." />
      ) : (
        <div className="space-y-2">
          {query.data.data.map((key) => (
            <ApiKeyRow key={key.id} apiKey={key} onRotated={handleRotated} />
          ))}
        </div>
      )}
    </div>
  )
}
