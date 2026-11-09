# Latest work plan

## Goal
Confirm the onboarding reset flow from the admin dashboard works correctly, then revert the welcome screen images back to the original assets used before the recent image swap.

## Current state
- `app/(home)/profile/admin-dashboard/index.tsx` already contains a `Reset onboarding` debug card that removes `hasSeenOnboarding` from `AsyncStorage`.
- `app/components/Welcome.tsx` reads that flag and routes to `/onboarding` when it is missing.
- Recent image swaps touched the welcome card assets; pending revert to the earlier originals.

## Next checks
1. Read the current onboarding flag logic in `Welcome.tsx` again to make sure the admin clear action matches what the welcome screen expects.
2. Read the onboarding screen contents to confirm it renders when `/onboarding` is opened.
3. Confirm which image files were changed and restore them to the previous versions for the four welcome cards.

## Steps
1. Re-read `app/components/Welcome.tsx` and `app/(home)/welcome/index.tsx`.
2. Re-read `app/components/Onboarding.tsx`.
3. Read `app/(home)/profile/admin-dashboard/index.tsx` again for the reset handler.
4. List the welcome image assets and determine the previous originals to restore.
5. Restore the welcome card images and verify the component still imports the expected paths.

## Done criteria
- Admin reset action removes the same `hasSeenOnboarding` key the welcome screen checks.
- Onboarding screen is reachable at `/onboarding` and shows the expected intro slides.
- Welcome card images match the earlier originals and imports still resolve.
