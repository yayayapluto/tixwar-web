import { createFileRoute } from '@tanstack/react-router'
import { Activity } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { CopyButton } from '@/components/copy-button'
import { DebugPageSkeleton, TraceListSkeleton } from '@/components/skeletons'
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
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { requireAdmin } from '@/features/auth/route-guard'
import { LoadGeneratorForm } from '@/features/debug/load-generator-form'
import { type DebugChaosRequest, useDebugChaos } from '@/features/debug/queries'
import { getDebugStream } from '@/lib/client'
import { ApiError } from '@/lib/errors'
import { useSse } from '@/lib/sse'
import { toast } from '@/lib/toast'

export const Route = createFileRoute('/debug/stream')({
  beforeLoad: () => {
    requireAdmin()
  },
  component: DebugPage,
  pendingComponent: DebugPageSkeleton,
})

const MAX_TRACES = 50

type Trace = {
  id: number
  ts: string
  raw: string
  step?: string
  status?: string
  durationMs?: number
  requestId?: string
  node?: string
  serverTs?: string
}

function parseTrace(id: number, payload: unknown): Trace {
  const ts = new Date().toISOString()
  const raw = JSON.stringify(payload, null, 2) ?? String(payload)
  if (typeof payload !== 'object' || payload === null) return { id, ts, raw }
  const obj = payload as Record<string, unknown>
  const text = (value: unknown) => (typeof value === 'string' ? value : undefined)
  const num = (value: unknown) => (typeof value === 'number' ? value : undefined)
  return {
    id,
    ts,
    raw,
    step: text(obj.step),
    status: text(obj.status),
    durationMs: num(obj.durationMs),
    requestId: text(obj.requestId),
    node: text(obj.node),
    serverTs: text(obj.ts),
  }
}

function timeOfDay(iso: string): string {
  return iso.length >= 19 ? iso.slice(11, 19) : iso
}

// The global MutationCache.onError already toasts 4xx errors, so a per-mutation
// onError only needs to cover the rest (5xx, network, unknown) to avoid a double toast.
function toastMutationError(error: unknown) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return
  toast(error instanceof ApiError ? error.detail : 'Something went wrong. Please try again.')
}

type ChaosAction = DebugChaosRequest['action']

const CHAOS_VALUE_HINT: Record<ChaosAction, { label: string; defaultValue?: number }> = {
  fail: { label: 'Value is the percent of requests that fail (0–100).', defaultValue: 100 },
  latency: { label: 'Value is added latency in milliseconds.', defaultValue: 200 },
  recover: { label: 'No value needed — recovers the target.', defaultValue: undefined },
  'failure-rate': {
    label: 'Value is the percent of requests that fail (0–100).',
    defaultValue: 50,
  },
  slow: { label: 'Value is added latency in milliseconds.', defaultValue: 1000 },
}

function chaosUnit(action: ChaosAction): string {
  return action === 'latency' || action === 'slow' ? 'ms' : '%'
}

function chaosSummary(request: DebugChaosRequest): string {
  const value =
    request.action === 'recover' || request.value === undefined
      ? ''
      : ` (${request.value}${chaosUnit(request.action)})`
  return `${request.target} ${request.action}${value}`
}

function validateChaos(form: DebugChaosRequest): string | null {
  if (form.action === 'recover') return null
  const value = form.value
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return 'Value must be above 0 — 0 has no effect.'
  }
  if (value > 60000) return 'Value must be at most 60000.'
  if ((form.action === 'fail' || form.action === 'failure-rate') && value > 100) {
    return 'Value must be between 1 and 100 for this action.'
  }
  return null
}

type ActiveChaos = {
  target: DebugChaosRequest['target']
  action: ChaosAction
  value?: number
  autoRecoverMs?: number
}

function TraceRow({ trace }: { trace: Trace }) {
  return (
    <article className="rounded border bg-muted/50 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <time dateTime={trace.serverTs ?? trace.ts} className="text-xs font-medium tabular-nums">
          {timeOfDay(trace.serverTs ?? trace.ts)}
        </time>
        {trace.step && <Badge variant="secondary">{trace.step}</Badge>}
        {trace.status && (
          <Badge
            variant={
              trace.status === 'error'
                ? 'destructive'
                : trace.status === 'ok'
                  ? 'default'
                  : 'outline'
            }
          >
            {trace.status}
          </Badge>
        )}
        {trace.durationMs !== undefined && (
          <span className="text-xs text-muted-foreground">{trace.durationMs} ms</span>
        )}
        {trace.requestId && (
          <span className="min-w-0 truncate text-xs text-muted-foreground" title={trace.requestId}>
            {trace.requestId}
          </span>
        )}
        <span className="ml-auto">
          <CopyButton value={trace.raw} label="Trace" />
        </span>
      </div>
      <pre className="mt-1 overflow-x-auto text-xs">{trace.raw}</pre>
    </article>
  )
}

