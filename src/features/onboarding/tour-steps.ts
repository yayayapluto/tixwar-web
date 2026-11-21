// The guided tour for regular users (guests and logged-in non-admins).
// Each step points at a DOM element by id; the overlay spotlights that
// element and darkens everything else.
export interface TourStep {
  id: string
  targetId: string
  title: string
  description: string
}

// Set once the tour is finished or skipped, so it only auto-starts on the
// first visit. The Settings "Show Onboarding" button ignores this flag.
export const TOUR_STORAGE_KEY = 'tixwar-onboarding-v1'

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'search',
    targetId: 'tour-search',
    title: 'Search events',
    description: 'Type an event name here to find it fast. Results update as you type.',
  },
  {
    id: 'categories',
    targetId: 'tour-categories',
    title: 'Browse by category',
    description: 'Tap a chip to see only one kind of event, like music or sports.',
  },
  {
    id: 'filters',
    targetId: 'tour-filters',
    title: 'Sort and filter',
    description: 'Change the order of the list, or show only events with a certain status.',
  },
  {
    id: 'event-card',
    targetId: 'tour-event-card',
    title: 'Pick an event',
    description: 'Tap a card to see ticket tiers, prices, and the sale countdown.',
  },
  {
    id: 'nav',
    targetId: 'tour-nav',
    title: 'Get around',
    description: 'This bar takes you to Events, Orders, Tickets, and Settings.',
  },
]
