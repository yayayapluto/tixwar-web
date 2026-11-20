import { createFileRoute } from '@tanstack/react-router'
import { Activity, Zap } from 'lucide-react'
import { useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  type DebugChaosRequest,
  type DebugLoadRequest,
  useDebugChaos,
  useDebugLoad,
  useDebugStream,
} from '@/features/debug/queries'

export const Route = createFileRoute('/debug/stream')({
  beforeLoad: () => {
    requireAdmin()
  },
  component: DebugPage,
})

const MAX_TRACES = 50

function DebugPage() {
  const load = useDebugLoad()
  const chaos = useDebugChaos()
  const [traces, setTraces] = useState<Array<{ id: number; ts: string; raw: string }>>([])
  const idRef = useRef(0)
  const [streaming, setStreaming] = useState(true)
  const [loadForm, setLoadForm] = useState<DebugLoadRequest>({
    scenario: 'single',
    concurrency: 20,
    requests: 100,
  })
  const [chaosForm, setChaosForm] = useState<DebugChaosRequest>({
    target: 'gateway',
    action: 'latency',
  })
  const feedRef = useRef<HTMLDivElement>(null)

  useDebugStream(streaming, (trace) => {
    idRef.current += 1
    const id = idRef.current
    setTraces((prev) =>
      [{ id, ts: new Date().toISOString(), raw: JSON.stringify(trace) }, ...prev].slice(
        0,
        MAX_TRACES,
      ),
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Debug dashboard</h1>
        <Button
          variant={streaming ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStreaming((s) => !s)}
        >
          <Activity className="size-4" aria-hidden="true" />
          {streaming ? 'Streaming' : 'Paused'}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Load generator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="scenario">Scenario</Label>
              <Select
                value={loadForm.scenario}
                onValueChange={(v) =>
                  setLoadForm((f) => ({
                    ...f,
                    scenario: v as DebugLoadRequest['scenario'],
                  }))
                }
              >
                <SelectTrigger id="scenario">
                  <SelectValue placeholder="Select scenario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="crowd">Crowd</SelectItem>
                  <SelectItem value="abuse">Abuse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="eventId">Event ID</Label>
                <Input
                  id="eventId"
                  value={loadForm.eventId ?? ''}
                  onChange={(e) => setLoadForm((f) => ({ ...f, eventId: e.target.value }))}
                  placeholder="evt_…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tierId">Tier ID</Label>
                <Input
                  id="tierId"
                  value={loadForm.tierId ?? ''}
                  onChange={(e) => setLoadForm((f) => ({ ...f, tierId: e.target.value }))}
                  placeholder="tier_…"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="concurrency">Concurrency</Label>
                <Input
                  id="concurrency"
                  type="number"
                  value={loadForm.concurrency}
                  onChange={(e) =>
                    setLoadForm((f) => ({ ...f, concurrency: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requests">Requests</Label>
                <Input
                  id="requests"
                  type="number"
                  value={loadForm.requests}
                  onChange={(e) => setLoadForm((f) => ({ ...f, requests: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={loadForm.quantity ?? 1}
                  onChange={(e) => setLoadForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                />
              </div>
            </div>
            <Button
              onClick={() => load.mutate(loadForm)}
              disabled={load.isPending}
              className="w-full"
            >
              <Zap className="size-4" aria-hidden="true" />
              {load.isPending ? 'Running…' : 'Run load'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chaos injection</CardTitle>
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
                <SelectTrigger id="target">
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
                onValueChange={(v) =>
                  setChaosForm((f) => ({
                    ...f,
                    action: v as DebugChaosRequest['action'],
                  }))
                }
              >
                <SelectTrigger id="action">
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
                value={chaosForm.value ?? 0}
                onChange={(e) => setChaosForm((f) => ({ ...f, value: Number(e.target.value) }))}
              />
            </div>
            <Button
              onClick={() => chaos.mutate(chaosForm)}
              disabled={chaos.isPending}
              className="w-full"
            >
              Apply chaos
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Trace stream</CardTitle>
            <Badge variant="secondary">{traces.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={feedRef} className="max-h-80 space-y-1 overflow-y-auto">
            {traces.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {streaming ? 'Waiting for traces…' : 'Stream paused.'}
              </p>
            ) : (
              traces.map((t) => (
                <pre key={t.id} className="overflow-x-auto rounded bg-muted p-2 text-xs">
                  {t.raw}
                </pre>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
