# Tunisiska Mega Transport — Redesign Implementation Guide

Companion to [`AUDIT-PHASE-0.md`](./AUDIT-PHASE-0.md).

---

## 1. What changed, at a glance

| Area | Before | After |
|---|---|---|
| Tab bar | Home · Booking · Wallet · Map · Profile (custom wave bar) | **Home · Trips · News · Profile** (`app/components/navigation/AppTabBar.tsx`) |
| Home | Service list with search + announcements carousel | Reference layout: brand header → headline → transport artwork → direction cards → next departure → shortcuts → latest news |
| Trips | Did not exist | `app/(tabs)/trips.tsx` — Upcoming / Past / All |
| Trip details | Did not exist | `app/(home)/trips/[id].tsx` — timeline, status, per-trip governorate picker, collection & delivery points, Stockholm handover instructions |
| Calendar | Only inside two booking flows | `app/(home)/trips/calendar.tsx` — departure days marked, timezone-correct |
| News | `app/(home)/announcements/` | `app/(tabs)/news.tsx` — reference card layout, "Important" label, relative timestamps |
| Tracking | Order list with status text | `app/(home)/trips/track.tsx` — progress ring + 4-stage tracker driven by real order status |
| Profile | 819-line screen, gradient card, PNG icons | `app/components/profile/ProfileScreen.tsx` — reference layout, **every** previous route preserved |
| Services | Emoji placeholder in the tab bar | `app/(tabs)/services.tsx` — searchable catalogue, carried over from the old Home |
| Dynamic Island | Nothing | **Genuine ActivityKit Live Activity** |

---

## 2. Design system

`app/theme/` is the single source of truth.

| File | Contents |
|---|---|
| `colors.ts` | Navy / orange / neutrals / semantic states, light + dark palettes |
| `typography.ts` | Rubik type ramp (the font was already licensed in `app/assets/fonts`) |
| `spacing.ts` | 4pt grid, radii, shadows, border widths, hit targets |
| `motion.ts` | Durations, easing curves, stagger steps, entrance presets |

`app/components/ui/` holds the primitives:

`ThemedText` · `Card` · `PrimaryButton` · `IconButton` · `Badge` · `Skeleton` · `ScreenHeader` · `SectionHeader` · `EmptyState` · `PressableScale` · `CountryFlag` · `TransportArt`

Two of them deserve a note:

- **`CountryFlag`** draws the Swedish and Tunisian flags with `react-native-svg`. The reference uses flag identity as a key visual, but emoji are not acceptable as interface icons and render inconsistently across platforms.
- **`TransportArt`** draws the truck / van / ship / plane / route artwork in the brand palette. The company has **no approved transport photography** in the project or in the Sanity asset library, so the app cannot ship photographs that would not represent real operations. The artwork is deliberately illustrative rather than pretending to be a photo — and when an administrator attaches a real image to a schedule, that image is used instead.

---

## 3. Data layer

### 3.1 Trips

Trips are the **existing** `shippingSchedule` / `containerShippingSchedule` Sanity documents. No new entity and no new backend.

- `app/lib/routes.ts` — the single route registry. Maps `route` → origin, destination, direction, timezone. Only Stockholm, Tunis, Sousse and Sfax appear; nothing is invented.
- `app/lib/time.ts` — timezone-correct formatting.
- `app/lib/tripTypes.ts` — the normalised `Trip` model.
- `app/lib/tripFormat.ts` — presentation helpers.
- `app/services/tripService.ts` — the **only** new read path. Drafts are excluded, and results are cached for 60 s so a screen mounting twice makes one request.

### 3.2 The date-shift trap

Schedules are stored as absolute instants but *authored* in local time. Rendering in UTC shifts the departure and can move it to the wrong calendar day.

Every departure is therefore rendered in the **origin's** timezone. `app/lib/time.ts` uses `Intl.DateTimeFormat` with `timeZone` when the runtime provides it, and falls back to a deterministic implementation of the two zones the company operates in (Europe/Stockholm with the EU summer-time rule, Africa/Tunis at UTC+1 year-round).

**Verified:** the fallback was checked against `Intl` across **85,312 timestamp/zone pairs over three years — 0 mismatches**. The 20 Aug 2026 departure (`06:30Z`) is `08:30` in Stockholm and `07:30` in Tunis — a full hour apart, and wrong in UTC in both.

### 3.3 Shipments

`app/services/shipmentService.ts` reads the user's own `shippingOrder` documents and derives the tracking stage from the order's real `status` field (`pending → confirmed → in_progress → completed`, plus `cancelled`). No stage is assumed.

---

## 4. CMS changes (Milestone 5)

### `shippingSchedule` and `containerShippingSchedule`

New, **all optional** — existing documents keep working with no migration:

