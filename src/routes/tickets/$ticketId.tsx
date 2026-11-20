import { createFileRoute } from '@tanstack/react-router'
import { Download, QrCode } from 'lucide-react'
import { CopyButton } from '@/components/copy-button'
import { ErrorState, ListSkeleton } from '@/components/status'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireCustomer } from '@/features/auth/route-guard'
import { useSession } from '@/features/auth/use-auth'
import { useTicket } from '@/features/tickets/queries'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/tickets/$ticketId')({
  beforeLoad: ({ location }) => {
    requireCustomer(location.href)
  },
  component: TicketDetailPage,
})

async function downloadQr(url: string, filename: string) {
  const res = await fetch(url)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.click()
  URL.revokeObjectURL(objectUrl)
}

function TicketDetailPage() {
  const { ticketId } = Route.useParams()
  const session = useSession()
  const isAdmin = session?.user.role === 'admin'
  const query = useTicket(ticketId)

  if (query.isPending) return <ListSkeleton rows={2} />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const detail = query.data.data
  const ticket = detail.ticket

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-semibold">Ticket</h1>
        <QrCode className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">{ticket.code}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Event: {ticket.eventId} · Issued {formatDate(ticket.issuedAt)}
          </p>
          {isAdmin && (
            <div className="space-y-1 rounded-md border p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Ticket ID</span>
                <span className="flex items-center gap-1">
                  <code className="font-mono">{ticket.id}</code>
                  <CopyButton value={ticket.id} label="Ticket ID" className="size-6" />
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Tier ID</span>
                <span className="flex items-center gap-1">
                  <code className="font-mono">{ticket.tierId}</code>
                  <CopyButton value={ticket.tierId} label="Tier ID" className="size-6" />
                </span>
              </div>
            </div>
          )}
          <div className="flex justify-center rounded-lg border bg-white p-4">
            <img
              src={detail.qrUrl}
              alt={`QR code for ticket ${ticket.code}`}
              className="size-56 object-contain"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => downloadQr(detail.qrUrl, `tixwar-${ticket.code}.png`)}
          >
            <Download className="size-4" aria-hidden="true" />
            Download QR
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            QR link expires in {detail.qrExpiresIn}s
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
