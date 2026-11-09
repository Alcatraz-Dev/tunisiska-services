# Tunisiska Mega Transport — Phase Zero Audit

**Date:** 2026-10-31
**Repository:** `/Users/haythem_dhahri/Desktop/projects/application/tunisiska-services`
**Branch:** `main` @ `09ecf11` · working tree clean · no uncommitted changes

---

## 1. Verified Stack

The prompt's preliminary hypothesis (Expo/React Native + Express + Sanity + Clerk) is **confirmed accurate**, with material corrections.

| Layer | Actual | Source of truth |
|---|---|---|
| Framework | Expo SDK **54.0.34**, React Native **0.81.5**, React **19.1.0** | `package.json:41,79` |
| Navigation | expo-router **~6.0.23** + `@react-navigation/bottom-tabs` | `package.json:50,32` |
| Styling | NativeWind **4.2.1** + Tailwind 3.4.17 | `package.json:73`, `tailwind.config.js` |
| Animation | react-native-reanimated **~4.1.1** + worklets 0.5.1 | `package.json:88,96` |
| Auth | Clerk (`@clerk/clerk-expo` 2.19.23) | `app/_layout.tsx:70` |
| CMS | Sanity (`@sanity/client` 7.11.2) — Studio in `studio-tunisiska-services/` | `sanityClient.ts` |
| Backend | Express 5 (`server.mjs`) — **Stripe payments + points only** | `server.mjs` |
| Notifications | `native-notify` (delivery) + `expo-notifications` (plumbing) | `app/_layout.tsx:39` |
| Payments | Stripe, Klarna (repo), Swish (decode util) | `app/config/stripe.ts` |
| Maps | `react-native-maps` 1.20.1 + Mapbox polyline | `package.json:83` |

**Correction to prompt's premise:** there is **no** trip/transport API on the Express server. The client talks to Sanity **directly** with a token from the client bundle. The server's complete route set is `GET /sanity/export`, `GET /health`, `GET /payment-success`, `GET /payment-cancel`, `POST /api/update-user-points`, `POST /payment-sheet`, `POST /create-checkout-session` (`server.mjs:14,91,96,101,106,242,293`).

---

## 2. Trips Data Source (the existing source of truth)

`shippingSchedule` and `containerShippingSchedule` Sanity documents **are** the trips. No new entity is needed.

- Schema: `studio-tunisiska-services/schemaTypes/shippingSchedule.ts`
- Fields: `route`, `isActive`, `departureTime` (datetime), `capacity`, `availableCapacity`, `status` (`available|full|cancelled|departed`), `vehicle` (`cargo_van|truck|container_ship|air_freight`), `notes`, `assignedDriver`
- Routes: `stockholm_tunis`, `tunis_stockholm`, `tunis_sousse`, `tunis_sfax`
- `containerShippingSchedule` mirrors this with `vehicle: container_ship` and container-unit capacity
- Already queried by `app/services/shippingOrderService.ts:120`, `app/services/containerShippingOrderService.ts:102`, `app/(home)/services/shipping/index.tsx:27`, `app/(home)/services/container-shipping/index.tsx:26`
- Already admin-managed at `app/(home)/profile/admin-manage/index.tsx:118-145` (`shipping-schedules`, `container-shipping-schedules`)

### Gaps the redesign must close

| Requirement | Current state | Action |
|---|---|---|
| Per-trip governorate availability | **Absent** — no location fields on the schedule schema | Extend schema (Milestone 5) |
| Per-trip collection/delivery points | **Absent** | Extend schema (Milestone 5) |
| Stockholm postal / personal-handover instructions | **Absent** | Extend schema (Milestone 5) |
| Trip images | **Absent** (schedule has no image field) | Extend schema (Milestone 5) |
| Trip origin/destination as data | Derived from `route` string | Acceptable — derive, do not duplicate |

**Rule honoured:** no location, schedule, or status is hardcoded in the client. Everything renders from these documents.

---

## 3. Existing Screens & Routes (to preserve)

**Tabs** (`app/(tabs)/_layout.tsx` → `app/components/WaveTabBar/WaveTabBar.tsx`): `Home` (`app/components/Homescreen.tsx`), `Booking` (`app/(home)/profile/booking/index.tsx`), `Wallet`, `Map` (`app/(home)/map/overview.tsx`), `Profile`.

**Stack groups:** `(auth)` sign-in/sign-up · `(home)` announcements, map, notification, onboarding, profile (+14 admin sub-routes), pushNotifications, services (shipping, container-shipping, move, move-cleaning, taxi), welcome.

