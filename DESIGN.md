# TixWar design direction

Flash-sale ticketing, redesigned after the EveTick ticketing reference
(dark, single orange accent, sticky Book Now bar, 3-step checkout, white QR
e-ticket card) combined with Duolingo's visual language — warm, friendly,
playful but tidy. **UI only:** no gamification, no social features, no API
changes (see "Forbidden").

Reference: https://v0-portfolio-redesign-gamma.vercel.app/design/evetick

## Identity

- **Brand:** warm orange → rose → amber gradient (`.bg-brand-gradient`,
  `.text-brand-gradient`), used for the hero, the primary button, the active
  bottom-bar pill, the ticket spine, and progress bars. Primary token is
  orange (`--primary`: orange-700 light / orange-400 dark), ring follows it.
- **Canvas:** warm-tinted background (light) / warm near-black (dark).
  Cards stay white (light) / warm dark (dark) so the gradient pops.
- **Radius:** chunky — `--radius: 0.875rem`, buttons `rounded-xl`.
- **Type:** system sans stack, extra-bold tight headlines
  (`text-3xl/4xl font-extrabold tracking-tight`), card titles
  `text-lg font-bold`, body `text-sm`, metadata `text-xs`.
- **Buttons (Duolingo-style chunky press):** primary buttons carry a 4px
  darker bottom border that collapses to 2px + `translate-y-0.5` on press,
  a shine sweep on hover, and `active:scale-[0.97]`. Outline/secondary keep
  the same press. Ghost buttons stay flat.
- **Urgency token:** `destructive` stays reserved for live-sale urgency —
  low stock, a sale ending soon, an order expiring in under a minute.

## Motion

Expressive is allowed, not only minimal/functional: entrances (`fade-up`,
staggered cards), the sliding bottom-bar pill, icon pops, hover lift on
cards, floating hero orbs, shine on primary buttons, ping dots on live
states. Still never animate live numbers the user reads (countdown ticks,
prices, stock counts) — progress bars may move, the digits may not.
`prefers-reduced-motion` disables all of it.

## Focal point per screen

- **Events:** a gradient hero ("Tickets sell out fast.") with the search
  inside it, then event cards with a category-gradient cover, a big date
  block, a white status badge (pulsing dot while on sale), and a watermark
  ticket icon that straightens on hover.
- **Event detail:** a gradient cover panel (name, meta, status, description)
  over the tiers; cheapest tier gets a gradient `Cheapest` badge + orange
  glow; low stock gets a pulsing dot.
- **Order:** a dark countdown panel with a gradient progress bar; order
  cards carry a left accent stripe colored by status.
- **Ticket:** a ticket stub (gradient spine + dashed divider) and the QR in
  a gradient frame, with an expiry progress bar under it.
- **Auth:** card with a gradient top strip and a fade-up entrance.

## Copy

Human language, never API vocabulary: status badges render labels
(`On sale`, `Waiting for payment`), never raw enums. Buttons carry their
facts (`Buy 2 × Rp 150.000`, `Pay Rp 300.000`). Empty states name the cause
and offer the next action.

## Forbidden

- No gamification or inter-user features: no streaks, leagues, points/XP,
  quests, friends, feeds, or mascots-as-a-feature. Duolingo contributes
  visual language only (warm color, chunky buttons, clear icons, friendly
  copy) — not its systems.
- No API changes, no new endpoints, no business-behavior changes for
  visual reasons.
- No category filter chips: the list API's `$text` search covers name +
  description only, so a category chip would return wrong results.
