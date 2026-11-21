import { Activity } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type DebugLoadRequest, useDebugLoad } from '@/features/debug/queries'
import { ApiError } from '@/lib/errors'
import { toast } from '@/lib/toast'

type LoadSummary = {
  scenario: string
  requests: number
  concurrency: number
  succeeded: number
  failed: number
  requestsPerSecond: number
  p95Ms: number
}

type LastRun = {
  scenario: string
  requests: number
  concurrency: number
  summary: LoadSummary | null
}

// The generated client types the load endpoint as 200: void, but the API
// actually returns an envelope `{ data: LoadSummary }`. Narrow it at runtime.
function parseLoadSummary(input: unknown): LoadSummary | null {
  if (typeof input !== 'object' || input === null) return null
  const data = (input as { data?: unknown }).data
  if (typeof data !== 'object' || data === null) return null
  const d = data as Record<string, unknown>
  if (
    typeof d.scenario !== 'string' ||
    typeof d.requests !== 'number' ||
    typeof d.concurrency !== 'number' ||
    typeof d.succeeded !== 'number' ||
    typeof d.failed !== 'number' ||
    typeof d.requestsPerSecond !== 'number' ||
    typeof d.p95Ms !== 'number'
  ) {
    return null
  }
  return {
    scenario: d.scenario,
    requests: d.requests,
    concurrency: d.concurrency,
    succeeded: d.succeeded,
    failed: d.failed,
    requestsPerSecond: d.requestsPerSecond,
    p95Ms: d.p95Ms,
  }
}

// The global MutationCache.onError already toasts 4xx errors, so a per-mutation
// onError only needs to cover the rest (5xx, network, unknown) to avoid a double toast.
function toastMutationError(error: unknown) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return
  toast(error instanceof ApiError ? error.detail : 'Something went wrong. Please try again.')
}

function validate(form: DebugLoadRequest): string | null {
  if (form.eventId && !/^evt_[A-Za-z0-9_-]{1,64}$/.test(form.eventId)) {
    return 'Event ID must look like evt_…'
  }
  if (form.tierId && !/^tier_[A-Za-z0-9_-]{1,64}$/.test(form.tierId)) {
    return 'Tier ID must look like tier_…'
  }
  const concurrency = form.concurrency
  if (
    !Number.isInteger(concurrency) ||
    concurrency === undefined ||
    concurrency < 1 ||
    concurrency > 200
  ) {
    return 'Concurrency must be a whole number between 1 and 200.'
  }
  const requests = form.requests
  if (!Number.isInteger(requests) || requests === undefined || requests < 1 || requests > 5000) {
    return 'Requests must be a whole number between 1 and 5000.'
  }
  const quantity = form.quantity ?? 1
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    return 'Quantity must be a whole number between 1 and 10.'
  }
  return null
}

export function LoadGeneratorForm({
  initialEventId,
  initialTierId,
}: {
  initialEventId?: string
  initialTierId?: string
}) {
  const load = useDebugLoad()
  const [form, setForm] = useState<DebugLoadRequest>({
    scenario: 'single',
    eventId: initialEventId,
    tierId: initialTierId,
    concurrency: 20,
    requests: 100,
    quantity: 1,
  })
  const [error, setError] = useState<string | null>(null)
  const [lastRun, setLastRun] = useState<LastRun | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // Live progress while a run is in flight: the load endpoint returns only
  // when the whole run finishes, so elapsed time is the only progress the
  // client can show. Cancel is not possible: useDebugLoad's mutation takes
  // no AbortSignal and its mutationFn lives outside this file, so there is
  // nothing to abort — the run finishes on the server either way.
  const running = load.isPending
  useEffect(() => {
    if (!running) return
    setElapsed(0)
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [running])

  function runLoad() {
    const problem = validate(form)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setConfirmOpen(true)
  }

  function runConfirmed() {
    load.mutate(form, {
      onSuccess: (res) => {
        const summary = parseLoadSummary(res.data)
        setLastRun({
          scenario: form.scenario,
          requests: form.requests ?? 0,
          concurrency: form.concurrency ?? 0,
          summary,
        })
        toast(
          summary
            ? `Load test finished: ${summary.succeeded} succeeded, ${summary.failed} failed of ${summary.requests} requests`
            : `Load test finished: ${form.scenario} · ${form.requests ?? 0} requests`,
          { variant: 'success' },
        )
      },
      onError: toastMutationError,
    })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="scenario">Scenario</Label>
        <Select
          value={form.scenario}
          disabled={running}
          onValueChange={(v) =>
            setForm((f) => ({
              ...f,
              scenario: v as DebugLoadRequest['scenario'],
            }))
          }
        >
          <SelectTrigger id="scenario" aria-label="Scenario">
            <SelectValue placeholder="Select scenario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single</SelectItem>
            <SelectItem value="crowd">Crowd</SelectItem>
            <SelectItem value="abuse">Abuse</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="eventId">Event ID</Label>
          <Input
            id="eventId"
            value={form.eventId ?? ''}
            disabled={running}
            onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))}
            placeholder="evt_…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tierId">Tier ID</Label>
          <Input
            id="tierId"
            value={form.tierId ?? ''}
            disabled={running}
            onChange={(e) => setForm((f) => ({ ...f, tierId: e.target.value }))}
            placeholder="tier_…"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="concurrency">Concurrency</Label>
          <Input
            id="concurrency"
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            value={form.concurrency}
            disabled={running}
            onChange={(e) => setForm((f) => ({ ...f, concurrency: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requests">Requests</Label>
          <Input
            id="requests"
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            value={form.requests}
            disabled={running}
            onChange={(e) => setForm((f) => ({ ...f, requests: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            value={form.quantity ?? 1}
            disabled={running}
            onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
          />
        </div>
      </div>
      <div className="min-h-4">
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button onClick={runLoad} disabled={running} className="w-full">
        <Activity className="size-4" aria-hidden="true" />
        {running ? 'Running…' : 'Run load'}
      </Button>
      <div className="min-h-8">
        {running ? (
          <p className="text-xs text-muted-foreground tabular-nums" role="status">
            Running {form.scenario} · {form.requests ?? 0} requests · concurrency{' '}
            {form.concurrency ?? 0} · {elapsed}s elapsed. The run cannot be cancelled once started.
          </p>
        ) : (
          lastRun && (
            <p className="text-xs text-muted-foreground tabular-nums">
              Last run: {lastRun.scenario} · {lastRun.requests} requests · concurrency{' '}
              {lastRun.concurrency}
              {lastRun.summary
                ? ` · ${lastRun.summary.succeeded} succeeded, ${lastRun.summary.failed} failed · ${Math.round(lastRun.summary.requestsPerSecond)} req/s · p95 ${Math.round(lastRun.summary.p95Ms)} ms`
                : ' · finished, no summary returned'}
            </p>
          )
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run load test?</AlertDialogTitle>
            <AlertDialogDescription>
              This fires {form.requests ?? 0} requests ({form.scenario} scenario, concurrency{' '}
              {form.concurrency ?? 0}, quantity {form.quantity ?? 1}) against{' '}
              {form.tierId
                ? `tier ${form.tierId}`
                : form.eventId
                  ? `event ${form.eventId}`
                  : 'the live sale'}
              . It cannot be cancelled once started — only wait for it to finish.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runConfirmed}>Run load</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