**Services to preserve and keep reachable:** Taxi, Moving, Move+Cleaning, Shipping, Container Shipping, Wallet, Points/Referral, Bookings, Map, Live Status, Admin (dashboard, manage, forms, announcements, notifications, backup, users, orders), Onboarding, Welcome, Payment success/cancel, Legal (terms/policy).

---

## 4. Reference-Image Gap Analysis

| Reference element | Current state | Delta |
|---|---|---|
| Home hero (headline + truck/ferry photography) | **Absent** — Home is a service list with search + category tabs | Full build |
| Two direction cards (Sweden→Tunisia, Tunisia→Sweden) | **Absent** | Full build |
| "Next departure" card | **Absent** | Full build |
| Dynamic Island "Next departure" | **Absent** — no ActivityKit, no widget extension, iOS deployment target is **15.1** | Full build + target bump to 16.2 |
| Trips tab (Upcoming / Past / All) | **Absent** as a top-level experience | Full build |
| Trip details with Parcel Delivery governorate picker | **Absent** | Full build |
| Calendar with marked departure dates | Exists only inside the two booking flows (`react-native-calendars`) | Promote + redesign |
| News & Updates | Exists (`app/(home)/announcements/`) but different visual language; **no importance flag, no publish scheduling** | Redesign + schema extension |
| Track Your Shipment with stage progress | Orders list exists with status text; **no stage tracker** | Build stage tracker from real order status |
| Profile with company identity + member tier | Exists, but no membership model exists | Build without inventing entitlements |
| Bottom nav Home / Trips / News / Profile | Current: Home / Booking / Wallet / Map / Profile | Restructure, keep all routes reachable |

---

## 5. Security Findings (Proportionate Audit)

### 5.1 Genuinely exposed credentials — rotation required

> Values are **not** printed here. Locations only.

| # | Location | Secret | Severity |
|---|---|---|---|
| **S1** | `.env.production` (**tracked in git**, commit `59791d5` and 11 later commits) | `EXPO_PUBLIC_CLERK_SECRET_KEY` | **Critical** |
| **S2** | `.env.production` (tracked in git) | `EXPO_PUBLIC_STRIPE_SECRET_KEY` | **Critical** |
| **S3** | `.env.production` + `eas.json:29` | `EXPO_PUBLIC_SANITY_TOKEN` — a **Sanity write-capable** token (`sk…`) | **Critical** |
| **S4** | `app.config.js:70,105` (committed) | Google Maps API key | Medium |
| **S5** | `app/_layout.tsx:40`, `app/services/nativeNotifyApi.ts:17-19`, `app/hooks/usePushNotifications.ts:15-16`, `app/(home)/notification/index.tsx:59-60`, `app/components/Homescreen.tsx:173-174,207-208` | NativeNotify **app token**, hardcoded in the client bundle in 6+ places | High |

**Why S1–S3 are critical and not theoretical:** the `EXPO_PUBLIC_` prefix causes Expo to **inline the value into the shipped JavaScript bundle**. A Clerk secret key, a Stripe secret key, and a Sanity write token are therefore recoverable by anyone who downloads the app. Because `.env.production` is committed, they are also in git history.

