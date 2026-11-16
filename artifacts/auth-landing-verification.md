# Landing, demo and Google authentication verification

Date: 2026-11-16 (Asia/Seoul)

## Implemented

- `/`: explanatory landing page with Google sign-in at the top, hero and bottom; existing approved illustrations; Korean/English and light/dark controls.
- `/demo/*`: retained activity workspaces, five-step hands-on tour, role exploration and earlier device data.
- `/login`: Google sign-in and demo entry. Existing activity URLs redirect to their demo equivalents.
- `/app/*`: server-verified Firebase session required; teacher/admin route access uses only the trusted `reading_role` claim.
- Google popup → ID token verification with revocation check → five-day HttpOnly session cookie → account workspace. Persistent Firebase browser tokens are not used.
- Demo and each account use distinct device storage keys. Backup and restore use the same scope. No automatic cloud synchronization is claimed.
- Logout flushes pending device writes. When saving fails, the user can keep the screen to back up or choose to log out without saving.

## Verified locally

- `npm test`: **106 passed, 0 failed**. Includes 11 authentication/security tests and 3 workspace routing/storage separation tests.
- `npm run build`: passed, including TypeScript.
- Desktop 1440px, mobile 375px and English 320px: no horizontal overflow. Language/theme/grade example/FAQ controls work; no browser page errors observed.
- `/`, `/demo`, `/login`: HTTP 200.
- Anonymous `/app`: HTTP 307 to `/login?next=%2Fapp`.
- `/api/auth/session`: HTTP 200 with `session:null, enabled:true` on the configured local development server.
- Missing-origin and cross-origin login POSTs: 403, no cookie.
- Malformed token POST: 400, no cookie.
- Logout POST from the configured local origin: 200 with cookie removal.
- In the actual browser, the Google button opened **accounts.google.com**, using the configured Firebase OAuth redirect and OpenID/email/profile scope. No credentials were entered and no end-user login was completed.

## External configuration inspection

- Firebase project guard: `chatnovel-e2ccb`.
- Authentication type: `FIREBASE_AUTH`; Google provider enabled.
- `localhost` and `reading-bice-six.vercel.app` were already authorized; no provider/domain changes were made.
- No blocking authentication triggers reported. Cloud Billing and Cloud Functions inventory reads lacked IAM permission; no billing change or backend creation was attempted.
- Existing Vercel project: `jejuai/reading`, `prj_tEa5OhXkSYDAlIo3xDS4SDgcORnc`.
- At this report's creation, production environment variables had not yet been installed and this update had **not been deployed**.

## Verification limits

The server cookie exchange/recovery/revocation behavior was tested with injected test adapters. Actual Google account authentication through the production cookie and subsequent logout remains to be verified after release. Firestore/Storage, cross-device synchronization, school enrollment, and real-time collaboration are separate work and remain unconnected. Existing saved narration continues to work; no paid AI/image generation was invoked.

Screenshots: `landing-desktop-full.png`, `landing-mobile.png`, `landing-mobile-en.png`, `landing-dark-mobile.png` in this artifacts directory (local-only, excluded from Git).
