import { createFileRoute, redirect } from '@tanstack/react-router'
import { EventsPageSkeleton } from '@/components/skeletons'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Forward every query param (e.g. ?utm_source=…) so shared links and
    // analytics params survive the redirect instead of landing on a bare /events.
    throw redirect({ to: '/events', search: (prev) => prev })
  },
  // Shown while the redirect resolves — the redirect lands on /events, so
  // the skeleton mirrors the events page instead of generic rows.
  pendingComponent: EventsPageSkeleton,
})
