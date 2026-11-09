# f001: Update design for all pages based on .kombai canvas redesign

> Generated from the PandaOS work record. The record is authoritative:
> editing this file changes nothing. Re-export to update it.

Status: active
Plan: finalized 2026-11-02T14:05:15.389Z

## Objective

Update all app screens to match the .kombai canvas redesign (Tunisiska Mega Transport brand). The .kombai canvas contains 20 designed screens with the new visual system: Rubik font, navy primary (#132B55), orange accent (#F2761B), specific spacing, shadows, and component patterns. Also add missing screens that exist in the canvas but not in the app.

## Problem

The app currently uses a mix of design patterns. The .kombai canvas provides a complete, cohesive redesign that needs to be applied to all existing screens and new screens need to be created for missing designs (Wallet, Settings-Language, Settings-Help, Select Date, Trip Departure Board, Route Diagram, Stowage Manifest, Live Activity).

Scale: standard

## Out of scope

- Backend/API changes
- Database schema changes
- Authentication flow changes
- New feature logic beyond UI

## Risks

- Large number of screens to update - risk of inconsistency
- Need to maintain existing functionality while updating UI
- Some screens have complex state/logic that must be preserved

## Slices

### design-system-foundation: Design system foundation updates

Status: pending
Tasks: 0 done of 4

Acceptance: Theme colors, typography, spacing, and core UI components (Button, Card, Input, Badge, etc.) match .kombai specs exactly

#### Requirement: Color tokens from .kombai

Primary navy: #132B55 (DEFAULT), #0B1B33 (800), #06101F (900)
Accent orange: #F2761B (DEFAULT), #D65E0A (600)
Neutral: #0C1626 (900/DEFAULT), #55627A (700), #8A97AC (600), #AEB9C9 (500), #E4E9F0 (300), #EDF1F6 (200), #F4F6FA (100), #F8FAFC (50), #FFFFFF (0)
Canvas: #F7F9FC (light), #080D16 (dark)
Surface: #FFFFFF (light), #111B2B (dark)

#### Requirement: Typography tokens from .kombai

Font: Rubik (300-800)
display: 30/37 extrabold
title1: 26/33 extrabold
title2: 20/26 bold
title3: 17/23 bold
headline: 16/22 semibold
body: 15/22 regular
bodySm: 13.5/19 regular
caption: 12.5/17 regular
footnote: 11.5/15 medium
overline: 10.5/14 bold uppercase tracked
numeric: 22/27 bold
numericLg: 30/34 extrabold
button: 15.5/20 bold
tab: 10.5/14 semibold

#### build

- [ ] colors: Verify theme/colors.ts matches .kombai navy (#132B55), orange (#F2761B), neutral scale
- [ ] typography: Verify theme/typography.ts matches .kombai Rubik scale (display 30, title1 26, title2 20, title3 17, body 15, bodySm 13.5, caption 12.5, footnote 11.5, overline 10.5)
- [ ] spacing: Verify theme/spacing.ts matches .kombai spacing tokens (gutter 20, md 16, lg 20, xl 24, xxl 32, pill radius, lg radius 20)
- [ ] core-components: Update core UI components (Button, Card, Input, Badge, PressableScale, SectionHeader, ThemedText) to match .kombai styling

### home-screen: Home screen — hero, directions, next departure

Status: pending
Tasks: 0 done of 4
Depends on: slice design-system-foundation

Acceptance: Home screen matches .kombai var_670b9d7e2943: status bar, logo/header, hero image with gradient, direction cards, next departure card

#### build

- [ ] home-header: Update app/(tabs)/index.tsx header with logo, brand text, notification bell with badge
- [ ] home-hero: Update hero section with TransportArt, background image, gradient overlay matching .kombai
- [ ] home-directions: Update DirectionCard component to match .kombai direction card design
- [ ] home-next-departure: Update NextDepartureCard to match .kombai next departure design

### trips-schedule-screen: Trips schedule screen — Upcoming/Past/All tabs

Status: pending
Tasks: 0 done of 4
Depends on: slice design-system-foundation

Acceptance: Trips screen matches .kombai var_9c185363278d: header with back/calendar, scope tabs (Upcoming/Past/All), direction swapper, RouteTimeline list

#### build

- [ ] trips-header: Update app/(tabs)/trips.tsx header with title and calendar icon button
- [ ] trips-scope-tabs: Update scope tabs (Upcoming/Past/All) with underline indicator matching .kombai
- [ ] trips-direction-swapper: Update DirectionTraveller/RouteTimeline direction swapper to match .kombai
- [ ] trips-list: Update RouteTimeline/TripCard list items to match .kombai trip card design

### trip-details-screen: Trip Details screen — timeline, parcel delivery

Status: pending
Tasks: 0 done of 6
Depends on: slice design-system-foundation

Acceptance: Trip Details matches .kombai var_1c16dabd1016: hero image with gradient, back/share buttons, date pill, direction title, TripCard lead, countdown/status card, parcel delivery dropdown with governorate picker, collection points, delivery points, Sweden collection, trip info

#### build

- [ ] trip-hero: Update app/(home)/trips/[id].tsx hero with image, gradient, back/share buttons
- [ ] trip-date-pill: Update date pill overlay on hero matching .kombai
- [ ] trip-manifest: Update TripCard lead variant and countdown/status card
- [ ] trip-parcel-delivery: Update parcel delivery section with governorate picker, collection/delivery points
- [ ] trip-sweden-collection: Update Sweden collection instructions section
- [ ] trip-info: Update trip information/summary section

### select-date-screen: Select Date screen — calendar with departures

Status: pending
Tasks: 0 done of 3
Depends on: slice design-system-foundation

Acceptance: New screen app/(home)/trips/calendar.tsx matches .kombai var_381e47ea74e0: header with back/title, calendar card with marked departure dates, departure list for selected date

#### build

- [ ] calendar-header: Create app/(home)/trips/calendar.tsx with header matching .kombai
- [ ] calendar-card: Build calendar card with marked dates (dotColor #F2761B) matching .kombai
- [ ] calendar-departure-list: Build departure list for selected date matching .kombai trip cards

### news-screen: News & Updates screen — announcement cards

Status: pending
Tasks: 0 done of 3
Depends on: slice design-system-foundation

Acceptance: News screen matches .kombai var_b44e3e56ccc4: header, featured announcement card with image + 'Important' badge, compact announcement cards with icons

#### build

- [ ] news-header: Update app/(tabs)/news.tsx header matching .kombai
- [ ] news-featured-card: Update NewsCard featured variant with image, Important badge, title, message, timestamp
- [ ] news-compact-cards: Update NewsCard compact variant with icon, title, message, timestamp

### track-shipment-screen: Track Your Shipment screen — progress ring and stages

Status: pending
Tasks: 0 done of 5
Depends on: slice design-system-foundation

Acceptance: Track screen matches .kombai var_e2ce7957e140: header, search bar for tracking number, progress ring with stages, stage list with connecting lines, shipment details card, all shipments list

#### build

- [ ] track-header-search: Update app/(home)/trips/track.tsx header and tracking search bar
- [ ] track-progress-ring: Update ProgressRing SVG to match .kombai design (orange gradient, stroke width)
- [ ] track-stage-list: Update stage list with dots, connecting lines, active/completed states
- [ ] track-details: Update shipment details card (route, pickup, delivery, tracking, contents)
- [ ] track-all-shipments: Update all shipments list with badge status

### profile-screen: Your Profile screen — identity and account rows

Status: pending
Tasks: 0 done of 4
Depends on: slice design-system-foundation

Acceptance: Profile screen matches .kombai var_88329a20b526: header with back/settings, avatar with badge, name + premium badge, account rows (My Shipments, My Trips, Notifications, Language, Help), Appearance row, Sign out button

#### build

- [ ] profile-header-avatar: Update app/components/profile/ProfileScreen.tsx header, avatar with cube badge, name, premium badge
- [ ] profile-account-rows: Update account rows list with icons, labels, chevrons, notification badge, language current value
- [ ] profile-appearance: Update Appearance row with current theme display
- [ ] profile-signout: Update Sign out button styling

### live-activity-screen: Live Activity screen — Dynamic Island, Lock Screen

Status: pending
Tasks: 0 done of 3
Depends on: slice design-system-foundation

Acceptance: New screen for Live Activity matches .kombai var_9e7faba9ecd7: gradient background, departure status pill with progress ring, Dynamic Island preview, Lock Screen preview

#### build

- [ ] live-activity-layout: Create app/(home)/liveStatus/index.tsx (or similar) with gradient background
- [ ] live-activity-pill: Build departure status pill with truck avatar, details, orange progress ring
- [ ] live-activity-previews: Build Dynamic Island and Lock Screen preview sections

### trip-departure-board: Trips — Departure board screen

Status: pending
Tasks: 0 done of 2
Depends on: slice design-system-foundation, slice select-date-screen

Acceptance: New screen matches .kombai var_074cd6f6b87d: departure board with route, time, vehicle, capacity, phosphor icons

#### build

- [ ] departure-board-layout: Create departure board screen (could be calendar.tsx or new) with phosphor icons
- [ ] departure-board-cards: Build departure board cards with route, time, vehicle, capacity

### trip-route-diagram: Trips — Route diagram screen

Status: pending
Tasks: 0 done of 2
Depends on: slice design-system-foundation

Acceptance: New screen matches .kombai var_a49694452b72 / var_f0e1847f61ea: route visualization with stops, map-like diagram

#### build

- [ ] route-diagram-layout: Create route diagram screen with map/route visualization
- [ ] route-diagram-stops: Build route stops with connections, icons, labels

### trip-stowage-manifest: Trips — Stowage manifest screen

Status: pending
Tasks: 0 done of 2
Depends on: slice design-system-foundation

Acceptance: New screen matches .kombai var_9c22ee188c66: manifest list with items, weights, status badges

#### build

- [ ] stowage-layout: Create stowage manifest screen
- [ ] stowage-items: Build manifest items with weight, status, actions

### shipping-booking-form: Services — Shipping booking form

Status: pending
Tasks: 0 done of 5
Depends on: slice design-system-foundation

Acceptance: Shipping form matches .kombai var_02337c17cc17: header, calendar with marked dates, trip selection, sender/recipient forms, category checkboxes, weight input, payment methods (cash/card/points/combined), price summary, confirm button

#### build

- [ ] shipping-header-calendar: Update app/(home)/services/shipping/index.tsx header and calendar
- [ ] shipping-trip-selection: Update trip selection cards matching .kombai
- [ ] shipping-forms: Update sender/recipient forms, category checkboxes, weight input
- [ ] shipping-payment: Update payment method selector (cash/stripe/points/combined) with points input
- [ ] shipping-price-summary: Update price summary card and confirm/Stripe button

### bookings-list: Bookings — My shipments list

Status: pending
Tasks: 0 done of 2
Depends on: slice design-system-foundation

Acceptance: Bookings list matches .kombai var_56e9c861af95: header, tabs (Active/Completed/All), shipment cards with icon, category, date, route, status badge, passengers/weight

#### build

- [ ] bookings-header-tabs: Update app/(home)/profile/booking/index.tsx header and Active/Completed/All tabs
- [ ] bookings-cards: Update shipment cards with icon, category, route, status badge, details

### wallet-screen: Wallet screen — balance and transactions

Status: pending
Tasks: 0 done of 3
Depends on: slice design-system-foundation

Acceptance: New screen app/(home)/wallet/index.tsx matches .kombai var_6ee0ba031f17: header, balance card with navy background, € amount, Top up/Transfer buttons, recent transactions list

#### build

- [ ] wallet-header-balance: Create app/(home)/wallet/index.tsx with header and navy balance card
- [ ] wallet-actions: Build Top up and Transfer buttons
- [ ] wallet-transactions: Build recent transactions list with icons, labels, amounts, dates

### notifications-screen: Notifications screen — list

Status: pending
Tasks: 0 done of 2
Depends on: slice design-system-foundation

Acceptance: Notifications screen matches .kombai var_c6fc48c90378: header, notification cards with icon, title, message, timestamp, unread indicator

#### build

- [ ] notifications-header: Update app/(home)/notification/index.tsx header
- [ ] notifications-cards: Update notification cards with icon bg, title, message, timestamp, unread dot

### settings-language-screen: Settings — Language screen

Status: pending
Tasks: 0 done of 2
Depends on: slice design-system-foundation

Acceptance: New screen app/(home)/profile/language/index.tsx matches .kombai var_4bccee0b133e: header, language options with radio selection (English, Svenska, العربية)

#### build

- [ ] language-layout: Create app/(home)/profile/language/index.tsx with header
- [ ] language-options: Build language options with radio buttons, checkmark for selected

### settings-help-screen: Settings — Help & Support screen

Status: pending
Tasks: 0 done of 2
Depends on: slice design-system-foundation

Acceptance: New screen app/(home)/profile/help-support/index.tsx matches .kombai var_8b658985d90c: header, list items (Chat, Email, Call, FAQ, Terms, Privacy) with icons and chevrons

#### build

- [ ] help-layout: Create app/(home)/profile/help-support/index.tsx with header
- [ ] help-items: Build help list items with icons, labels, chevrons

### welcome-onboarding-screen: Welcome — onboarding screen

Status: pending
Tasks: 0 done of 2
Depends on: slice design-system-foundation

Acceptance: Welcome screen matches .kombai var_89a04d1652d4: status bar, centered logo, headline, description, Get started button, 'I already have an account' link

#### build

- [ ] welcome-layout: Update app/(home)/welcome/index.tsx to match .kombai exactly
- [ ] welcome-buttons: Update Get started primary button and secondary link

### announcement-detail-screen: Announcement — article detail screen

Status: pending
Tasks: 0 done of 2
Depends on: slice design-system-foundation

Acceptance: Announcement detail matches .kombai var_06581fce2e51: header, Important badge, title, meta (time/author), description, media (image/video), CTA link button

#### build

- [ ] announcement-header: Update app/(home)/announcements/[slug].tsx header with back, title
- [ ] announcement-content: Update content: Important badge, title, meta, description, media, CTA button

## Phases

- plan (feature): current
- design (slice): pending
- build (slice): pending
- review (slice): pending
- ship (feature): pending