| Field | Purpose |
|---|---|
| `image` | Transport photograph for this departure (hotspot-enabled) |
| `summary` | Short description on the trip details screen |
| `origin` / `destination` | Overrides, used only when a departure differs from the route default |
| `tunisiaLocations[]` | **Per-trip** governorate availability: `governorate`, `governorateKey`, `available`, `notes`, `collectionPoints[]`, `deliveryPoints[]` |
| `swedenCollection` | `postalInstructions`, `personalHandoverInstructions`, `notes` |

The shared field definitions live in `studio-tunisiska-services/schemaTypes/scheduleFields.ts` so both schedule types stay in step.

### `announcement`

Added `status` (`published` / `draft`), `isImportant`, `publishedAt` and `summary`. Drafts never reach the app — the query excludes `drafts.**` and the service filters on `status`.

---

## 5. Dynamic Island Live Activity (Milestone 7)

### What it is

A **real** ActivityKit Live Activity. The operating system owns it: the app requests it, the widget extension renders it, and the Dynamic Island shows it. Nothing is simulated inside React Native.

### Layout

```
modules/tunisiska-live-activity/
├── expo-module.config.json
├── index.ts                              JS entry
├── package.json
└── ios/
    ├── TunisiskaLiveActivity.podspec
    ├── TunisiskaLiveActivityModule.swift   the ActivityKit bridge (Expo module)
    └── NextDepartureAttributes.swift       shared ActivityAttributes
    └── widget/
        ├── NextDepartureWidget.swift        ActivityConfiguration + Dynamic Island
        ├── NextDepartureWidgetBundle.swift  @main WidgetBundle
        └── Info.plist

plugins/withLiveActivities.js              the config plugin
app/lib/liveActivity.ts                    the JS facade
app/hooks/useLiveActivitySync.ts           keeps it in step with the next departure
```

### How it works

1. `useLiveActivitySync` watches the next genuine departure.
2. `app/lib/liveActivity.ts` resolves the native module — and degrades to a no-op when it is absent (Expo Go, iOS < 16.2, or a build without the extension).
3. The native module calls `Activity.request(...)`, replacing any previous activity so the Dynamic Island never shows two countdowns.
4. The widget renders the Lock Screen banner and the four Dynamic Island presentations (expanded, compact leading/trailing, minimal).

### The attributes file

`NextDepartureAttributes.swift` is compiled into **two** targets: the app (through the module pod) and the widget extension (a copy written by the config plugin). Both declare the same `activityType`, which is how ActivityKit matches a running activity to the widget that renders it, and both have an identical `Codable` `ContentState`.

### Why a config plugin

`ios/` is **not tracked in git**. Everything the plugin does is therefore reproduced by `expo prebuild`, so the native project always matches the committed sources. The plugin:

1. Raises the iOS deployment target to **16.2** (ActivityKit requirement — this drops iOS 15.x).
2. Copies the widget sources into the generated project.
3. Adds the Widget Extension target, its build configurations, sources and frameworks phases.
4. Adds the target dependency and the *Embed App Extensions* copy-files phase.
5. Sets `NSSupportsLiveActivities` on the app.

It is idempotent: a re-run removes the previous target before adding it again.

### Platform support — honestly stated

| Platform | Live Activity? |
|---|---|
| iOS 16.2+ | **Yes** — Lock Screen + Dynamic Island |
| iOS 15.x | No — the in-app departure card and native notifications are used instead |
| Android | No — same fallback |
| Expo Go | No — a **development build** is required |

The Dynamic Island is never faked in React Native.

### Building it

```bash
npx expo prebuild --platform ios
cd ios && pod install
npx expo run:ios --device "iPhone 17 Pro"
```

The Live Activity appears in the Dynamic Island on a Dynamic Island device (iPhone 14 Pro and later, including the iPhone 17 Pro simulators available locally).

---

## 6. Podfile fixes (pre-existing build blockers)

Two problems stopped a clean `expo prebuild` from producing a buildable project. Both had previously been fixed only by hand-editing the gitignored `ios/` directory. `plugins/withPodfileFixes.js` now captures them:

1. **`use_modular_headers!`** — `@react-native-google-signin/google-signin` pulls in Swift pods that do not define modules, which CocoaPods refuses to integrate as static libraries.
2. **Pod deployment targets** — a number of podspecs still declare iOS 9–13, below the iOS 15 minimum Xcode 27 accepts.

**Verified:** `pod install` completes with 141 pods and the workspace builds.

---

## 7. Landing page

`web/index.html` + `web/styles.css` — a standalone static page sharing the app's design language (same tokens, same Rubik type, same navy + orange identity). It carries no backend logic: it links to the app rather than duplicating booking logic.

The hero uses the same first-party vector artwork as the app rather than stock photography.

---

