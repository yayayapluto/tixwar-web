import { Activity } from 'lucide-react'
import { useState } from 'react'
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

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="scenario">Scenario</Label>
        <Select
          value={form.scenario}
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
            onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))}
            placeholder="evt_…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tierId">Tier ID</Label>
          <Input
            id="tierId"
            value={form.tierId ?? ''}
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
            value={form.concurrency}
            onChange={(e) => setForm((f) => ({ ...f, concurrency: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requests">Requests</Label>
          <Input
            id="requests"
            type="number"
            inputMode="numeric"
            value={form.requests}
            onChange={(e) => setForm((f) => ({ ...f, requests: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            inputMode="numeric"
            value={form.quantity ?? 1}
            onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
          />
        </div>
      </div>
      <Button onClick={() => load.mutate(form)} disabled={load.isPending} className="w-full">
        <Activity className="size-4" aria-hidden="true" />
        {load.isPending ? 'Running…' : 'Run load'}
      </Button>
    </div>
  )
}
