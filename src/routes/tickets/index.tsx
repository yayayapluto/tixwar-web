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

function TicketCard({ ticket, index }: { ticket: Ticket; index: number }) {
  return (
    <Card
      className="animate-fade-up"
      style={{ animationDelay: `${Math.min(index % 12, 8) * 45}ms` }}
    >
      <CardHeader>
        <CardTitle className="min-w-0 truncate font-mono text-sm">{ticket.code}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm text-muted-foreground">
          Issued {formatDate(ticket.issuedAt)}
        </span>
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
        <EmptyState
          title="No tickets yet"
          description="Your tickets will appear here after payment is confirmed."
          action={
            <Link to="/events" className="text-sm underline underline-offset-4">
              Browse events
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3">
          {query.data.data.map((ticket, i) => (
            <TicketCard key={ticket.id} ticket={ticket} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