## 8. Motion, haptics and accessibility

- **Motion** — Reanimated 4 only. Entrance animations use `FadeIn` / `FadeInDown`, which already default to `ReduceMotion.System`. The `useMotion()` hook resolves durations to 0 and swaps the easing for linear when Reduce Motion is on. The skeleton shimmer stops entirely.
- **Haptics** — `expo-haptics` through `PressableScale`: light impact on press, selection on segmented controls, medium on sign-out.
- **Accessibility** — every interactive element has an `accessibilityRole` and an explicit `accessibilityLabel`; status is always carried by a label as well as a colour; skeletons are hidden from assistive technology; the landing page has a skip link, visible focus rings and a `prefers-reduced-motion` block.

---

## 9. Verification performed

Everything below was executed on this machine, not assumed.

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | **8 errors — the pre-existing baseline.** Every one is in a file the redesign did not touch (`admin-dashboard`, `admin-manage`, `orderService`, `envDebug`, `sanityApi`, `zip`). New code adds **zero** errors. |
| Sanity Studio | `cd studio-tunisiska-services && npx tsc --noEmit` | Clean |
| iOS JS bundle | `npx expo export --platform ios` | **Passes** — 9.35 MB Hermes bytecode |
| CocoaPods | `npx expo prebuild --platform ios --clean` | **Passes** — 141 pods installed from a clean checkout |
| iOS native build | `xcodebuild -workspace TunisiskaMega.xcworkspace -scheme TunisiskaMega -sdk iphonesimulator` | **BUILD SUCCEEDED** — `TunisiskaMega.app` produced, with `TunisiskaLiveActivityWidget.appex` built and embedded in `TunisiskaMega.app/PlugIns/` |
| App in simulator | Installed and launched on an iPhone 15 Pro Max simulator | Home screen renders with **live Sanity data** |
| Timezone correctness | Fallback checked against `Intl` over 3 years | **85,312 timestamp/zone pairs — 0 mismatches** |
| Landing page | Rendered in a browser | Renders correctly; **0 console errors or warnings** |
| Accessibility | Static audit of new interactive elements | Every pressable in the new code has an `accessibilityRole` and an explicit `accessibilityLabel` |
| Credential exposure | Scan of every added file | **No new secrets** — the only match is the pre-existing Google Maps key in `app.config.js` |

### What the simulator run showed

The Home screen rendered with real data, not fixtures:

- The next departure resolved to the genuine `shippingSchedule` document for **2 Nov 2026 · 12:00** (Tunis → Stockholm), formatted in the origin's local time.
- The Sweden → Tunisia direction card read **"Ingen avgång planerad just nu"** — because no real upcoming departure exists in that direction. The app says so rather than inventing one.
- The notification bell carried the real unread count.
- The country flags are drawn as vectors — no emoji.

---

## 10. Removed code

| Removed | Why |
|---|---|
| `app/components/WaveTabBar/` | The custom tab bar was replaced by `AppTabBar`. It also imported the old profile route and broke the bundle. |
| `app/components/Homescreen.tsx` | The old Home. Its services catalogue **and its search + category filtering** were carried over into `app/(tabs)/services.tsx`. |
| `app/components/ServiceCard.tsx`, `AnnouncementsCarousel.tsx` | Only used by the old Home. The carousel also logged the query, the token-presence flag and the full payload to the production console. |
| `app/constants/demoAnnouncements.ts` | Three **fabricated** announcements with stock media. Unused, but a live foot-gun for any new fallback path. |
| `app/(home)/profile/index.tsx` | Replaced by `app/components/profile/ProfileScreen.tsx`. Every route and action it exposed is preserved, plus the referral code now actually copies to the clipboard. |

Nothing was orphaned: `/bookings`, `/services`, `/announcements` and the whole `(home)` stack still resolve.

---

## 11. Known limitations and owner decisions

1. **Credential rotation** is still outstanding — see the audit, §5.1. It needs the owner to rotate the Clerk, Stripe and Sanity credentials and rename them so Expo does not inline them into the client bundle.
2. **Authorship of transport photography.** The app falls back to branded vector artwork until the company attaches real photographs to `shippingSchedule.image`. The artwork is intentionally not a photo.
3. **Runtime machine translation** still sends CMS content to a third-party API. The redesign routes new chrome through the same existing layer for consistency; replacing it with curated resources needs the owner to choose a direction (audit §10, item 6).
4. **iOS 15.x is dropped** by the Live Activity deployment-target bump.
5. **The admin broadcast route** `/(home)/profile/admin-notifications` still has no server-side authorisation check. The redesign does not touch it; it needs the owner's approval to fix (audit §5.2, A1).
6. **No automated tests** exist in the project. The timezone fallback was verified against `Intl` with a standalone script, but it is not part of a test suite.