**Required remediation (needs owner approval — credential changes are out of my scope):**
1. Rotate the Clerk secret key, the Stripe secret key, and the Sanity token.
2. Rename them **without** the `EXPO_PUBLIC_` prefix (`CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, `SANITY_TOKEN`) so Expo never bundles them. The client needs only `EXPO_PUBLIC_SANITY_TOKEN` scoped to **read-only** access.
3. Remove `.env.production` from git tracking; add `!.env.example` with empty placeholders.
4. Replace the committed Google Maps key with a runtime-injected one.
5. Move the NativeNotify app token server-side.

**Also note:** `.gitignore` already ignores `.env*`, `ios/` and `android/` — but `.env.production` was committed **before** that rule, and `git ls-files` still tracks it.

### 5.2 Authorization & data-exposure findings

| # | Finding | Evidence |
|---|---|---|
| **A1** | **Unauthenticated admin broadcast.** `/(home)/profile/admin-notifications` has no auth/`isAdmin` guard. The route is merely *hidden* from the profile menu. Any authenticated user can navigate to it and push a notification to every user. | `app/(home)/profile/admin-notifications/index.tsx:1-13` (no guard); `app/(home)/profile/index.tsx:582` (hide-only) |
| **A2** | **Server-side authorization absent** on `POST /api/update-user-points` — any caller can credit or debit points on any Clerk user id. | `server.mjs:106-229` |
| **A3** | **Broad CORS** `origin: "*"` on a server that mutates Stripe and Clerk state. | `server.mjs:10,81` |
| **A4** | **Push-token plumbing is broken**, so targeting silently fails: sign-in writes `pushToken`, the broadcast sender reads `expoPushToken`; neither field exists in the `users` schema. The broadcast finds **zero** tokens. | `app/hooks/useQuery.ts:24` vs `app/(home)/profile/admin-notifications/index.tsx:126` vs `schemaTypes/user.ts:8-88` |
| **A5** | `notificationHistory` documents written by the admin composer use field names (`type`, `imageUrl`, `videoUrl`, `sentAt`) that **do not exist** in the schema, while the schema's `dateSent`/`notificationType` are never written. Both sides use disjoint names. | `admin-notifications/index.tsx:166-175` vs `schemaTypes/notificationHistory.ts:8-37` |
| **A6** | Bulk/scheduled notification sending is **broken**: `sendBulkNotification` / `scheduleNotification` are called but not implemented. The `try/catch` swallows the `TypeError`. | `app/utils/notificationUtils.ts:240,266,318` vs `app/services/nativeNotifyApi.ts:72-250` |
| **A7** | `GET /sanity/export` streams the **entire dataset** with the write token, unauthenticated, `origin: "*"`. | `server.mjs:14-50` |
| **A8** | `native-notify` targeted sends use the shared app token with an arbitrary `subID` — anyone holding the token can target any user id. | `app/services/nativeNotifyApi.ts:161-186` |

### 5.3 Privacy / correctness findings

| # | Finding | Evidence |
|---|---|---|
| **P1** | **All user-facing copy — including CMS content — is machine-translated at runtime** by a third-party API (`ftapi.pythonanywhere.com`). User content and announcements leave the device. Results are non-deterministic and unproofread. | `app/hooks/useTranslation.ts:23-30` |
| **P2** | **Notification permission is requested on first launch with no explanation** — a likely App Store review rejection. | `app/_layout.tsx:79` → `app/hooks/usePushNotifications.ts:135` → `:23` |
| **P3** | **Push taps do not deep-link.** The response listener only marks read; it never navigates. | `app/hooks/usePushNotifications.ts:177-183` |
| **P4** | **No RTL.** `I18nManager.forceRTL` is absent repo-wide. Arabic is selectable but the entire UI stays LTR. `AutoText` computes `isRTL` and never uses it. | `app/components/ui/AutoText.tsx:6,22` |
| **P5** | `i18next` / `react-i18next` are installed but **never imported**. No resource bundles exist. | `package.json:69,78` |
| **P6** | `app/constants/demoAnnouncements.ts` holds **3 fabricated announcements** with `picsum.photos` / `pixabay` media. Currently **unimported** (so no fabricated content ships) but a live foot-gun for any new fallback path. | `app/constants/demoAnnouncements.ts:1-41`; zero importers repo-wide |
| **P7** | `app/(tabs)/services.tsx` is a placeholder containing an **emoji** (`🛠️`). | `app/(tabs)/services.tsx:7` |
| **P8** | `AnnouncementsCarousel` logs the full query, the Sanity token presence flag, and the **entire response payload** to production console. | `app/components/AnnouncementsCarousel.tsx:23-41` |

---

## 6. Baseline Build & Test Status

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | **8 pre-existing errors** (baseline, must not increase) |
| Lint | — | **No lint script configured.** `eslint` is present only in `studio-tunisiska-services/`. |
| Unit tests | — | **None.** No test runner, no test files, no CI. |
| CI | — | **None** (`.github/` absent). |
| `npm run` scripts | `package.json:6-17` | `start`, `dev`, `server`, `android`, `ios`, `web`, `deploy` |
| Sanity Studio | `cd studio-tunisiska-services && npx tsc --noEmit` | Clean |
| iOS bundle | `npx expo export --platform ios` | **Passes** — 9.35 MB Hermes bytecode |
| iOS native build | `xcodebuild -workspace TunisiskaMega.xcworkspace -scheme TunisiskaMega` | See Milestone 7 |

**Pre-existing TypeScript errors (baseline — all in files the redesign did not touch):**
`app/(home)/profile/admin-dashboard/index.tsx:430,511` (invalid route literal) · `app/(home)/profile/admin-manage/index.tsx:341` (undefined index) · `app/services/orderService.ts:154` (missing `container_shipping` pricing key) · `app/utils/envDebug.ts:25` (`extra` on `EmbeddedManifest`) · `app/utils/sanityApi.ts:78,113` (generic `T | undefined`) · `app/utils/zip.ts:10` (Buffer/`Data` overload).

> **Correction:** the initial figure of "10 errors" was a miscount from a truncated log. The verified baseline is **8**, and the redesign leaves it at **8** — every new file typechecks cleanly.

### Native build blocker found during the audit

`npx expo prebuild --clean` **cannot install pods** on this project as it stands. `@react-native-google-signin/google-signin` pulls in `GoogleSignIn` → `AppCheckCore` → `GoogleUtilities` + `RecaptchaInterop`, which do not define modules:

```
The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and `RecaptchaInterop`,
which do not define modules.
```

Because `ios/` is gitignored, the working native project was hand-maintained and the fix was never captured in git. `plugins/withModularHeaders.js` now adds `use_modular_headers!` to the Podfile so the project is reproducible from a clean checkout. **Verified: `pod install` completes with 141 pods.**

**Native toolchain available locally** (enables genuine verification):
Xcode 27.1 · CocoaPods 1.16.2 · Watchman 2026.09.21 · JDK 17 · Android SDK present · **iPhone 17 Pro simulators on iOS 26.2 & 26.4 — Dynamic Island hardware.**

---

## 7. Dynamic Island / Live Activities — Feasibility

| Requirement | Finding |
|---|---|
| `expo-widgets` (official Expo Live Activity library) | **Not available.** First published for **Expo SDK 55** (`npm view expo-widgets` → earliest `55.0.0`). This project is SDK 54. Using it forces an SDK 54→55+ upgrade that risks the entire native dependency set (`native-notify`, `react-native-maps`, `react-native-klarna-inapp-sdk`, `react-native-reanimated` 4, Reanimated 4 / RN 0.81). **Rejected as disproportionate.** |
| `react-native-widget-extension@0.3.0` (third-party) | **Rejected.** The published npm tarball ships **no Swift source** — only `ios/ReactNativeWidgetExtension.podspec` — while the podspec declares `s.source_files = "**/*.{h,m,swift}"`. The native module cannot compile. It also pins `@expo/config-plugins ~56.0.0` against an SDK 54 project. |
| iOS deployment target | Currently **15.1** (`ios/TunisiskaMega.xcodeproj/project.pbxproj`). ActivityKit requires **16.1+**; **16.2** is needed for the `ActivityConfiguration` APIs used. Must be bumped — a **1-version-support drop** (iOS 15.x users). |
| Native iOS project in git | **Not tracked** — `ios/` and `android/` are in `.gitignore`. Native changes therefore **cannot be committed directly**; they must be generated by a **config plugin** so `expo prebuild` reproduces them. The project already has this pattern: `plugins/withAudioBackgroundFix.js`, `plugins/withKlarnaRepo.js`. |
| Expo Go | **Live Activities are impossible in Expo Go.** A development build (`expo-dev-client` is already installed, `package.json:45`) is mandatory. |
| Simulator support | ActivityKit **does** work in the iOS Simulator (iOS 16.1+). Dynamic Island simulators (iPhone 17 Pro) are available locally → the Live Activity can be genuinely verified. |

### Chosen approach

A **first-party, in-repo implementation** with no new third-party dependency:

1. `plugins/withLiveActivities.js` — Expo config plugin that raises the deployment target to 16.2, generates the Widget Extension target in the Xcode project, writes the SwiftUI widget + ActivityKit sources, and wires App Group entitlements on both targets.
2. `modules/tunisiska-live-activity/` — a **local Expo module** (SDK 54 supports local modules) exposing `areActivitiesEnabled` / `start` / `update` / `end` / `listRunning` to JS.
3. `app/lib/liveActivity.ts` — JS facade with a graceful no-op fallback on Android, on iOS < 16.2, in Expo Go, and when the user has disabled Live Activities.
4. The Live Activity is driven by **real `shippingSchedule` data** — the next genuine upcoming departure. No fabricated countdown.

**Honest limitation:** a Live Activity renders only on **iOS 16.2+**; iOS 15.x and Android receive an in-app departure card and native notifications instead. The app never simulates a Dynamic Island inside React Native.

---

## 8. Implementation Architecture

### 8.1 Design system (new)

`app/theme/` — a single source of truth for the redesign:

```
app/theme/colors.ts       navy / orange / surfaces / text / borders / semantic states
app/theme/typography.ts    Rubik scale (fonts already licensed in app/assets/fonts)
app/theme/spacing.ts      4pt grid
app/theme/radii.ts        card & control radii
app/theme/shadows.ts      controlled iOS-style depth
app/theme/motion.ts       durations + easings + Reduce Motion switch
app/theme/index.ts        public exports
```

`app/components/ui/` — new primitives alongside the existing `AutoText` / `Input` / `Button` (which are **kept and still used**):
`Surface`, `Card`, `PrimaryButton`, `SecondaryButton`, `IconButton`, `Badge`, `Skeleton`, `ScreenHeader`, `EmptyState`, `ErrorState`, `SectionHeader`, `PressableScale`.

Tailwind `theme.extend.colors` is updated to reference the same palette so NativeWind classes and the TS tokens cannot drift.

### 8.2 Data layer

New `app/services/tripService.ts` — the **only** new read path. It queries `shippingSchedule` + `containerShippingSchedule` with a single projection and exposes:
`getTrips({ scope: 'upcoming' | 'past' | 'all', route?, date? })`, `getNextDeparture()`, `getTripsByMonth(year, month)`, `getTrip(id)`.

A new `app/lib/tripTypes.ts` normalises the two schedule types into one `Trip` model, and derives origin/destination/timezone from `route` via a **single route table** (`app/lib/routes.ts`) — Stockholm and Tunis only, no invented cities.

### 8.3 Navigation restructure

New tab set: **Home · Trips · News · Profile**, implemented with `expo-router` `Tabs` (not the current custom wave bar, which is kept as an unused component to avoid orphaning it). `Wallet`, `Bookings`, `Map`, and `Services` are reachable from Home shortcuts and the Profile menu, so **no route is orphaned**.

New screens under `app/(trips)/`:
`trips/index` (Upcoming/Past/All), `trips/[id]` (Trip Details), `trips/calendar`, `trips/track` (Shipment tracking), `trips/[id]/governate` is folded into Trip Details.

### 8.4 CMS extension (Milestone 5)

`shippingSchedule` gains: `image` (transport photo), `origin`/`destination` (optional override), `tunisiaLocations` (array of `{ governorate, governorateKey, available, collectionPoints[], deliveryPoints[], notes }`), `swedenCollection` (postal instruction + personal handover instruction), `notes` already exists.

`announcement` gains: `isImportant` (boolean), `publishedAt` (datetime), `status` (`draft|published`), `summary`.

No migration is destructive: all new fields are optional, so existing documents keep working unchanged.

### 8.5 Motion

Reanimated 4 only (already present). Shared `app/theme/motion.ts` holds durations/easings. `useReducedMotion` from `react-native-reanimated` gates every non-essential animation. Skeletons mirror final layout and cross-fade into content.

### 8.6 Localization

The machine-translation hook is **not** removed in this pass (removing it would delete 107 languages of behaviour). Instead the redesign introduces `app/theme/strings.ts` for the **new** screens' own chrome, sourced through the existing `AutoText` path, so the new UI degrades gracefully. RTL mirroring is implemented for the new layouts via a `useRTL()` helper that reads the same `rtlLanguages` list.

---

## 9. Implementation Sequence

| Milestone | Deliverable | Verification |
|---|---|---|
| **1** | This audit | ✅ complete |
| **2** | `app/theme/*` + `app/components/ui/*` | `tsc` clean for new files |
| **3** | Home, Trips, Trip Details, Calendar, News, Profile, navigation | `tsc`; Metro bundle export; screenshot in simulator |
| **4** | Shipment tracking stage tracker; Services hub replacing the emoji placeholder | `tsc`; route smoke test |
| **5** | Sanity schema extensions; delete `demoAnnouncements.ts` | Studio build; GROQ validation against live dataset |
| **6** | Motion, skeletons, haptics, Reduce Motion, a11y labels | `tsc`; reduced-motion run |
| **7** | Live Activity: config plugin + Swift widget + native module + JS facade | `expo prebuild`; Xcode build; **Live Activity observed in the iPhone 17 Pro simulator** |
| **8** | Static landing page (`web/`) sharing the design language | Local build; Lighthouse-ish checks |
| **9** | TypeScript, lint, security review, regression pass | `tsc` baseline not exceeded; regression checklist |

---

## 10. Decisions Required From the Owner

These block nothing in Milestones 2–4, but must be resolved before release:

1. **Credential rotation** (S1–S5) — I will not rotate production credentials without explicit approval.
2. **iOS 16.2 minimum** — acceptable to drop iOS 15.x for genuine Live Activities?
3. **Remove `EXPO_PUBLIC_` from secret variables** and re-issue a **read-only** Sanity token for the client?
4. **Guard the admin broadcast route** (`/(home)/profile/admin-notifications`) with a server-side `isAdmin` check — approve?
5. **Centralize push sending server-side** and remove the app token from the client bundle — approve the architectural change?
6. **Replace runtime machine translation** with curated resources (requires authoring 107 locales, or narrowing to the 13 featured languages) — which direction?
7. **Git identity** for any requested commits — confirm the owner's name/email to preserve history attribution (per prompt rule 12).