function DebugPage() {
  const chaos = useDebugChaos()
  const [traces, setTraces] = useState<Trace[]>([])
  const [totalReceived, setTotalReceived] = useState(0)
  const idRef = useRef(0)
  const [streaming, setStreaming] = useState(true)
  const [retryKey, setRetryKey] = useState(0)
  const [streamError, setStreamError] = useState(false)
  const [query, setQuery] = useState('')
  const [stepFilter, setStepFilter] = useState('all')
  const [chaosForm, setChaosForm] = useState<DebugChaosRequest>({
    target: 'gateway',
    action: 'latency',
    value: 200,
  })
  const [chaosError, setChaosError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [activeChaos, setActiveChaos] = useState<ActiveChaos | null>(null)

  const sseStatus = useSse(streaming, [retryKey], (signal) =>
    getDebugStream({
      signal,
      onSseEvent: (ev) => {
        // Any event (ready, heartbeat, message) proves the connection is alive.
        setStreamError(false)
        if (ev.event === 'message') {
          idRef.current += 1
          const id = idRef.current
          const trace = parseTrace(id, ev.data)
          setTotalReceived((n) => n + 1)
          setTraces((prev) => [trace, ...prev].slice(0, MAX_TRACES))
        }
      },
      // The generated client retries internally and never throws to useSse,
      // so a failed attempt only surfaces here.
      onSseError: () => setStreamError(true),
    }),
  )

  const connectionStatus: 'paused' | 'connecting' | 'live' | 'error' = !streaming
    ? 'paused'
    : streamError
      ? 'error'
      : sseStatus === 'connected'
        ? 'live'
        : 'connecting'

  function retryStream() {
    setStreamError(false)
    setStreaming(true)
    setRetryKey((k) => k + 1)
  }

  function toggleStreaming() {
    setStreamError(false)
    setStreaming((s) => !s)
  }

  function clearTraces() {
    setTraces([])
    setTotalReceived(0)
  }

  const steps = useMemo(
    () => [...new Set(traces.map((t) => t.step).filter((s): s is string => Boolean(s)))].sort(),
    [traces],
  )
  const filteredTraces = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return traces.filter(
      (t) =>
        (stepFilter === 'all' || t.step === stepFilter) &&
        (needle === '' || t.raw.toLowerCase().includes(needle)),
    )
  }, [traces, query, stepFilter])
  const filtering = query.trim() !== '' || stepFilter !== 'all'

  function applyChaos(request: DebugChaosRequest) {
    chaos.mutate(request, {
      onSuccess: (envelope) => {
        const state = envelope.data
        if (!state.applied) {
          toast('Chaos was not applied. Check the service and try again.')
          return
        }
        if (request.action === 'recover') {
          setActiveChaos(null)
          toast(`Chaos recovered on ${request.target}`, { variant: 'success' })
          return
        }
        const autoRecoverMs =
          typeof state.detail.autoRecoverAfterMs === 'number'
            ? state.detail.autoRecoverAfterMs
            : undefined
        setActiveChaos({
          target: request.target,
          action: request.action,
          value: request.value,
          autoRecoverMs,
        })
        toast(`Chaos applied: ${chaosSummary(request)}`, { variant: 'success' })
      },
      onError: toastMutationError,
    })
  }

  function handleApplyClick() {
    const problem = validateChaos(chaosForm)
    if (problem) {
      setChaosError(problem)
      return
    }
    setChaosError(null)
    if (chaosForm.action === 'recover') {
      applyChaos(chaosForm)
    } else {
      setConfirmOpen(true)
    }
  }

  const streamErrorObject = new ApiError({
    status: 0,
    title: 'Stream disconnected',
    detail: 'The trace stream disconnected. Traces sent while it is down are lost.',
    code: 'NETWORK_ERROR',
    type: 'about:blank',
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Debug dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live request traces, load tests and chaos injection. The API must have DEBUG_ENABLED on.
        </p>
      </div>

      {activeChaos && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
        >
          <p className="text-sm font-medium text-destructive">
            Chaos active: {chaosSummary(activeChaos)}
            {activeChaos.autoRecoverMs !== undefined &&
              ` · recovers automatically after ${Math.round(activeChaos.autoRecoverMs / 1000)}s`}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => applyChaos({ target: activeChaos.target, action: 'recover' })}
            disabled={chaos.isPending}
          >
            Recover {activeChaos.target}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Trace stream</CardTitle>
            <Badge variant="secondary">
              <span
                aria-hidden="true"
                className={
                  connectionStatus === 'live'
                    ? 'mr-1.5 size-2 rounded-full bg-primary'
                    : connectionStatus === 'error'
                      ? 'mr-1.5 size-2 rounded-full bg-destructive'
                      : 'mr-1.5 size-2 rounded-full bg-muted-foreground'
                }
              />
              {connectionStatus === 'live'
                ? 'Live'
                : connectionStatus === 'error'
                  ? 'Disconnected'
                  : connectionStatus === 'paused'
                    ? 'Paused'
                    : 'Connecting…'}
            </Badge>
            <Badge variant="secondary">{totalReceived}</Badge>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearTraces}
                disabled={traces.length === 0}
              >
                Clear
              </Button>
              <Button
                variant={streaming ? 'default' : 'outline'}
                size="sm"
                onClick={toggleStreaming}
              >
                <Activity className="size-4" aria-hidden="true" />
                {streaming ? 'Streaming' : 'Paused'}
              </Button>
            </div>
          </div>
          <CardDescription>
            {totalReceived > traces.length
              ? `Menampilkan ${traces.length} dari ${totalReceived} trace`
              : `${totalReceived} trace received`}
            {filtering && ` · ${filteredTraces.length} of ${traces.length} match the filter`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter traces…"
              aria-label="Filter traces"
              className="min-w-40 flex-1"
            />
            <Select value={stepFilter} onValueChange={setStepFilter}>
              <SelectTrigger aria-label="Filter by step" className="w-44">
                <SelectValue placeholder="All steps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All steps</SelectItem>
                {steps.map((step) => (
                  <SelectItem key={step} value={step}>
                    {step}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {connectionStatus === 'error' && traces.length === 0 ? (
            <ErrorState error={streamErrorObject} onRetry={retryStream} />
          ) : connectionStatus === 'error' ? (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
            >
              <p className="text-sm font-medium text-destructive">
                Stream disconnected — new traces are not arriving.
              </p>
              <Button variant="outline" size="sm" className="ml-auto" onClick={retryStream}>
                Retry
              </Button>
            </div>
          ) : null}

          {traces.length === 0 ? (
            connectionStatus === 'connecting' ? (
              <TraceListSkeleton />
            ) : connectionStatus === 'paused' ? (
              <EmptyState
                title="Stream paused"
                description="Resume the stream to see traces."
                action={
                  <Button variant="outline" size="sm" onClick={toggleStreaming}>
                    Resume stream
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="No traces yet"
                description="Connected — waiting for traces. Run a load test or wait for traffic."
              />
            )
          ) : (
            <div
              role="log"
              aria-live="off"
              aria-label="Trace stream"
              className="max-h-[36rem] space-y-1 overflow-y-auto"
            >
              {filteredTraces.length === 0 ? (
                <p className="text-sm text-muted-foreground">No traces match the filter.</p>
              ) : (
                filteredTraces.map((t) => <TraceRow key={t.id} trace={t} />)
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Load generator</CardTitle>
          </CardHeader>
          <CardContent>
            <LoadGeneratorForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chaos injection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="target">Target</Label>
              <Select
                value={chaosForm.target}
                onValueChange={(v) =>
                  setChaosForm((f) => ({
                    ...f,
                    target: v as DebugChaosRequest['target'],
                  }))
                }
              >
                <SelectTrigger id="target" aria-label="Target">
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gateway">Gateway</SelectItem>
                  <SelectItem value="worker">Worker</SelectItem>
                  <SelectItem value="redis">Redis</SelectItem>
                  <SelectItem value="mongo">Mongo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select
                value={chaosForm.action}
                onValueChange={(v) => {
                  const action = v as DebugChaosRequest['action']
                  setChaosForm((f) => ({
                    ...f,
                    action,
                    value: CHAOS_VALUE_HINT[action].defaultValue,
                  }))
                }}
              >
                <SelectTrigger id="action" aria-label="Action">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fail">Fail</SelectItem>
                  <SelectItem value="latency">Latency</SelectItem>
                  <SelectItem value="recover">Recover</SelectItem>
                  <SelectItem value="failure-rate">Failure rate</SelectItem>
                  <SelectItem value="slow">Slow</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                inputMode="numeric"
                min={0}
                max={60000}
                disabled={chaosForm.action === 'recover'}
                value={chaosForm.value ?? ''}
                onChange={(e) => setChaosForm((f) => ({ ...f, value: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">
                {CHAOS_VALUE_HINT[chaosForm.action].label}
              </p>
            </div>
            {chaosError && (
              <p role="alert" className="text-xs text-destructive">
                {chaosError}
              </p>
            )}
            <Button onClick={handleApplyClick} disabled={chaos.isPending} className="w-full">
              {chaos.isPending ? 'Applying…' : 'Apply chaos'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply chaos to {chaosForm.target}?</AlertDialogTitle>
            <AlertDialogDescription>
              This applies “{chaosForm.action}”
              {chaosForm.action !== 'recover' &&
                chaosForm.value !== undefined &&
                ` (${chaosForm.value}${chaosUnit(chaosForm.action)})`}{' '}
              to {chaosForm.target}. It can degrade the service — use Recover to undo it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => applyChaos(chaosForm)} disabled={chaos.isPending}>
              Apply chaos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
