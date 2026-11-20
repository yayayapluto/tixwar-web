import { createFileRoute } from '@tanstack/react-router'
import { Activity } from 'lucide-react'
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
import { LoadGeneratorForm } from '@/features/debug/load-generator-form'
import { type DebugChaosRequest, useDebugChaos, useDebugStream } from '@/features/debug/queries'

export const Route = createFileRoute('/debug/stream')({
  beforeLoad: () => {
    requireAdmin()
  },
  component: DebugPage,
})

const MAX_TRACES = 50

function DebugPage() {
  const chaos = useDebugChaos()
  const [traces, setTraces] = useState<Array<{ id: number; ts: string; raw: string }>>([])
  const idRef = useRef(0)
  const [streaming, setStreaming] = useState(true)
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
      <div className="flex flex-wrap items-center justify-between gap-2">
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
                onValueChange={(v) =>
                  setChaosForm((f) => ({
                    ...f,
                    action: v as DebugChaosRequest['action'],
                  }))
                }
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
            <CardTitle>Trace stream</CardTitle>
            <Badge variant="secondary">{traces.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={feedRef}
            role="log"
            aria-label="Trace stream"
            className="max-h-80 space-y-1 overflow-y-auto"
          >
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
