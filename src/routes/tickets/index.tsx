import { createFileRoute, Link } from '@tanstack/react-router'
import { QrCode } from 'lucide-react'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/status'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireCustomer } from '@/features/auth/route-guard'
import { type Ticket, useTickets } from '@/features/tickets/queries'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/tickets/')({
  beforeLoad: ({ location }) => {
    requireCustomer(location.href)
  },
  component: TicketsPage,
})

function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm">{ticket.code}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">Issued {formatDate(ticket.issuedAt)}</span>
        <Link
          to="/tickets/$ticketId"
          params={{ ticketId: ticket.id }}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <QrCode className="size-4" aria-hidden="true" />
          View QR
        </Link>
      </CardContent>
    </Card>
  )
}

function TicketsPage() {
  const query = useTickets()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">My tickets</h1>
      {query.isPending ? (
        <ListSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState title="No tickets yet" description="Confirmed orders appear here." />
      ) : (
        <div className="grid gap-3">
          {query.data.data.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  )
}
