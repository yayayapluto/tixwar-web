# TixWar design direction

Flash-sale ticketing. The product is a race: limited stock, a sale window, a
payment countdown. The UI should make that race legible, not decorate it.

## Identity

- **Palette:** shadcn preset `b3kJnBDtY` (Style Nova, Base Color Mist,
  Theme Green, Chart Orange, Radius 0.625rem). Neutrals are mist-tinted
  (`--background`, `--card`, `--muted`); `--primary` is green (light
  `oklch(0.527 0.154 150.069)`, dark `oklch(0.448 0.119 151.328)`); chart
  tokens (`--chart-1`–`--chart-5`) are orange. No gradients, no glow, no
  background grids.
- **One urgency token:** `destructive` (red) is reserved for live-sale
  urgency — low stock, a sale ending in under an hour, an order expiring
  in under a minute. It stays distinct from the green primary and is never
  used for decoration.
- **Type:** Plus Jakarta Sans Variable (self-hosted via Fontsource, weight
  200–800), system sans fallback. Page titles `text-2xl font-semibold`, card
  titles `text-base`, body `text-sm`, metadata `text-xs text-muted-foreground`.
- **Motion:** fast and functional only — 150–200ms `ease-out` entrances,
  `active:scale-[0.97–0.98]` press feedback, `--ease-drawer` for the sheet.
  No route transitions, no staggered lists, no motion on data the user reads
  (counts, prices, countdown ticks).

## Focal point per screen

- **Events:** the list itself, with sale state visible on each card
  (no border on any card; `ON_SALE` keeps its default badge,
  `SOLD_OUT` is dimmed).
- **Event detail:** the cheapest tier (primary border + `Cheapest` badge),
  the live sale countdown, and the remaining stock.
- **Order:** the payment countdown and the total in the Pay button.
- **Ticket:** the QR code and its live expiry.

## Copy

Human language, never API vocabulary: status badges render labels
(`On sale`, `Waiting for payment`), never raw enums. Buttons carry their
facts (`Buy 2 × Rp 150.000`, `Pay Rp 300.000`). Empty states name the cause
and offer the next action.

## What not to do

- Do not add a hero or marketing section, or colors beyond the preset palette.
- Do not add glassmorphism beyond the floating bottom bar.
- Do not animate for decoration; every animation must pass the
  frequency/purpose/speed/function gate.
- Do not invent endpoints or change API behavior for visual reasons.
